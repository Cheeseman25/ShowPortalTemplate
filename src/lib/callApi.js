// Call board API client. Posts a JSON action to the call board backend and returns the parsed reply.
// A same-site URL (starts with "/", the AWS API behind CloudFront) must carry the body's SHA-256 in
// x-amz-content-sha256, which CloudFront needs to sign POSTs to the Lambda. An Apps Script URL must NOT
// get custom headers: they would trigger a CORS preflight, which Apps Script cannot answer.
export async function postCall(url, body) {
  const text = JSON.stringify(body);
  const headers = { 'Content-Type': 'text/plain;charset=utf-8' };
  if (url.startsWith('/')) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    headers['x-amz-content-sha256'] = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  }
  const res = await fetch(url, { method: 'POST', headers, body: text });
  return res.json();
}
