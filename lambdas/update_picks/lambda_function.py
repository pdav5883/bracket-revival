import json

from utils.tournament import *

prefix = "../test_data/"

def lambda_handler(event, context):
    """
    POST request
    """
    body = json.loads(event["body"])
    year = body.get("year")
    cid = body.get("cid").replace(" ", "").lower()
    pid = body.get("pid").replace(" ", "").lower()
    new_picks = body.get("picks", None)

    # TODO: assert arguments exist
    # TODO: check that pid exists

    player_key = prefix + year + "/" + cid + "/" + pid + ".json"
    player = read_file(player_key)
    
    # check that there are right number of picks for round, infer round
    #  from number of times that player has picked
    rnd = len(player["picks"])
    games_remaining = NUMGAMES - sum(GAMES_PER_ROUND[0:rnd])
    
    if games_remaining != len(new_picks):
        return {"statusCode": 400,
                "body": f"Submitted picks are incorrect length. Expected length: {games_remaining}. Submitted length: {len(new_picks)}"}

    # check that this submission is allowed
    competition_key = prefix + year + "/" + cid + "/competition.json"
    competition = read_file(competition_key)

    if not competition["open_picks"]:
        return {"statusCode": 400,
                "body": f"Picks for game {cid} are currently locked"}

    if rnd > competition["completed_rounds"]:
        return {"statusCode": 400,
                "body": f"Game {cid} completed rounds is {competition['completed_rounds']}, which is less than submission round {rnd}"}

    player["picks"].append(new_picks)
    
    write_file(player_key, player)

    return f"Successfully added new picks for round {rnd} to player {pid} in game {cid}"


def read_file(key):
    with open(key, "r") as fptr:
        data = json.load(fptr)

    return data


def write_file(key, data):
    with open(key, "w") as fptr:
        json.dump(data, fptr)

