rm lambda.zip
zip lambda.zip lambda_function.py
aws lambda update-function-code --function-name BracketGetCompetitions --zip-file fileb:///home/peter/Projects/bracket-revival/lambdas/get_competitions/lambda.zip
