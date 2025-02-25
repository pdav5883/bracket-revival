import os
import json
import boto3
from botocore.exceptions import ClientError


def key_exists_local(key):
    """
    Boolean whether a file exists at key
    """
    return os.path.isfile(prefix + key)


def read_file_local(key):
    with open(prefix + key, "r") as fptr:
        data = json.load(fptr)

    return data


def write_file_local(key, data):
    os.makedirs(os.path.dirname(prefix + key), exist_ok=True)

    with open(prefix + key, "w") as fptr:
        json.dump(data, fptr)


def delete_file_local(key):
    os.remove(prefix + key)


def delete_directory_local(key):
    os.rmdir(prefix + key)


def read_parameter_local(name):
    """
    For testing always return test
    """
    return "test"


def key_exists_s3(key):
    try:
        s3.head_object(Bucket=bucket, Key=key)
        return True
    except ClientError as e:
        return False


def read_file_s3(key):
    try:
        data_s3 = s3.get_object(Bucket=bucket, Key=key)
    except ClientError as e:
        return None

    return json.loads(data_s3["Body"].read().decode("utf-8"))


def write_file_s3(key, data):
    response = s3.put_object(Body=bytes(json.dumps(data).encode("utf-8")), Bucket=bucket, Key=key)
    return None


def delete_file_s3(key):
    response = s3.delete_object(Bucket=bucket, Key=key)
    return None


def delete_directory_s3(key):
    # directories don't exist in S3
    return None


def read_parameter_ssm(name):
    try:
        return ssm.get_parameter(Name=name)["Parameter"]["Value"]
    except ClientError as e:
        return None


def trigger_sync_sns(year, cid):
    msg = json.dumps({"year": year, "cid": cid.replace(" ", "").lower()})
    response = sns.publish(TopicArn=sync_topic_arn, Message=msg)
    return None


def trigger_email_sns(emailbatch):
    # emailbatch: {"typ": t , "content": {}, "recipients": [pname1, pname2,...]}
    msg = json.dumps(emailbatch)
    response = sns.publish(TopicArn=email_topic_arn, Message=msg)
    return None


def get_user_cognito(access_token):
    return cognito.get_user(AccessToken=access_token)


def get_user_attribute_cognito(access_token, attribute):
    # Handle single attribute case
    if isinstance(attribute, str):
        user = get_user_cognito(access_token)
        for attr in user['UserAttributes']:
            if attr['Name'] == attribute:
                return attr['Value']
        return None
    
    # Handle multiple attributes case
    if isinstance(attribute, (list, tuple)):
        user = get_user_cognito(access_token)
        attr_values = [None] * len(attribute)
        for i, attr_name in enumerate(attribute):
            for attr in user['UserAttributes']:
                if attr['Name'] == attr_name:
                    attr_values[i] = attr['Value']
                    break
                
        return tuple(attr_values)
    
    return None


def trigger_sync_local(year, cid):
    cid = cid.replace(" ", "").lower()

    print(f"Cannot perform local auto sync. Run manually in browser by visiting [local host]sync?year={year}&cid={cid}")
    return None


def trigger_email_local(emailbatch):
    print(f"Cannot perform local email trigger")
    return None


def get_user_local(access_token):
    print("Cannot perform local user retrieval")
    return None


def get_user_attribute_local(access_token, attribute):
    print("Cannot perform local user attribute retrieval")
    return None

# allow switch to local testing with env variables
if "BRACKET_REVIVAL_LOCAL_PREFIX" in os.environ:
    prefix = os.environ["BRACKET_REVIVAL_LOCAL_PREFIX"]
    
    key_exists = key_exists_local
    read_file = read_file_local
    write_file = write_file_local
    delete_file = delete_file_local
    delete_directory = delete_directory_local
    read_parameter = read_parameter_local
    trigger_sync = trigger_sync_local
    tirgger_email = trigger_email_local
    get_user = get_user_local
    get_user_attribute = get_user_attribute_local

else:
    bucket = SUB_PrivateBucketName # type: ignore
    sync_topic_arn = SUB_SyncTopicArn # type: ignore
    email_topic_arn = SUB_EmailTopicArn # type: ignore
    s3 = boto3.client("s3")
    ssm = boto3.client("ssm")
    sns = boto3.client("sns")
    cognito = boto3.client("cognito-idp")

    key_exists = key_exists_s3
    read_file = read_file_s3
    write_file = write_file_s3
    delete_file = delete_file_s3
    delete_directory = delete_directory_s3
    read_parameter = read_parameter_ssm
    trigger_sync = trigger_sync_sns
    trigger_email = trigger_email_sns
    get_user = get_user_cognito
    get_user_attribute = get_user_attribute_cognito
