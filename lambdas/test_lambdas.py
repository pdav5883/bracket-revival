from test_lambda import lambda_function as test_lambda

from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route("/test", methods=["GET"])
def test_function():

    event = make_event()
    data = test_lambda.lambda_handler(event, None)

    return jsonify(data)


def make_event():
    if request.method == "GET":
        event = {"queryStringParameters": dict(request.args)}
    elif request.method == "POST":
        # TODO: need to test this, lambda expects to run json.loads(event["body"])
        event = {"body": json.dumps(request.json)}
    else:
        event = {}
    return event

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000)
