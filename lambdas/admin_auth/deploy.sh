rm lambda.zip
zip lambda.zip lambda_function.py
aws lambda update-function-code --function-name BracketAdminAuth --zip-file fileb://`pwd`/lambda.zip
