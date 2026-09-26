const { github } = require("./github");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed."
    });
  }

  try {
    const requested = String(req.query.path || "").trim();

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

    if (!allowedFolders.some(folder => requested.startsWith(folder))) {
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
      const error = await response.text();

      console.error(
        "MEDIA GITHUB ERROR:",
        response.status,
        error
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

    const cleanBase64 = String(file.content)
      .replace(/\s/g, "");

    const buffer = Buffer.from(
      cleanBase64,
      "base64"
    );

    if (!buffer.length) {
      return res.status(404).json({
        success: false,
        error: "Media file is empty."
      });
    }

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

  } catch (error) {
    console.error(
      "MEDIA ROUTE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Unable to load media."
    });
  }
};
