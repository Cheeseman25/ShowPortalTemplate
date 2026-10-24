# Call board API (AWS)

Replaces the Google Sheet "Rehearsals" tab for the call board. Same actions and JSON as the Apps Script
(`verifyPin`, `save`, `archive`/`unarchive`, `calendarAttach`, `calendarCreate`, plus `GET` list), so the site only
changes its URL (`callBoardUrl` in the show settings). It also serves `GET /api/videos`, the choreography playlist,
so the YouTube key never reaches the browser.

```
browser --> CloudFront (/api/calls, /api/videos) --> Lambda (function URL, IAM + CloudFront OAC)
                                                      |-- DynamoDB table (calls; "_auth" item = PIN lockout counter)
                                                      |-- SSM Parameter Store SecureStrings (PIN, bridge secret, YouTube key)
                                                      '-- Apps Script bridge (calendar only: awsSync / awsAttach / awsCreate)
```

Calendar work stays in Apps Script because the Google Calendar lives there. The Lambda sends it the calls for the
saved date plus a shared secret; Apps Script uses that copy instead of the Sheet for that one request.

## Settings (Lambda environment variables)
| Name | Meaning |
|---|---|
| `TABLE_NAME` | DynamoDB table, partition key `id` (string) |
| `PIN_PARAM` | SSM SecureString name for the staff PIN |
| `SYNC_PARAM` | SSM SecureString name for the Apps Script bridge secret |
| `APPS_SCRIPT_URL` | Apps Script `/exec` URL ("" turns the calendar bridge off) |
| `YT_PARAM` | SSM SecureString name for the YouTube Data API key |
| `YT_PLAYLIST_ID` | Playlist served at `/api/videos` (fixed here so callers cannot choose another) |

Secrets are never in this repo. The YouTube key must be API-restricted to "YouTube Data API v3" and must NOT have a
website restriction (requests come from AWS, not a browser).

## Behaviour worth knowing
- Wrong PIN 10 times in 15 minutes locks all PIN attempts for 15 minutes.
- Writes validate and trim every field, cap sizes, and drop unknown fields. Calls are never deleted, only archived.
- Every write logs one structured JSON line (who, what, when, result) and never the PIN.
- POSTs through CloudFront must carry `x-amz-content-sha256` (the SHA-256 of the body). `src/lib/callApi.js` does this.

## Test and deploy
```
cd aws/callboard-api && npm install && npm test        # 17 tests, no AWS access needed
zip -j callboard-api.zip index.mjs                       # the AWS SDK is already in the Lambda runtime
```
Upload the zip and update the function code (console, or `aws lambda update-function-code`). Then build and upload the
site with `npm run build:aws` (merges `show/show.aws.config.js` over `show/show.config.js`), and invalidate CloudFront.
