import json

from update_picks import lambda_function as update_picks
from get_bracket import lambda_function as get_bracket
from get_round_start import lambda_function as get_round_start
from update_scoreboard import lambda_function as update_scoreboard
from get_scoreboard import lambda_function as get_scoreboard
from get_competitions import lambda_function as get_competitions
from add_element import lambda_function as add_element
from admin_edit import lambda_function as admin_edit
from admin_auth import lambda_function as admin_auth

from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


@app.route("/picks", methods=["POST"])
def update_function():
    event = make_event()
    data = update_picks.lambda_handler(event, None)

    return jsonify(data)


@app.route("/bracket", methods=["GET"])
def bracket_function():
    event = make_event()
    data = get_bracket.lambda_handler(event, None)

    return jsonify(data)


@app.route("/start", methods=["GET"])
def start_function():
    event = make_event()
    data = get_round_start.lambda_handler(event, None)

    return jsonify(data)


@app.route("/sync", methods=["POST","GET"])
def sync_function():
    event = make_event()
    data = update_scoreboard.lambda_handler(event, None)

    return jsonify(data)


@app.route("/scoreboard", methods=["GET"])
def scoreboard_function():
    event = make_event()
    data = get_scoreboard.lambda_handler(event, None)

    return jsonify(data)


@app.route("/competitions", methods=["GET"])
def competitions_function():
    event = make_event()
    data = get_competitions.lambda_handler(event, None)

    return jsonify(data)


@app.route("/add", methods=["PUT", "GET"])
def add_element_function():
    event = make_event()
    data = add_element.lambda_handler(event, None)

    return jsonify(data)


@app.route("/admin", methods=["POST"])
def admin_edit_function():
    event = make_event()
    
    # auth is automatic true
    event["headers"] = {"authorization": "test"}
    auth = admin_auth.lambda_handler(event, None)

    if auth["isAuthorized"]:
        data = admin_edit.lambda_handler(event, None)
    else:
        data = "Invalid authorization"

    return jsonify(data)


def make_event():
    if request.method == "GET":
        event = {"queryStringParameters": dict(request.args)}
    elif request.method == "POST":
        event = {"body": json.dumps(request.json)}
    elif request.method == "PUT":
        event = {"body": json.dumps(request.json)}
    else:
        event = {}

    return event

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000)
