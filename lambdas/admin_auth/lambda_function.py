from common import utils

def lambda_handler(event, context):
    auth_attempt = event.get("headers", {}).get("authorization", "")
    
    auth_truth = utils.read_parameter("bracket-admin-secret")
    
    if auth_attempt == auth_truth:
        return {"isAuthorized": True}
    else:
        return {"isAuthorized": False}
