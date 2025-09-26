import os
import json
import boto3
from botocore.exceptions import ClientError

sns = boto3.client("sns")


def trigger_sync_sns(year, cid):
    msg = json.dumps({"year": year, "cid": cid.replace(" ", "").lower()})
    response = sns.publish(TopicArn=sync_topic_arn, Message=msg)
    return None


def trigger_email_sns(emailbatch):
    # emailbatch: {"typ": t , "content": {}, "recipients": [pname1, pname2,...]}
    msg = json.dumps(emailbatch)

    try:
        response = sns.publish(TopicArn=email_topic_arn, Message=msg)
    except ClientError as e:
        print(f"Error sending email batch: {msg}")
        raise e
