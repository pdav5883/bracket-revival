import json

from utils.tournament import *
from utils import points

prefix = "../test_data/"

def lambda_handler(event, context):
    """
    Accept year, gid, cid and return score array
    """
    year = event["queryStringParameters"].get("year", None)
    cid = event["queryStringParameters"].get("cid", None)
    pid = event["queryStringParameters"].get("pid", None)

    # TODO: assert arguments exist

    results_key = prefix + year + "/results.json"
    competition_key = prefix + year + "/" + cid + "/competition.json"
    player_key = prefix + year + "/" + cid + "/" + pid + ".json"

    results = read_file(results_key).get("results")
    completed_rounds = read_file(competition_key).get("completed_rounds")
    picks = read_file(player_key).get("picks")

    # set all results beyond played rounds to None
    if completed_rounds < NUMROUNDS:
        played_games = sum(GAMES_PER_ROUND[0:completed_rounds])
        for i in range(played_games, NUMGAMES):
            results[i] = None

    # TODO: what to do if picks for all round not there?

    pnts = points.calc_points_revival(picks, results)
    
    return {"points": pnts}


def read_file(key):
    with open(key) as fptr:
        data = json.load(fptr)

    return data

