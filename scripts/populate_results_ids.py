#!/usr/bin/env python3
"""
Populate the ids field in a results file from a scoreboard file.

Reads:
- scoreboard file: has "events"; each event has "id" and (in competitions[0].competitors)
  team "abbreviation" or "id" (ESPN id).
- teams file: list of teams in bracket order; each has "short_name" and "espn_id".
- results file: has "ids" (one per game in bracket order).

For each game in results, we determine the two teams from the bracket structure.
If an scoreboard event has the same two teams (by short_name/abbreviation or espn_id),
we set results.ids[game_index] = event.id.

Get scoreboard for a day by saving for each day: https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?groups=100&dates=20260321
"""

import argparse
import json
import sys

# Bracket structure (from lambdas/bracket_common/tournament.py and GetBracket)
PREV_GAME = (
    (None, None), (None, None), (None, None), (None, None),
    (None, None), (None, None), (None, None), (None, None),
    (None, None), (None, None), (None, None), (None, None),
    (None, None), (None, None), (None, None), (None, None),
    (None, None), (None, None), (None, None), (None, None),
    (None, None), (None, None), (None, None), (None, None),
    (None, None), (None, None), (None, None), (None, None),
    (None, None), (None, None), (None, None), (None, None),
    (0, 1), (2, 3), (4, 5), (6, 7),
    (8, 9), (10, 11), (12, 13), (14, 15),
    (16, 17), (18, 19), (20, 21), (22, 23),
    (24, 25), (26, 27), (28, 29), (30, 31),
    (32, 33), (34, 35), (36, 37), (38, 39),
    (40, 41), (42, 43), (44, 45), (46, 47),
    (48, 49), (50, 51), (52, 53), (54, 55),
    (56, 57), (58, 59),
    (60, 61),
)
NUMGAMES = 63


def make_absolute_bracket(results):
    """
    Convert flat list of 0/1 results into (upper_team_idx, lower_team_idx) per game.
    results must have length NUMGAMES; use None for games not yet decided.
    """
    if len(results) != NUMGAMES:
        return None
    abs_inds = []
    for i in range(NUMGAMES):
        i_prev_upper, i_prev_lower = PREV_GAME[i]
        if i_prev_upper is None:
            i_upper = 2 * i
            i_lower = 2 * i + 1
        else:
            abs_upper = abs_inds[i_prev_upper]
            rel_upper = results[i_prev_upper]
            i_upper = abs_upper[rel_upper] if rel_upper is not None else None
            abs_lower = abs_inds[i_prev_lower]
            rel_lower = results[i_prev_lower]
            i_lower = abs_lower[rel_lower] if rel_lower is not None else None
        abs_inds.append((i_upper, i_lower))
    return abs_inds


def event_team_keys(competitors):
    """Return a frozenset of two identifiers for the event's teams (for matching)."""
    keys = []
    for c in competitors:
        team = c.get("team", {})
        # Prefer abbreviation, fall back to id (ESPN id)
        key = (team.get("abbreviation") or "").strip() or (team.get("id") or "")
        if key:
            keys.append(key)
    if len(keys) != 2:
        return None
    return frozenset(keys)


def game_team_keys(teams, i_upper, i_lower):
    """Return a frozenset of two identifiers for the game's teams (for matching)."""
    if i_upper is None or i_lower is None:
        return None
    keys = []
    for idx in (i_upper, i_lower):
        t = teams[idx]
        # Prefer short_name, fall back to espn_id
        key = (t.get("short_name") or "").strip() or (t.get("espn_id") or "")
        if isinstance(key, int):
            key = str(key)
        if not key:
            return None
        keys.append(key)
    return frozenset(keys)


def main():
    parser = argparse.ArgumentParser(description="Populate results.ids from scoreboard events by matching teams.")
    parser.add_argument("scoreboard", help="Path to scoreboard JSON (has events)")
    parser.add_argument("teams", help="Path to teams JSON (bracket order)")
    parser.add_argument("results", help="Path to results JSON (has ids); updated in place")
    parser.add_argument("--dry-run", action="store_true", help="Print matches only, do not write")
    args = parser.parse_args()

    with open(args.scoreboard) as f:
        scoreboard = json.load(f)
    with open(args.teams) as f:
        teams = json.load(f)
    with open(args.results) as f:
        results = json.load(f)

    events = scoreboard.get("events", [])
    ids = results.get("ids", [])
    if len(ids) != NUMGAMES:
        print(f"Results ids length is {len(ids)}, expected {NUMGAMES}. Padding or truncating.", file=sys.stderr)
        if len(ids) < NUMGAMES:
            ids.extend([None] * (NUMGAMES - len(ids)))
        else:
            ids = ids[:NUMGAMES]
        results["ids"] = ids

    results_list = results.get("results", [None] * NUMGAMES)
    if len(results_list) < NUMGAMES:
        results_list.extend([None] * (NUMGAMES - len(results_list)))
    abs_inds = make_absolute_bracket(results_list)

    # Build event key -> event id (if duplicate keys, last wins)
    event_by_key = {}
    for ev in events:
        eid = ev.get("id")
        if not eid:
            continue
        comps = ev.get("competitions") or []
        if not comps:
            continue
        competitors = comps[0].get("competitors") or []
        key = event_team_keys(competitors)
        if key:
            event_by_key[key] = eid

    # Match each game to an event
    matched = 0
    for i in range(NUMGAMES):
        i_upper, i_lower = abs_inds[i]
        key = game_team_keys(teams, i_upper, i_lower)
        if key is None:
            continue
        eid = event_by_key.get(key)
        if eid is not None:
            if ids[i] != eid:
                u_name = teams[i_upper].get("name", "?") if i_upper is not None else "?"
                l_name = teams[i_lower].get("name", "?") if i_lower is not None else "?"
                print(f"Game {i}: {u_name} vs {l_name} -> id {eid}")
            ids[i] = eid
            matched += 1

    print(f"Matched {matched} games to scoreboard events.")

    if not args.dry_run and matched > 0:
        results["ids"] = ids
        with open(args.results, "w") as f:
            json.dump(results, f, indent=2)
        print(f"Wrote {args.results}")
    elif args.dry_run:
        print("(Dry run; no file written)")


if __name__ == "__main__":
    main()
