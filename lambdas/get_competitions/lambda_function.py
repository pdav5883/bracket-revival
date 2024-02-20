##############
### Return structure with valid years and cids 

import json 
from common import utils


def lambda_handler(event, context):
    """
    GET request

    If no input, return index.json, if year/cid input return competition.json
    """
    year = event["queryStringParameters"].get("year", None)
    cid = event["queryStringParameters"].get("cid", None)

    if year is None or cid is None:
        return utils.read_file("index.json")
    else:
        cid = cid.replace(" ", "").lower()
        return utils.read_file(year + "/" + cid + "/competition.json")
  

