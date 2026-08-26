export default async function handler(req,res){
  const code=req.query.code;
  if(!code)return res.status(400).send("Missing Google authorization code.");
  try{
    const body=new URLSearchParams({
      code,
      client_id:process.env.GOOGLE_CLIENT_ID,
      client_secret:process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri:process.env.GOOGLE_REDIRECT_URI,
      grant_type:"authorization_code"
    });
    const r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body});
    const d=await r.json();
    if(!r.ok)return res.status(500).send(`<h1>Google error</h1><pre>${JSON.stringify(d,null,2)}</pre>`);
    if(!d.refresh_token)return res.status(500).send("<h1>No refresh token returned</h1><p>Remove this app from your Google Account permissions, then visit /api/connect-gmail again.</p>");
    res.setHeader("Content-Type","text/html");
    return res.status(200).send(`<!doctype html><html><body style="font-family:Arial;max-width:760px;margin:50px auto;padding:20px"><h1>Gmail connected</h1><p>Copy the refresh token below and add it in Vercel as <b>GOOGLE_REFRESH_TOKEN</b>. Keep it private.</p><textarea style="width:100%;height:140px;padding:15px">${d.refresh_token}</textarea><p>After adding it to Vercel, redeploy your project. Then return to your invoice website.</p></body></html>`);
  }catch(e){return res.status(500).send(e.message)}
}