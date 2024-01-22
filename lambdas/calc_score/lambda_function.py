import json

from common import tournament as trn
from common import points
from common import utils


def lambda_handler(event, context):
    """
    Accept year, gid, cid and return score array
    """
    year = event["queryStringParameters"].get("year", None)
    cid = event["queryStringParameters"].get("cid", None)
    pid = event["queryStringParameters"].get("pid", None)

    # TODO: assert arguments exist

    results_key = year + "/results.json"
    competition_key = year + "/" + cid + "/competition.json"
    player_key = year + "/" + cid + "/" + pid + ".json"

    results = utils.read_file(results_key).get("results")
    completed_rounds = utils.read_file(competition_key).get("completed_rounds")
    picks = utils.read_file(player_key).get("picks")

    # set all results beyond played rounds to None
    if completed_rounds < trn.NUMROUNDS:
        played_games = sum(trn.GAMES_PER_ROUND[0:completed_rounds])
        for i in range(played_games, trn.NUMGAMES):
            results[i] = None

    # TODO: what to do if picks for all round not there?

    pnts = points.calc_points_revival(picks, results)
    
    return {"points": pnts}


