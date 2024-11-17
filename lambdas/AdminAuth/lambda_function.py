from common import utils

ssm_param = SUB_SsmAdminSecretId

def lambda_handler(event, context):
    auth_attempt = event.get("headers", {}).get("authorization", "")
    
    auth_truth = utils.read_parameter(ssm_param)
    
    if auth_attempt == auth_truth:
        return {"isAuthorized": True}
    else:
        return {"isAuthorized": False}
