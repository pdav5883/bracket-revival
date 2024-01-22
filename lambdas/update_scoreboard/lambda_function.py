import json

from utils.tournament import *
from utils import points
from utils import basic


def lambda_handler(event, context):
    """
    POST request (GET for testing)
    """
    #body = json.loads(event["body"])
    #year = body.get("year")
    #cid = body.get("cid").replace(" ", "").lower()

    # for testing only
    year = event["queryStringParameters"].get("year")
    cid = event["queryStringParameters"].get("cid")

    # TODO: assert arguments exist

    results_key = year + "/results.json"
    results_dict = basic.read_file(results_key)
    results = results_dict["results"]

    competition_key = year + "/" + cid + "/competition.json"
    
    competition = basic.read_file(competition_key)
    scoreboard = competition["scoreboard"]

    player_names = list(scoreboard.keys())

    # repopulate scoreboard
    scoreboard = {}

    for pname in player_names:
        pid = pname.replace(" ", "").lower()
        player_key = year + "/" + cid + "/" + pid + ".json"
        player = basic.read_file(player_key)

        points_game = points.calc_points_revival(player["picks"], results)
        points_round = []
        first_game = 0

        for gpr in GAMES_PER_ROUND:
            points_round.append(sum(points_game[first_game:first_game + gpr]))
            first_game += gpr

        scoreboard[pname] = points_round

    competition["scoreboard"] = scoreboard

    basic.write_file(competition_key, competition)

    return f"Successfully updated scoreboard for year {year}, cid {cid}"


