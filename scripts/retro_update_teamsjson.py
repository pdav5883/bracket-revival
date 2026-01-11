import json
import difflib
import argparse
import os

def retro_update():
    # Set up argument parser
    parser = argparse.ArgumentParser(description="Update teams JSON with ESPN data.")
    parser.add_argument("espn_file", type=str, help="Path to the ESPN teams JSON file")
    parser.add_argument("blr_file", type=str, help="Path to the BLR teams JSON file")
    args = parser.parse_args()

    # Load the JSON files
    with open(args.espn_file, "r") as fptr:
        espn_teams = json.load(fptr)

    with open(args.blr_file, "r") as fptr:
        blr_teams = json.load(fptr)

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
        
    for cn, bteam in zip(corrected_names, blr_teams):
        if cn is None:
            print(f"Need to find {bteam['name']}")
            bteam["mascot"] = "XX"
            bteam["espn_id"] = "XX"
            continue
        espn_team = espn_teams[espn_names.index(cn)]
        bteam["name"] = espn_team["team"]
        bteam["short_name"] = espn_team["abbreviation"]
        bteam["mascot"] = espn_team["mascot"]
        bteam["espn_id"] = espn_team["id"]

        base, ext = os.path.splitext(args.blr_file)
        with open(f"{base}_updated{ext}", "w") as fptr:
            json.dump(blr_teams, fptr)


if __name__ == "__main__":
    retro_update()
