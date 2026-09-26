const { getFile, saveFile } = require("./github");

function getCookie(req, name) {
  const cookies = req.headers.cookie || "";
  const match = cookies
    .split(";")
    .map(x => x.trim())
    .find(x => x.startsWith(`${name}=`));

  if (!match) return null;
  return decodeURIComponent(match.substring(name.length + 1));
}

function clean(value, max) {
  return String(value || "").trim().slice(0, max);
}

const allowedPlatforms = [
  "discord",
  "instagram",
  "tiktok",
  "youtube",
  "x",
  "facebook",
  "snapchat",
  "twitch",
  "kick",
  "github",
  "reddit",
  "spotify",
  "soundcloud",
  "steam",
  "roblox",
  "xbox",
  "playstation",
  "linkedin",
  "threads",
  "bluesky",
  "telegram",
  "pinterest",
  "tumblr",
  "gitlab",
  "codepen",
  "patreon",
  "kofi",
  "cashapp",
  "venmo",
  "paypal",
  "custom"
];

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed."
    });
  }

  try {
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

    const username = String(user.username).toLowerCase();
    const profilePath = `profiles/${username}.json`;

    const profileResult = await getFile(profilePath);

    if (!profileResult) {
      return res.status(404).json({
        success: false,
        error: "Profile not found."
      });
    }

    const body = req.body || {};
    const old = profileResult.content || {};

    const profilePicture =
      typeof body.profilePicture === "string"
        ? body.profilePicture.trim()
        : String(old.profilePicture || "");

    const background =
      typeof body.background === "string"
        ? body.background.trim()
        : String(old.background || "");

    const music =
      typeof body.music === "string"
        ? body.music.trim()
        : String(old.music || "");

    let discord = old.discord || {
      enabled: false,
      id: null
    };

    if (body.discord && typeof body.discord === "object") {
      discord = {
        enabled: Boolean(body.discord.enabled),
        id: body.discord.id
          ? clean(body.discord.id, 64)
          : null
      };
    }

    let links = [];

    if (Array.isArray(body.links)) {
      const used = new Set();

      for (const item of body.links.slice(0, 10)) {
        if (!item || typeof item !== "object") continue;

        const platform = clean(item.platform, 30).toLowerCase();
        const url = clean(item.url, 500);

        if (!allowedPlatforms.includes(platform)) continue;
        if (!url) continue;
        if (used.has(platform)) continue;
        if (!/^https?:\/\//i.test(url)) continue;

        used.add(platform);

        links.push({
          platform,
          url
        });
      }
    } else if (Array.isArray(old.links)) {
      links = old.links;
    }

    const updatedProfile = {
      ...old,
      username,
      displayName: clean(body.displayName, 80) || username,
      bio: clean(body.bio, 500),
      profilePicture,
      background,
      music,
      discord,
      links
    };

    await saveFile(
      profilePath,
      updatedProfile,
      profileResult.sha,
      `Update Biofyit profile: ${username}`
    );

    return res.status(200).json({
      success: true,
      message: "Profile published successfully.",
      profile: updatedProfile
    });

  } catch (error) {
    console.error("PROFILE SAVE ERROR:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Unable to save your profile."
    });
  }
};
