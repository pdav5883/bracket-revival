rm lambda.zip
zip lambda.zip lambda_function.py
aws lambda update-function-code --function-name BracketSendEmail --zip-file fileb://`pwd`/lambda.zip
