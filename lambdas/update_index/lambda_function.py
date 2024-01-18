import json

from utils.tournament import *
from utils import points

prefix = "../test_data/"

def lambda_handler(event, context):
    """
    POST request
    """
    #body = json.loads(event["body"])
    #year = body.get("year")
    #cid = body.get("cid").replace(" ", "").lower()

    # for testing only
    year = event["queryStringParameters"].get("year")
    cid = event["queryStringParameters"].get("cid")

    # TODO: assert arguments exist

    results_key = prefix + year + "/results.json"
    results_dict = read_file(results_key)
    results = results_dict["results"]

    competition_key = prefix + year + "/" + cid + "/competition.json"
    
    competition = read_file(competition_key)
    scoreboard = competition["scoreboard"]

    player_names = list(scoreboard.keys())

    # repopulate scoreboard
    scoreboard = {}

    for pname in player_names:
        pid = pname.replace(" ", "").lower()
        player_key = prefix + year + "/" + cid + "/" + pid + ".json"
        player = read_file(player_key)

        points_game = points.calc_points_revival(player["picks"], results)
        points_round = []
        first_game = 0

        for gpr in GAMES_PER_ROUND:
            points_round.append(sum(points_game[first_game:first_game + gpr]))
            first_game += gpr

        scoreboard[pname] = points_round

    competition["scoreboard"] = scoreboard

    write_file(competition_key, competition)

    return f"Successfully updated scoreboard for year {year}, cid {cid}"


def read_file(key):
    with open(key, "r") as fptr:
        data = json.load(fptr)

    return data


def write_file(key, data):
    with open(key, "w") as fptr:
        json.dump(data, fptr)

