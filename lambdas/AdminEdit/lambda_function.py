import json
import boto3

from common import utils
from common import tournament as trn

user_pool_id = "us-east-1_7j2Ragbz6"
cognito = boto3.client('cognito-idp')

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
    - etype=competition: {"delete_competition":,
                          "email_all":,
                          "completed_rounds":,
                          "open_picks",
                          "open_players",
                          "email_individual", [name1, ...],
                          "autopick_individual", [name1, ...],
                          "players": {old_name: new_name,...}} if new_name is None,  delete the player
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
        cid = body["cid"]
        new_competition = body["data"]
        return update_competition(year, cid, new_competition)
    

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

    # sync scoreboard for all competitions in year
    index = utils.read_file("index.json")
    for cid in index[year]:
        utils.trigger_sync(year, cid.replace(" ", "").lower())

    return {"body": "Successful results update"}


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

    return {"body": "Successful teams update"}


def update_competition(year, cid, new_competition):
    competition_key = year + "/" + cid.replace(" ", "").lower() + "/competition.json"
    old_competition = utils.read_file(competition_key)

    delete_competition = new_competition.pop("delete_competition")

    if delete_competition:
        # remove all pid.json, competition.json, update index.json
        for playername in old_competition["scoreboard"]:
            player_key = year + "/" + cid.replace(" ", "").lower() + "/" + playername.replace(" ", "__").lower() + ".json"
            utils.delete_file(player_key)

        utils.delete_file(competition_key)
        utils.delete_directory(year + "/" + cid.replace(" ", ""))

        index = utils.read_file("index.json")
        index[year].pop(cid)
        utils.write_file("index.json", index)

        return

    # validation checks TODO

    # start from old competition
    new_data = dict(old_competition)

    new_data["completed_rounds"] = int(new_competition["completed_rounds"])
    new_data["open_picks"] = new_competition["open_picks"] in (True, "true", "True", 1, "1")
    new_data["open_players"] = new_competition["open_players"] in (True, "true", "True", 1, "1")

    # start updating index, do write after any updates from name edit loop below
    index = utils.read_file("index.json")
    index[year][new_data["name"]]["open_players"] = new_data["open_players"]
    index_player_list = index[year][new_data["name"]]["players"]

    # for player name edits, must update competition.json, index.json, {name}.json, and change filename
    for old_name, new_name in new_competition["players"].items():
        if new_name is None:
            print(f"Deleting player name {old_name} from competition")
            old_pid = old_name.replace(" ", "__").lower()
            old_player_key = year + "/" + cid.replace(" ", "").lower()  + "/" + old_pid + ".json"
            utils.delete_file(old_player_key)

            # update competition.json
            new_data["scoreboard"].pop(old_name)

            # update index.json
            index_player_list.remove(old_name)

        elif new_name != old_name:
            print(f"Replace player name {old_name} with {new_name}")
            old_pid = old_name.replace(" ", "__").lower()
            new_pid = new_name.replace(" ", "__").lower()

            old_player_key = year + "/" + cid.replace(" ", "").lower()  + "/" + old_pid + ".json"
            new_player_key = year + "/" + cid.replace(" ", "").lower()  + "/" + new_pid + ".json"

            # update {name}.json
            player = utils.read_file(old_player_key)
            player["pid"] = new_pid
            player["name"] = new_name
            utils.write_file(new_player_key, player)
            utils.delete_file(old_player_key)

            # update to competition.json
            score = new_data["scoreboard"].pop(old_name)
            new_data["scoreboard"][new_name] = score

            # update to index.json
            index_player_list.remove(old_name)
            index_player_list.append(new_name)

    print(f"Rewriting {cid} competition.json FROM:")
    print(old_competition)
    print(f"TO:")
    print(new_data)

    # update competition.json
    utils.write_file(competition_key, new_data)

    # update index.json
    utils.write_file("index.json", index)

    # check for auto-picks
    for pname in new_competition["autopick_individual"]:
        player_key = year + "/" + cid.replace(" ", "").lower()  + "/" + pname.replace(" ", "").lower() + ".json"
        player = utils.read_file(player_key)
        picks = player["picks"]

        if len(picks) <= new_data["completed_rounds"]:
            last_picks = picks[-1]
            games_last_round = trn.GAMES_PER_ROUND[len(picks) - 1]
            next_picks = last_picks[games_last_round:]
            picks.append(next_picks)
            utils.write_file(player_key, player)

            print(f"Submitted auto-picks for player {pname} in comp {cid} year {year}: {next_picks}")
        else:
            print("Cannot make auto-picks for player {pname} in comp {cid} year {year}. Player has made {len(picks)} picks through {new_data['completed_rounds'] rounds")

    # sync scoreboard
    utils.trigger_sync(year, cid)

    # emails
    if new_competition["email_all"]:
        # Get emails for all players from Cognito
        player_emails = []
        print(f"Sending emails to all players: {index_player_list}")
        
        for player_name in index_player_list:
            try:
                response = cognito.list_users(
                    UserPoolId=user_pool_id,
                    Filter=f'name = "{player_name.replace(" ", "__").lower()}"'
                )
                if response['Users']:
                    # Get email from user attributes
                    for attr in response['Users'][0]['Attributes']:
                        if attr['Name'] == 'email':
                            player_emails.append(attr['Value'])
                            break
            except Exception as e:
                print(f"Error getting email for player {player_name}: {str(e)}")
        
        utils.trigger_email({"typ": "newround",
                           "content": {"year": year,
                                     "compname": new_data["name"],
                                     "pick_round": new_data["completed_rounds"],
                                     "deadline": new_competition["deadline"]},
                           "recipient_names": index_player_list,
                           "recipient_emails": player_emails})
        
        print(f"Sent to addresses: {player_emails}")

    if len(new_competition["email_individual"]) > 0:
        player_emails = []
        print(f"Sending emails to individual players: {new_competition['email_individual']}")
        
        for player_name in new_competition["email_individual"]:
            try:
                response = cognito.list_users(
                    UserPoolId=user_pool_id,
                    Filter=f'name = "{player_name.replace(" ", "__").lower()}"'
                )
                if response['Users']:
                    # Get email from user attributes
                    for attr in response['Users'][0]['Attributes']:
                        if attr['Name'] == 'email':
                            player_emails.append(attr['Value'])
                            break
            except Exception as e:
                print(f"Error getting email for player {player_name}: {str(e)}")

        print(f"Sent to addresses: {player_emails}")

        utils.trigger_email({"typ": "reminder",
                             "content": {"year": year,
                                         "compname": new_data["name"],
                                         "pick_round": new_data["completed_rounds"],
                                         "deadline": new_competition["deadline"]},
                             "recipient_names": new_competition["email_individual"],
                             "recipient_emails": player_emails})

    return {"body": "Successful competition update"}
