const { getFile, saveFile } = require("./github");

const CLIENT_ID = process.env.DISCORD_CLIENT_ID || "1553283277945577502";
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || "https://biofyit.com/api/discord-callback";

const PRESENCE_API_URL = process.env.PRESENCE_API_URL;
const PRESENCE_API_KEY = process.env.PRESENCE_API_KEY;

const GUILD_ID = "1435008832655982614";

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

function clearStateCookie() {
  return "biofyit_discord_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).send("Method not allowed.");
  }

  try {
    if (!CLIENT_SECRET) {
      return res.status(500).send("Discord OAuth is not configured.");
    }

    if (!PRESENCE_API_URL || !PRESENCE_API_KEY) {
      return res.status(500).send("Presence service is not configured.");
    }

    const userId = getCookie(req, "biofyit_user");
    const savedState = getCookie(req, "biofyit_discord_state");

    const code = String(req.query.code || "");
    const state = String(req.query.state || "");

    if (!userId) {
      return res.redirect("/login.html");
    }

    if (!savedState || !state || state !== savedState) {
      return res.status(400).send("Invalid Discord authorization state.");
    }

    if (!code) {
      return res.status(400).send("Discord authorization was cancelled.");
    }

    const tokenResponse = await fetch(
      "https://discord.com/api/oauth2/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          grant_type: "authorization_code",
          code,
          redirect_uri: REDIRECT_URI
        })
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("DISCORD TOKEN ERROR:", tokenData);
      return res.status(400).send("Unable to authorize your Discord account.");
    }

    const discordResponse = await fetch(
      "https://discord.com/api/users/@me",
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`
        }
      }
    );

    const discordUser = await discordResponse.json();

    if (!discordResponse.ok || !discordUser.id) {
      return res.status(400).send("Unable to identify your Discord account.");
    }

    const presenceUrl =
      `${PRESENCE_API_URL.replace(/\/+$/, "")}/v1/users/${discordUser.id}`;

    const presenceResponse = await fetch(
      presenceUrl,
      {
        headers: {
          "X-API-Key": PRESENCE_API_KEY
        }
      }
    );

    const presenceData = await presenceResponse.json().catch(() => null);

    if (!presenceResponse.ok || !presenceData?.success) {
      return res.status(403).send(
        "You must join the Biofyit Discord server before connecting Discord."
      );
    }

    if (
      String(presenceData.data?.guild_id) !== GUILD_ID
    ) {
      return res.status(403).send(
        "Your Discord account is not connected to the Biofyit server."
      );
    }

    const usersResult = await getFile("users.json");
    const users = usersResult?.content || [];

    const user = users.find(
      item => String(item.id) === String(userId)
    );

    if (!user) {
      return res.status(401).send("Your Biofyit session has expired.");
    }

    const profilePath = `profiles/${user.username}.json`;
    const profileResult = await getFile(profilePath);

    if (!profileResult) {
      return res.status(404).send("Biofyit profile not found.");
    }

    const profile = profileResult.content || {};

    profile.lanyard = {
      enabled: true,
      id: String(discordUser.id),
      verified: true,
      guildId: GUILD_ID
    };

    await saveFile(
      profilePath,
      profile,
      profileResult.sha,
      `Connect Discord for ${user.username}`
    );

    res.setHeader("Set-Cookie", clearStateCookie());

    return res.redirect("/dashboard.html?discord=connected");

  } catch (error) {
    console.error("DISCORD CALLBACK ERROR:", error);

    return res.status(500).send(
      "Unable to connect your Discord account."
    );
  }
};
