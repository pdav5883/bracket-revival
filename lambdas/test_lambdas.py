import json

from test_lambda import lambda_function as test_lambda
from calc_score import lambda_function as calc_score
from update_picks import lambda_function as update_picks
from get_bracket import lambda_function as get_bracket

from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route("/test", methods=["GET"])
def test_function():

    event = make_event()
    data = test_lambda.lambda_handler(event, None)

    return jsonify(data)


@app.route("/score", methods=["GET"])
def score_function():
    event = make_event()
    data = calc_score.lambda_handler(event, None)

    return jsonify(data)


@app.route("/update", methods=["POST"])
def update_function():
    event = make_event()
    data = update_picks.lambda_handler(event, None)

    return jsonify(data)


@app.route("/bracket", methods=["GET"])
def bracket_function():
    event = make_event()
    data = get_bracket.lambda_handler(event, None)

    return jsonify(data)


def make_event():
    if request.method == "GET":
        event = {"queryStringParameters": dict(request.args)}
    elif request.method == "POST":
        event = {"body": json.dumps(request.json)}
    else:
        event = {}
    return event

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000)
