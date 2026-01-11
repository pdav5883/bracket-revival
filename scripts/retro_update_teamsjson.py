import json
import difflib

with open("all_teams.json", "r") as fptr:
    espn_teams = json.load(fptr)

with open("teams_2025.json", "r") as fptr:
    blr_teams = json.load(fptr)

# blr_teams = [{"name": "Auburn", "short_name": "Short 1", "seed": 1},...
# all_teams = [{"id": "2", "team": "Auburn", "mascot": "Tigers", "abbreviation": "AUB"},...


espn_names = [t["team"] for t in espn_teams]
corrected_names = []

for bteam in blr_teams:
    bname = bteam["name"]
    matches = difflib.get_close_matches(bname, espn_names)
    print(f"{bname} ===> {matches}")
    x = input(":")
    if x == "":
        corrected_names.append(matches[0])
    elif x == "x":
        corrected_names.append(None)
    else:
        corrected_names.append(matches[int(x)])
    
    # if len(corrected_names) > 5:
    #     break

for cn, bteam in zip(corrected_names, blr_teams[:len(corrected_names)]):
    if cn is None:
        print(f"Need to find {bteam['name']}")
        continue
    espn_team = espn_teams[espn_names.index(cn)]
    bteam["name"] = espn_team["team"]
    bteam["short_name"] = espn_team["abbreviation"]
    bteam["mascot"] = espn_team["mascot"]
    bteam["espn_id"] = espn_team["id"]

with open("teams_2025_updated.json", "w") as fptr:
    json.dump(blr_teams, fptr)