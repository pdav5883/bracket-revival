import json

from common import tournament as trn
from common import points
from common import utils


def lambda_handler(event, context):
    """
    GET request (should really be POST, but much easier this way)

    or

    SNS topic subscription
    """
    if "queryStringParameters" in event:
        year = event["queryStringParameters"].get("year")
        cid = event["queryStringParameters"].get("cid")
    elif "Records" in event:
        msg = json.loads(event["Records"][0]["Sns"]["Message"])
        year = msg.get("year")
        cid = msg.get("cid")

    # TODO: assert arguments exist

    results_key = year + "/results.json"
    results_dict = utils.read_file(results_key)
    results = results_dict["results"]

    competition_key = year + "/" + cid + "/competition.json"
    
    competition = utils.read_file(competition_key)
    scoreboard = competition["scoreboard"]

    player_names = list(scoreboard.keys())

    # repopulate scoreboard
    scoreboard = {}

    for pname in player_names:
        pid = pname.replace(" ", "").lower()
        player_key = year + "/" + cid + "/" + pid + ".json"
        player = utils.read_file(player_key)

        points_game = points.calc_points_revival(player["picks"], results)
        points_round = []
        first_game = 0

        for gpr in trn.GAMES_PER_ROUND:
            points_round.append(sum(points_game[first_game:first_game + gpr]))
            first_game += gpr

        scoreboard[pname] = points_round

    competition["scoreboard"] = scoreboard

    utils.write_file(competition_key, competition)

    return f"Successfully updated scoreboard for year {year}, cid {cid}"


