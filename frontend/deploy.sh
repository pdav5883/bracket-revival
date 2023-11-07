aws s3 sync . s3://{bucket-name} --cache-control="max-age=21600" --exclude="*" --include="*.html" --include="*.css" --include="*.js"
aws cloudfront create-invalidation --distribution-id {dist-id} --paths "/*"
