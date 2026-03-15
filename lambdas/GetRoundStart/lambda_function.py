##############
### Return list of games at start of round to fill in picks

import json

from bracket_common import tournament as trn
from bracket_common import bracket_utils
from blr_common import blr_utils

bucket = SUB_PrivateBucketName


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
        pid = pid.replace(" ", "__").lower()
        player_key = year + "/" + cid + "/" + pid + ".json"
        player = blr_utils.read_file_s3(bucket, player_key)
        picks = player["picks"]
        round_start = len(picks)
    elif round_start is not None:
        round_start = int(round_start)
        picks = []
    else:
        # TODO: return an error here.
        return {
            "statusCode": 400,
            "body": "Either pid or round_start must be present in query",
        }

    # TODO: assert arguments exist

    results_key = year + "/results.json"
    teams_key = year + "/teams.json"
    competition_key = year + "/" + cid + "/competition.json"

    results_dict = blr_utils.read_file_s3(bucket, results_key)
    results = results_dict.get("results")
    statuses = results_dict.get("statuses", ["NOT_STARTED"] * len(results))

    teams = blr_utils.read_file_s3(bucket, teams_key)

    completed_rounds = results_dict["completed_rounds"]


    competition = blr_utils.read_file_s3(bucket, competition_key)

    if not competition["open_picks"]:
        return {
            "statusCode": 400,
            "body": f"Picks for {competition['name']} {year} are currently locked",
        }

    if round_start > completed_rounds:
        return {
            "statusCode": 400,
            "body": f"There are no picks to make right now - check back later.",
        }

    if round_start >= trn.NUMROUNDS:
        return {"statusCode": 400, "body": f"All picks have been made for this bracket"}
    print(f"round_start: {round_start}")
    print(f"results: {results}")

    start_games_ind = bracket_utils.get_start_games_abs_ind(results, round_start)
    start_games = [
        {
            "teams": [teams[t0]["name"], teams[t1]["name"]],
            "seeds": [teams[t0]["seed"], teams[t1]["seed"]],
            "espn_ids": [teams[t0]["espn_id"], teams[t1]["espn_id"]],
        }
        for t0, t1 in start_games_ind
    ]

    bonus_games = get_bonus_games(results, picks, round_start, teams)

    # Compute constraints when use_game_status is enabled and we have player context
    use_game_status = competition.get("use_game_status", False)
    constraints = None
    if use_game_status and pid is not None:
        constraints = bracket_utils.get_pick_constraints(
            results, statuses, picks, round_start, start_games_ind
        )

    response = {"start_games": start_games, "bonus_games": bonus_games}
    if constraints is not None:
        response["constraints"] = constraints
    return response


def get_bonus_games(results, picks, round_start, teams):
    # if no picks made, no bonus games
    if picks is None or len(picks) == 0:
        return []

    # convert picks to absolute index of teams that each pick represents
    abs_picks = []

    for rnd, picks_rnd in enumerate(picks):
        prev_games = sum(trn.GAMES_PER_ROUND[0:rnd])
        picks_padded = list(picks_rnd) + [None] * (
            trn.NUMGAMES - prev_games - len(picks_rnd)
        )
        abs_bracket_inds = bracket_utils.make_absolute_bracket(
            results[0:prev_games], picks_padded
        )  # contains upper/lower for each game

        # fill abs_picks with None for completed games, two steps reqd bc earlier picks will include "picked" games already completed
        abs_picks_rnd = prev_games * [None] + [
            upper_lower_abs[pick]
            for upper_lower_abs, pick in zip(abs_bracket_inds[prev_games:], picks_rnd)
        ]

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
        bonus_games.append(
            [rnd_ind - round_start, game_ind, teams[latest_pick]["name"], num_picks]
        )

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


