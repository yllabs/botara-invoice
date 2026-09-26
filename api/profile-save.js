const { getFile, saveFile, github } = require("./github");

function getCookie(req, name) {
  const cookies = req.headers.cookie || "";
  const match = cookies.split(";").map(item => item.trim()).find(item => item.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.substring(name.length + 1));
}

function cleanString(value, max = 500) {
  return String(value || "").trim().slice(0, max);
}

const allowedPlatforms = [
  "discord","instagram","tiktok","youtube","x","facebook","snapchat","twitch","kick",
  "github","reddit","spotify","soundcloud","steam","roblox","xbox","playstation",
  "linkedin","threads","bluesky","telegram","pinterest","tumblr","gitlab","codepen",
  "patreon","kofi","cashapp","venmo","paypal","custom"
];

async function uploadFile(path, base64, contentType, username) {
  const cleanBase64 = String(base64).replace(/^data:[^;]+;base64,/, "");

  const response = await github(path, {
    method: "PUT",
    body: JSON.stringify({
      message: `Update Biofyit media: ${username}`,
      content: cleanBase64
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("GitHub upload error:", error);
    throw new Error("Unable to upload media.");
  }

  return `https://raw.githubusercontent.com/${process.env.BIOFYIT_DATA_REPO}/main/${path}`;
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
        error: "Session expired."
      });
    }

    const username = String(user.username).toLowerCase();
    const profilePath = `profiles/${username}.json`;

    let profileResult = await getFile(profilePath);

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
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
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

      const platform = String(link.platform || "").trim().toLowerCase();
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

    if (body.discord && typeof body.discord === "object") {
      updatedProfile.discord = {
        enabled: Boolean(body.discord.enabled),
        id: body.discord.id || null
      };
    }

    if (body.profilePicture && body.profilePicture.data) {
      const extension = String(body.profilePicture.extension || "png").replace(/[^a-z0-9]/gi, "").toLowerCase() || "png";
      const path = `media/profile-pictures/${username}.${extension}`;

      updatedProfile.profilePicture = await uploadFile(
        path,
        body.profilePicture.data,
        body.profilePicture.type || "image/png",
        username
      );
    }

    if (body.background && body.background.data) {
      const extension = String(body.background.extension || "jpg").replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
      const path = `media/backgrounds/${username}.${extension}`;

      updatedProfile.background = await uploadFile(
        path,
        body.background.data,
        body.background.type || "image/jpeg",
        username
      );
    }

    if (body.music && body.music.data) {
      const extension = String(body.music.extension || "mp3").replace(/[^a-z0-9]/gi, "").toLowerCase() || "mp3";
      const path = `media/music/${username}.${extension}`;

      updatedProfile.music = await uploadFile(
        path,
        body.music.data,
        body.music.type || "audio/mpeg",
        username
      );
    }

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
      error: "Unable to publish profile."
    });
  }
};
