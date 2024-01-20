import json

from utils.tournament import *
from utils import points

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
    year = event["queryStringParameters"].get("year")
    cid = event["queryStringParameters"].get("cid").replace(" ", "").lower()
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

    if pid is None or pid == "":
        player = None
        player_picks = []
    else:
        pid = pid.replace(" ", "").lower()
        player_key = prefix + year + "/" + cid + "/" + pid + ".json"
        player = read_file(player_key)
        player_picks = player["picks"]


    # don't show a player results past completed_rounds or beyond the picks they've made
    completed_rounds = competition["completed_rounds"]

    if completed_rounds_query is not None:
        completed_rounds = min(completed_rounds, int(completed_rounds_query))

    if player is not None:
        completed_rounds = min(completed_rounds, len(player_picks))

    # set all results beyond played rounds to None and hide picks beyond round
    if completed_rounds < NUMROUNDS:
        played_games = sum(GAMES_PER_ROUND[0:completed_rounds])
        for i in range(played_games, NUMGAMES):
            results[i] = None
            scores[i] = [None, None]

        if player is not None:
            player_picks = player_picks[0:completed_rounds]

    # points calc returns all zeros if picks is empty
    player_points = points.calc_points_revival(player_picks, results)
    
    games = []
    
    # write results and points into games flat list first
    abs_inds = make_absolute_bracket(results)

    for i, (i_upper, i_lower) in enumerate(abs_inds):
        game = {"teams": [names[i_upper] if i_upper is not None else None, names[i_lower] if i_lower is not None else None],
                "seeds": [seeds[i_upper] if i_lower is not None else None, seeds[i_lower] if i_lower is not None else None],
                "score": scores[i],
                "result": results[i],
                "picks": [[], []]}

        # player_points contains how many points you get for game i, but games list contains the points won
        #  for picking the participants of game i.
        prev_upper, prev_lower = PREV_GAME[i]
        points_upper = player_points[prev_upper] if prev_upper is not None else 0
        points_lower = player_points[prev_lower] if prev_lower is not None else 0
        game["points"] = [points_upper, points_lower]

        games.append(game)

    # games does not include bracket champion
    champion_abs_ind = abs_inds[-1][results[-1]] if results[-1] is not None else None
    champion = {"team": names[champion_abs_ind] if champion_abs_ind is not None else None,
                "seed": seeds[champion_abs_ind] if champion_abs_ind is not None else None,
                "picks": [],
                "points": player_points[-1]}

    # write each round of picks into games flat list
    for rnd, picks_rnd in enumerate(player_picks):
        # results leading up to this round of picks
        results_pre = results[0:sum(GAMES_PER_ROUND[0:rnd])]

        abs_inds = make_absolute_bracket(results_pre, picks_rnd)

        first_pick = sum(GAMES_PER_ROUND[0:rnd+1])

        for i in range(first_pick, NUMGAMES):
            i_upper, i_lower = abs_inds[i]
            games[i]["picks"][0].append(names[i_upper])
            games[i]["picks"][1].append(names[i_lower])

        # bracket winner is not in games
        champion_abs_ind = abs_inds[-1][picks_rnd[-1]]
        champion["picks"].append(names[champion_abs_ind])

    # nest flat list into rounds
    games_nested = []

    for gpr in GAMES_PER_ROUND:
        games_round = []
        for _ in range(gpr):
            games_round.append(games.pop(0))
        games_nested.append(games_round)

    return {"games": games_nested,
            "champion": champion}


def make_absolute_bracket(results, picks=None):
    """
    Converts flat list of 0/1 results and/or picks into flat list of upper/lower absolute indices into teams

    - results must start from round0 and continue through round i (or be empty)
    - if present picks must start at round i+1 (or zero if results empty) and continue through final round.

    Returns list of absolute upper/lower indices for each game, None if there is no result/pick for game

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

