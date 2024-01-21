# bracket-revival
Work in progress

## Critical Functions
- Submit picks
- Send email reminder for picks
- Edit game scores
- Compute points per player
- Visualize bracket for player
- Visualize leaderboard
- Test page to play a smaller version to understand rules

## WIP
- Move all read/write functions into separate utils file, build for S3
- Deploy and test

## Lambdas
#### calc_score
- GET: Reads data files and returns flat list of points for each game
- Input: year, cid, pid
- Output: {"points": [flat list of points per game, 0 if game not played]}
#### get_bracket
- GET: Reads data files and returns nested list of results, plus nested picks and points if pid is present.
- Input: year, cid, pid (opt), completed_rounds (opt)
- Output: {"games": [[{"teams": [a,b], "seeds": [a,b], "score": [a,b], "result": 0/1, "picks": [[],[]], "points": [a,b]}, (r0g1), ...], [(r1g0), (r1g1), ...], ...],
           "champion": {"team": a, "seed": a, "picks": []}
- picks and points fields are structured for frontend rendering. i.e. the picks values will not be one of the "teams" values. Picks is who was picked to be **playing** in this game, and points is how many points were awarded for correctly picking who is in the game.
#### get_round_start
- GET: Returns list of games starting in given round to populate bracket
- Input: year, cid, round_start
- Output: [{"teams": [a,b], "seeds": [a,b]}, (round 0 game 1), (round 0 game 2), ...]
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
#### add_player
- POST: Adds a new player to competition
	- Adds player name to competition.json scoreboard
	- Adds player name to index.json
	- Adds pid.json file in competition dir
- WIP
#### add_competition
- POST: Adds a new competition to year
	- Adds a new competition dir with competition.json
	- Adds competition name to index.json
- WIP
#### add_year
- POST: Adds a new year
	- Adds year dir, results.json, teams.json empty
	- Adds year to index.json
- WIP

## How to Test
- In terminal 1: `cd frontend` and run `python -m http.server`
- In terminal 2: `cd lambdas` and run `python -m test_lambdas`
	- Note: `flask` and `flask_cors` must be installed in the environment
- In browser go to `localhost:8000/{page}.html` 

## Data Model
index.json - {"yr": {"Comp Name 1": ["Name 1",...],  "Comp Name 2",...},...}
/{year}
  teams.json - list of teams with {"name", "short_name", "seed"}
  results.json - {"results": list of 0/1/null, "score": list of [a,b]/null}
  /{cid}
    competition.json - state of competition {"cid": "lowernospaces", "name": "Actual Name" , "completed_rounds": N, "open_picks": true/false (can make any picks any time)
                                             "scoreboard": {"Actual pName": [r0, r1, ...],...}}
    {pid}.json - {"pid": "lowernospaces", "name": "Actual Name", "picks": [[],[],..]}
  

## Computing Points
- Play in game? NO
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

## References
- https://github.com/TheChipmunks/react-tournament-bracket

truth [0, 1, 1, 0, 0, 1, 1]

test1 [[0, 0, 1, 1, 0, 0, 1], [0, 1, 0], [1]]
        1  0  1  0                2  1    1  = 6

test2 [[1, 0, 0, 0, 0, 1, 1], [0, 1, 1], [1]]
        0  0, 0, 1             1  2       4 = 8  
1
-1
2
   1
3
-4
4
       7
5
-6
6
   7
7
-7
8



0 
1  32
2
3  33 48
4
5  34
6
7  35 49 56

8
9  36
10
11 37 50
12
13 38
14
15 39 51 57 60

16
17 40
18
19 41 52
20
21 42
22
23 43 53 58

24
25 44
26
27 45 54
28
29 46
30
31 47 55 59 61 62
