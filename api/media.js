const { github } = require("./github");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).send("Method not allowed.");
  }

  try {
    const path = String(req.query.path || "");

    if (!path.startsWith("media/")) {
      return res.status(400).send("Invalid media path.");
    }

    if (path.includes("..")) {
      return res.status(400).send("Invalid media path.");
    }

    const response = await github(path);

    if (response.status === 404) {
      return res.status(404).send("Media not found.");
    }

    if (!response.ok) {
      const text = await response.text();
      console.error("MEDIA ERROR:", text);
      return res.status(500).send("Unable to load media.");
    }

    const data = await response.json();

    if (!data.content) {
      return res.status(404).send("Media content not found.");
    }

    const buffer = Buffer.from(
      data.content.replace(/\s/g, ""),
      "base64"
    );

    const extension = path.split(".").pop().toLowerCase();

    const mimeTypes = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      webp: "image/webp",
      gif: "image/gif",
      mp3: "audio/mpeg",
      wav: "audio/wav",
      ogg: "audio/ogg"
    };

    res.setHeader(
      "Content-Type",
      mimeTypes[extension] || "application/octet-stream"
    );

    res.setHeader(
      "Cache-Control",
      "public, max-age=3600"
    );

    return res.status(200).send(buffer);

  } catch (error) {
    console.error("MEDIA SERVER ERROR:", error);
    return res.status(500).send("Unable to load media.");
  }
};
