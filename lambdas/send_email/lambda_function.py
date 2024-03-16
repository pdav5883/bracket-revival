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
            content["pick_round_name"] = trn.ROUND_NAMES[content.pop("pick_round")]
            content["closing_datetime"] = "Thur Mar 21 at 12:00PM EST"

        for pname in batch["recipients"]:
            pid = pname.replace(" ", "").lower()
            player_key = year + "/" + cid + "/" + pid + ".json"
            player = utils.read_file(player_key)
            
            content["pick_url"] = f"localhost:8000/picks.html?year={year}&cid={compname}&pid={pname}&secret={player['secret']}"
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
                                 <p>Welcome to bracket-revival!</p>\
                                 <p>Click <a href='{{pick_url}}'>HERE</a> to make your first set of picks!</p>\
                                 <p>You'll be making a fresh set of picks each round, so make sure to check your email at the end of every round to make your new picks. If you need a rule refresher click <a href=''>HERE</a><p>\
                                 <p>Your Friend,<br>The Bracketmaster</p>\
                               </body>\
                             </html>"}

newround_template = {"subject": "Time to Make More Picks! ({{compname}} {{year}})",
                     "body": "<html>\
                               <head>\
                               </head>\
                               <body>\
                                 <p>Hello {{pname}},</p>\
                                 <p>It's time to pick a fresh bracket starting in the {{pick_round_name}} and going all the way to the Championship.</p>\
                                 <p>Click <a href='{{pick_url}}'>HERE</a> to make your picks.</p>\
                                 <p>You have until <strong>{{closing_datetime}}</strong> when the next round starts to submit - so don't delay! If you need a rule refresher click <a href=''>HERE</a></p>\
                                 <p>Your Friend,<br>The Bracketmaster</p>\
                               </body>\
                             </html>"}

reminder_template = {"subject": "TBD",
                  "body": "TBD"}

templates = {"welcome": welcome_template,
             "newround": newround_template,
             "reminder": reminder_template}

