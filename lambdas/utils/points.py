from utils.tournament import *


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

