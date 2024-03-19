import json
import boto3

from common import utils
from common import tournament as trn

"""
event = {"Records": [{"Sns": {"Message": emailbatch}}]}

emailbatch: {"typ": t , "content": {}, "recipients": [pname1, pname2,...]}
    welcome: year, compname
    newround: year, compname, pick_round
"""

ses = boto3.client("ses")

def lambda_handler(event, context):
    """
    SNS topic subscription
    """

    # each msg is a batch of emails all to players in the same typ/year/compname combo
    for msg in event["Records"]:
        batch = json.loads(msg["Sns"]["Message"])

        year = batch["content"]["year"]
        compname = batch["content"]["compname"]
        cid = compname.replace(" ", "").lower()

        competition_key = year + "/" + cid + "/competition.json"
        competition = utils.read_file(competition_key)

        # populate other content
        email_type = batch["typ"]
        content = batch["content"]
        if email_type == "welcome":
            pass
        elif email_type == "newround":
            pick_round = content.pop("pick_round")
            content["pick_round_name"] = trn.ROUND_NAMES[pick_round]
            content["bracket_name"] = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth"][pick_round]

        for pname in batch["recipients"]:
            pid = pname.replace(" ", "").lower()
            player_key = year + "/" + cid + "/" + pid + ".json"
            player = utils.read_file(player_key)
            
            content["scoreboard_url"] = f"https://bracket.bearloves.rocks/scoreboard.html?year={year}&cid={compname}"
            content["bracket_url"] = f"https://bracket.bearloves.rocks/bracket.html?year={year}&cid={compname}&pid={pname}"
            content["pick_url"] = f"https://bracket.bearloves.rocks/picks.html?year={year}&cid={compname}&pid={pname}&secret={player['secret']}"
            content["pname"] = pname

            subject = templates[email_type]["subject"]
            body = templates[email_type]["body"]

            for key, val in content.items():
                subject = subject.replace("{{" + key + "}}", val)
                body = body.replace("{{" + key + "}}", val)

            ses.send_email(Source="bracket@bearloves.rocks",
                           Destination={"ToAddresses": [player["email"]]},
                           Message={"Subject": {"Data": subject},
                                    "Body": {"Html": {"Data": body}}
                                   }
                          )

        print("Sent batch: ", batch)

    return "Successfully sent messages"


welcome_template = {"subject": "Welcome to bracket-revival! ({{compname}} {{year}})",
                    "body": "<html>\
                               <head>\
                               </head>\
                               <body>\
                                 <p>Hello {{pname}}!</p>\
                                 <p>Welcome to bracket-revival! Before each round of March Madness, you'll be picking a fresh bracket from the surviving teams. The more times you correctly pick a team to win, the more points you'll score!</p>\
                                 <p>Click <a href='{{pick_url}}'>HERE</a> to pick your First Bracket!</p>\
                                 <p>You have until <strong>{{deadline}}</strong> when the first game starts to submit your picks - so don't delay!</p>\
                                 <p>For more info, be sure to check out the <a href='https://bracket.bearloves.rocks/rules.html'>Rules</a> and your game's <a href='{{scoreboard_url}}'>Scoreboard</a>.</p>\
                                 <p>Look for an email like this after every round with a link to pick your next bracket. Thanks for playing!</p>\
                                 <p>Your Friend,<br>The BLR Commissioner</p>\
                               </body>\
                             </html>"}

newround_template = {"subject": "Time to Pick Your {{bracket_name}} Bracket! ({{compname}} {{year}})",
                     "body": "<html>\
                               <head>\
                               </head>\
                               <body>\
                                 <p>Hello {{pname}},</p>\
                                 <p>It's time to pick a fresh bracket starting in the {{pick_round_name}} and going all the way to the Championship.</p>\
                                 <p>Click <a href='{{pick_url}}'>HERE</a> to make your picks.</p>\
                                 <p>You have until <strong>{{deadline}}</strong> when the next round starts - so don't delay!</p>\
                                 <p>Looking for the <a href='{{scoreboard_url}}'>Scoreboard</a>, your <a href='{{bracket_url}}'>Brackets</a>, or a <a href='https://bracket.bearloves.rocks/rules.html'>Rules Refresher</a>?</p>\
                                 <p>Your Friend,<br>The BLR Commissioner</p>\
                               </body>\
                             </html>"}

reminder_template = {"subject": "TBD",
                  "body": "TBD"}

templates = {"welcome": welcome_template,
             "newround": newround_template,
             "reminder": reminder_template}

