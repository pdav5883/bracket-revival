##############
### Return structure with valid years and cids 

import json 
import os

from common import utils
from common import tournament as trn

def lambda_handler(event, context):
    """
    PUT request

    Input: - type: year/competition/player
           - year
           - compname (for competition, player)
           - playername (for player)
    Output: None
    """
    #body = json.loads(event["body"])
    #typ = body.get("type")
    #year = body.get("year", None)
    #cname = body.get("compname", None)
    #pname = body.get("playername", None)

    # for testing only
    typ = event["queryStringParameters"].get("type")
    year = event["queryStringParameters"].get("year", None)
    cname = event["queryStringParameters"].get("compname", None)
    pname = event["queryStringParameters"].get("playername", None)

    if typ == "year":
        return add_year(year)
    elif typ == "competition":
        return add_competition(year, cname)
    elif typ == "player":
        return add_player(year, cname, pname)
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

    return f"Successfully created new year {year}"


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
                   "completed_rounds": 0,
                   "open_picks": True}

    utils.write_file(competition_key, competition)

    # update index file
    index = utils.read_file("index.json")
    index[year][compname] = []
    utils.write_file("index.json", index)

    return f"Successfully created new competition {compname} in year {year}"


def add_player(year, compname, playername):
    """
    Adds pid.json. Competition must already exist
    """
    if year is None:
        return {"statusCode": 400,
                "body": "Request requires year parameter"}
    if compname is None:
        return {"statusCode": 400,
                "body": "Request requires compname parameter"}
    if playername is None:
        return {"statusCode": 400,
                "body": "Request requires playername parameter"}
        
    cid = compname.replace(" ", "").lower()
    pid = playername.replace(" ", "").lower()

    competition_key = year + "/" + cid + "/competition.json"
    player_key = year + "/" + cid + "/" + pid + ".json"

    if not utils.key_exists(competition_key):
        return {"statusCode": 400,
                "body": f"Competition {cid} does not yet exist"}

    if utils.key_exists(player_key):
        return {"statusCode": 400,
                "body": f"Player pid {pid} already exists"}

    player = {"pid": pid,
              "name": playername,
              "picks": []}

    utils.write_file(player_key, player)

    # update competition file
    competition = utils.read_file(competition_key)
    competition["scoreboard"][playername] = []
    utils.write_file(competition_key, competition)

    # update index.json. Grab the actual full competition name from competition.json since we
    #  want to be robust to the compname input being the cid
    index = utils.read_file("index.json")
    index[year][competition["name"]].append(playername)
    
    utils.write_file("index.json", index)

    return f"Successfully created new player {playername} in competition {compname} in year {year}"



