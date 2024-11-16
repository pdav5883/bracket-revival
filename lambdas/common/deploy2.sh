mkdir -p _tmp/python/common
cp *.py _tmp/python/common
cd _tmp
zip -r t-BracketCommon.zip python
mv t-BracketCommon.zip ..
cd ..
rm -rf _tmp

