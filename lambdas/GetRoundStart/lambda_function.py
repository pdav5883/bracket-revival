##############
### Return list of games at start of round to fill in picks

import json

from common import tournament as trn
from common import utils


def lambda_handler(event, context):
    """
    GET request

    Input: year, cid, pid OR round_start
    All games before round_start must have completed
    Output: {"start_games": [round 0 games [{teams: [], seeds: [], score: [], result:}]],
             "bonus_games": [[round ind, game ind, team name, num correct],...]}
    """
    year = event["queryStringParameters"].get("year")
    cid = event["queryStringParameters"].get("cid").replace(" ", "").lower()
    pid = event["queryStringParameters"].get("pid", None)
    round_start = event["queryStringParameters"].get("round_start", None)

    if pid is not None:
        pid = pid.replace(" ", "").lower()
        player_key = year + "/" + cid + "/" + pid + ".json"
        player = utils.read_file(player_key)
        picks = player["picks"]
        round_start = len(picks)
    elif round_start is not None:
        round_start = int(round_start)
        picks = []
    else:
        # TODO: return an error here
        return {"statusCode": 400,
                "body": "Either pid or round_start must be present in query"}

    # TODO: assert arguments exist

    results_key = year + "/results.json"
    teams_key = year + "/teams.json"
    competition_key = year + "/" + cid + "/competition.json"
 
    results_dict = utils.read_file(results_key)
    results = results_dict.get("results")

    teams = utils.read_file(teams_key)
    
    competition = utils.read_file(competition_key)
    completed_rounds = competition.get("completed_rounds")

    if not competition["open_picks"]:
        return {"statusCode": 400,
                "body": f"Picks for {cid} are currently locked"}

    if round_start > completed_rounds:
        return {"statusCode": 400,
                "body": f"There are no picks to make right now - check back later."}

    if round_start >= trn.NUMROUNDS:
        return {"statusCode": 400,
                "body": f"All picks have been made for this bracket"}

    start_games_ind = get_start_games_abs_ind(results, round_start)
    start_games = [{"teams":[teams[t0]["name"], teams[t1]["name"]], "seeds": [teams[t0]["seed"], teams[t1]["seed"]]} for t0, t1 in start_games_ind]

    bonus_games = get_bonus_games(results, picks, round_start, teams)

    return {"start_games": start_games,
            "bonus_games": bonus_games}


def get_start_games_abs_ind(results, round_start):
    start_games_ind = []

    # for each game in round_start search back through tournament tree to first round to find teams
    first_game = sum(trn.GAMES_PER_ROUND[0:round_start])

    for i in range(first_game, first_game + trn.GAMES_PER_ROUND[round_start]):
        i_upper, i_lower = i, i
        i_prev_upper, i_prev_lower = trn.PREV_GAME[i]

        while i_prev_upper is not None:
            i_upper = i_prev_upper
            i_prev_upper = trn.PREV_GAME[i_upper][results[i_upper]]

        while i_prev_lower is not None:
            i_lower = i_prev_lower
            i_prev_lower = trn.PREV_GAME[i_lower][results[i_lower]]

        # happens if round_start = 0
        if i_upper == i_lower:
            t0 = 2 * i
            t1 = 2 * i + 1
        else:
            t0 = 2 * i_upper + results[i_upper]
            t1 = 2 * i_lower + results[i_lower]

        start_games_ind.append((t0, t1))

    return start_games_ind


def get_bonus_games(results, picks, round_start, teams):
    # if no picks made, no bonus games
    if picks is None or len(picks) == 0:
        return []

    # convert picks to absolute index of teams that each pick represents
    abs_picks = []

    for rnd, picks_rnd in enumerate(picks):
        prev_games = sum(trn.GAMES_PER_ROUND[0:rnd])
        abs_bracket_inds = make_absolute_bracket(results[0:prev_games], picks_rnd) # contains upper/lower for each game

        # fill abs_picks with None for completed games, two steps reqd bc earlier picks will include "picked" games already completed
        abs_picks_rnd = prev_games * [None] + [upper_lower_abs[pick] for upper_lower_abs, pick in zip(abs_bracket_inds[prev_games:], picks_rnd)]
        
        # num completed games
        for i in range(sum(trn.GAMES_PER_ROUND[0:round_start])):
            abs_picks_rnd[i] = None

        abs_picks.append(abs_picks_rnd)
        
    # compare picks for each game, starting with most recent round of picks, then generate [rnd ind, game ind, team name, num picked]
    bonus_games = []
    for flat_ind in range(trn.NUMGAMES):
        latest_pick = abs_picks[-1][flat_ind]

        # means game is already played, so we don't care about bonus
        if latest_pick is None:
            continue

        num_picks = 1

        # for loop works backward from second to last (second most recent) set of picks
        for abs_picks_rnd in abs_picks[-2::-1]:
            # if we find a pick that's different from more recent picks, no more bonus growth
            if abs_picks_rnd[flat_ind] != latest_pick:
                break
            else:
                num_picks += 1
        
        rnd_ind, game_ind = flat_ind_to_nested_ind(flat_ind)

        # minus round_start because frontend wants round index relative to round_start
        bonus_games.append([rnd_ind - round_start, game_ind, teams[latest_pick]["name"], num_picks])

    return bonus_games


def flat_ind_to_nested_ind(flat_ind):
    """
    Returns round ind, game-within-round ind
    """
    rnd = 0
    for i in range(1, trn.NUMROUNDS):
        if flat_ind < sum(trn.GAMES_PER_ROUND[:i]):
            break
        else:
            rnd += 1

    game_in_rnd = flat_ind - sum(trn.GAMES_PER_ROUND[:rnd])

    return rnd, game_in_rnd



# TODO: move this to utils (copied from get_bracket)  
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


