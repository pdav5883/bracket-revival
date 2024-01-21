import json

from utils.tournament import *
from utils import points
from utils import basic


def lambda_handler(event, context):
    """
    Accept year, gid, cid and return score array
    """
    year = event["queryStringParameters"].get("year", None)
    cid = event["queryStringParameters"].get("cid", None)
    pid = event["queryStringParameters"].get("pid", None)

    # TODO: assert arguments exist

    results_key = basic.prefix + year + "/results.json"
    competition_key = basic.prefix + year + "/" + cid + "/competition.json"
    player_key = basic.prefix + year + "/" + cid + "/" + pid + ".json"

    results = basic.read_file(results_key).get("results")
    completed_rounds = basic.read_file(competition_key).get("completed_rounds")
    picks = basic.read_file(player_key).get("picks")

    # set all results beyond played rounds to None
    if completed_rounds < NUMROUNDS:
        played_games = sum(GAMES_PER_ROUND[0:completed_rounds])
        for i in range(played_games, NUMGAMES):
            results[i] = None

    # TODO: what to do if picks for all round not there?

    pnts = points.calc_points_revival(picks, results)
    
    return {"points": pnts}


