import json

prefix = "../test_data/"

def lambda_handler(event, context):
    """
    GET request

    Input: year, cid, completed_rounds (so that frontend can show earlier games states)
    Output: [round 0 games [{teams: [], seeds: [], score: [], result:}]]
    """
    year = event["queryStringParameters"].get("year", None)
    cid = event["queryStringParameters"].get("cid", None)
    completed_rounds_query = event["queryStringParameters"].get("completed_rounds", None)

    # TODO: assert arguments exist

    results_key = prefix + year + "/results.json"
    teams_key = prefix + year + "/teams.json"
    competition_key = prefix + year + "/" + cid + "/competition.json"
 
    results_dict = read_file(results_key)
    results = results_dict.get("results")
    scores = results_dict.get("scores")

    teams = read_file(teams_key)
    names = [t["name"] for t in teams]
    seeds = [t["seed"] for t in teams]

    competition = read_file(competition_key)
    
    if completed_rounds_query is None:
        completed_rounds = competition.get("completed_rounds")
    else:
        completed_rounds = min(competition.get("completed_rounds"), int(completed_rounds_query))

    # set all results beyond played rounds to None
    if completed_rounds < NUMROUNDS:
        played_games = sum(GAMES_PER_ROUND[0:completed_rounds])
        for i in range(played_games, NUMGAMES):
            results[i] = None
            scores[i] = [None, None]

    games = []

    # create flat list of bracket
    for i in range(NUMGAMES):
        i_prev_upper, i_prev_lower = PREV_GAME[i]

        if i_prev_upper is None:
            name_upper = names[2 * i]
            name_lower = names[2 * i + 1]
            seed_upper = seeds[2 * i]
            seed_lower = seeds[2 * i + 1]

        else:
            game_upper = games[i_prev_upper]
            result_upper = game_upper["result"]

            if result_upper is None:
                name_upper = None
                seed_upper = None
            else:
                name_upper = game_upper["teams"][result_upper]
                seed_upper = game_upper["seeds"][result_upper]

            game_lower = games[i_prev_lower]
            result_lower = game_lower["result"]

            if result_lower is None:
                name_lower = None
                seed_lower = None
            else:
                name_lower = game_lower["teams"][result_lower]
                seed_lower = game_lower["seeds"][result_lower]

        game = {"teams": [name_upper, name_lower],
                "seeds": [seed_upper, seed_lower],
                "score": scores[i],
                "result": results[i]}

        games.append(game)

    # nest flat list into rounds
    games_nested = []

    for gpr in GAMES_PER_ROUND:
        games_round = []
        for _ in range(gpr):
            games_round.append(games.pop(0))
        games_nested.append(games_round)

    return games_nested


def read_file(key):
    with open(key, "r") as fptr:
        data = json.load(fptr)

    return data


def write_file(key, data):
    with open(key, "w") as fptr:
        json.dump(data, fptr)


PREV_GAME = ((None, None), (None, None), (None, None), (None, None),
             (0, 1), (2, 3),
             (4, 5))
GAMES_PER_ROUND = (4, 2, 1)
NUMROUNDS = len(GAMES_PER_ROUND)
NUMGAMES = sum(GAMES_PER_ROUND)

