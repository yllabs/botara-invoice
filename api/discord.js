const crypto = require("crypto");
const { getFile, saveFile } = require("../github");

const CLIENT_ID =
  process.env.DISCORD_CLIENT_ID;

const CLIENT_SECRET =
  process.env.DISCORD_CLIENT_SECRET;

const REDIRECT_URI =
  process.env.DISCORD_REDIRECT_URI;

const PRESENCE_API_URL =
  process.env.PRESENCE_API_URL;

const PRESENCE_API_KEY =
  process.env.PRESENCE_API_KEY;

const GUILD_ID =
  "1435008832655982614";

function getCookie(req, name) {
  const header =
    req.headers?.cookie || "";

  for (const item of header.split(";")) {
    const index = item.indexOf("=");

    if (index === -1) continue;

    const key =
      item.slice(0, index).trim();

    const value =
      item.slice(index + 1).trim();

    if (key === name) {
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }

  return null;
}

async function getUser(req) {
  const userId =
    getCookie(req, "biofyit_user");

  if (!userId) return null;

  const file =
    await getFile("users.json");

  const users =
    Array.isArray(file?.content)
      ? file.content
      : [];

  return users.find(
    user => user.id === userId
  ) || null;
}

function fail(res, message) {
  return res.redirect(
    "/dashboard.html?discord=error&message=" +
    encodeURIComponent(message)
  );
}

module.exports = async function handler(
  req,
  res
) {
  try {
    const action =
      String(
        req.query?.action || ""
      ).toLowerCase();

    if (action === "start") {
      const user =
        await getUser(req);

      if (!user) {
        return res.redirect(
          "/login.html"
        );
      }

      if (
        !CLIENT_ID ||
        !CLIENT_SECRET ||
        !REDIRECT_URI
      ) {
        return fail(
          res,
          "Discord OAuth is not configured."
        );
      }

      const state =
        crypto
          .randomBytes(32)
          .toString("hex");

      res.setHeader(
        "Set-Cookie",
        `biofyit_discord_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
      );

      const params =
        new URLSearchParams({
          client_id: CLIENT_ID,
          redirect_uri: REDIRECT_URI,
          response_type: "code",
          scope: "identify",
          state
        });

      return res.redirect(
        "https://discord.com/oauth2/authorize?" +
        params.toString()
      );
    }

    if (action === "callback") {
      const user =
        await getUser(req);

      if (!user) {
        return fail(
          res,
          "Your Biofyit session expired."
        );
      }

      const code =
        String(
          req.query?.code || ""
        );

      const state =
        String(
          req.query?.state || ""
        );

      const savedState =
        getCookie(
          req,
          "biofyit_discord_state"
        );

      if (!code) {
        return fail(
          res,
          "Discord did not return an authorization code."
        );
      }

      if (!savedState) {
        return fail(
          res,
          "Discord state cookie was missing."
        );
      }

      if (state !== savedState) {
        return fail(
          res,
          "Discord state verification failed."
        );
      }

      if (
        !CLIENT_ID ||
        !CLIENT_SECRET ||
        !REDIRECT_URI
      ) {
        return fail(
          res,
          "Discord OAuth environment variables are missing."
        );
      }

      let tokenResponse;

      try {
        tokenResponse =
          await fetch(
            "https://discord.com/api/oauth2/token",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/x-www-form-urlencoded"
              },
              body:
                new URLSearchParams({
                  client_id: CLIENT_ID,
                  client_secret:
                    CLIENT_SECRET,
                  grant_type:
                    "authorization_code",
                  code,
                  redirect_uri:
                    REDIRECT_URI
                })
            }
          );
      } catch {
        return fail(
          res,
          "Biofyit could not reach Discord."
        );
      }

      const tokenRaw =
        await tokenResponse.text();

      let token;

      try {
        token = JSON.parse(tokenRaw);
      } catch {
        token = null;
      }

      if (
        !tokenResponse.ok ||
        !token?.access_token
      ) {
        console.error(
          "DISCORD TOKEN:",
          tokenRaw
        );

        return fail(
          res,
          `Discord authorization failed with HTTP ${tokenResponse.status}.`
        );
      }

      let discordResponse;

      try {
        discordResponse =
          await fetch(
            "https://discord.com/api/users/@me",
            {
              headers: {
                Authorization:
                  `Bearer ${token.access_token}`
              }
            }
          );
      } catch {
        return fail(
          res,
          "Could not retrieve your Discord account."
        );
      }

      const discordRaw =
        await discordResponse.text();

      let discordUser;

      try {
        discordUser =
          JSON.parse(discordRaw);
      } catch {
        discordUser = null;
      }

      if (
        !discordResponse.ok ||
        !discordUser?.id
      ) {
        console.error(
          "DISCORD USER:",
          discordRaw
        );

        return fail(
          res,
          "Discord account verification failed."
        );
      }

      if (
        !PRESENCE_API_URL ||
        !PRESENCE_API_KEY
      ) {
        return fail(
          res,
          "Presence service is not configured."
        );
      }

      const presenceUrl =
        PRESENCE_API_URL.replace(
          /\/+$/,
          ""
        ) +
        `/v1/users/${discordUser.id}`;

      let presenceResponse;

      try {
        presenceResponse =
          await fetch(
            presenceUrl,
            {
              method: "GET",
              headers: {
                Accept:
                  "application/json",
                "X-API-Key":
                  PRESENCE_API_KEY
              }
            }
          );
      } catch (error) {
        console.error(
          "PRESENCE FETCH:",
          error
        );

        return fail(
          res,
          "Biofyit could not reach the presence server."
        );
      }

      const presenceRaw =
        await presenceResponse.text();

      let presence;

      try {
        presence =
          JSON.parse(presenceRaw);
      } catch {
        presence = null;
      }

      if (!presenceResponse.ok) {
        console.error(
          "PRESENCE RESPONSE:",
          presenceResponse.status,
          presenceRaw
        );

        return fail(
          res,
          `Presence verification failed with HTTP ${presenceResponse.status}.`
        );
      }

      if (
        presence?.success === false
      ) {
        return fail(
          res,
          presence.error ||
          "Your Discord account could not be verified."
        );
      }

      const profilePath =
        `profiles/${user.username}.json`;

      const profileFile =
        await getFile(profilePath);

      if (!profileFile) {
        return fail(
          res,
          "Your Biofyit profile could not be found."
        );
      }

      const profile =
        profileFile.content || {};

      profile.username =
        user.username;

      profile.lanyard = {
        enabled: true,
        id: discordUser.id,
        verified: true,
        guildId: GUILD_ID
      };

      if (
        !profile.profilePicture &&
        discordUser.avatar
      ) {
        profile.profilePicture =
          `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png?size=256`;
      }

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

      return res.redirect(
        "/dashboard.html?discord=connected"
      );
    }

    return res.status(400).json({
      success: false,
      error: "Invalid Discord action."
    });
  } catch (error) {
    console.error(
      "DISCORD ERROR:",
      error
    );

    return fail(
      res,
      error.message ||
      "Discord connection failed."
    );
  }
};
