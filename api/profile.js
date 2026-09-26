const { getFile } = require("./github");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed."
    });
  }

  const username = String(req.query.username || "").trim().toLowerCase();

  if (!/^[a-z0-9_]{3,32}$/.test(username)) {
    return res.status(400).json({
      success: false,
      error: "Invalid username."
    });
  }

  try {
    const result = await getFile(`profiles/${username}.json`);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: "Profile not found."
      });
    }

    return res.status(200).json({
      success: true,
      profile: result.content
    });
  } catch (error) {
    console.error("Profile error:", error);

    return res.status(500).json({
      success: false,
      error: "Unable to load profile."
    });
  }
};
