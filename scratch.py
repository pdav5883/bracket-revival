import sys

GAME_MAP = (((None, None), 32), ((None, None), 32), ((None, None), 33), ((None, None), 33),
            ((None, None), 34), ((None, None), 34), ((None, None), 35), ((None, None), 35),
            ((None, None), 36), ((None, None), 36), ((None, None), 37), ((None, None), 37),
            ((None, None), 38), ((None, None), 38), ((None, None), 39), ((None, None), 39),
            ((None, None), 40), ((None, None), 40), ((None, None), 41), ((None, None), 41),
            ((None, None), 42), ((None, None), 42), ((None, None), 43), ((None, None), 43),
            ((None, None), 44), ((None, None), 44), ((None, None), 45), ((None, None), 45),
            ((None, None), 46), ((None, None), 46), ((None, None), 47), ((None, None), 47), 
            
            ((0, 1), 48), ((2, 3), 48), ((4, 5), 49), ((6, 7), 49),
            ((8, 9), 50), ((10, 11), 50), ((12, 13), 51), ((14, 15), 51),
            ((16, 17), 52), ((18, 19), 52), ((20, 21), 53), ((22, 23), 53),
            ((24, 25), 54), ((26, 27), 54), ((28, 29), 55), ((30, 31), 55),
            
            ((32, 33), 56), ((34, 35), 56), ((36, 37), 57), ((38, 39), 57),
            ((40, 41), 58), ((42, 43), 58), ((44, 45), 59), ((46, 47), 59),
            
            ((48, 49), 60), ((50, 51), 60), ((52, 53), 61), ((54, 55), 61),
            
            ((56, 57), 62), ((58, 59), 62),
            
            ((60, 61), None))

PREV_GAME = ((None, None), (None, None), (None, None), (None, None), # round64
             (None, None), (None, None), (None, None), (None, None),
             (None, None), (None, None), (None, None), (None, None),
             (None, None), (None, None), (None, None), (None, None),
             (None, None), (None, None), (None, None), (None, None),
             (None, None), (None, None), (None, None), (None, None),
             (None, None), (None, None), (None, None), (None, None),
             (None, None), (None, None), (None, None), (None, None),
             (0, 1), (2, 3), (4, 5), (6, 7), # round32
             (8, 9), (10, 11), (12, 13), (14, 15),
             (16, 17), (18, 19), (20, 21), (22, 23),
             (24, 25), (26, 27), (28, 29), (30, 31),
             (32, 33), (34, 35), (36, 37), (38, 39), # round16
             (40, 41), (42, 43), (44, 45), (46, 47),
             (48, 49), (50, 51), (52, 53), (54, 55), # round8
             (56, 57), (58, 59), # round4
             (60, 61)) # round2

PREV_GAME = ((None, None), (None, None), (None, None), (None, None),
             (0, 1), (2, 3),
             (4, 5))


NEXT_GAME = (32, 32, 33, 33, 34, 34, 35, 35, # round64
             36, 36, 37, 37, 38, 38, 39, 39,
             40, 40, 41, 41, 42, 42, 43, 43,
             44, 44, 45, 45, 46, 46, 47, 47,
             48, 48, 49, 49, 50, 50, 51, 51, # round32
             52, 52, 53, 53, 54, 54, 55, 55,
             56, 56, 57, 57, 58, 58, 59, 59, # round16
             60, 60, 61, 61, # round 8
             62, 62, # round4
             None) # round2

NEXT_GAME = (4, 4, 5, 5, 6, 6, None)

#ROUND64 = (0, 31)
#ROUND32 = (32, 47)
#ROUND16 = (48, 55)
#ROUND8 = (56, 59)
#ROUND4 = (60, 61)
#ROUND2 = (62, 62)

GAMES_PER_ROUND = (32, 16, 8, 4, 2, 1)
GAMES_PER_ROUND = (4, 2, 1)

NUMGAMES = sum(GAMES_PER_ROUND)


def calc_points_basic_flat(picks, results):
    """
    Picks and results are both flat lists of 0/1/None

    Results must be same length as picks with None for unplayed, because games within
    round are not played in index order

    Each game worth 1 point
    """
    points = NUMGAMES * [0]

    # to get a game right, you must pick the winner right, and have picked the game the winner came from right 
    for i in range(NUMGAMES):
        child_game = PREV_GAME[i][results[i]]
        if (picks[i] == results[i])  and ((child_game is None) or points[child_game]):
            points[i] = 1

    return points


def calc_points_basic_nested(picks, results):
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
            child_game = PREV_GAME[i_abs][results[i_abs]]
            
            if (picks_round[i] == results[i_abs]) and ((child_game is None) or (points[child_game])):
                points[i_abs] = 1

        num_prev_games += GAMES_PER_ROUND[rnd]

    return points


def calc_points_revival(picks, results, K=2):
    """
    Picks are nested, results include only games played
    picks[0] picks the whole bracket
    picks[1] picks
    """
    """
    Picks are nested, full picks for first round and on, full picks second round and on
    """
    points = NUMGAMES * [0]

    num_prev_games = 0
    
    for rnd, picks_round in enumerate(picks):

        #breakpoint()

        # only look at picks for current round
        for i in range(GAMES_PER_ROUND[rnd]):
            #breakpoint()
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





def get_next(i):
    """
    Return index of game that winner of this game goes to
    """
    # round of 2
    if i == 62:
        return None
    
    # round of 4
    elif i >= 60:
        return 62

    # round of 8:
    elif i >= 56:
        return (i - 56) // 2 + 60

    # round of 16
    elif i >= 48:
        return (i - 48) // 2 + 56

    # round of 32
    elif i >= 32:
        return (i - 32) // 2 + 48

    # round of 64
    elif i >= 0:
        return i // 2 + 32

    else:
        raise ValueError(f"Input {i} must be between 0 and 62 to be a valid game index")


def get_prev(i):
    """
    Return indices of two games that participants of this game came from
    """
    # round of 64
    if i <= 31:
        return None, None

    # round of 32
    if i <= 47:
        a = (i - 32) * 2 + 0
        return a, a + 1

    # round of 16
    if i <= 55:
        a = (i - 48) * 2 + 32
        return a, a + 1

    # round of 8
    if i <= 59:
        a = (i - 56) * 2 + 48
        return a, a + 1

    if i <= 61:
        a = (i - 60) * 2 + 56
        return a, a + 1

    elif i == 62:
        return 60, 61

    else:
        raise ValueError(f"Input {i} must be between 0 and 62 to be a valid game index")
        


if __name__ == "__main__":
    res = [0, 1, 1, 0, 0, 1, 1]
    picks = [[0,1,1,0,0,1,1],[0,1,1],[1]]
    points = calc_points_revival(picks, res)
    print(points)
