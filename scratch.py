import sys

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
