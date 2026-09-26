const { getFile, github } = require("./github");

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

const mediaTypes = {
  profilePicture: {
    folder: "media/profile-pictures",
    extensions: ["png", "jpg", "jpeg", "webp", "gif"],
    maxSize: 2 * 1024 * 1024
  },

  background: {
    folder: "media/backgrounds",
    extensions: ["png", "jpg", "jpeg", "webp", "gif"],
    maxSize: 2 * 1024 * 1024
  },

  music: {
    folder: "media/music",
    extensions: ["mp3", "wav", "ogg"],
    maxSize: 4 * 1024 * 1024
  }
};

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

    const body = req.body || {};
    const type = String(body.type || "");
    const file = body.file || {};

    const config = mediaTypes[type];

    if (!config) {
      return res.status(400).json({
        success: false,
        error: "Invalid media type."
      });
    }

    if (!file.data) {
      return res.status(400).json({
        success: false,
        error: "No file was provided."
      });
    }

    let base64 = String(file.data);

    if (base64.includes(",")) {
      base64 = base64.substring(
        base64.indexOf(",") + 1
      );
    }

    base64 = base64.replace(/\s/g, "");

    if (!base64) {
      return res.status(400).json({
        success: false,
        error: "The uploaded file is empty."
      });
    }

    const extension = String(file.extension || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    if (!config.extensions.includes(extension)) {
      return res.status(400).json({
        success: false,
        error: "That file type is not supported."
      });
    }

    const buffer = Buffer.from(base64, "base64");

    if (!buffer.length) {
      return res.status(400).json({
        success: false,
        error: "The uploaded file could not be read."
      });
    }

    if (buffer.length > config.maxSize) {
      return res.status(400).json({
        success: false,
        error: type === "music"
          ? "Music must be smaller than 4 MB."
          : "Images must be smaller than 2 MB."
      });
    }

    const username = String(user.username)
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "");

    const path = `${config.folder}/${username}.${extension}`;

    const existing = await github(path);

    let sha = null;

    if (existing.ok) {
      const existingFile = await existing.json();
      sha = existingFile.sha;
    } else if (existing.status !== 404) {
      const error = await existing.text();

      console.error(
        "MEDIA EXISTING FILE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        error: "Unable to access media storage."
      });
    }

    const uploadBody = {
      message: `Update ${type} for ${username}`,
      content: buffer.toString("base64")
    };

    if (sha) {
      uploadBody.sha = sha;
    }

    const upload = await github(path, {
      method: "PUT",
      body: JSON.stringify(uploadBody)
    });

    if (!upload.ok) {
      const error = await upload.text();

      console.error(
        "MEDIA UPLOAD ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        error: "GitHub rejected the media upload."
      });
    }

    const url =
      `/api/media?path=${encodeURIComponent(path)}`;

    return res.status(200).json({
      success: true,
      type,
      path,
      url
    });

  } catch (error) {
    console.error(
      "MEDIA UPLOAD CRASH:",
      error
    );

    return res.status(500).json({
      success: false,
      error: error.message || "Unable to upload media."
    });
  }
};
