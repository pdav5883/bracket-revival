##############
### Return list of games at start of round to fill in picks

import json

from utils.tournament import *

prefix = "../test_data/"

def lambda_handler(event, context):
    """
    GET request

    Input: year, cid, completed_rounds (opt)
    Output: {"names": [Full Names], "total_points": [...], "round_points": [[r0, r1, ...],...]}
    """
    year = event["queryStringParameters"].get("year")
    cid = event["queryStringParameters"].get("cid").replace(" ", "").lower()
    completed_rounds_query = event["queryStringParameters"].get("completed_rounds", None)

    competition_key = prefix + year + "/" + cid + "/competition.json"
    
    competition = read_file(competition_key)
    completed_rounds = competition["completed_rounds"]
    scoreboard = competition["scoreboard"]

    if completed_rounds_query is not None:
        completed_rounds = min(completed_rounds, int(completed_rounds_query))

    names = list(scoreboard.keys())
    round_points = list(scoreboard.values())

    # zero out points for rounds beyond completed
    round_points = [[p if rnd < completed_rounds else 0 for rnd, p in enumerate(rp)] for rp in round_points]

    total_points = [sum(rp) for rp in round_points]

    return {"names": names, "total_points": total_points, "round_points": round_points}

      
def read_file(key):
    with open(key, "r") as fptr:
        data = json.load(fptr)

    return data

