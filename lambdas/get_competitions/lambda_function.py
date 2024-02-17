##############
### Return structure with valid years and cids 

import json 
from common import utils


def lambda_handler(event, context):
    """
    GET request

    Input: None
    Output: {"year": [cid0, cid1,...],...} 
    """
    print(utils.read_file("index.json"))
    return utils.read_file("index.json") 
  

