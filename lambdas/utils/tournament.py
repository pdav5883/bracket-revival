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

GAMES_PER_ROUND = (32, 16, 8, 4, 2, 1)
NUMROUNDS = len(GAMES_PER_ROUND)
NUMGAMES = sum(GAMES_PER_ROUND)
