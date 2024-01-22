rm lambda.zip
zip lambda.zip lambda_function.py
aws lambda update-function-code --function-name BracketAddElement --zip-file fileb:///home/peter/Projects/bracket-revival/lambdas/add_element/lambda.zip
