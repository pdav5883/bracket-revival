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

ROUND64 = (0, 31)
ROUND32 = (32, 47)
ROUND16 = (48, 55)
ROUND8 = (56, 59)
ROUND4 = (60, 61)
ROUND2 = (62, 62)
NUMGAMES = 63

def calc_score(picks, results):
    """
    Picks and tuples are both list of 0/1/None

    picks is always len 63
    """
    # first compare to get matching res/pick (necessary condition for point)
    correct = [pick == result if result is not None else None for pick, result in zip(picks, results)]

    # adjust correct if the previous pick was correct
    for i in range(NUMGAMES):
        child_game = GAME_MAP[i][0][result[i]]
        child_correct = (child_game is None) or (correct[child_game])
        correct[i] = correct[i] and child_correct


def make_game_map():
    m = tuple((get_prev(i), get_next(i)) for i in range(63))
    return m

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
    i = int(sys.argv[1])

    print("Previous games:", get_prev(i))
    print("Next game:", get_next(i))
