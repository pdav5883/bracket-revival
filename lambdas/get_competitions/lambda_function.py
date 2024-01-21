##############
### Return structure with valid years and cids 

import json 
from utils import basic


def lambda_handler(event, context):
    """
    GET request

    Input: None
    Output: {"year": [cid0, cid1,...],...} 
    """
    return basic.read_file(basic.prefix + "/index.json") 
  

