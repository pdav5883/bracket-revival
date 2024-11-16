################
# This script deploys the AWS resources required for bowl-pickem using CloudFormation.
# The input to the script is the name of the JSON parameters file used to define
# parameter values in the CFN stack.
#
# When the CFN stack is deployed, any lambda functions that are created/updated are populated with placeholder
# code, so this scripts also calls the deploy scripts for each lambda to upload code.
################

echo "Deploying bracket-revival cloudformation with params from ${1}"

aws cloudformation deploy \
  --template-file ./bracket-revival-cfn.yaml \
  --stack-name bracket-revival \
  --parameter-overrides file://${1} \
  --capabilities CAPABILITY_NAMED_IAM \
  # --no-execute-changeset

python update_cfn_lambdas.py

#cd ../lambdas

#for d in */
#do
#  echo "Deploying lambda update from ${d}"
#  cd $d
#  sh deploy.sh
#  cd ..
#done

