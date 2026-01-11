import requests
from datetime import datetime
import json

ESPN_URL = "http://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams?limit=1000"

resp = requests.get(ESPN_URL)
team_entries = resp.json()["sports"][0]["leagues"][0]["teams"]

teams = [{"id": te["team"]["id"],
          "team": te["team"]["shortDisplayName"],
          "mascot": te["team"]["name"],
          "abbreviation": te["team"]["abbreviation"]} for te in team_entries]

fname = f"all_teams_{datetime.now().strftime("%Y%m%d")}.json"

print(f"Writing {len(teams)} teams to {fname}")

with open(fname, "w") as fptr:
    json.dump(teams, fptr)