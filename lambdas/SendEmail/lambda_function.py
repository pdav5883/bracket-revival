#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import boto3

from common import utils
from common import tournament as trn

from botocore.exceptions import ClientError

"""
event = {"Records": [{"Sns": {"Message": emailbatch}}]}

emailbatch: {"typ": t , "content": {}, "recipients": [pname1, pname2,...]}
    welcome: year, compname
    newround: year, compname, pick_round
"""

root_url = SUB_DeployedRootURL # type: ignore
ses_identity = SUB_SesIdentity # type: ignore

ses = boto3.client("ses")

def lambda_handler(event, context):
    """
    SNS topic subscription
    """

    # each msg is a batch of emails all to players in the same typ/year/compname combo
    for msg in event["Records"]:
        batch = json.loads(msg["Sns"]["Message"])

        # populate other content
        email_type = batch["typ"]
        content = batch["content"]

        if email_type == "verify":
            content["verify_url"] = f"https://{root_url}/{content['verify_path']}"
        elif email_type == "welcome":
            year = batch["content"]["year"]
            compname = batch["content"]["compname"]
            content["scoreboard_url"] = f"https://{root_url}/scoreboard.html?year={year}&cid={compname}"

        elif email_type in ("reminder", "newround"):
            year = batch["content"]["year"]
            compname = batch["content"]["compname"]
            content["scoreboard_url"] = f"https://{root_url}/scoreboard.html?year={year}&cid={compname}"
            content["pick_round_name"] = trn.ROUND_NAMES[content["pick_round"]]
            content["bracket_name"] = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth"][content["pick_round"]]
            
        for name, email in zip(batch["recipient_names"], batch["recipient_emails"]):
            content["name"] = name.split(" ")[0] # first name only
            if email_type in ("welcome", "newround", "reminder"):
              content["bracket_url"] = f"https://{root_url}/bracket.html?year={year}&cid={compname}&pid={name}"
              content["pick_url"] = f"https://{root_url}/picks.html?year={year}&cid={compname}&pid={name}"

            subject = templates[email_type]["subject"]
            body = templates[email_type]["body"]

            for key, val in content.items():
                subject = subject.replace("{{" + key + "}}", str(val))
                body = body.replace("{{" + key + "}}", str(val))     
            try:
                ses.send_email(Source=f"bracket@{ses_identity}",
                                Destination={"ToAddresses": [email]},
                                Message={"Subject": {"Data": subject},
                                        "Body": {"Html": {"Data": body}}
                                }
                      )
                print(f"Sent to {email}")
            except ClientError as e:
                print(f"Error sending email to {email} with content:")
                print(content)
                raise e

        print("Sent batch: ", batch)

    return "Successfully sent messages"


welcome_template = {"subject": "Welcome to bracket-revival! ({{compname}} {{year}})",
                    "body": "<html>\
                               <head>\
                               </head>\
                               <body>\
                                 <p>Hi {{name}},</p>\
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
                                 <p>Hi {{name}},</p>\
                                 <p>It's time to pick a fresh bracket starting in the {{pick_round_name}} and going all the way to the Championship.</p>\
                                 <p>Click <a href='{{pick_url}}'>HERE</a> to make your picks.</p>\
                                 <p>You have until <strong>{{deadline}}</strong> when the next round starts - so don't delay!</p>\
                                 <p>Looking for the <a href='{{scoreboard_url}}'>Scoreboard</a>, your <a href='{{bracket_url}}'>Brackets</a>, or a <a href='https://bracket.bearloves.rocks/rules.html'>Rules Refresher</a>?</p>\
                                 <p>Your Friend,<br>The BLR Commissioner</p>\
                               </body>\
                             </html>"}

reminder_template = {"subject": "Don't Forget to Pick Your {{bracket_name}} Bracket! ({{compname}} {{year}})",
                     "body": "<html>\
                               <head>\
                               </head>\
                               <body>\
                                 <p>Hi {{name}},</p>\
                                 <p>A friendly reminder that time is running out to make your latest round of picks! The next round starts at <strong>{{deadline}}</strong>, so get your picks in before then!</p>\
                                 <p>Click <a href='{{pick_url}}'>HERE</a> to make your picks.</p>\
                                 <p>Your Friend,<br>The BLR Commissioner</p>\
                               </body>\
                             </html>"}

verify_template = {"subject": "Sign In to Bracket Revival",
                  "body": "<html>\
                             <head>\
                             </head>\
                             <body>\
                               <p>Hi {{name}},</p>\
                               <p>Click <a href='{{verify_url}}'>HERE</a> to sign in to bracket-revival.</p>\
                               <p>From,<br>The BLR Security Team</p>\
                             </body>\
                           </html>"}

templates = {"welcome": welcome_template,
             "newround": newround_template,
             "reminder": reminder_template,
             "verify": verify_template}

