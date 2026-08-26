export default function handler(req, res) {
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!redirectUri) return res.status(500).send("Missing GOOGLE_REDIRECT_URI in Vercel.");
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/gmail.send",
    access_type: "offline",
    prompt: "consent"
  });
  res.redirect("https://accounts.google.com/o/oauth2/v2/auth?" + params.toString());
}
