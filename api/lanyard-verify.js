const { getFile, saveFile } = require("./github");

const BIOFYIT_GUILD_ID = "1435008832655982614";
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const LANYARD_API = "https://api.lanyard.rest/v1/users";

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

async function discordRequest(path) {
  return fetch(`https://discord.com/api/v10${path}`, {
    headers: {
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`
    }
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed."
    });
  }

  try {
    if (!DISCORD_BOT_TOKEN) {
      return res.status(500).json({
        success: false,
        error: "Discord verification is not configured."
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

    const memberResponse = await discordRequest(
      `/guilds/${BIOFYIT_GUILD_ID}/members/${discordId}`
    );

    if (memberResponse.status === 404) {
      return res.status(403).json({
        success: false,
        verified: false,
        error: "You must join the Biofyit Discord server first."
      });
    }

    if (!memberResponse.ok) {
      const error = await memberResponse.text();

      console.error(
        "DISCORD MEMBER ERROR:",
        memberResponse.status,
        error
      );

      return res.status(500).json({
        success: false,
        error: "Unable to verify your Discord membership."
      });
    }

    const lanyardResponse = await fetch(
      `${LANYARD_API}/${discordId}`
    );

    if (!lanyardResponse.ok) {
      return res.status(403).json({
        success: false,
        verified: false,
        error: "Your Discord account is not currently being tracked by Lanyard."
      });
    }

    const lanyard = await lanyardResponse.json();

    if (!lanyard.success || !lanyard.data) {
      return res.status(403).json({
        success: false,
        verified: false,
        error: "Lanyard could not find your Discord presence."
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
      guildId: BIOFYIT_GUILD_ID
    };

    await saveFile(
      profilePath,
      profile,
      profileResult.sha,
      `Connect Lanyard for ${user.username}`
    );

    return res.status(200).json({
      success: true,
      verified: true,
      discord: {
        id: discordId,
        username:
          lanyard.data.discord_user?.global_name ||
          lanyard.data.discord_user?.username ||
          "Discord User"
      },
      presence: {
        status: lanyard.data.discord_status || "offline",
        activities: lanyard.data.activities || [],
        spotify: lanyard.data.spotify || null
      }
    });

  } catch (error) {
    console.error(
      "LANYARD VERIFY ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Unable to verify your Lanyard connection."
    });
  }
};
