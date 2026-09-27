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

  for (const part of cookies.split(";")) {
    const index = part.indexOf("=");

    if (index === -1) continue;

    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();

    if (key === name) {
      return decodeURIComponent(value);
    }
  }

  return null;
}

async function getUser(req) {
  const userId = getCookie(req, "biofyit_user");

  if (!userId) return null;

  const file = await getFile("users.json");
  const users = file ? file.content : [];

  return users.find(user => user.id === userId) || null;
}

function errorRedirect(res, message) {
  return res.redirect(
    "/dashboard.html?discord=error&message=" +
    encodeURIComponent(message)
  );
}

module.exports = async function handler(req, res) {
  try {
    const action = String(req.query.action || "").toLowerCase();

    if (action === "start") {
      const user = await getUser(req);

      if (!user) {
        return res.redirect("/login.html");
      }

      if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
        return errorRedirect(
          res,
          "Discord OAuth environment variables are missing."
        );
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
        "https://discord.com/oauth2/authorize?" + params.toString()
      );
    }

    if (action === "callback") {
      const user = await getUser(req);

      if (!user) {
        return errorRedirect(
          res,
          "Biofyit session was lost before Discord finished."
        );
      }

      const code = String(req.query.code || "");
      const returnedState = String(req.query.state || "");
      const savedState = getCookie(req, "biofyit_discord_state");

      if (!code) {
        return errorRedirect(
          res,
          "Discord did not return an authorization code."
        );
      }

      if (!savedState) {
        return errorRedirect(
          res,
          "Discord state cookie was missing."
        );
      }

      if (savedState !== returnedState) {
        return errorRedirect(
          res,
          "Discord state verification failed."
        );
      }

      if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
        return errorRedirect(
          res,
          "Discord OAuth environment variables are missing."
        );
      }

      let tokenResponse;

      try {
        tokenResponse = await fetch(
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
      } catch (error) {
        console.error("DISCORD TOKEN FETCH FAILED:", error);

        return errorRedirect(
          res,
          "Step 1 failed: Biofyit could not reach Discord's token API."
        );
      }

      const tokenText = await tokenResponse.text();

      let tokenData;

      try {
        tokenData = JSON.parse(tokenText);
      } catch {
        tokenData = null;
      }

      if (!tokenResponse.ok || !tokenData?.access_token) {
        console.error(
          "DISCORD TOKEN RESPONSE:",
          tokenResponse.status,
          tokenText
        );

        return errorRedirect(
          res,
          `Step 1 failed: Discord returned HTTP ${tokenResponse.status}.`
        );
      }

      let discordResponse;

      try {
        discordResponse = await fetch(
          "https://discord.com/api/users/@me",
          {
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`
            }
          }
        );
      } catch (error) {
        console.error("DISCORD USER FETCH FAILED:", error);

        return errorRedirect(
          res,
          "Step 2 failed: Biofyit could not reach Discord user API."
        );
      }

      const discordText = await discordResponse.text();

      let discordUser;

      try {
        discordUser = JSON.parse(discordText);
      } catch {
        discordUser = null;
      }

      if (!discordResponse.ok || !discordUser?.id) {
        console.error(
          "DISCORD USER RESPONSE:",
          discordResponse.status,
          discordText
        );

        return errorRedirect(
          res,
          `Step 2 failed: Discord returned HTTP ${discordResponse.status}.`
        );
      }

      if (!PRESENCE_API_URL) {
        return errorRedirect(
          res,
          "Step 3 failed: PRESENCE_API_URL is missing."
        );
      }

      if (!PRESENCE_API_KEY) {
        return errorRedirect(
          res,
          "Step 3 failed: PRESENCE_API_KEY is missing."
        );
      }

      const presenceUrl =
        PRESENCE_API_URL.replace(/\/+$/, "") +
        `/v1/users/${discordUser.id}`;

      let presenceResponse;

      try {
        presenceResponse = await fetch(presenceUrl, {
          headers: {
            "X-API-Key": PRESENCE_API_KEY
          }
        });
      } catch (error) {
        console.error("PRESENCE FETCH FAILED:", error);

        return errorRedirect(
          res,
          "Step 3 failed: Biofyit could not reach the presence server."
        );
      }

      const presenceText = await presenceResponse.text();

      let presenceData;

      try {
        presenceData = JSON.parse(presenceText);
      } catch {
        presenceData = null;
      }

      if (!presenceResponse.ok) {
        console.error(
          "PRESENCE RESPONSE:",
          presenceResponse.status,
          presenceText
        );

        return errorRedirect(
          res,
          `Step 3 failed: Presence server returned HTTP ${presenceResponse.status}.`
        );
      }

      if (!presenceData || presenceData.success === false) {
        return errorRedirect(
          res,
          "Step 3 failed: Presence server could not verify your Discord account."
        );
      }

      const profilePath = `profiles/${user.username}.json`;
      const profileFile = await getFile(profilePath);

      if (!profileFile) {
        return errorRedirect(
          res,
          "Step 4 failed: Biofyit profile was not found."
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
    console.error("DISCORD CALLBACK CRASH:", error);

    return errorRedirect(
      res,
      "Discord connection crashed: " + (error.message || "Unknown error.")
    );
  }
};
