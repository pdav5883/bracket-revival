# package layer
rm common.zip
mkdir -p _tmp/python/common
cp *.py _tmp/python/common
cd _tmp
zip -r common.zip python
mv common.zip ..
cd ..
rm -rf _tmp

# update layer in AWS
aws lambda publish-layer-version \
    --layer-name bracket-revival-common \
    --zip-file fileb://`pwd`/common.zip \
    --description "$1" \
    --compatible-runtimes python3.10

version=$(aws lambda list-layer-versions --layer-name bracket-revival-common | python3 -c "import sys, json; print(json.load(sys.stdin)['LayerVersions'][0]['LayerVersionArn'])")

# update lambdas to use new layer
aws lambda update-function-configuration --function-name BracketAddElement --layers $version
aws lambda update-function-configuration --function-name BracketAdminAuth --layers $version
aws lambda update-function-configuration --function-name BracketAdminEdit --layers $version
aws lambda update-function-configuration --function-name BracketGetBracket --layers $version
aws lambda update-function-configuration --function-name BracketGetRoundStart --layers $version
aws lambda update-function-configuration --function-name BracketGetScoreboard --layers $version
aws lambda update-function-configuration --function-name BracketUpdatePicks --layers $version
aws lambda update-function-configuration --function-name BracketUpdateScoreboard --layers $version
aws lambda update-function-configuration --function-name BracketSendEmail --layers $version


