##############
### Return structure with valid years and cids 

import json 
from blr_common import blr_utils

bucket = SUB_PrivateBucketName

def lambda_handler(event, context):
    """
    GET request

    If no input, return index.json, if year/cid input return competition.json
    """
    params = event.get("queryStringParameters", {})
    year = params.get("year", None)
    cid = params.get("cid", None)

    if year is None or cid is None:
        return blr_utils.read_file_s3(bucket, "index.json")
    else:
        cid = cid.replace(" ", "").lower()
        return blr_utils.read_file_s3(bucket, year + "/" + cid + "/competition.json")
  

