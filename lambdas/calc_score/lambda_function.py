import json

from utils.tournament import *

prefix = "../test_data/"

def lambda_handler(event, context):
    """
    Accept year, gid, cid and return score array
    """
    year = event["queryStringParameters"].get("year", None)
    cid = event["queryStringParameters"].get("cid", None)
    pid = event["queryStringParameters"].get("pid", None)

    # TODO: assert arguments exist

    results_key = prefix + year + "/results.json"
    competition_key = prefix + year + "/" + cid + "/competition.json"
    player_key = prefix + year + "/" + cid + "/" + pid + ".json"

    results = read_file(results_key).get("results")
    completed_rounds = read_file(competition_key).get("completed_rounds")
    picks = read_file(player_key).get("picks")

    # set all results beyond played rounds to None
    if completed_rounds < NUMROUNDS:
        played_games = sum(GAMES_PER_ROUND[0:completed_rounds])
        for i in range(played_games, NUMGAMES):
            results[i] = None

    # TODO: what to do if picks for all round not there?

    points = calc_points_revival(picks, results)
    
    return {"points": points}


def calc_points_revival(picks, results, K=2):
    """
    Picks are nested, full picks for first round and on, full picks second round and on
    """
    points = NUMGAMES * [0]

    num_prev_games = 0
    
    for rnd, picks_round in enumerate(picks):

        # only look at picks for current round
        for i in range(GAMES_PER_ROUND[rnd]):
            i_abs = i + num_prev_games # index into flat lists
            
            # must pick winner right, and have picked child game right
            if (picks_round[i] == results[i_abs]):
                points[i_abs] = 1

                rnd_back = rnd - 1

                while rnd_back >= 0:
                    num_prev_games_back = sum(GAMES_PER_ROUND[0:rnd_back])
                    
                    # check that current pick is same
                    if picks[rnd_back][i_abs - num_prev_games_back] != results[i_abs]:
                        break

                    # check that children are all correct
                    # j is here to ensure we go back the correct number of steps based on round
                    child_game = PREV_GAME[i_abs][results[i_abs]]
                    j = 0

                    while (child_game is not None) and (j < rnd - rnd_back):
                        if picks[rnd_back][child_game - num_prev_games_back] != results[child_game]:
                            break

                        child_game = PREV_GAME[child_game][results[child_game]]
                        j += 1

                    if (child_game is not None) and (j < rnd - rnd_back):
                        break

                    # if we've made it to None child, then we picked i_abs game correctly in previous round
                    points[i_abs] *= K

                    rnd_back -= 1

        num_prev_games += GAMES_PER_ROUND[rnd]

    return points


def read_file(key):
    with open(key) as fptr:
        data = json.load(fptr)

    return data

