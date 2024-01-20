##############
### Return list of games at start of round to fill in picks

import json

from utils.tournament import *

prefix = "../test_data/"

def lambda_handler(event, context):
    """
    GET request

    Input: year, cid, pid OR round_start
    All games before round_start must have completed
    Output: [round 0 games [{teams: [], seeds: [], score: [], result:}]]
    """
    year = event["queryStringParameters"].get("year")
    cid = event["queryStringParameters"].get("cid").replace(" ", "").lower()
    pid = event["queryStringParameters"].get("pid", None)
    round_start = event["queryStringParameters"].get("round_start", None)

    if pid is not None:
        pid = pid.replace(" ", "").lower()
        round_start = get_player_next_round(year, cid, pid)
    elif round_start is not None:
        round_start = int(round_start)
    else:
        # TODO: return an error here
        return {"statusCode": 400,
                "body": "Either pid or round_start must be present in query"}

    # TODO: assert arguments exist

    results_key = prefix + year + "/results.json"
    teams_key = prefix + year + "/teams.json"
    competition_key = prefix + year + "/" + cid + "/competition.json"
 
    results_dict = read_file(results_key)
    results = results_dict.get("results")

    teams = read_file(teams_key)
    
    competition = read_file(competition_key)
    completed_rounds = competition.get("completed_rounds")

    if round_start > completed_rounds:
        return {"statusCode": 400,
                "body": f"Start round {round_start} is greater than completed rounds {completed_rounds}"}

    if round_start >= NUMROUNDS:
        return {"statusCode": 400,
                "body": f"Start round {round_start} is great than number of rounds"}

    games = []

    # for each game in round_start search back through tournament tree to first round to find teams
    first_game = sum(GAMES_PER_ROUND[0:round_start])

    for i in range(first_game, first_game + GAMES_PER_ROUND[round_start]):
        i_upper, i_lower = i, i
        i_prev_upper, i_prev_lower = PREV_GAME[i]

        while i_prev_upper is not None:
            i_upper = i_prev_upper
            i_prev_upper = PREV_GAME[i_upper][results[i_upper]]

        while i_prev_lower is not None:
            i_lower = i_prev_lower
            i_prev_lower = PREV_GAME[i_lower][results[i_lower]]

        # happens if round_start = 0
        if i_upper == i_lower:
            t0 = teams[2 * i]
            t1 = teams[2 * i + 1]
        else:
            t0 = teams[2 * i_upper + results[i_upper]]
            t1 = teams[2 * i_lower + results[i_lower]]

        games.append({"teams": [t0["name"], t1["name"]], "seeds": [t0["seed"], t1["seed"]]})
    
    return games


def get_player_next_round(year, cid, pid):
    player_key = prefix + year + "/" + cid + "/" + pid + ".json"
    player = read_file(player_key)
    return len(player["picks"])
  

def read_file(key):
    with open(key, "r") as fptr:
        data = json.load(fptr)

    return data


def write_file(key, data):
    with open(key, "w") as fptr:
        json.dump(data, fptr)

