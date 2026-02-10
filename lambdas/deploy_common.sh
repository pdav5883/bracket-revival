#!/bin/bash

# Constants
STACK_NAME="bracket-revival"
LAYER_NAME_KEY="LayerCommonName"
LAYER_MODULE="bracket_common"
ZIP_FILE="${LAYER_MODULE}/${LAYER_MODULE}.zip"
ZIP_STRUCTURE="python/${LAYER_MODULE}"
TEMP_DIR="${LAYER_MODULE}/temp"

# Initialize force flag
FORCE_UPDATE=fals

if [[ $1 == "--force" ]]; then
  FORCE_UPDATE=true
fi

# only do something if there is a layer directory
if [ ! -d "${LAYER_MODULE}" ]; then
  echo "No layer directory ${LAYER_MODULE}, exiting."; exit 0
fi

# Fetch CloudFormation parameters and store them in an associative array
declare -A CF_PARAMS
while IFS= read -r line; do
    key=$(echo $line | awk '{print $1}')
    value=$(echo $line | awk '{print $2}')
    CF_PARAMS["$key"]="$value"
done < <(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Parameters[]" --output text | awk '{print $1, $2}')

while IFS= read -r line; do
    key=$(echo $line | awk '{print $1}')
    value=$(echo $line | awk '{print $2}')
    CF_PARAMS["$key"]="$value"
done < <(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[]" --output text | awk '{print $1, $2}')

# whether to zip lambda_function.py
if [[ "$FORCE_UPDATE" = true || ! -f "$ZIP_FILE" ]]; then
  REZIP=true

else
  REZIP=fals
  for pyf in ${LAYER_MODULE}/*.py; do
    if [ $pyf -nt $ZIP_FILE ]; then
      REZIP=true
      break
    fi
  done
fi

if [ $REZIP = true ]; then
  echo "Performing substitutions and updating $ZIP_FILE..."
  mkdir -p "$TEMP_DIR/$ZIP_STRUCTURE"
  cp ${LAYER_MODULE}/*.py "$TEMP_DIR/$ZIP_STRUCTURE"

  # Perform the substitution for "SUB_" placeholders
  for pyf in $TEMP_DIR/$ZIP_STRUCTURE/*.py; do
    for placeholder in $(grep -oP 'SUB_[A-Za-z0-9_]*' "$pyf"); do
      key="${placeholder#SUB_}"
      value="${CF_PARAMS[$key]}"
      if [[ -n "$value" ]]; then
        sed -i "s/$placeholder/\"$value\"/g" "$pyf"
      else
        echo "Error: No value found for $placeholder in $pyf in CloudFormation parameters."
	rm -rf "$TEMP_DIR"
	exit 1;
      fi
    done
  done
  
  # Create or update the zip file containing lambda_function.py
  cd $TEMP_DIR
  zip -r ../../$ZIP_FILE $ZIP_STRUCTURE/*
  cd ../..

  # Remove the temporary directory
  rm -rf "$TEMP_DIR"
else
  echo "$ZIP_FILE is up-to-date."
fi

layer_name="${CF_PARAMS[$LAYER_NAME_KEY]}"

# Check the last modified time of latest layer version
latest_version=$(aws lambda list-layer-versions --layer-name "$layer_name" --query 'LayerVersions[0].Version' --output text)
layer_modified=$(aws lambda get-layer-version --layer-name "$layer_name" --version-number "$latest_version" --query 'CreatedDate' --output text)

# Convert the last modified time to epoch seconds
layer_modified_epoch=$(date -d "$layer_modified" +%s)
zip_file_epoch=$(date -r "$ZIP_FILE" +%s)

# Compare the modification times
if [[ "$FORCE_UPDATE" = true || "$zip_file_epoch" -gt "$layer_modified_epoch" ]]; then
  echo "Uploading $zip_file to AWS Lambda Layer $layer_name..."
  aws lambda publish-layer-version --layer-name $layer_name --zip-file fileb://$ZIP_FILE --compatible-runtimes "python3.12" --no-cli-pager --query 'LayerVersionArn' --output text > /dev/null

  if [ $? -ne 0 ]; then
    echo "Error: Failed to update AWS Lambda Layer $layer_name."
    exit 1
  else
    echo "Lambda layer $layer_name was updated"
  fi

else
  echo "Lambda layer $layer_name is already up-to-date."
  echo ""
fi


