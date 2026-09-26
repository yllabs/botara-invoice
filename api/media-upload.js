const { getFile, github } = require("./github");

function getCookie(req, name) {
  const cookies = req.headers.cookie || "";
  const match = cookies.split(";").map(x => x.trim()).find(x => x.startsWith(`${name}=`));
  if (!match) return null;
  return match ? decodeURIComponent(match.substring(name.length + 1)) : null;
}

const allowed = {
  profilePicture: {
    folder: "media/profile-pictures",
    extensions: ["png", "jpg", "jpeg", "webp", "gif"]
  },
  background: {
    folder: "media/backgrounds",
    extensions: ["png", "jpg", "jpeg", "webp", "gif"]
  },
  music: {
    folder: "media/music",
    extensions: ["mp3", "wav", "ogg"]
  }
};

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed." });
  }

  try {
    const userId = getCookie(req, "biofyit_user");

    if (!userId) {
      return res.status(401).json({ success: false, error: "You must be signed in." });
    }

    const usersResult = await getFile("users.json");
    const users = usersResult?.content || [];
    const user = users.find(x => x.id === userId);

    if (!user) {
      return res.status(401).json({ success: false, error: "Session expired." });
    }

    const body = req.body || {};
    const type = String(body.type || "");
    const file = body.file || {};

    if (!allowed[type]) {
      return res.status(400).json({ success: false, error: "Invalid media type." });
    }

    const base64 = String(file.data || "").replace(/^data:[^;]+;base64,/, "");

    if (!base64) {
      return res.status(400).json({ success: false, error: "No file was provided." });
    }

    const extension = String(file.extension || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    if (!allowed[type].extensions.includes(extension)) {
      return res.status(400).json({ success: false, error: "Invalid file type." });
    }

    const username = String(user.username).toLowerCase();
    const path = `${allowed[type].folder}/${username}.${extension}`;

    const existing = await github(path);
    let sha = null;

    if (existing.ok) {
      const existingFile = await existing.json();
      sha = existingFile.sha;
    } else if (existing.status !== 404) {
      return res.status(500).json({
        success: false,
        error: "Unable to access media storage."
      });
    }

    const githubBody = {
      message: `Update Biofyit ${type}: ${username}`,
      content: base64
    };

    if (sha) githubBody.sha = sha;

    const upload = await github(path, {
      method: "PUT",
      body: JSON.stringify(githubBody)
    });

    if (!upload.ok) {
      const error = await upload.text();
      console.error("MEDIA UPLOAD:", error);

      return res.status(500).json({
        success: false,
        error: "GitHub rejected the media upload."
      });
    }

    const url = `/api/media?path=${encodeURIComponent(path)}`;

    return res.status(200).json({
      success: true,
      url
    });
  } catch (error) {
    console.error("MEDIA UPLOAD ERROR:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Unable to upload media."
    });
  }
};
