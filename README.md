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

## Data Model

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
## Questions/Misc Thoughts
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
