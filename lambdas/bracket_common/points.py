from bracket_common import tournament as trn
import math

def calc_points_underdog_revival(picks, results):
    """
    Return points_base, points_multiplier
    """
    points_multiplier = calc_points_revival(picks, results)
    points_base = trn.NUMGAMES * [0]

    # the seed of the winner for each game
    winner_seed = []
    for i_abs, res in enumerate(results):
        if res is None:
            winner_seed.append(None)
        elif trn.PREV_GAME[i_abs][res] is None:
            winner_seed.append(trn.SEEDS[i_abs][res])
        else:
            winner_seed.append(winner_seed[trn.PREV_GAME[i_abs][res]])

    best_matchup_all = calc_best_matchup(results)

    rnd = 0

    for i_abs, multiplier in enumerate(points_multiplier):
        # did not pick game correctly
        if multiplier == 0:
            continue

        if i_abs == sum(trn.GAMES_PER_ROUND[:rnd+1]):
            rnd += 1

        back_rnd = int(math.log2(multiplier))
        i_rel = i_abs - sum(trn.GAMES_PER_ROUND[:rnd-back_rnd])
        best_seed = best_matchup_all[rnd - back_rnd][i_rel][1 - results[i_abs]]
        points_base[i_abs] = calc_base_underdog_revival(winner_seed[i_abs], best_seed)

    return points_base, points_multiplier


def calc_base_underdog_revival(seed_winner, seed_loser):
    upset = int(seed_winner) - int(seed_loser)
    
    if upset <= 2:
        return 1
    elif upset <= 5:
        return 2
    elif upset <= 8:
        return 3
    elif upset <= 11:
        return 4
    else:
        return 5


def calc_best_matchup(results):
    """
    For each game, calculate the best possible seeds that could be playing in the game
    based on the rnd that picks were made.

    Calculating the best matchup is necessary because the best seed that a team can play in a 
    given game depends on whether that team is the upper or lower team. For example, the best
    team a 16 seed can play in the second round is an 8 (since 16 would beat 1 in 1st rnd). However
    in that same second round game, that 8 seed could be playing a 1 seed. In order to calculate
    the base points in future rounds, the upper and lower best seeds must be tracked.

    results = [0, 1, ..., None, None]
    Outputs: [[1, 8, 5, 4, 6, 3, 7, 2,...,1, 1, 1, 1, 1, 1, 1] (32),...
    ]
    """
    # round_start_best_seeds = [min(matchup) for matchup in list(trn.SEEDS)]
    round_start_matchups = list(trn.SEEDS)
    best_matchups = []

    for pick_rnd in range(trn.NUMROUNDS):
        # best_seeds_pick_rnd = list(round_start_best_seeds)
        best_matchups_rnd = list(round_start_matchups)
        num_prev_games = sum(trn.GAMES_PER_ROUND[:pick_rnd])
        num_this_games = trn.GAMES_PER_ROUND[pick_rnd]

        # loop through all remaining games in PREV_GAMES and grab the max of those previous games in best_seeds_pick_rnd
        start = num_prev_games + num_this_games
        stop = trn.NUMGAMES
        for i_abs in range(start, stop):
            prev0, prev1 = trn.PREV_GAME[i_abs]
            prev0_matchup = best_matchups_rnd[prev0 - num_prev_games]
            prev1_matchup = best_matchups_rnd[prev1 - num_prev_games]
            best_matchups_rnd.append((min(prev0_matchup), min(prev1_matchup)))

        best_matchups.append(best_matchups_rnd)

        next_round_start_matchups = list()
        num_next_games = trn.GAMES_PER_ROUND[pick_rnd + 1] if num_this_games > 1 else 0
        start = num_prev_games + num_this_games
        stop = num_prev_games + num_this_games + num_next_games
        for i_abs in range(start, stop):
            prev0, prev1 = trn.PREV_GAME[i_abs]
            res0, res1 = results[prev0], results[prev1]

            # if there is an unfinished game in this round, then not possible to make this round of picks
            if res0 is None or res1 is None:
                return best_matchups

            winner0 = round_start_matchups[prev0 - num_prev_games][res0]
            winner1 = round_start_matchups[prev1 - num_prev_games][res1]
            next_round_start_matchups.append((winner0, winner1))

        round_start_matchups = list(next_round_start_matchups)
    return best_matchups


def calc_points_revival(picks, results):
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
                    points[i_abs] *= 2

                    rnd_back -= 1

        num_prev_games += trn.GAMES_PER_ROUND[rnd]

    return points
