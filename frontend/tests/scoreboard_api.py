#!/usr/bin/env python3
"""
Mini mock API that serves scoreboard data from scoreboard-test.json
in the format of scoreboard-example-simple.json (ESPN-style events).
"""

import json
from pathlib import Path

from flask import Flask, jsonify

APP_DIR = Path(__file__).parent
DATA_FILE = APP_DIR / "scoreboard-test.json"

app = Flask(__name__)


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response

# Status lookup: maps simple status string -> full status object
STATUS_MAP = {
    "STATUS_SCHEDULED": {
        "clock": 0.0,
        "displayClock": "0:00",
        "period": 0,
        "type": {
            "id": "1",
            "name": "STATUS_SCHEDULED",
            "state": "pre",
            "completed": False,
            "description": "Scheduled",
            "detail": "Wed, March 11th at 11:30 PM EDT",
            "shortDetail": "3/11 - 11:30 PM EDT",
        },
    },
    "STATUS_IN_PROGRESS": {
        "clock": 600.0,
        "displayClock": "10:00",
        "period": 2,
        "type": {
            "id": "2",
            "name": "STATUS_IN_PROGRESS",
            "state": "in",
            "completed": False,
            "description": "In Progress",
            "detail": "10:00 - 2nd Half",
            "shortDetail": "10:00 - 2nd",
        },
    },
    "STATUS_HALFTIME": {
        "clock": 0.0,
        "displayClock": "0:00",
        "period": 1,
        "type": {
            "id": "23",
            "name": "STATUS_HALFTIME",
            "state": "in",
            "completed": False,
            "description": "Halftime",
            "detail": "Halftime",
            "shortDetail": "Halftime",
        },
    },
    "STATUS_FINAL": {
        "clock": 0.0,
        "displayClock": "0:00",
        "period": 2,
        "type": {
            "id": "3",
            "name": "STATUS_FINAL",
            "state": "post",
            "completed": True,
            "description": "Final",
            "detail": "Final",
            "shortDetail": "Final",
        },
    },
}


def transform_game_to_event(game: dict, base_date: str = "2026-03-12T00:30Z") -> dict:
    """Convert a game from scoreboard-test format to scoreboard-example-simple format."""
    status_key = game.get("status", "STATUS_SCHEDULED")
    status = STATUS_MAP.get(status_key, STATUS_MAP["STATUS_SCHEDULED"]).copy()
    status["type"] = status["type"].copy()

    score = game.get("score", [0, 0])
    competitors = [{"score": str(score[0])}, {"score": str(score[1])}]

    # Vary date slightly per game id for ordering
    game_id = game.get("id", 0)
    hour_offset = game_id % 24
    date = f"2026-03-12T{hour_offset:02d}:30Z" if game_id else base_date

    return {
        "id": str(game.get("id", 0)),
        "date": date,
        "status": status,
        "competitors": competitors,
    }


def load_and_transform() -> dict:
    """Load scoreboard-test.json and transform to events format."""
    with open(DATA_FILE) as f:
        data = json.load(f)
    games = data.get("games", [])
    events = [transform_game_to_event(g) for g in games]
    return {"events": events}


@app.route("/scoreboard")
def scoreboard():
    """Serve scoreboard data in ESPN-style events format."""
    return jsonify(load_and_transform())


if __name__ == "__main__":
    app.run(port=5001, debug=True)
