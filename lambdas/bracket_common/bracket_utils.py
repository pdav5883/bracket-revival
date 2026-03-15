import os
import json
import boto3
from datetime import datetime, UTC
from . import tournament as trn

sns = boto3.client("sns")

root_url = SUB_DeployedRootURL
sync_topic_arn = SUB_SyncTopicArn


def trigger_sync_sns(year, cid):
    msg = json.dumps({"year": year, "cid": cid.replace(" ", "").lower()})
    response = sns.publish(TopicArn=sync_topic_arn, Message=msg)
    return None


def populate_email_content(email_type, content):
    """
    Populate email content with URLs and other dynamic values
    """
    if email_type == "welcome":
        content["scoreboard_url"] = f"https://{root_url}/scoreboard.html?year={content['year']}&cid={content['compname']}"
    elif email_type in ("reminder", "newround"):
        content["scoreboard_url"] = f"https://{root_url}/scoreboard.html?year={content['year']}&cid={content['compname']}"
        content["pick_round_name"] = trn.ROUND_NAMES[content["pick_round"]]
        content["bracket_name"] = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth"][content["pick_round"]]
        
    if email_type in ("welcome", "newround", "reminder"):
        content["bracket_url"] = f"https://{root_url}/bracket.html?year={content['year']}&cid={content['compname']}&pid={content['name']}"
        content["pick_url"] = f"https://{root_url}/picks.html?year={content['year']}&cid={content['compname']}&pid={content['name']}"

    # Add timestamp to content
    content["timestamp"] = datetime.now(UTC).strftime("%Y-%m-%d %H:%M:%S UTC")
    
    return content


welcome_template = {"subject": "Welcome to bracket-revival! ({{compname}} {{year}})",
                    "body": "<html>\
                               <head>\
                                 <style>\
                                   body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }\
                                   .content { max-width: 600px; margin: 0 auto; }\
                                   .timestamp { font-size: 7pt; color: #999; margin-top: 15px; text-align: right; }\
                                 </style>\
                               </head>\
                               <body>\
                                 <div class='content'>\
                                   <div class='timestamp'>{{timestamp}}</div>\
                                   <p>Hi {{name}},</p>\
                                   <p>Welcome to bracket-revival! Before each round of March Madness, you'll be picking a fresh bracket from the surviving teams. The more times you correctly pick a team to win, the more points you'll score!</p>\
                                   <p>Click <a href='{{pick_url}}'>HERE</a> to pick your First Bracket!</p>\
                                   <p>You have until <strong>{{deadline}}</strong> when the first game starts to submit your picks - so don't delay!</p>\
                                   <p>For more info, be sure to check out the <a href='https://bracket.bearloves.rocks/rules.html'>Rules</a> and your game's <a href='{{scoreboard_url}}'>Scoreboard</a>.</p>\
                                   <p>Look for an email like this after every round with a link to pick your next bracket. Thanks for playing!</p>\
                                   <p>Your Friend,<br>The BLR Commissioner</p>\
                                   <div class='timestamp'>{{timestamp}}</div>\
                                 </div>\
                               </body>\
                             </html>"}

newround_template = {"subject": "Time to Pick Your {{bracket_name}} Bracket! ({{compname}} {{year}})",
                     "body": "<html>\
                               <head>\
                                 <style>\
                                   body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }\
                                   .content { max-width: 600px; margin: 0 auto; }\
                                   .timestamp { font-size: 7pt; color: #999; margin-top: 15px; text-align: right; }\
                                 </style>\
                               </head>\
                               <body>\
                                 <div class='content'>\
                                   <div class='timestamp'>{{timestamp}}</div>\
                                   <p>Hi {{name}},</p>\
                                   <p>It's time to pick a fresh bracket starting in the {{pick_round_name}} and going all the way to the Championship.</p>\
                                   <p>Click <a href='{{pick_url}}'>HERE</a> to make your picks.</p>\
                                   <p>You have until <strong>{{deadline}}</strong> when the next round starts - so don't delay!</p>\
                                   <p>Looking for the <a href='{{scoreboard_url}}'>Scoreboard</a>, your <a href='{{bracket_url}}'>Brackets</a>, or a <a href='https://bracket.bearloves.rocks/rules.html'>Rules Refresher</a>?</p>\
                                   <p>Your Friend,<br>The BLR Commissioner</p>\
                                   <div class='timestamp'>{{timestamp}}</div>\
                                 </div>\
                               </body>\
                             </html>"}

reminder_template = {"subject": "Don't Forget to Pick Your {{bracket_name}} Bracket! ({{compname}} {{year}})",
                     "body": "<html>\
                               <head>\
                                 <style>\
                                   body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }\
                                   .content { max-width: 600px; margin: 0 auto; }\
                                   .timestamp { font-size: 7pt; color: #999; margin-top: 15px; text-align: right; }\
                                 </style>\
                               </head>\
                               <body>\
                                 <div class='content'>\
                                   <div class='timestamp'>{{timestamp}}</div>\
                                   <p>Hi {{name}},</p>\
                                   <p>A friendly reminder that time is running out to make your latest round of picks! The next round starts at <strong>{{deadline}}</strong>, so get your picks in before then!</p>\
                                   <p>Click <a href='{{pick_url}}'>HERE</a> to make your picks.</p>\
                                   <p>Your Friend,<br>The BLR Commissioner</p>\
                                   <div class='timestamp'>{{timestamp}}</div>\
                                 </div>\
                               </body>\
                             </html>"}

templates = {"welcome": welcome_template,
             "newround": newround_template,
             "reminder": reminder_template}


def compute_completed_rounds(results):
    """
    Compute completed_rounds from results: 1 if all games in round 0 are non-null,
    2 if all games in rounds 0-1 are non-null, etc.
    """
    completed_rounds = 0
    for rnd in range(trn.NUMROUNDS):
        first_game = sum(trn.GAMES_PER_ROUND[0:rnd])
        num_games = trn.GAMES_PER_ROUND[rnd]
        if all(results[first_game + i] is not None for i in range(num_games)):
            completed_rounds = rnd + 1
        else:
            break
    return completed_rounds

def compute_started_rounds(results):
    """
    Find the number of rounds that have started
    """
    completed_rounds = compute_completed_rounds(results)

    if completed_rounds == trn.NUMROUNDS:
      return completed_rounds

    prev_games = sum(trn.GAMES_PER_ROUND[0:completed_rounds])
    next_round_results = results[prev_games:prev_games + trn.GAMES_PER_ROUND[completed_rounds]]

    if any(x is not None for x in next_round_results):
      return completed_rounds + 1
    else:
      return completed_rounds


def get_start_games_abs_ind(results, round_start):
    """Return list of (t0, t1) team indices for each game in round_start."""
    start_games_ind = []
    first_game = sum(trn.GAMES_PER_ROUND[0:round_start])
    for i in range(first_game, first_game + trn.GAMES_PER_ROUND[round_start]):
        i_upper, i_lower = i, i
        i_prev_upper, i_prev_lower = trn.PREV_GAME[i]
        while i_prev_upper is not None:
            i_upper = i_prev_upper
            i_prev_upper = trn.PREV_GAME[i_upper][results[i_upper]]
        while i_prev_lower is not None:
            i_lower = i_prev_lower
            i_prev_lower = trn.PREV_GAME[i_lower][results[i_lower]]
        if i_upper == i_lower:
            t0, t1 = 2 * i, 2 * i + 1
        else:
            t0 = 2 * i_upper + results[i_upper]
            t1 = 2 * i_lower + results[i_lower]
        start_games_ind.append((t0, t1))
    return start_games_ind


def make_absolute_bracket(results, picks=None):
    """
    Converts flat list of 0/1 results and/or picks into flat list of upper/lower
    absolute indices into teams. Returns None if invalid.
    """
    if picks is not None:
        rel_inds = results + picks
    else:
        rel_inds = results

    if len(rel_inds) != trn.NUMGAMES:
        return None

    abs_inds = []
    for i in range(trn.NUMGAMES):
        i_prev_upper, i_prev_lower = trn.PREV_GAME[i]
        if i_prev_upper is None:
            i_upper = 2 * i
            i_lower = 2 * i + 1
        else:
            abs_upper = abs_inds[i_prev_upper]
            rel_upper = rel_inds[i_prev_upper]
            i_upper = abs_upper[rel_upper] if rel_upper is not None else None
            abs_lower = abs_inds[i_prev_lower]
            rel_lower = rel_inds[i_prev_lower]
            i_lower = abs_lower[rel_lower] if rel_lower is not None else None
        abs_inds.append((i_upper, i_lower))
    return abs_inds


def get_pick_constraints(results, statuses, picks, round_start, start_games_ind):
    """
    Return list of constraints for each start game. Length = GAMES_PER_ROUND[round_start].
    None = no constraint (game not started). 0 or 1 = required pick (autopick value).
    """
    first_game = sum(trn.GAMES_PER_ROUND[0:round_start])
    num_games_round = trn.GAMES_PER_ROUND[round_start]
    constraints = []

    # pick_constraints are what the player is forced to pick if the game has started, if this is
    # the first round, then pick the favorite
    if round_start > 0:
        picks_prev_round = picks[round_start - 1]
        games_prev_round = trn.GAMES_PER_ROUND[round_start - 1]
        pick_constraints = picks_prev_round[games_prev_round:games_prev_round + num_games_round]
    else:
        pick_constraints = [0] * num_games_round

    for i in range(num_games_round):
        abs_ind = first_game + i
        status = statuses[abs_ind]

        # status is None if this year doesn't have game statuses recorded
        if status == "NOT_STARTED" or status is None:
            constraints.append(None)
        else:
            constraints.append(pick_constraints[i])

    return constraints




