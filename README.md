# bracket-revival
Work in progress

## TODO
- Email
	- BracketSendEmail is lambda that calls SES to send messages. Can make multiple SES calls in one invocation.
	- Triggered by SNS topic bracket-revival-send-topic
	- BracketAdminEdit can write to SNS topic in response to frontend calls to send updates (make picks, score updates, etc)
	- BracketAddElement can write to SNS when new player is generated in require_secret=true game
- Error handling
	- Requesting picks when all picks made
	- Requesting picks when picks can't be made yet
	- Admin auth failure
	- Query params for bracket, scoreboard, picks are not valid (good for newplayer
- Admin page
	- View/edit emails
	- View/edit secrets
- Rules page
- About page
- Home page
- Send email script
- Populate missing picks script
- Test page to play smaller version to understand rules
- Button on picks page to reset bracket
- Button on picks page to see previous bracket
- Deploy frontend, with webpack in production
- License and ref to bracketry

## Maybe TODO
- Load page once all formatting is ready to avoid jump from unformatted
- Refactor js into shared utils
- Scoreboard shows game status and who has submitted picks
- Set up bracketry for mobile
- Email reminders
- Team logos
- picks query params only works if you use cid=compname rather than cid=cid since it looks into index file

### Real-time game flow
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
    competition.json - state of competition {"cid": "lowernospaces", "name": "Actual Name" , "completed_rounds": N, "open_picks": true/false, "open_players": true/false, "require_secret": true/false
                                             "scoreboard": {"Actual pName": [r0, r1, ...],...}}
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
