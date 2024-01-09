import json

from utils.tournament import *

prefix = "../test_data/"

def lambda_handler(event, context):
    """
    GET request

    Input: year, cid, pid (opt), completed_rounds (opt)
    Output: nested list of games
            [[{"teams": [a,b], "seeds": [a,b], "score": [a,b], "result": 0/1, "picks": [[a,a,a], [b,b,b]], "points": [0/1/2, 0/1/2]}, (r0g1), ...],
             [(r1g0), (r1g1), ...],
             ...]

    "picks" and "points" are null is pid is missing

    "picks" respresents who we picked to be *playing* in the game, not who we picked to win the game.
    """
    year = event["queryStringParameters"].get("year", None)
    cid = event["queryStringParameters"].get("cid", None)
    pid = event["queryStringParameters"].get("pid", None)
    completed_rounds_query = event["queryStringParameters"].get("completed_rounds", None)

    # TODO: assert arguments exist

    results_key = prefix + year + "/results.json"
    teams_key = prefix + year + "/teams.json"
    competition_key = prefix + year + "/" + cid + "/competition.json"

    results_dict = read_file(results_key)
    results = results_dict["results"]
    scores = results_dict["scores"]

    teams = read_file(teams_key)
    names = [t["name"] for t in teams]
    seeds = [t["seed"] for t in teams]

    competition = read_file(competition_key)

    if pid is None:
        player = None
    else:
        player_key = prefix + year + "/" + cid + "/" + pid + ".json"
        player = read_file(player_key)


    # don't show a player results past completed_rounds or beyond the picks they've made
    completed_rounds = competition["completed_rounds"]

    if completed_rounds_query is not None:
        completed_rounds = min(completed_rounds, int(completed_rounds_query))

    if player is not None:
        completed_rounds = min(completed_rounds, len(player["picks"]))

    # set all results beyond played rounds to None and hide picks beyond round
    if completed_rounds < NUMROUNDS:
        played_games = sum(GAMES_PER_ROUND[0:completed_rounds])
        for i in range(played_games, NUMGAMES):
            results[i] = None
            scores[i] = [None, None]

        if player is not None:
            player["picks"] = player["picks"][0:completed_rounds]

    games = []
    
    abs_inds = make_absolute_bracket(results)

    for i, (i_upper, i_lower) in enumerate(abs_inds):
        game = {"teams": [names[i_upper] if i_upper is not None else None, names[i_lower] if i_lower is not None else None],
                "seeds": [seeds[i_upper] if i_lower is not None else None, seeds[i_lower] if i_lower is not None else None],
                "score": scores[i],
                "result": results[i]}
        games.append(game)

    # nest flat list into rounds
    games_nested = []

    for gpr in GAMES_PER_ROUND:
        games_round = []
        for _ in range(gpr):
            games_round.append(games.pop(0))
        games_nested.append(games_round)

    return games_nested


def make_absolute_bracket(results, picks=None):
    """
    Converts flat list of 0/1 results and/or picks into flat list of upper/lower absolute indices into teams

    - results must start from round0 and continue through round i (or be empty)
    - if present picks must start at round i+1 (or zero if results empty) and continue through final round.

    Returns list of absolute upper/lower indices for each game, with None for unplayed

    Returns None if something goes wrong (TODO: do something else here)
    """
    # rel_inds is 0/1 result/pick from previous game
    if picks is not None:
        rel_inds = results + picks
    else:
        rel_inds = results

    if len(rel_inds) != NUMGAMES:
        return None

    abs_inds = []

    # create flat list of bracket indices
    for i in range(NUMGAMES):
        i_prev_upper, i_prev_lower = PREV_GAME[i]

        if i_prev_upper is None:
            i_upper = 2 * i
            i_lower = 2 * i + 1

        else:
            abs_upper = abs_inds[i_prev_upper]
            rel_upper = rel_inds[i_prev_upper]

            if rel_upper is None:
                i_upper = None
            else:
                i_upper = abs_upper[rel_upper]

            abs_lower = abs_inds[i_prev_lower]
            rel_lower = rel_inds[i_prev_lower]

            if rel_lower is None:
                i_lower = None
            else:
                i_lower = abs_lower[rel_lower]

        abs_inds.append((i_upper, i_lower))

    return abs_inds


def read_file(key):
    with open(key, "r") as fptr:
        data = json.load(fptr)

    return data


def write_file(key, data):
    with open(key, "w") as fptr:
        json.dump(data, fptr)

