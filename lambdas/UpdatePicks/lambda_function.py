import json

from common import tournament as trn
from common import utils


def lambda_handler(event, context):
    """
    POST request
    """
    body = json.loads(event["body"])
    year = body.get("year")
    cid = body.get("cid").replace(" ", "").lower()
    pid = body.get("pid").replace(" ", "").lower()
    secret = body.get("secret", None)
    new_picks = body.get("picks", [])

    print("Event Body:", body)

    # TODO: assert arguments exist
    # TODO: check that pid exists

    player_key = year + "/" + cid + "/" + pid + ".json"
    player = utils.read_file(player_key)
    
    # check that there are right number of picks for round, infer round
    #  from number of times that player has picked
    rnd = len(player["picks"])
    games_remaining = trn.NUMGAMES - sum(trn.GAMES_PER_ROUND[0:rnd])
    
    if games_remaining != len(new_picks):
        err_msg = f"Submitted picks are incorrect length. Expected length: {games_remaining}. Submitted length: {len(new_picks)}"
        print(err_msg)
        return {"statusCode": 400,
                "body": err_msg}

    # check that this submission is allowed
    competition_key = year + "/" + cid + "/competition.json"
    competition = utils.read_file(competition_key)

    if not competition["open_picks"]:
        err_msg = f"Picks for {cid} are currently locked"
        print(err_msg)
        return {"statusCode": 400,
                "body": err_msg}

    if competition["require_secret"] and secret != player["secret"]:
        err_msg = f"Pick submission secret is incorrect. Make sure to use your email link for picks."
        print(err_msg)
        return {"statusCode": 400,
                "body": err_msg}

    if rnd > competition["completed_rounds"]:
        err_msg = f"{cid} is not accepting picks for Round {rnd}. Try again later."
        print(err_msg)
        return {"statusCode": 400,
                "body": err_msg}

    player["picks"].append(new_picks)
    
    utils.write_file(player_key, player)

    # sync scoreboard
    utils.trigger_sync(year, cid)
    
    msg = f"Successfully added new picks for round {rnd} to player {pid} in {cid}"
    print(msg)
    return {"body": msg}

