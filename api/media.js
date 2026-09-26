const { github, getFile } = require("../github");

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

async function serveMedia(req, res) {
  const requested = String(
    req.query.path || ""
  ).trim();

  if (!requested) {
    return res.status(400).json({
      success: false,
      error: "Missing media path."
    });
  }

  if (
    requested.includes("..") ||
    requested.includes("\\") ||
    requested.startsWith("/") ||
    !requested.startsWith("media/")
  ) {
    return res.status(400).json({
      success: false,
      error: "Invalid media path."
    });
  }

  const allowedFolders = [
    "media/profile-pictures/",
    "media/backgrounds/",
    "media/music/"
  ];

  if (
    !allowedFolders.some(
      folder => requested.startsWith(folder)
    )
  ) {
    return res.status(403).json({
      success: false,
      error: "Media access denied."
    });
  }

  const extension = requested
    .split(".")
    .pop()
    .toLowerCase();

  const contentTypes = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg"
  };

  if (!contentTypes[extension]) {
    return res.status(415).json({
      success: false,
      error: "Unsupported media type."
    });
  }

  const response = await github(requested);

  if (response.status === 404) {
    return res.status(404).json({
      success: false,
      error: "Media not found."
    });
  }

  if (!response.ok) {
    console.error(
      "MEDIA GITHUB ERROR:",
      await response.text()
    );

    return res.status(500).json({
      success: false,
      error: "Unable to access media storage."
    });
  }

  const file = await response.json();

  if (!file.content) {
    return res.status(404).json({
      success: false,
      error: "Media content not found."
    });
  }

  const buffer = Buffer.from(
    String(file.content).replace(/\s/g, ""),
    "base64"
  );

  res.setHeader(
    "Content-Type",
    contentTypes[extension]
  );

  res.setHeader(
    "Content-Length",
    buffer.length
  );

  res.setHeader(
    "Cache-Control",
    "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400"
  );

  res.setHeader(
    "X-Content-Type-Options",
    "nosniff"
  );

  return res.status(200).send(buffer);
}

async function uploadMedia(req, res) {
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

  const usersResult =
    await getFile("users.json");

  const users =
    usersResult?.content || [];

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

  const body = req.body || {};

  const type = String(
    body.type || ""
  );

  if (!mediaTypes[type]) {
    return res.status(400).json({
      success: false,
      error: "Invalid media type."
    });
  }

  let data = body.data || body.fileData || "";
  let extension = body.extension || "";

  if (
    body.file &&
    typeof body.file === "object"
  ) {
    data =
      body.file.data ||
      body.file.base64 ||
      data;

    extension =
      body.file.extension ||
      extension;
  }

  if (!data) {
    return res.status(400).json({
      success: false,
      error: "No file data was provided."
    });
  }

  extension = String(extension)
    .toLowerCase()
    .replace(/^\./, "")
    .replace(/[^a-z0-9]/g, "");

  if (
    !mediaTypes[type].extensions.includes(
      extension
    )
  ) {
    return res.status(400).json({
      success: false,
      error: "That file type is not supported."
    });
  }

  let base64 = String(data);

  if (base64.includes(",")) {
    base64 =
      base64.substring(
        base64.indexOf(",") + 1
      );
  }

  base64 = base64.replace(/\s/g, "");

  let buffer;

  try {
    buffer = Buffer.from(
      base64,
      "base64"
    );
  } catch {
    return res.status(400).json({
      success: false,
      error: "Unable to read the uploaded file."
    });
  }

  if (!buffer || !buffer.length) {
    return res.status(400).json({
      success: false,
      error: "Unable to read the uploaded file."
    });
  }

  const config =
    mediaTypes[type];

  if (buffer.length > config.maxSize) {
    return res.status(400).json({
      success: false,
      error:
        type === "music"
          ? "Music must be smaller than 4 MB."
          : "Images must be smaller than 2 MB."
    });
  }

  const username = String(
    user.username
  )
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");

  const path =
    `${config.folder}/${username}.${extension}`;

  const existing =
    await github(path);

  let sha = null;

  if (existing.ok) {
    const existingFile =
      await existing.json();

    sha = existingFile.sha;
  } else if (existing.status !== 404) {
    return res.status(500).json({
      success: false,
      error: "Unable to access media storage."
    });
  }

  const uploadBody = {
    message:
      `Update ${type} for ${username}`,
    content:
      buffer.toString("base64")
  };

  if (sha) {
    uploadBody.sha = sha;
  }

  const upload = await github(
    path,
    {
      method: "PUT",
      body: JSON.stringify(uploadBody)
    }
  );

  if (!upload.ok) {
    console.error(
      "MEDIA UPLOAD ERROR:",
      await upload.text()
    );

    return res.status(500).json({
      success: false,
      error: "GitHub rejected the media upload."
    });
  }

  return res.status(200).json({
    success: true,
    type,
    path,
    url:
      `/api/media?path=${encodeURIComponent(path)}`
  });
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === "GET") {
      return await serveMedia(req, res);
    }

    if (req.method === "POST") {
      return await uploadMedia(req, res);
    }

    return res.status(405).json({
      success: false,
      error: "Method not allowed."
    });
  } catch (error) {
    console.error(
      "MEDIA ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        "Unable to process media."
    });
  }
};
