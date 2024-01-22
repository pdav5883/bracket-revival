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


# allow switch to local testing with env variables
if "BRACKET_REVIVAL_LOCAL_PREFIX" in os.environ:
    prefix = os.environ["BRACKET_REVIVAL_LOCAL_PREFIX"]
    
    key_exists = key_exists_local
    read_file = read_file_local
    write_file = write_file_local

else:
    bucket = "bracket-revival-private"
    s3 = boto3.client("s3")

    key_exists = key_exists_s3
    read_file = read_file_s3
    write_file = write_file_s3
