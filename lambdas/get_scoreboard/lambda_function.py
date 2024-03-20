##############
### Return scoreboard

import json
from copy import deepcopy

from common import tournament as trn
from common import utils


def lambda_handler(event, context):
    """
    GET request

    Input: year, cid, completed_rounds (opt)
    Output: {"names": [Full Names], "total_points": [...], "round_points": [[r0, r1, ...],...]}
    """
    year = event["queryStringParameters"].get("year")
    cid = event["queryStringParameters"].get("cid").replace(" ", "").lower()
    completed_rounds_query = event["queryStringParameters"].get("completed_rounds", None)

    # TODO handle bad/no inputs

    competition_key = year + "/" + cid + "/competition.json"
    
    competition = utils.read_file(competition_key)
    completed_rounds = competition["completed_rounds"]
    scoreboard = competition["scoreboard"]

    if completed_rounds_query is not None:
        completed_rounds = min(completed_rounds, int(completed_rounds_query))

    names = list(scoreboard.keys())
    round_points = list(scoreboard.values())
    pick_status = [competition["pick_status"][name] for name in names]

    # zero out points for rounds beyond completed
    round_points = [[p if rnd < completed_rounds else 0 for rnd, p in enumerate(rp)] for rp in round_points]
    total_points = [sum(rp) for rp in round_points]

    # round_render shows us what to put in each round. True is checkmark, False is waiting mark. Otherwise it's "-" if round hasn't been played/picked yet, or actual score for round
    # Known issue when completed_rounds_query is passed in, as pick_status is only valid for completed_rounds stored in competition. Since completed_rounds_query is not being used in primary gameflow, letting this one slide and cause problems far into the future
    round_render = deepcopy(round_points)
    for player_render, player_pick_status in zip(round_render, pick_status):
        for rnd in range(len(player_render)):
            if rnd == completed_rounds and player_pick_status is not None:
                player_render[rnd] = player_pick_status
            
            # need the geq here because player_pick_status = None means we're not making picks so it gets a "-"
            elif rnd >= completed_rounds:
                player_render[rnd] = "-"

    return {"names": names, "total_points": total_points, "round_points": round_points, "round_render": round_render}

