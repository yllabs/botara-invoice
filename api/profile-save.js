const { getFile, saveFile } = require("./github");

function getCookie(req, name) {
  const cookies = req.headers.cookie || "";

  const match = cookies
    .split(";")
    .map(item => item.trim())
    .find(item => item.startsWith(`${name}=`));

  if (!match) return null;

  return decodeURIComponent(
    match.substring(name.length + 1)
  );
}

function validUsername(username) {
  return /^[a-z0-9_]{3,32}$/.test(username);
}

function cleanString(value, max = 500) {
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

    const user = users.find(item => item.id === userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Session expired."
      });
    }

    const username = user.username.toLowerCase();

    const profileResult = await getFile(
      `profiles/${username}.json`
    );

    if (!profileResult) {
      return res.status(404).json({
        success: false,
        error: "Profile not found."
      });
    }

    const body = req.body || {};

    const displayName = cleanString(
      body.displayName,
      80
    );

    const bio = cleanString(
      body.bio,
      500
    );

    let links = body.links;

    if (!Array.isArray(links)) {
      links = [];
    }

    if (links.length > 10) {
      return res.status(400).json({
        success: false,
        error: "You can only have 10 social links."
      });
    }

    const usedPlatforms = new Set();

    const cleanedLinks = [];

    for (const link of links) {
      if (!link || typeof link !== "object") {
        continue;
      }

      const platform = String(
        link.platform || ""
      )
        .trim()
        .toLowerCase();

      const url = String(
        link.url || ""
      ).trim();

      if (!allowedPlatforms.includes(platform)) {
        continue;
      }

      if (!url) {
        continue;
      }

      if (usedPlatforms.has(platform)) {
        continue;
      }

      if (
        !/^https?:\/\//i.test(url)
      ) {
        continue;
      }

      usedPlatforms.add(platform);

      cleanedLinks.push({
        platform,
        url: url.slice(0, 500)
      });
    }

    const oldProfile = profileResult.content || {};

    const updatedProfile = {
      ...oldProfile,
      username,
      displayName,
      bio,
      links: cleanedLinks
    };

    await saveFile(
      `profiles/${username}.json`,
      updatedProfile,
      profileResult.sha,
      `Update Biofyit profile: ${username}`
    );

    return res.status(200).json({
      success: true,
      message: "Profile saved successfully.",
      profile: updatedProfile
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: "Unable to save profile."
    });
  }
};
