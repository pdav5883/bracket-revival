import json

from common import utils

"""
Lambda admin_edit allows direct updates to .json files from
frontend POST request. There are multiple types of edits allowed
with etype argument in request body:
    - results (year): update the scores and winner for completed
    games
    - teams (year): update the teams populating the initial
    bracket
    - competition (year, cid): update competition flags, completed
    rounds (and maybe player names)

    data format:
    - etype=results: {"results": [0/1/None,....],
                      "scores": [[#/None, #/None],...]}
    - etype=teams: [[name, shortname],...] where order is same as
    bracket order in teams.json
    - etype=competition TODO
"""

def lambda_handler(event, context):
    """
    Accepts POST request
    """
    
    body = json.loads(event["body"])
    etype = body["etype"]
    year = body["year"]
    
    if etype == "results":
        new_results = body["data"]
        return update_results(year, new_results)
    
    elif etype == "teams":
        new_teams = body["data"]
        return update_teams(year, new_teams)

    elif etype == "competition":
        # TODO
        return None
    

def update_results(year, new_data):
    """
    Updates the {year}/results.json file
    """
    obj_key = year + "/results.json"
    old_data = utils.read_file(obj_key)

    # validation checks
    try:
        assert len(new_data["results"]) == len(old_data["results"]), "New results length must match Old results length"
        assert len(new_data["scores"]) == len(old_data["scores"]), "New scores length must match Old scores length"

    except AssertionError as e:
        print("Error, validation failed")
        print(e)
        
        return {"statusCode": 400,
                "body": str(e)}

    # can't just write new_results to file since there could be other fields
    write_data = old_data
    write_data["results"] = new_data["results"]
    write_data["scores"] = new_data["scores"]

    print(f"Changing {obj_key} FROM:")
    print(old_data)

    print(f"Changing {obj_key} TO:")
    print(write_data)

    # update results.json file
    utils.write_file(obj_key, write_data)

    return {"statusCode": 200,
            "body": "Successful update"}


def update_teams(year, new_teams):
    obj_key = year + "/teams.json"
    old_teams = utils.read_file(obj_key)

    # validation checks
    try:
        assert len(old_teams) == len(new_teams), "Number of teams must match"
    
    except AssertionError as e:
        print("Error, validation failed")
        print(e)
        
        return {"statusCode": 400,
                "body": str(e)}
    
    # preserve seed order from old_teams
    new_data = old_teams

    for i, (name, sname) in enumerate(new_teams):
        new_data[i]["name"] = name
        new_data[i]["short_name"] = sname

    utils.write_file(obj_key, new_data)

    return {"statusCode": 200,
            "body": "Successful update"}

