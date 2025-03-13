##############
### Return structure with valid years and cids 

import json 
import os
import random
import string

from common import utils
from common import tournament as trn

def lambda_handler(event, context):
    """
    PUT request with all input in query params

    The /add endpoint that calls this lambda uses the UserAuth authorizer. year and competition adds
    require admin user. player requires signed in user

    Input: - type: year/competition/player
           - year
           - compname (for competition, player)
           - access_token (contained in header))
    Output: None
    """
    # both GET and PUT requests alllowed, but all data is stored in query params
    typ = event["queryStringParameters"].get("type")
    year = event["queryStringParameters"].get("year", None)
    cname = event["queryStringParameters"].get("compname", None)
    
    access_token = event['headers'].get('authorization', '')

    if typ == "year":
        # admin has already been verified
        return add_year(year)
    elif typ == "competition":
        # admin has already been verified
        return add_competition(year, cname)
    elif typ == "player":
        # need access token to grab name for signed in user
        return add_player(year, cname, access_token)
    else:
        return {"statusCode": 400,
                "body": f"Invalid element type {typ}"}
 

def add_year(year):
    """
    Adds year folder, results.json, teams.json
    """
    if year is None:
        return {"statusCode": 400,
                "body": "Request requires year parameter"}
        
    results_key = year + "/results.json"
    teams_key = year + "/teams.json"

    if utils.key_exists(results_key):
        return {"statusCode": 400,
                "body": f"Year {year} already exists"}

    results = {"results": [None] * trn.NUMGAMES,
               "scores": [[None, None]] * trn.NUMGAMES}

    team_blank = {"name": "Full ", "short_name": "Short ", "seed": 0}
    seed_order = [1, 16, 8, 9, 5, 12, 4, 13, 6, 11, 3, 14, 7, 10, 2, 15] * 4

    teams = []

    for seed in seed_order:
        team = dict(team_blank)
        team["name"] += str(seed)
        team["short_name"] += str(seed)
        team["seed"] = seed
        teams.append(team)

    utils.write_file(results_key, results)
    utils.write_file(teams_key, teams)

    # update index file
    index = utils.read_file("index.json")
    index[str(year)] = {}
    utils.write_file("index.json", index)

    return {"body": f"Successfully created new year {year}"}


def add_competition(year, compname):
    """
    Adds cid folder, competition.json. Year must already exist
    """
    if year is None:
        return {"statusCode": 400,
                "body": "Request requires year parameter"}
    if compname is None:
        return {"statusCode": 400,
                "body": "Request requires compname parameter"}
        
    cid = compname.replace(" ", "").lower()

    results_key = year + "/results.json"
    competition_key = year + "/" + cid + "/competition.json"

    if not utils.key_exists(results_key):
        return {"statusCode": 400,
                "body": f"Year {year} does not yet exist"}

    if utils.key_exists(competition_key):
        return {"statusCode": 400,
                "body": f"Competition cid {cid} already exists"}

    competition = {"cid": cid,
                   "name": compname,
                   "scoreboard": {},
                   "pick_status": {},
                   "completed_rounds": 0,
                   "open_picks": False,
                   "open_players": False,
                   "first_deadline": "Thursday, March 21st at Noon (EST)"}

    utils.write_file(competition_key, competition)

    # update index file
    index = utils.read_file("index.json")
    index[year][compname] = {"players": [], "open_players": False}
    utils.write_file("index.json", index)

    return {"body": f"Successfully created new competition {compname} in year {year}"}


def add_player(year, compname, access_token):
    """
    Adds pid.json. Competition must already exist.
    """
    if year is None:
        return {"statusCode": 400,
                "body": "Request requires year parameter"}
    if compname is None:
        return {"statusCode": 400,
                "body": "Request requires compname parameter"}
    if access_token is None:
        return {"statusCode": 400,
                "body": "Request requires access_token"}
    
    cid = compname.replace(" ", "").lower()
    competition_key = year + "/" + cid + "/competition.json"
    competition = utils.read_file(competition_key)

    if competition is None:
        return {"statusCode": 400,
                "body": f"Competition {compname} in year {year} does not exist"}

    if not competition["open_players"]:
        return {"statusCode": 400,
                "body": f"Competiton {compname} is not accepting new players"}
    
    pfirst, plast, pid, pemail = utils.get_user_attribute(access_token, ["given_name", "family_name", "name", "email"])
    
    player_key = year + "/" + cid + "/" + pid + ".json"
    playername = pfirst + " " + plast

    if utils.key_exists(player_key):
        return {"statusCode": 400,
                "body": f"{playername} already exists in this competition"}

    player = {"pid": pid,
              "name": playername,
              "picks": []}

    utils.write_file(player_key, player)

    # update competition file
    competition["scoreboard"][playername] = []
    utils.write_file(competition_key, competition)

    # update index.json. Grab the actual full competition name from competition.json since we
    #  want to be robust to the compname input being the cid
    index = utils.read_file("index.json")
    index[year][competition["name"]]["players"].append(playername)
    utils.write_file("index.json", index)

    # sync scoreboard
    utils.trigger_sync(year, cid)

    # send welcome email
    email = {"typ": "welcome", "content": {"year": year, "compname": compname, "deadline": competition["first_deadline"]}, "recipient_names": [pfirst], "recipient_emails": [pemail]}
    utils.trigger_email(email)

    return {"body": f"Successfully created new player {playername} in competition {compname} in year {year}"}



