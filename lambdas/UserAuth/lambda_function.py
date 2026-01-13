import json
import os
import random
import boto3
from botocore.exceptions import ClientError

blr_authorizer = SUB_BLRLambdaUserAuthArn

lambda_client = boto3.client('lambda')


def lambda_handler(event, context):
    access_token = event['headers'].get('authorization', '')

    ########################
    ##### TESTING ONLY #####
    ########################
    # return {"isAuthorized": True}

    if not access_token:
        return {"isAuthorized": False}

    user_id = event.get('queryStringParameters', {}).get('pid', '').replace(' ', '__').lower()

    if event["rawPath"] == "/start":
        auth_type = "specificUser"
    elif event["rawPath"] == "/picks":
        auth_type = "specificUser"
    elif event["rawPath"] == "/add":
        auth_type = "anyUser"
    elif event["rawPath"] == "/admin":
        auth_type = "adminUser"
    else:
        return {"isAuthorized": False}

    lambda_event = {"authType": auth_type, "accessToken": access_token, "userID": user_id}
    lambda_response = lambda_client.invoke(FunctionName=blr_authorizer,
                                            InvocationType='RequestResponse',
                                            Payload=json.dumps(lambda_event))

    if json.loads(lambda_response['Payload'].read())["isAuthorized"]:
        return {"isAuthorized": True}
    else:
        return {"isAuthorized": False}
