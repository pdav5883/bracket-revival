##############
### Return structure with valid years and cids 

import json 
import os

prefix = "../test_data/"

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
        
    results_key = prefix + year + "/results.json"
    teams_key = prefix + year + "/teams.json"

    if key_exists(results_key):
        return {"statusCode": 400,
                "body": f"Year {year} already exists"}

    results = {"results": [],
               "scores": []}

    team_blank = {"name": "Full ", "short_name": "Short ", "seed": 0}
    seed_order = [1, 16, 8, 9, 5, 12, 4, 13, 6, 11, 3, 14, 7, 10, 2, 15] * 4

    teams = []

    for seed in seed_order:
        team = dict(team_blank)
        team["name"] += str(seed)
        team["short_name"] += str(seed)
        team["seed"] = seed
        teams.append(team)

    write_file(results_key, results)
    write_file(teams_key, teams)

    # update index file
    index = read_file(prefix + "index.json")
    index[str(year)] = {}
    write_file(prefix + "index.json", index)

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

    results_key = prefix + year + "/results.json"
    competition_key = prefix + year + "/" + cid + "/competition.json"

    if not key_exists(results_key):
        return {"statusCode": 400,
                "body": f"Year {year} does not yet exist"}

    if key_exists(competition_key):
        return {"statusCode": 400,
                "body": f"Competition cid {cid} already exists"}

    competition = {"cid": cid,
                   "name": compname,
                   "scoreboard": {},
                   "completed_rounds": 0,
                   "open_picks": True}

    write_file(competition_key, competition)

    # update index file
    index = read_file(prefix + "index.json")
    index[year][compname] = []
    write_file(prefix + "index.json", index)

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

    competition_key = prefix + year + "/" + cid + "/competition.json"
    player_key = prefix + year + "/" + cid + "/" + pid + ".json"

    if not key_exists(competition_key):
        return {"statusCode": 400,
                "body": f"Competition {cid} does not yet exist"}

    if key_exists(player_key):
        return {"statusCode": 400,
                "body": f"Player pid {pid} already exists"}

    player = {"pid": pid,
              "name": playername,
              "picks": []}

    write_file(player_key, player)

    # update index file
    index = read_file(prefix + "index.json")
    index[year][compname].append(playername)
    write_file(prefix + "index.json", index)

    return f"Successfully created new player {playername} in competition {compname} in year {year}"


def key_exists(key):
    """
    Boolean whether a file exists at key
    """
    return os.path.isfile(key)


def read_file(key):
    with open(key, "r") as fptr:
        data = json.load(fptr)

    return data


def write_file(key, data):
    os.makedirs(os.path.dirname(key), exist_ok=True)

    with open(key, "w") as fptr:
        json.dump(data, fptr)

