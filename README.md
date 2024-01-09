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

## Lambdas
#### calc_score
- GET: Reads data files and returns flat list of points for each game
- Input: year, cid, pid
- Output: {"points": [flat list of points per game, 0 if game not played]}
#### get_bracket
- GET: Reads data files and returns nested list of game results (no picks)
- **WAS**
- Input: year, cid, completed_rounds (opt)
- Output: [[{"teams": [a,b], "seeds": [a,b], "score": [a,b], "result": 0/1}, (round 0 game 1), ...], [(round 1 game 0), (round 1 game 1), ...], ...]
- **IS**: add pick/points info if pid is present
- GET: Reads data files and returns nested list of results, plus nested picks and points if pid is present.
- Input: year, cid, pid (opt), completed_rounds (opt)
- Output: [[{"teams": [a,b], "seeds": [a,b], "score": [a,b], "result": 0/1, "picks": [[],[]], "points": [a,b]}, (r0g1), ...], [(r1g0), (r1g1), ...], ...].
- picks and points fields are structured for frontend rendering. i.e. the picks values will not be one of the "teams" values. Picks is who was picked to be **playing** in this game, and points is how many points were awarded for correctly picking who is in the game.
#### get_round_start
- GET: Returns list of games starting in given round to populate bracket
- Input: year, cid, round_start
- Output: [{"teams": [a,b], "seeds": [a,b]}, (round 0 game 1), (round 0 game 2), ...]
#### update_picks
- POST: Adds picks to a player's data file
- Input: year, cid, pid, round, picks: [0/1 flat list of picks]

## Working
- Page: Visualize current bracket
- Page: Make picks for entire bracket

## How to Test
- In terminal 1: `cd frontend` and run `python -m http.server`
- In terminal 2: `cd lambdas` and run `python -m test_lambdas`
	- Note: `flask` and `flask_cors` must be installed in the environment
- In browser go to `localhost:8000/{page}.html` 
## Data Model
/{year}
  teams.json - list of teams with {"name", "short_name", "seed"}
  results.json - {"results": list of 0/1/null, "score": list of [a,b]/null}
  /{cid}
    competition.json - state of competition {"cid": {cid uuid}, "name", "scoreboard": {}, "completed_rounds": N, other state info}
    {pid}.json - {"pid": {pid uuid}, "name", "picks": [[],[],..]}
  

## Computing Points
- Play in game?
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
