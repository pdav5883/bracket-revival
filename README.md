# bracket-revival
A March Madness bracket picking game where you get to re-pick your bracket after every round. 

## TODO
### New Features
- Test page to play mini version to understand scoring
- Add logos to bracket
- Underdog bonus points
- Automatic score updating

### Improvements
- Add admin auth to add endpoint for year and game, access from admin.html
- Button on picks page to see previous bracket
- Next round buttons anchored to top of screen
- Restricted endpoint to grab emails and pick links for players
- Show completed rounds on scoreboard
- Show pick round, bracket round on pages

### Bugs
- Confirm welcome email from join game works
- Confirm batch emailing from admin works
- Confirm admin edit works

## Maybe TODO
- Error handling for bad params
- webpack into production
- Refactor js into shared utils
- Late picks are allowed, but if game has started that is autopicked
- Change logo retrieval to BLR assets

## Underdog Bonus

## Logos
- Get all the teams: http://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams?limit=1000
- Logos are referenced: https://a.espncdn.com/i/teamlogos/ncaa/500/153.png
- Smaller logo uses a different API: https://a1.espncdn.com/combiner/i?img=/i/teamlogos/ncaa/500/153.png&w=80&h=80&scale=crop&cquality=40
- ESPN API repo: https://github.com/pseudo-r/Public-ESPN-API

## New Game Flow
  - If /join.html includes year, cid arguments, then go straight to page, other provide dropdown with GO selector
  - Upon GO, check to see if game can be joined (accepting players)
  - Provide option/requirement to Sign In
  - Create player, checking for access key if needed 
- If they are signed in, their info autopopulates for name, TODO add option for nickname for the game, then a json file is created using first-last.json in S3 to hold their picks.

## Real-time game flow
- Year is created
- Admin edits teams.json to create bracket
- Game is created, set `open_players=true`, `open_picks=true`, `completed_rounds=0`
- Player is created, visits picks.html to make picks64
- First game in first round begins, set `open_players=false`, `open_picks=false`, `completed_rounds=1`
- Admin edits results.json with scores, scoreboard will update with points
- Last game in first round completes, set `open_picks=true`, run send emails for picks links/reminders
- First game in second round begins, set `open_picks=false`, `completed_rounds=2`, run auto-pick script
- Admin edits results.json with scores
- ...

## Data Model
index.json - {"yr": {"Comp Name 1": {"players": ["Name 1",...], "require_secret": true/false},  "Comp Name 2",...},...}
/{year}
  teams.json - list of teams with {"name", "short_name", "seed"}
  results.json - {"results": list of 0/1/null, "score": list of [a,b]/null}
  /{cid}
    competition.json - state of competition {"cid": "lowernospaces", "name": "Actual Name" , "completed_rounds": N, "open_picks": true/false, "open_players": true/false, "require_secret": true/false, "first_deadline": datetime for email
                                             "scoreboard": {"Actual pName": [r0, r1, ...],...},
					     "pick_status": {"Actual pName": True/False,...}}
    {pid}.json - {"pid": "lowernospaces", "name": "Actual Name", "picks": [[],[],..], "email": (opt), "secret": (opt) }
 
## Lambdas
#### calc_score
- GET: Reads data files and returns flat list of points for each game
- Input: year, cid, pid
- Output: {"points": [flat list of points per game, 0 if game not played]}
#### get_bracket
- GET: Reads data files and returns nested list of results, plus nested picks and points if pid is present.
- Input: year, cid, pid (opt), completed_rounds (opt)
- Output: {"games": [[{"teams": [a,b], "seeds": [a,b], "score": [a,b], "result": 0/1, "picks": [[a,b,0/1]], "points": #, "correct": #}, (r0g1), ...], [(r1g0), (r1g1), ...], ...],
           "champion": {"team": a, "seed": a, "picks": []}
- picks is list of tuples, where each tuple is [upper team in game, lower team in game, picked result] for each round of picks for this game.
- points is number of points awarded for this game, None if not yet played
- correct is number of sequential picks that were correct for this game, None if not yet played
#### get_round_start
- GET: Returns list of games starting in given round to populate bracket
- Input: year, cid, round_start
- Output: {"start_games": [{"teams": [a,b], "seeds": [a,b]}, (round 0 game 1), (round 0 game 2), ...],
           "bonus_games": [[round ind, game ind, team name, num correct],...]}
#### update_picks
- POST: Adds picks to a player's data file
- Input: year, cid, pid, picks: [0/1 flat list of picks]
#### get_competitions
- GET: Returns struct with years and competition names for each year, and player names for each cid
- Input: none
- Output: {"y0": {"comp name": ["player name", ...],...}
#### get_scoreboard
- GET: Returns list of players with points, details on game
- Input: year, cid, rounds_completed (opt)
- Output: {"names": [Full Names], "total_points": [total,...], "round_points": [[r0, r1, ...],...]}
#### update_scoreboard
- POST: Updates the scoreboard field in competition file by looking at results and picks.
	- Does not pay attention to completed_rounds in competition.json, since that is considered during get_scoreboard
	- Assumes that all player names have been added to competition.json
- Input: year, cid
- Output: None
#### add_element
- POST: Adds a new year/competition/player

## Testing
- In terminal 1:
	- `cd frontend`
	- In `frontend/src/scripts/constants.js` uncomment `BASE_URL = BASE_URL_LOCAL` if local backend desired 
	- `npm run serve`
- In terminal 2: (optional if local backend desired)
	-`cd lambdas`
	- Activate venv with flask, flask_cors, boto3
	- `export BRACKET_REVIVAL_LOCAL_PREFIX="../test_data/"`
	- `python -m test_lambdas`
- In browser go to `localhost:8000/{page}.html` 
 
## Questions/Misc Thoughts
- How should I take care of controlling when pick submissions are allowed? Plan use a combo of open_picks and completed_rounds in competition.json. open_picks must be true, and completed_rounds must be >= to the round submission being attempted. 
- index.json will contain all years, cids, and player names. This may not scale well, but get to that problem if it becomes one. For now it's simpler to pass all this data at once rather than create a new endpoit just to grab names whenever a new cid is selected in bracket dropdown.
- How much data does the backend send back for get_bracket?
	- Backend will look at three sources to determine how much data to send.
	- 1. completed_rounds in competition.json. If completed_rounds = 1, then it will show all available results and picks for round 0.
	- 2. completed_rounds in query param. Same behavior as #1
	- 3. Picks made by pid. If pid has only submitted picks for round 0 and round 1, this is equivalent to setting completed_rounds = 2. 
	- Rationale: this pushes complexity from the frontend to the backend, where I can write better code. This way I can also use completed_rounds in competition.json to hide picks from other players until a round starts. For example, with completed_rounds = 0, players wouldn't be able to see anyone elses picks. Then once the first rounds starts I'd set completed_rounds = 1 and all picks would be visible. Downside is that players would not be able to see their own picks until the round starts. (Could get around this by allowing edits).
- If you change your pick to have a team keep going when you had them going out, should you get all the bonus?
	- No bonus should be awarded based on when the pick is made, not whether you correctly picked the team to this point. If you switch a pick in the current round, that pick should always be worth 1.

## Computing Points
1. current pick is correct: point = 1, else point = 0 and break
2. loop through prev rounds: current pick is correct and children back to that round are correct: point * K, else break

- Current picks:
	- Game: pick = result
	- points = 1
- Prev pick
	- Game: pick = result
	- Prev: pick = result
	- points MULT
- Prev-prev pick
	- Game: pick = result
	- Prev: pick = result
	- Prev-prev: pick = result
	- points MULT

