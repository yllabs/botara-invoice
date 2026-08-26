export default async function handler(req, res) {
  if (!req.query.code) return res.status(400).send("Missing authorization code.");
  try {
    const body = new URLSearchParams({
      code: req.query.code,
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirect_uri: process.env.GOOGLE_REDIRECT_URI || "",
      grant_type: "authorization_code"
    });
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {"Content-Type":"application/x-www-form-urlencoded"},
      body
    });
    const d = await r.json();
    if (!r.ok) return res.status(500).send(`<pre>${JSON.stringify(d,null,2)}</pre>`);
    if (!d.refresh_token) return res.status(500).send("No refresh token returned. Remove this app from your Google Account permissions, then try /api/connect-gmail again.");
    res.setHeader("Content-Type","text/html");
    res.status(200).send(`<h1>Gmail connected</h1><p>Copy this private refresh token into Vercel as GOOGLE_REFRESH_TOKEN:</p><textarea style="width:95%;height:160px">${d.refresh_token}</textarea><p>Then redeploy.</p>`);
  } catch (e) { res.status(500).send(e.message); }
}