# Launching a show on AWS

One CloudFormation stack per show builds the hosting: a private S3 bucket for the site, CloudFront in front of it,
a Lambda + DynamoDB call board API, and the wiring between them. Secrets are created by hand in SSM Parameter
Store and never appear in this repo. Google (Sheet, Calendar, Drive) keeps the cast list, schedule and music.

All resources go in your project's selected Region. CloudFront and its certificate are the only `us-east-1` pieces.
Use a unique name per show (show + year), for example `seussical2027`, and use it for the subdomain, the stack and
the SSM prefix.

## One-time setup (shared by every show)

1. A domain with DNS you can edit (this project uses Cloudflare).
2. An ACM certificate in **us-east-1** for `*.yourdomain.com` (plus the apex). Validate it with the CNAME ACM shows you.
   One wildcard certificate serves every show. Keep its ARN.
3. A private S3 bucket in the selected Region for deploy files (the Lambda zip). Keep it private.

## Per show

### 1. Secrets (SSM Parameter Store, type SecureString)

Create these three in the selected Region. `<prefix>` is for example `/tts/seussical2027`.

| Name | Value |
|---|---|
| `<prefix>/admin-pin` | The staff PIN for posting calls |
| `<prefix>/sync-secret` | A random string of 32+ characters (the same value goes in Apps Script, step 5) |
| `<prefix>/youtube-key` | YouTube Data API v3 key, API-restricted to that API, **no website restriction** (calls come from AWS, not a browser). Use any placeholder if the show has no Choreography page |

### 2. Lambda code

```
cd aws/callboard-api
npm install && npm test          # 17 tests, no AWS access needed
zip -j callboard-api.zip index.mjs
```
Upload `callboard-api.zip` to the deploy bucket at `deploy/callboard-api.zip`. (The AWS SDK is already in the Lambda runtime.)

### 3. The stack

Create a stack from `aws/cloudformation/show-stack.yaml` with parameters:

| Parameter | Value |
|---|---|
| `DomainName` | `seussical2027.yourdomain.com` |
| `CertificateArn` | The us-east-1 wildcard certificate |
| `ParameterPrefix` | `<prefix>` from step 1 |
| `CodeBucket` / `CodeKey` | Deploy bucket and `deploy/callboard-api.zip` |
| `PlaylistId` | YouTube playlist ID for Choreography (blank turns it off) |
| `AppsScriptUrl` | The Apps Script `/exec` URL from step 5 (blank for now; update the stack later) |

When it finishes, the outputs give `DnsTarget` (a `dxxxx.cloudfront.net` name), `DistributionId`, `SiteBucketName`.

The site bucket and DynamoDB table are set to **Retain**, so deleting the stack never deletes show data.

### 4. DNS

Add a CNAME: `seussical2027` -> the `DnsTarget` value. In Cloudflare, set it to **DNS only** (grey cloud).

### 5. Google side

Follow the Google Sheet, Calendar and Drive steps in the top-level README, then set the Script Property
`AWS_SYNC_SECRET` to the exact value of `<prefix>/sync-secret`. Deploy the web app and put its `/exec` URL in
`backendUrl` (show settings) and in the stack's `AppsScriptUrl` parameter (update the stack).

### 6. Build and upload the site

```
npm install
npm run build                    # show/show.config.js already points at /api/calls and /api/videos
```
Upload everything in `dist/` to the site bucket (S3 console upload, or presigned URLs), keeping `index.html` and
`assets/` at the top level. Then invalidate CloudFront (`/*`) so visitors get the new files.

### 7. Check it

- `https://seussical2027.yourdomain.com` loads.
- `/api/calls` returns `[]` (JSON).
- Staff Login works with your PIN and a test call appears and survives a reload.
- If the show has Choreography: `/api/videos` returns videos (a 502 means the YouTube key is wrong or restricted by website).
- Saving a call updates the calendar event on that date (needs the Apps Script step).

## Things that bite

- **POSTs need `x-amz-content-sha256`.** CloudFront signs requests to the Lambda and requires the SHA-256 of the body in that header. `src/lib/callApi.js` does this; any other client must too.
- Many wrong PINs lock attempts for 15 minutes (by design).
- Calls are never deleted, only archived. The DynamoDB table has point-in-time recovery on.
- Changing the Lambda: rebuild the zip, upload it, then update the function code (or update the stack with a new `CodeKey`).
- Rotating a secret: change the SSM value; the Lambda reads it again within a few minutes. The bridge secret must change in both SSM and Apps Script.
- The wildcard certificate renews itself while its DNS validation CNAME stays in place. Do not delete it.
