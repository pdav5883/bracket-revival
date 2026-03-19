"""
Lambda that updates results.json by fetching scoreboard data from S3.
Loops through scoreboard events, finds matching id in results.ids, updates status/scores/result.
"""
from bracket_common import bracket_utils
from blr_common import blr_utils
import json
from datetime import datetime
from urllib.request import urlopen
from urllib.error import HTTPError, URLError
from zoneinfo import ZoneInfo

bucket = SUB_PrivateBucketName
TEST_SCOREBOARD_KEY = "test/scoreboard-example.json"
SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?groups=100"


def _event_to_game_data(ev):
    """Extract status and scores from a scoreboard event."""
    status_type = ev.get("status", {}).get("type", {})
    name = status_type.get("name", "")

    if name == "STATUS_FINAL":
        game_status = "COMPLETE"
    elif name == "STATUS_SCHEDULED":
        game_status = "NOT_STARTED"
    else:
        game_status = "IN_PROGRESS"

    competitors = ev["competitions"][0]["competitors"]
    score0 = int(competitors[0]["score"]) if len(competitors) > 0 and competitors[0].get("score") else 0
    score1 = int(competitors[1]["score"]) if len(competitors) > 1 and competitors[1].get("score") else 0

    return {"status": game_status, "scores": [score0, score1]}


def lambda_handler(event, context):
    """
    API Gateway GET with year query param, or direct invoke with {year: "2026"}.
    If `year` is omitted (e.g. scheduled invocation), default to the current year in America/New_York.
    """
    if "queryStringParameters" in event and event["queryStringParameters"]:
        year = event["queryStringParameters"].get("year")
    else:
        year = event.get("year")

    if not year:
        # When invoked by a scheduler we may not have queryStringParameters.
        year = str(datetime.now(tz=ZoneInfo("America/New_York")).year)
    else:
        year = str(year)

    results_key = year + "/results.json"
    results_dict = blr_utils.read_file_s3(bucket, results_key)

    # TODO: change this to a live call to ESPN scoreboard
    try:
        print(f"Fetching scoreboard data from url {SCOREBOARD_URL}")
        with urlopen(SCOREBOARD_URL, timeout=10) as resp:
            scoreboard_data = json.load(resp)
    except (HTTPError, URLError) as e:
        print(f"Error fetching scoreboard: {e}")
        return {"statusCode": 500, "body": f"Error fetching scoreboard: {e}"}
    except json.JSONDecodeError as e:
        print(f"Error parsing scoreboard: {e}")
        return {"statusCode": 500, "body": f"Error parsing scoreboard: {e}"}

    ids = results_dict["ids"]
    statuses = results_dict["statuses"]
    scores = results_dict["scores"]
    results = results_dict["results"]

    num_updated = 0

    print(f"Found {len(scoreboard_data.get('events', []))} events in scoreboard")

    # Loop through scoreboard; for each entry find its id in results.ids and update
    for ev in scoreboard_data.get("events", []):
        event_id = ev.get("id")
        if not event_id:
            continue
        try:
            i = ids.index(event_id)
        except ValueError:
            continue

        data = _event_to_game_data(ev)
        old_status = statuses[i]
        statuses[i] = data["status"]
        if data["status"] == "COMPLETE":
            scores[i] = data["scores"]
            results[i] = 0 if scores[i][0] > scores[i][1] else 1
        elif data["status"] == "NOT_STARTED":
            scores[i] = [None, None]
            results[i] = None
        elif data["status"] == "IN_PROGRESS":
            scores[i] = data["scores"]
            results[i] = None

        if statuses[i] != old_status:
            print(f"Game {event_id} status changed from {old_status} to {data['status']}")
            num_updated += 1

    results_dict["completed_rounds"] = bracket_utils.compute_completed_rounds(results)
    results_dict["started_rounds"] = bracket_utils.compute_started_rounds(results)
    blr_utils.write_file_s3(bucket, results_key, results_dict)

    # sync scoreboard for all competitions in year
    if num_updated > 0:
        index = blr_utils.read_file_s3(bucket, "index.json")
        for cid in index[year]:
            bracket_utils.trigger_sync_sns(year, cid.replace(" ", "").lower())

    return {"body": f"Successfully updated results for year {year}. {num_updated} games updated."}
