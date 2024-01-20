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
    rnd = int(body.get("round"))
    new_picks = body.get("picks", None)

    # TODO: assert arguments exist
    # TODO: check that pid exists

    # check that there are right number of picks for round
    games_remaining = NUMGAMES - sum(GAMES_PER_ROUND[0:rnd])
    
    if games_remaining != len(new_picks):
        return {"statusCode": 400,
                "body": "Submitted picks are incorrect length"}

    player_key = prefix + year + "/" + cid + "/" + pid + ".json"
    player = read_file(player_key)

    # check that pid picks are ready for these new ones
    if len(player["picks"]) != rnd:
        return {"statusCode": 400,
                "body": "Player cannot accept picks for this round"}

    player["picks"].append(new_picks)
    
    write_file(player_key, player)

    return "Successfully added new picks"


def read_file(key):
    with open(key, "r") as fptr:
        data = json.load(fptr)

    return data


def write_file(key, data):
    with open(key, "w") as fptr:
        json.dump(data, fptr)

