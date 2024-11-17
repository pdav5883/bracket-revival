rm lambda.zip
zip lambda.zip lambda_function.py
aws lambda update-function-code --function-name BracketGetCompetitions --zip-file fileb://`pwd`/lambda.zip
