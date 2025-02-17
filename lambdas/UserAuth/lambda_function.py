import json
import os
import random
import boto3
from botocore.exceptions import ClientError

from common import utils

DOMAIN = "localhost:8000"
user_pool_id = "us-east-1_7j2Ragbz6"

cognito = boto3.client('cognito-idp')
ses = boto3.client('ses')

def lambda_handler(event, context):
    # print("=====================================")
    print("NEW AUTH EVENT")
    # print(f"Trigger Source: {event['triggerSource']}")
    print(event)
    print(context)

    if "triggerSource" in event:
        return handle_auth_flow(event, context)
    elif "rawPath" in event:
        return handle_endpoint_auth(event, context)
    else:
        raise Exception("Invalid event")
    
def handle_endpoint_auth(event, context):
    if event["rawPath"] == "/start":
        return start_or_picks_endpoint_auth(event, context)
    elif event["rawPath"] == "/picks":
        return start_or_picks_endpoint_auth(event, context)
    elif event["rawPath"] == "/admin":
        return admin_endpoint(event, context)
    else:
        return {"isAuthorized": False,
                "context": {
                    "message": f"Invalid endpoint {event['rawPath']}"
                    }
                }
    
def start_or_picks_endpoint_auth(event, context):
    # grab the competition
    year = event['queryStringParameters']['year']   
    cid = event['queryStringParameters']['cid']
    pid = event['queryStringParameters']['pid']

    competition_key = f"{year}/{cid}/competition.json"
    competition = utils.read_file(competition_key)
    require_secret = competition['require_secret']
    
    if not require_secret:
        return {"isAuthorized": True}

    # confirm that pid matches cognito user name
    access_token = event['headers'].get('authorization', '').replace('Bearer ', '')
    
    if not access_token:
        return {"isAuthorized": False,
                "context": {
                    "message": f"You must be signed in as {pid.lower()} to access this page"
                    }
                }

    user = cognito.get_user(AccessToken=access_token)
    
    # TODO: catch error here if accessToken is not valid
    name = None
    for attr in user['UserAttributes']:
        if attr['Name'] == 'name':
            name = attr['Value']
            break
    
    if name == pid.lower():
        return {"isAuthorized": True}
    else:
        return {"isAuthorized": False,
                "context": {
                    "message": f"You must be signed in as {pid.lower()} to access this page"
                    }
                }
    
def admin_endpoint(event, context):
    access_token = event['headers'].get('authorization', '').replace('Bearer ', '')
    
    if not access_token:
        return {"isAuthorized": False,
                "context": {
                    "message": f"You must be signed in as an admin to submit changes"
                    }
                }

    user = cognito.get_user(AccessToken=access_token)

    if user_is_admin(user['Username']):
        return {"isAuthorized": True}
    else:
        return {"isAuthorized": False,
                "context": {
                    "message": f"You must be signed in as an admin to submit changes"
                    }
                }

def handle_auth_flow(event, context):
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
    """Auto-confirm user and set username as concatenation of given and family names"""
    # Get user attributes
    user_attrs = event['request']['userAttributes']
    given_name = user_attrs.get('given_name', '')
    family_name = user_attrs.get('family_name', '')
    name = user_attrs.get('name', '')
    email = user_attrs.get('email', '')

    existing_email = cognito.list_users(UserPoolId=event['userPoolId'],Filter=f'email = "{email}"')['Users']
    if len(existing_email) > 0:
        raise Exception("Email already in use")
    
    existing_name = cognito.list_users(UserPoolId=event['userPoolId'],Filter=f'name = "{name}"')['Users']
    if len(existing_name) > 0:
        raise Exception("Name already in use")
    
    # Auto-confirm but don't verify email
    event['response']['autoConfirmUser'] = True
    event['response']['autoVerifyEmail'] = False
    
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
            # TODO: change to SNS publish
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
    """Mark email as verified and add admin status after successful authentication"""
    try:
        # Check if user is admin
        is_admin = user_is_admin(event['userName'])
        
        # Update user attributes
        cognito.admin_update_user_attributes(
            UserPoolId=event['userPoolId'],
            Username=event['userName'],
            UserAttributes=[
                {
                    'Name': 'email_verified',
                    'Value': 'true'
                },
                {
                    # this field controls whether admin links are visible in UI, authentication for admin happens backend
                    'Name': 'custom:is_admin',
                    'Value': str(is_admin).lower()
                }
            ]
        )
    except ClientError as e:
        print(f"Error updating user attributes: {str(e)}")
        raise e
    
    return event

def user_is_admin(user_name):
    response = cognito.admin_list_groups_for_user(
        UserPoolId=user_pool_id,
        Username=user_name
    )
    return 'admin' in [group['GroupName'] for group in response['Groups']]
