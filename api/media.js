const { getFile, saveFile } = require("../github");

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

function getCookie(req, name) {
  const cookies = req.headers.cookie || "";

  const match = cookies
    .split(";")
    .map(x => x.trim())
    .find(x => x.startsWith(`${name}=`));

  if (!match) {
    return null;
  }

  return decodeURIComponent(
    match.substring(name.length + 1)
  );
}

function clean(value, max) {
  return String(value || "")
    .trim()
    .slice(0, max);
}

async function getProfile(req, res) {
  const username = String(
    req.query.username || ""
  )
    .trim()
    .toLowerCase();

  if (!/^[a-z0-9_]{3,32}$/.test(username)) {
    return res.status(400).json({
      success: false,
      error: "Invalid username."
    });
  }

  const result = await getFile(
    `profiles/${username}.json`
  );

  if (!result?.content) {
    return res.status(404).json({
      success: false,
      error: "Profile not found."
    });
  }

  return res.status(200).json({
    success: true,
    profile: result.content
  });
}

async function saveProfile(req, res) {
  const userId = getCookie(
    req,
    "biofyit_user"
  );

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: "You must be signed in."
    });
  }

  const usersResult = await getFile("users.json");
  const users = usersResult?.content || [];

  const user = users.find(
    item =>
      String(item.id) === String(userId)
  );

  if (!user) {
    return res.status(401).json({
      success: false,
      error: "Your session has expired."
    });
  }

  const username = String(
    user.username
  ).toLowerCase();

  const profilePath =
    `profiles/${username}.json`;

  const profileResult =
    await getFile(profilePath);

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

  let lanyard = old.lanyard || {
    enabled: false,
    id: null
  };

  if (
    body.lanyard &&
    typeof body.lanyard === "object"
  ) {
    const id = clean(
      body.lanyard.id,
      32
    );

    lanyard = {
      enabled: Boolean(
        body.lanyard.enabled
      ),
      id: id || null,
      verified: Boolean(
        body.lanyard.verified
      ),
      guildId:
        body.lanyard.guildId ||
        "1435008832655982614"
    };
  }

  let links = [];

  if (Array.isArray(body.links)) {
    const used = new Set();

    for (
      const item of body.links.slice(0, 10)
    ) {
      if (
        !item ||
        typeof item !== "object"
      ) {
        continue;
      }

      const platform = clean(
        item.platform,
        30
      ).toLowerCase();

      const url = clean(
        item.url,
        500
      );

      if (
        !allowedPlatforms.includes(
          platform
        )
      ) {
        continue;
      }

      if (!url) {
        continue;
      }

      if (used.has(platform)) {
        continue;
      }

      if (!/^https?:\/\//i.test(url)) {
        continue;
      }

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
    displayName:
      clean(body.displayName, 80) ||
      username,
    bio: clean(body.bio, 500),
    profilePicture,
    background,
    music,
    lanyard,
    links
  };

  delete updatedProfile.discord;

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
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === "GET") {
      return await getProfile(req, res);
    }

    if (req.method === "POST") {
      return await saveProfile(req, res);
    }

    return res.status(405).json({
      success: false,
      error: "Method not allowed."
    });
  } catch (error) {
    console.error("PROFILE ERROR:", error);

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        "Unable to process profile."
    });
  }
};
