const { getFile, saveFile } = require("./github");

const GUILD_ID = "1435008832655982614";
const PRESENCE_API_URL = process.env.PRESENCE_API_URL;
const PRESENCE_API_KEY = process.env.PRESENCE_API_KEY;

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

function validDiscordId(id) {
  return /^\d{17,20}$/.test(id);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed."
    });
  }

  try {
    if (!PRESENCE_API_URL || !PRESENCE_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "Presence service is not configured."
      });
    }

    const userId = getCookie(req, "biofyit_user");

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "You must be signed in."
      });
    }

    const usersResult = await getFile("users.json");
    const users = usersResult?.content || [];

    const user = users.find(
      item => String(item.id) === String(userId)
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Your session has expired."
      });
    }

    const discordId = String(
      req.body?.discordId || ""
    ).trim();

    if (!validDiscordId(discordId)) {
      return res.status(400).json({
        success: false,
        error: "Enter a valid Discord User ID."
      });
    }

    const baseUrl = PRESENCE_API_URL.replace(/\/+$/, "");

    const response = await fetch(
      `${baseUrl}/v1/users/${encodeURIComponent(discordId)}`,
      {
        headers: {
          "X-API-Key": PRESENCE_API_KEY
        }
      }
    );

    const result = await response.json().catch(() => null);

    if (response.status === 404) {
      return res.status(403).json({
        success: false,
        verified: false,
        error: "You must join the Biofyit Discord server first."
      });
    }

    if (!response.ok || !result?.success || !result?.data) {
      console.error(
        "PRESENCE SERVICE ERROR:",
        response.status,
        result
      );

      return res.status(403).json({
        success: false,
        verified: false,
        error: "Your Discord account could not be found by Biofyit."
      });
    }

    const data = result.data;

    if (String(data.guild_id) !== GUILD_ID) {
      return res.status(403).json({
        success: false,
        verified: false,
        error: "Your Discord account is not connected to Biofyit."
      });
    }

    const profilePath = `profiles/${user.username}.json`;
    const profileResult = await getFile(profilePath);

    if (!profileResult) {
      return res.status(404).json({
        success: false,
        error: "Profile not found."
      });
    }

    const profile = profileResult.content || {};

    profile.lanyard = {
      enabled: true,
      id: discordId,
      verified: true,
      guildId: GUILD_ID
    };

    await saveFile(
      profilePath,
      profile,
      profileResult.sha,
      `Connect Discord presence for ${user.username}`
    );

    return res.status(200).json({
      success: true,
      verified: true,
      discord: {
        id: discordId,
        username:
          data.discord_user?.global_name ||
          data.discord_user?.username ||
          "Discord User",
        avatar: data.discord_user?.avatar_url || null
      },
      presence: {
        status: data.discord_status || "offline",
        activities: data.activities || [],
        spotify: data.spotify || null
      }
    });

  } catch (error) {
    console.error(
      "PRESENCE VERIFY ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Unable to connect to the presence service."
    });
  }
};
