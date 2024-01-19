##############
### Return structure with valid years and cids 

import json 

prefix = "../test_data/"

def lambda_handler(event, context):
    """
    GET request

    Input: None
    Output: {"year": [cid0, cid1,...],...} 
    """
    return read_file(prefix + "/index.json") 
  

def read_file(key):
    with open(key, "r") as fptr:
        data = json.load(fptr)

    return data

