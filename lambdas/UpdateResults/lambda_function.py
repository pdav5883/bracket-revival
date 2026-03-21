"""
Lambda that updates results.json by fetching scoreboard data from S3.
Loops through scoreboard events, finds matching id in results.ids, updates status/scores/result.
"""
from bracket_common import bracket_utils
from bracket_common import tournament as trn
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
    score0 = int(competitors[0]["score"]) if competitors[0].get("score") else 0
    score1 = int(competitors[1]["score"]) if competitors[1].get("score") else 0

    id0 = competitors[0]["id"] if competitors[0].get("id") else ""
    id1 = competitors[1]["id"] if competitors[1].get("id") else ""

    return {"status": game_status, "scores": [score0, score1], "team_ids": [id0, id1]}


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
    espn_ids = []


    teams_key = year + "/teams.json"
    teams = blr_utils.read_file_s3(bucket,teams_key)
    team_ids = [t.get("espn_id", None) for t in teams]

    for i, (i_upper, i_lower) in enumerate(make_absolute_bracket(results)):
        espn_ids.append([
            team_ids[i_upper] if i_upper is not None else None,
            team_ids[i_lower] if i_lower is not None else None
        ])

    print(f"Found {len(scoreboard_data.get('events', []))} events in scoreboard")
    num_updated = 0

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

        # order of competitors in espn scoreboard is based on seeds, order in results is based on bracket structure
        # so we need to flip the scoreboard if the order is different
        if data["team_ids"][0] == espn_ids[i][0]:
            score = data["scores"]
        else:
            score = data["scores"][::-1]

        old_status = statuses[i]
        statuses[i] = data["status"]
        if data["status"] == "COMPLETE":
            scores[i] = score
            results[i] = 0 if scores[i][0] > scores[i][1] else 1
        elif data["status"] == "NOT_STARTED":
            scores[i] = [None, None]
            results[i] = None
        elif data["status"] == "IN_PROGRESS":
            scores[i] = score
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


def make_absolute_bracket(results, picks=None):
    """
    Converts flat list of 0/1 results and/or picks into flat list of upper/lower absolute indices into teams

    - results must start from round0 and continue through round i (or be empty)
    - if present picks must start at round i+1 (or zero if results empty) and continue through final round.

    Returns list of absolute upper/lower indices for each game, None if there is no result/pick for game

    Returns None if something goes wrong (TODO: do something else here)
    """
    # rel_inds is 0/1 result/pick from previous game
    if picks is not None:
        rel_inds = results + picks
    else:
        rel_inds = results

    if len(rel_inds) != trn.NUMGAMES:
        return None

    abs_inds = []

    # create flat list of bracket indices
    for i in range(trn.NUMGAMES):
        i_prev_upper, i_prev_lower = trn.PREV_GAME[i]

        if i_prev_upper is None:
            i_upper = 2 * i
            i_lower = 2 * i + 1

        else:
            abs_upper = abs_inds[i_prev_upper]
            rel_upper = rel_inds[i_prev_upper]

            if rel_upper is None:
                i_upper = None
            else:
                i_upper = abs_upper[rel_upper]

            abs_lower = abs_inds[i_prev_lower]
            rel_lower = rel_inds[i_prev_lower]

            if rel_lower is None:
                i_lower = None
            else:
                i_lower = abs_lower[rel_lower]

        abs_inds.append((i_upper, i_lower))

    return abs_inds