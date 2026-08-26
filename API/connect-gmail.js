export default function handler(req,res){
  const base=`${req.headers["x-forwarded-proto"]||"https"}://${req.headers.host}`;
  const params=new URLSearchParams({
    client_id:process.env.GOOGLE_CLIENT_ID,
    redirect_uri:process.env.GOOGLE_REDIRECT_URI||`${base}/api/gmail-callback`,
    response_type:"code",
    scope:"https://www.googleapis.com/auth/gmail.send",
    access_type:"offline",
    prompt:"consent"
  });
  res.redirect("https://accounts.google.com/o/oauth2/v2/auth?"+params.toString());
}