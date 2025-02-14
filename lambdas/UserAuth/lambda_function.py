import json
import os
import random
import boto3
from botocore.exceptions import ClientError

DOMAIN = "localhost:8000"

cognito = boto3.client('cognito-idp')
ses = boto3.client('ses')

def lambda_handler(event, context):
    # print("=====================================")
    # print(f"Trigger Source: {event['triggerSource']}")
    # print(event)
    # print(context)

    if event['triggerSource'] == 'PreSignUp_SignUp':
        return pre_sign_up(event, context)
    elif event['triggerSource'] == 'DefineAuthChallenge_Authentication':
        return define_auth_challenge(event, context)
    elif event['triggerSource'] == 'CreateAuthChallenge_Authentication':
        return create_auth_challenge(event, context)
    elif event['triggerSource'] == 'VerifyAuthChallengeResponse_Authentication':
        return verify_auth_challenge(event, context)
    elif event['triggerSource'] == 'PostAuthentication_Authentication':
        return post_authentication(event, context)
    


def pre_sign_up(event, context):
    """Auto-confirm user but leave email unverified"""
    event['response']['autoConfirmUser'] = True
    event['response']['autoVerifyEmail'] = False
    
    # Return the entire event object
    return event

def define_auth_challenge(event, context):
    """Define the challenge flow"""
    session = event['request']['session']
    
    if len(session) == 0:
        # First challenge - send email with link
        event['response']['challengeName'] = 'CUSTOM_CHALLENGE'
        event['response']['failAuthentication'] = False
        event['response']['issueTokens'] = False
    
    elif len(session) == 1 and session[0]['challengeResult'] is True:
        # User successfully completed the challenge
        event['response']['failAuthentication'] = False
        event['response']['issueTokens'] = True
    
    else:
        # Fail authentication if we get here
        event['response']['failAuthentication'] = True
        event['response']['issueTokens'] = False
    
    return event

def create_auth_challenge(event, context):
    """Create and send the challenge via email"""
    if event['request']['challengeName'] == 'CUSTOM_CHALLENGE':
        # Generate a random 6-digit code
        code = str(random.randint(100000, 999999))
        print(f"Generated code: {code}")
        
        # Store the code in private challenge parameters
        event['response']['privateChallengeParameters'] = {'code': code}
        
        # Get user email
        email = event['request']['userAttributes']['email']
        verify_link = f"http://{DOMAIN}/login.html?code={code}&email={email}"
        
        # Prepare email content
        email_html = f"""
        <h1>Verify your email</h1>
        <p>Click the link below to verify your email and get access:</p>
        <a href="{verify_link}">Verify Email</a>
        """
        
        try:
            # Send email using SES
            ses.send_email(
                Source="bracket@bearloves.rocks",
                Destination={
                    'ToAddresses': [email]
                },
                Message={
                    'Subject': {
                        'Data': 'Verify your email'
                    },
                    'Body': {
                        'Html': {
                            'Data': email_html
                        }
                    }
                }
            )
        except ClientError as e:
            print(f"Error sending email: {str(e)}")
            raise e
        
        # Return challenge metadata
        event['response']['publicChallengeParameters'] = {
            'email': email
        }
    return event

def verify_auth_challenge(event, context):
    """Verify the challenge response"""
    expected_code = event['request']['privateChallengeParameters']['code']
    actual_code = event['request']['challengeAnswer']

    print(f"Expected code: {expected_code}")
    print(f"Actual code: {actual_code}")
    
    event['response']['answerCorrect'] = (expected_code == actual_code)
    
    return event

def post_authentication(event, context):
    """Mark email as verified after successful authentication"""
    try:
        cognito.admin_update_user_attributes(
            UserPoolId=event['userPoolId'],
            Username=event['userName'],
            UserAttributes=[
                {
                    'Name': 'email_verified',
                    'Value': 'true'
                }
            ]
        )
    except ClientError as e:
        print(f"Error updating user attributes: {str(e)}")
        raise e
    
    return event