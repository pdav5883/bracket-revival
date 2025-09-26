import json
import math

from bracket_common import tournament as trn
from bracket_common import points
from blr_common import blr_utils
from bracket_common import bracket_utils

bucket = SUB_PrivateBucketName

def lambda_handler(event, context):
    """
    GET request

    Input: year, cid (opt), pid (opt),  rounds (opt)
    Output: nested list of games
            [[{"teams": [a,b], "seeds": [a,b], "score": [a,b], "result": 0/1, "picks": [[a,b,0/1], ], "points": None/0/1/2/..., "correct": None/#}, (r0g1), ...],
             [(r1g0), (r1g1), ...],
             ...]

    "picks" and "points" are null is pid is missing

    "picks" tuple is picked contestants for game and 0/1 winner
    """
    year = event["queryStringParameters"].get("year")
    cid = event["queryStringParameters"].get("cid", "").replace(" ", "").lower()
    pid = event["queryStringParameters"].get("pid", "").replace(" ", "__").lower()
    completed_rounds_query = event["queryStringParameters"].get("rounds", None)

    # TODO: assert arguments exist

    results_key = year + "/results.json"
    teams_key = year + "/teams.json"

    results_dict = blr_utils.read_file_s3(bucket, results_key)
    results = results_dict["results"]
    scores = results_dict["scores"]

    teams = blr_utils.read_file_s3(bucket,teams_key)
    names = [t["name"] for t in teams]
    shorts = [t["short_name"] for t in teams]
    seeds = [t["seed"] for t in teams]

    if cid == "":
        completed_rounds = trn.NUMROUNDS
    else:
        competition_key = year + "/" + cid + "/competition.json"
        competition = blr_utils.read_file_s3(bucket, competition_key)
        completed_rounds = competition["completed_rounds"]

    if pid == "":
        player = None
        player_picks = []
    else:
        player_key = year + "/" + cid + "/" + pid + ".json"
        print(player_key)
        player = blr_utils.read_file_s3(bucket, player_key)
        player_picks = player["picks"]


    # don't show a player results past completed_rounds or beyond the picks they've made
    if completed_rounds_query is not None:
        completed_rounds = min(completed_rounds, int(completed_rounds_query))

    if player is not None:
        completed_rounds = min(completed_rounds, len(player_picks))

    # set all results beyond played rounds to None and hide picks beyond round
    if completed_rounds < trn.NUMROUNDS:
        played_games = sum(trn.GAMES_PER_ROUND[0:completed_rounds])
        print(f"Completed round {completed_rounds}")
        print(f"Results {results}")
        print(f"Played games {played_games}")
        for i in range(played_games, trn.NUMGAMES):
            results[i] = None
            scores[i] = [None, None]

        if player is not None:
            # +1 because we'll show picks that take into account everything that happened through completed_rounds, but also need to check that these picks have been made
            if len(player_picks) > completed_rounds:
                player_picks = player_picks[0:completed_rounds+1]

    # points calc returns all zeros if picks is empty
    player_points = points.calc_points_revival(player_picks, results)
    
    games = []
    
    # write results and points into games flat list first
    abs_inds = make_absolute_bracket(results)

    for i, (i_upper, i_lower) in enumerate(abs_inds):
        game = {"teams": [names[i_upper] if i_upper is not None else None, names[i_lower] if i_lower is not None else None],
                "shorts": [shorts[i_upper] if i_upper is not None else None, shorts[i_lower] if i_lower is not None else None],
                "seeds": [seeds[i_upper] if i_upper is not None else None, seeds[i_lower] if i_lower is not None else None],
                "score": scores[i],
                "result": results[i],
                "picks": []}

        if player is None:
            game["points"] = None
            game["correct"] = None
        else:
            game["points"] = player_points[i]
            game["correct"] = 0 if player_points[i] == 0 else 1 + int(math.log2(player_points[i])) 

        games.append(game)

    # write each round of picks into games flat list
    for rnd, picks_rnd in enumerate(player_picks):
        # results leading up to this round of picks
        prev_games = sum(trn.GAMES_PER_ROUND[0:rnd])
        results_pre = results[0:prev_games]

        abs_inds = make_absolute_bracket(results_pre, picks_rnd)

        first_pick = sum(trn.GAMES_PER_ROUND[0:rnd])

        for i in range(first_pick, trn.NUMGAMES):
            i_upper, i_lower = abs_inds[i]
            games[i]["picks"].append([names[i_upper], names[i_lower], picks_rnd[i - first_pick]])

    # nest flat list into rounds
    games_nested = []

    for gpr in trn.GAMES_PER_ROUND:
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

    Returns list of absolute upper/lower indices for each game, None if there is no result/pick for game

    Returns None if something goes wrong (TODO: do something else here)
    """
    # rel_inds is 0/1 result/pick from previous game
    if picks is not None:
        rel_inds = results + picks
    else:
        rel_inds = results

    if len(rel_inds) != trn.NUMGAMES:
        return None

    abs_inds = []

    # create flat list of bracket indices
    for i in range(trn.NUMGAMES):
        i_prev_upper, i_prev_lower = trn.PREV_GAME[i]

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


