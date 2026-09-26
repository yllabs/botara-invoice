const crypto = require("crypto");

const CLIENT_ID = process.env.DISCORD_CLIENT_ID || "1553283277945577502";
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || "https://biofyit.com/api/discord-callback";

function getCookie(req, name) {
  const cookies = req.headers.cookie || "";
  const match = cookies
    .split(";")
    .map(x => x.trim())
    .find(x => x.startsWith(`${name}=`));

  if (!match) return null;

  return decodeURIComponent(
    match.substring(name.length + 1)
  );
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).send("Method not allowed.");
  }

  if (!getCookie(req, "biofyit_user")) {
    return res.redirect("/login.html");
  }

  const state = crypto.randomBytes(32).toString("hex");

  res.setHeader(
    "Set-Cookie",
    `biofyit_discord_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
  );

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: "identify",
    state
  });

  return res.redirect(
    `https://discord.com/oauth2/authorize?${params.toString()}`
  );
};
