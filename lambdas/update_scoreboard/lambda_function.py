import json

from utils.tournament import *
from utils import points

prefix = "../test_data/"

def lambda_handler(event, context):
    """
    POST request
    """
    year = body.get("year")
    cid = body.get("cid").replace(" ", "").lower()

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
        player_key = prefix + year + "/" + cid + "/"
        player = read_file(competition_key)

        scoreboard[pname] = points.calc_points_revival(player["picks"], results)

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

