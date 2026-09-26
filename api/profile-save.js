const { getFile, saveFile, github } = require("./github");

function getCookie(req, name) {
  const cookies = req.headers.cookie || "";
  const match = cookies
    .split(";")
    .map(x => x.trim())
    .find(x => x.startsWith(`${name}=`));

  if (!match) return null;

  return decodeURIComponent(match.substring(name.length + 1));
}

function cleanString(value, max) {
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

function getExtension(file, fallback) {
  const extension = String(file?.extension || fallback)
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();

  return extension || fallback;
}

function decodeBase64(data) {
  const value = String(data || "");

  if (!value.includes("base64,")) {
    throw new Error("Invalid uploaded file.");
  }

  return value.split("base64,")[1];
}

async function uploadMedia(path, data, username) {
  const base64 = decodeBase64(data);

  if (!base64) {
    throw new Error("Uploaded file is empty.");
  }

  const existing = await github(path);

  let sha = null;

  if (existing.status === 200) {
    const existingData = await existing.json();
    sha = existingData.sha;
  } else if (existing.status !== 404) {
    const text = await existing.text();

    let error;

    try {
      error = JSON.parse(text);
    } catch {
      throw new Error("Unable to access GitHub media storage.");
    }

    throw new Error(error.message || "Unable to access GitHub media storage.");
  }

  const body = {
    message: `Update Biofyit media: ${username}`,
    content: base64
  };

  if (sha) {
    body.sha = sha;
  }

  const response = await github(path, {
    method: "PUT",
    body: JSON.stringify(body)
  });

  const text = await response.text();

  let result;

  try {
    result = JSON.parse(text);
  } catch {
    console.error("GitHub media response:", text);
    throw new Error("GitHub returned an invalid media response.");
  }

  if (!response.ok) {
    console.error("GitHub media upload error:", result);
    throw new Error(result.message || "Unable to publish photo.");
  }

  return `/api/media?path=${encodeURIComponent(path)}`;
}

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
        error: "Your session has expired."
      });
    }

    const username = String(user.username).toLowerCase();

    let profileResult = await getFile(`profiles/${username}.json`);

    if (!profileResult) {
      profileResult = {
        content: {
          username,
          displayName: username,
          bio: "",
          profilePicture: "",
          background: "",
          music: "",
          discord: {
            enabled: false,
            id: null
          },
          links: []
        },
        sha: null
      };
    }

    let body = req.body || {};

    if (typeof body === "string") {
      body = JSON.parse(body);
    }

    const oldProfile = profileResult.content || {};

    const updatedProfile = {
      ...oldProfile,
      username,
      displayName: cleanString(body.displayName, 80) || username,
      bio: cleanString(body.bio, 500)
    };

    let links = body.links;

    if (typeof links === "string") {
      try {
        links = JSON.parse(links);
      } catch {
        links = [];
      }
    }

    if (!Array.isArray(links)) {
      links = [];
    }

    const cleanedLinks = [];
    const usedPlatforms = new Set();

    for (const link of links.slice(0, 10)) {
      if (!link || typeof link !== "object") continue;

      const platform = String(link.platform || "")
        .trim()
        .toLowerCase();

      const url = String(link.url || "").trim();

      if (!allowedPlatforms.includes(platform)) continue;
      if (!url) continue;
      if (usedPlatforms.has(platform)) continue;
      if (!/^https?:\/\//i.test(url)) continue;

      usedPlatforms.add(platform);

      cleanedLinks.push({
        platform,
        url: url.slice(0, 500)
      });
    }

    updatedProfile.links = cleanedLinks;

    if (body.profilePicture?.data) {
      const extension = getExtension(
        body.profilePicture,
        "png"
      );

      updatedProfile.profilePicture = await uploadMedia(
        `media/profile-pictures/${username}.${extension}`,
        body.profilePicture.data,
        username
      );
    }

    if (body.background?.data) {
      const extension = getExtension(
        body.background,
        "jpg"
      );

      updatedProfile.background = await uploadMedia(
        `media/backgrounds/${username}.${extension}`,
        body.background.data,
        username
      );
    }

    if (body.music?.data) {
      const extension = getExtension(
        body.music,
        "mp3"
      );

      updatedProfile.music = await uploadMedia(
        `media/music/${username}.${extension}`,
        body.music.data,
        username
      );
    }

    await saveFile(
      `profiles/${username}.json`,
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
      error: error.message || "Unable to publish profile."
    });
  }
};
