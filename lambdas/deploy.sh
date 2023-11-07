rm lambda.zip
zip lambda.zip lambda_function.py
aws lambda update-function-code --function-name {lambda-name} --zip-file fileb:///home/peter/Projects/bracket-revival/lambdas/{lambda-dir}/lambda.zip
