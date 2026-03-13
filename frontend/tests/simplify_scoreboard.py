#!/usr/bin/env python3
"""
Ingest scoreboard-example.json and preserve only events with id, date,
competitors.score, and status fields. Write result to scoreboard-example-simple.json.
"""

import json
from pathlib import Path

INPUT_FILE = Path(__file__).parent / "scoreboard-example.json"
OUTPUT_FILE = Path(__file__).parent / "scoreboard-example-simple.json"


def simplify_event(event: dict) -> dict:
    """Extract id, date, competitors.score, and status from an event."""
    result = {
        "id": event.get("id"),
        "date": event.get("date"),
        "status": event.get("status"),
    }
    # Get competitors.score from competitions
    competitors = []
    for comp in event.get("competitions", []):
        for c in comp.get("competitors", []):
            competitors.append({"score": c.get("score")})
    result["competitors"] = competitors
    return result


def main() -> None:
    with open(INPUT_FILE) as f:
        data = json.load(f)

    events = data.get("events", [])
    simplified = {"events": [simplify_event(e) for e in events]}

    with open(OUTPUT_FILE, "w") as f:
        json.dump(simplified, f, indent=2)

    print(f"Wrote {len(events)} events to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
