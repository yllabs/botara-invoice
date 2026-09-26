const { getFile, saveFile, github } = require("./github");

function getCookie(req, name) {
  const cookies = req.headers.cookie || "";
  const match = cookies.split(";").map(x => x.trim()).find(x => x.startsWith(`${name}=`));
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

async function uploadMedia(path, data, username) {
  const base64 = String(data).replace(/^data:[^;]+;base64, "");

  const existing = await github(path);

  let sha = null;

  if (existing.ok) {
    const file = await existing.json();
    sha = file.sha;
  } else if (existing.status !== 404) {
    const error = await existing.text();
    console.error(error);
    throw new Error("Unable to access media storage.");
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

  if (!response.ok) {
    const error = await response.text();
    console.error("MEDIA UPLOAD ERROR:", error);
    throw new Error("Unable to publish photo.");
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
    const user = users.find(x => x.id === userId);

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

    if (body.profilePicture?.data) {
      const extension = String(body.profilePicture.extension || "png")
        .replace(/[^a-z0-9]/gi, "")
        .toLowerCase();

      updatedProfile.profilePicture = await uploadMedia(
        `media/profile-pictures/${username}.${extension || "png"}`,
        body.profilePicture.data,
        username
      );
    }

    if (body.background?.data) {
      const extension = String(body.background.extension || "jpg")
        .replace(/[^a-z0-9]/gi, "")
        .toLowerCase();

      updatedProfile.background = await uploadMedia(
        `media/backgrounds/${username}.${extension || "jpg"}`,
        body.background.data,
        username
      );
    }

    if (body.music?.data) {
      const extension = String(body.music.extension || "mp3")
        .replace(/[^a-z0-9]/gi, "")
        .toLowerCase();

      updatedProfile.music = await uploadMedia(
        `media/music/${username}.${extension || "mp3"}`,
        body.music.data,
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
      error: error.message || "Unable to publish profile."
    });
  }
};
