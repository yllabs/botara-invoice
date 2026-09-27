const crypto = require("crypto");
const { getFile, saveFile } = require("../github");

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;
const PRESENCE_API_URL = process.env.PRESENCE_API_URL;
const PRESENCE_API_KEY = process.env.PRESENCE_API_KEY;
const GUILD_ID = "1435008832655982614";

function getCookie(req, name) {
  const cookies = req.headers.cookie || "";
  const parts = cookies.split(";");

  for (const part of parts) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) {
      return decodeURIComponent(value.join("="));
    }
  }

  return null;
}

async function getCurrentUser(req) {
  const userId = getCookie(req, "biofyit_user");

  if (!userId) return null;

  const file = await getFile("users.json");
  const users = file ? file.content : [];

  return users.find(user => user.id === userId) || null;
}

module.exports = async function handler(req, res) {
  try {
    const action = String(req.query.action || "").toLowerCase();

    if (action === "start") {
      const user = await getCurrentUser(req);

      if (!user) {
        return res.redirect("/login.html");
      }

      const state = crypto.randomBytes(32).toString("hex");

      res.setHeader(
        "Set-Cookie",
        `biofyit_discord_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
      );

      const params = new URLSearchParams({
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        response_type: "code",
        scope: "identify",
        state
      });

      return res.redirect(
        `https://discord.com/oauth2/authorize?${params.toString()}`
      );
    }

    if (action === "callback") {
      const user = await getCurrentUser(req);

      if (!user) {
        return res.redirect(
          "/dashboard.html?discord=error&message=" +
          encodeURIComponent("Your Biofyit session expired. Please sign in again.")
        );
      }

      const code = String(req.query.code || "");
      const returnedState = String(req.query.state || "");
      const savedState = getCookie(req, "biofyit_discord_state");

      if (!code) {
        return res.redirect(
          "/dashboard.html?discord=error&message=" +
          encodeURIComponent("Discord did not return an authorization code.")
        );
      }

      if (!savedState || savedState !== returnedState) {
        return res.redirect(
          "/dashboard.html?discord=error&message=" +
          encodeURIComponent("Discord authorization state was invalid.")
        );
      }

      if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
        return res.redirect(
          "/dashboard.html?discord=error&message=" +
          encodeURIComponent("Discord OAuth environment variables are missing.")
        );
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

      const tokenText = await tokenResponse.text();

      let tokenData;

      try {
        tokenData = JSON.parse(tokenText);
      } catch {
        tokenData = null;
      }

      if (!tokenResponse.ok || !tokenData?.access_token) {
        console.error("DISCORD TOKEN ERROR:", tokenText);

        return res.redirect(
          "/dashboard.html?discord=error&message=" +
          encodeURIComponent(
            `Discord token exchange failed (${tokenResponse.status}).`
          )
        );
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

      if (!discordResponse.ok || !discordUser?.id) {
        console.error("DISCORD USER ERROR:", discordUser);

        return res.redirect(
          "/dashboard.html?discord=error&message=" +
          encodeURIComponent("Biofyit could not retrieve your Discord account.")
        );
      }

      if (!PRESENCE_API_URL || !PRESENCE_API_KEY) {
        return res.redirect(
          "/dashboard.html?discord=error&message=" +
          encodeURIComponent("Presence service is not configured.")
        );
      }

      const presenceUrl =
        PRESENCE_API_URL.replace(/\/+$/, "") +
        `/v1/users/${discordUser.id}`;

      const presenceResponse = await fetch(presenceUrl, {
        headers: {
          "X-API-Key": PRESENCE_API_KEY
        }
      });

      const presenceText = await presenceResponse.text();

      let presenceData;

      try {
        presenceData = JSON.parse(presenceText);
      } catch {
        presenceData = null;
      }

      if (!presenceResponse.ok) {
        console.error("PRESENCE ERROR:", presenceResponse.status, presenceText);

        return res.redirect(
          "/dashboard.html?discord=error&message=" +
          encodeURIComponent(
            `You must be in the Biofyit Discord server to connect Discord.`
          )
        );
      }

      if (!presenceData || presenceData.success === false) {
        return res.redirect(
          "/dashboard.html?discord=error&message=" +
          encodeURIComponent("Presence service could not verify your Discord account.")
        );
      }

      const profilePath = `profiles/${user.username}.json`;
      const profileFile = await getFile(profilePath);

      if (!profileFile) {
        return res.redirect(
          "/dashboard.html?discord=error&message=" +
          encodeURIComponent("Your Biofyit profile could not be found.")
        );
      }

      const profile = profileFile.content;

      profile.lanyard = {
        enabled: true,
        id: discordUser.id,
        verified: true,
        guildId: GUILD_ID
      };

      await saveFile(
        profilePath,
        profile,
        profileFile.sha,
        `Connect Discord for ${user.username}`
      );

      res.setHeader(
        "Set-Cookie",
        "biofyit_discord_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
      );

      return res.redirect("/dashboard.html?discord=connected");
    }

    return res.status(400).json({
      success: false,
      error: "Invalid Discord action."
    });
  } catch (error) {
    console.error("DISCORD CALLBACK ERROR:", error);

    return res.redirect(
      "/dashboard.html?discord=error&message=" +
      encodeURIComponent(error.message || "Unable to connect Discord.")
    );
  }
};
