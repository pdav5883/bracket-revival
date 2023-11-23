

def lambda_handler(event, context):
    a = event["queryStringParameters"]["a"]

    try:
        out = int(a) * 2
    except Exception:
        out = str(a) + " text!"

    return {"out": out}
