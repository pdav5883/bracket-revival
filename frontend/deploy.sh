aws s3 sync ./dist s3://bracket-revival-public --cache-control="max-age=600" --exclude="*" --include="*.html" --include="*.css" --include="*.js" --include="*.png"
aws cloudfront create-invalidation --distribution-id EAYYH2TLICFBU --paths "/*"
