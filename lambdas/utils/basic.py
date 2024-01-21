import os
import json


def key_exists_local(key):
    """
    Boolean whether a file exists at key
    """
    return os.path.isfile(key)


def read_file_local(key):
    with open(key, "r") as fptr:
        data = json.load(fptr)

    return data


def write_file_local(key, data):
    os.makedirs(os.path.dirname(key), exist_ok=True)

    with open(key, "w") as fptr:
        json.dump(data, fptr)


def key_exists_s3(key):
    pass


def read_file_s3(key):
    pass


def write_file_s3(key, data):
    pass


# allow switch to local testing with env variables
if "BRACKET_REVIVAL_LOCAL_PREFIX" in os.environ:
    prefix = os.environ["BRACKET_REVIVAL_LOCAL_PREFIX"]
    
    key_exists = key_exists_local
    read_file = read_file_local
    write_file = write_file_local

else:
    prefix = "BUCKET NAME"
    key_exists = key_exists_s3
    read_file = read_file_s3
    write_file = write_file_s3
