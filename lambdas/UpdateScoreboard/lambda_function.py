import json

from bracket_common import tournament as trn
from bracket_common import points
from blr_common import blr_utils

bucket = SUB_PrivateBucketName


def lambda_handler(event, context):
    """
    GET request (should really be POST, but much easier this way)

    or

    SNS topic subscription
    """
    if "queryStringParameters" in event:
        year = event["queryStringParameters"].get("year")
        cid = event["queryStringParameters"].get("cid").replace(" ", "").lower()
    elif "Records" in event:
        msg = json.loads(event["Records"][0]["Sns"]["Message"])
        year = msg.get("year")
        cid = msg.get("cid").replace(" ", "").lower()

    # TODO: assert arguments exist

    results_key = year + "/results.json"
    results_dict = blr_utils.read_file_s3(bucket, results_key)
    results = results_dict["results"]

    competition_key = year + "/" + cid + "/competition.json"
    
    competition = blr_utils.read_file_s3(bucket, competition_key)
    scoreboard = competition["scoreboard"]

    player_names = list(scoreboard.keys())

    # repopulate scoreboard
    scoreboard = {}
    pick_status = {}

    for pname in player_names:
        pid = pname.replace(" ", "__").lower()
        player_key = year + "/" + cid + "/" + pid + ".json"
        player = blr_utils.read_file_s3(bucket, player_key)

        points_game = points.calc_points_revival(player["picks"], results)
        points_round = []
        first_game = 0

        for gpr in trn.GAMES_PER_ROUND:
            points_round.append(sum(points_game[first_game:first_game + gpr]))
            first_game += gpr

        scoreboard[pname] = points_round
        
        # pick status is None if picks aren't currently open, True if picks submitted for this round, False if waiting
        if not competition["open_picks"]:
            pick_status[pname] = None
        elif len(player["picks"]) > competition["completed_rounds"]:
            pick_status[pname] = True
        else:
            pick_status[pname] = False

    competition["scoreboard"] = scoreboard
    competition["pick_status"] = pick_status

    blr_utils.write_file_s3(bucket, competition_key, competition)

    return f"Successfully updated scoreboard for year {year}, cid {cid}"


