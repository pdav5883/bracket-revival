import json
import boto3

from common import utils

"""
event = {"Records": [{"Sns": {"Message": emailbatch}}]}

emailbatch: {"typ": t , "content": {}, "recipients": [pname1, pname2,...]}
    welcome: year, compname
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

        for pname in batch["recipients"]:
            pid = pname.replace(" ", "").lower()
            player_key = year + "/" + cid + "/" + pid + ".json"
            player = utils.read_file(player_key)
            secret = player["secret"]

            template = templates[batch["typ"]]
            subject = template["subject"]
            body = template["body"]
            
            pick_url = f"localhost:8000/picks.html?year={year}&cid={compname}&pid={pname}&secret={secret}"

            body = body.replace("{{pname}}", pname).replace("{{pick_url}}", pick_url)

            ses.send_email(Source="bracket@bearloves.rocks",
                           Destination={"ToAddresses": [player["email"]]},
                           Message={"Subject": {"Data": subject},
                                    "Body": {"Html": {"Data": body}}
                                   }
                          )

        print("Sent batch: ", batch)

    return "Successfully sent messages"




welcome_template = {"subject": "Welcome to bracket-revival!",
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

round_template = {"subject": "TBD",
                  "body": "TBD"}

reminder_template = {"subject": "TBD",
                  "body": "TBD"}

templates = {"welcome": welcome_template,
             "round": round_template,
             "reminder": reminder_template}

