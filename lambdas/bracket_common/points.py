from bracket_common import tournament as trn


def calc_points_underdog_revival(picks, results):
    """
    Return points_base, points_multiplier
    """

def calc_best_seed(results):
    """
    For each game, calculate the best possible seed that could be playing in the game
    based on the rnd that picks were made.
    results = [0, 1, ..., None, None] 
    Outputs: [[1, 8, 5, 4, 6, 3, 7, 2,...,1, 1, 1, 1, 1, 1, 1]
    ] 
    """
    # round_start_best_seeds = [min(matchup) for matchup in list(trn.SEEDS)]
    round_start_seeds = list(trn.SEEDS)
    best_seeds = []

    for pick_rnd in range(trn.NUMROUNDS):
        # best_seeds_pick_rnd = list(round_start_best_seeds)
        best_seeds_pick_rnd = [min(matchup) for matchup in round_start_seeds]
        num_prev_games = sum(trn.GAMES_PER_ROUND[:pick_rnd])
        num_this_games = trn.GAMES_PER_ROUND[pick_rnd]

        # loop through all remaining games in PREV_GAMES and grab the max of those previous games in best_seeds_pick_rnd
        start = num_prev_games + num_this_games
        stop = trn.NUMGAMES
        for i_abs in range(start, stop):
            prev0, prev1 = trn.PREV_GAME[i_abs]
            prev0_seed = best_seeds_pick_rnd[prev0 - num_prev_games]
            prev1_seed = best_seeds_pick_rnd[prev1 - num_prev_games]
            best_seeds_pick_rnd.append(min(prev0_seed, prev1_seed))

        best_seeds.append(best_seeds_pick_rnd)

        next_round_start_seeds = list()
        num_next_games = trn.GAMES_PER_ROUND[pick_rnd + 1] if num_this_games > 1 else 0
        start = num_prev_games + num_this_games
        stop = num_prev_games + num_this_games + num_next_games
        for i_abs in range(start, stop):
            prev0, prev1 = trn.PREV_GAME[i_abs]
            res0, res1 = results[prev0], results[prev1]

            # if there is an unfinished game in this round, then not possible to make this round of picks
            if res0 is None or res1 is None:
                return best_seeds
            
            winner0 = round_start_seeds[prev0 - num_prev_games][res0]
            winner1 = round_start_seeds[prev1 - num_prev_games][res1]
            next_round_start_seeds.append((winner0, winner1))

        round_start_seeds = list(next_round_start_seeds)

    return best_seeds


def calc_points_revival(picks, results, K=2):
    """
    Picks are nested, full picks for first round and on, full picks second round and on
    """
    points = trn.NUMGAMES * [0]

    num_prev_games = 0
    
    for rnd, picks_round in enumerate(picks):

        # only look at picks for current round
        for i in range(trn.GAMES_PER_ROUND[rnd]):
            i_abs = i + num_prev_games # index into flat lists
            
            # must pick winner right, and have picked child game right
            if (picks_round[i] == results[i_abs]):
                points[i_abs] = 1

                rnd_back = rnd - 1

                while rnd_back >= 0:
                    num_prev_games_back = sum(trn.GAMES_PER_ROUND[0:rnd_back])
                    
                    # check that current pick is same
                    if picks[rnd_back][i_abs - num_prev_games_back] != results[i_abs]:
                        break

                    # check that children are all correct
                    # j is here to ensure we go back the correct number of steps based on round
                    child_game = trn.PREV_GAME[i_abs][results[i_abs]]
                    j = 0

                    while (child_game is not None) and (j < rnd - rnd_back):
                        if picks[rnd_back][child_game - num_prev_games_back] != results[child_game]:
                            break

                        child_game = trn.PREV_GAME[child_game][results[child_game]]
                        j += 1

                    if (child_game is not None) and (j < rnd - rnd_back):
                        break

                    # if we've made it to None child, then we picked i_abs game correctly in previous round
                    points[i_abs] *= K

                    rnd_back -= 1

        num_prev_games += trn.GAMES_PER_ROUND[rnd]

    return points
