import json
import os
import random
import boto3
from botocore.exceptions import ClientError

from common import utils

user_pool_id = SUB_UserPoolId
admin_group_name = SUB_CognitoAdminGroupName

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
        return admin_endpoint_auth(event, context)
    elif event["rawPath"] == "/add":
        return add_endpoint_auth(event, context)
    else:
        return {"isAuthorized": False}
    
def start_or_picks_endpoint_auth(event, context):
    # compare the pid of the request with the pid of the signed in user
    pid = event['queryStringParameters']['pid'].replace(" ", "__").lower()

    # confirm that pid matches cognito user name
    access_token = event['headers'].get('authorization', '')
    
    if not access_token:
        return {"isAuthorized": False}

    cognito_pid,  = utils.get_user_attribute(access_token, ["name"])

    
    if cognito_pid == pid:
        return {"isAuthorized": True}
    else:
        return {"isAuthorized": False}
    
def add_endpoint_auth(event, context):
    typ = event['queryStringParameters']['type']

    if typ == "year":
        return add_year_or_competition_endpoint_auth(event, context)
    elif typ == "competition":
        return add_year_or_competition_endpoint_auth(event, context)
    elif typ == "player":
        return add_player_endpoint_auth(event, context)
    else:
        return {"isAuthorized": False}
    
def add_year_or_competition_endpoint_auth(event, context):
    # submitting user must always be admin
    return admin_endpoint_auth(event, context)


def add_player_endpoint_auth(event, context):
    # check that this user exists
    access_token = event['headers'].get('authorization', '')

    if not access_token:
        return {"isAuthorized": False}

    try:    
        user = utils.get_user(access_token)
        return {"isAuthorized": True}
    
    except cognito.exceptions.UserNotFoundException:
        return {"isAuthorized": False}
    

def admin_endpoint_auth(event, context):
    access_token = event['headers'].get('authorization', '')
    
    if not access_token:
        return {"isAuthorized": False}

    user = utils.get_user(access_token)

    if user_is_admin(user['Username']):
        return {"isAuthorized": True}
    else:
        return {"isAuthorized": False}

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
        raise ClientError(
            error_response={'Error': {'Message': 'Email already in use'}}, operation_name='pre_sign_up'
            )
    
    existing_name = cognito.list_users(UserPoolId=event['userPoolId'],Filter=f'name = "{name}"')['Users']
    if len(existing_name) > 0:
        raise ClientError(
            error_response={'Error': {'Message': 'Name already in use'}}, operation_name='pre_sign_up'
        )
    
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
        
        # Get user email URL
        email = event['request']['userAttributes']['email']
        name = event['request']['userAttributes']['given_name']
        
        # Build verification link with code
        verify_path = f"login.html?code={code}&email={email}"

        email_msg = {"typ": "verify", "content": {"verify_path": verify_path}, "recipient_names": [name], "recipient_emails": [email]}
        
        try:
            utils.trigger_email(email_msg)
        
        except ClientError as e:
            print(f"Error sending email: {str(email_msg)}")
            print(f"Error: {str(e)}")
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
    return admin_group_name in [group['GroupName'] for group in response['Groups']]
