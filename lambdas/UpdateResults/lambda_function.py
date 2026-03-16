"""
Lambda that updates results.json by fetching scoreboard data from S3.
Loops through scoreboard events, finds matching id in results.ids, updates status/scores/result.
"""
from bracket_common import bracket_utils
from blr_common import blr_utils

bucket = SUB_PrivateBucketName
TEST_SCOREBOARD_KEY = "test/scoreboard-example.json"


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

    competitors = ev.get("competitors", [])
    score0 = int(competitors[0]["score"]) if len(competitors) > 0 and competitors[0].get("score") else 0
    score1 = int(competitors[1]["score"]) if len(competitors) > 1 and competitors[1].get("score") else 0

    return {"status": game_status, "scores": [score0, score1]}


def lambda_handler(event, context):
    """
    API Gateway GET with year query param, or direct invoke with {year: "2026"}.
    """
    if "queryStringParameters" in event and event["queryStringParameters"]:
        year = event["queryStringParameters"].get("year")
    else:
        year = event.get("year")

    if not year:
        return {"statusCode": 400, "body": "Missing year parameter"}

    results_key = year + "/results.json"
    results_dict = blr_utils.read_file_s3(bucket, results_key)

    # TODO: change this to a live call to ESPN scoreboard
    scoreboard_data = blr_utils.read_file_s3(bucket, TEST_SCOREBOARD_KEY)

    ids = results_dict["ids"]
    statuses = results_dict["statuses"]
    scores = results_dict["scores"]
    results = results_dict["results"]

    update_scoreboard = False

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
            update_scoreboard = True

    results_dict["completed_rounds"] = bracket_utils.compute_completed_rounds(results)
    results_dict["started_rounds"] = bracket_utils.compute_started_rounds(results)
    blr_utils.write_file_s3(bucket, results_key, results_dict)

    # sync scoreboard for all competitions in year
    if update_scoreboard:
        index = blr_utils.read_file_s3(bucket, "index.json")
        for cid in index[year]:
            bracket_utils.trigger_sync_sns(year, cid.replace(" ", "").lower())

    return {"body": f"Successfully updated results for year {year}"}
