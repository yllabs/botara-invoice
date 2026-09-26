const { getFile } = require("./github");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed."
    });
  }

  const requestedUsername = String(req.query.username || "").trim().toLowerCase();

  if (!/^[a-z0-9_]{3,32}$/.test(requestedUsername)) {
    return res.status(400).json({
      success: false,
      error: "Invalid username."
    });
  }

  try {
    const usersResult = await getFile("users.json");
    const users = usersResult?.content || [];

    const user = users.find(
      item => String(item.username || "").toLowerCase() === requestedUsername
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "Profile not found."
      });
    }

    const actualUsername = String(user.username).toLowerCase();

    const profileResult = await getFile(
      `profiles/${actualUsername}.json`
    );

    if (!profileResult?.content) {
      return res.status(404).json({
        success: false,
        error: "Profile not found."
      });
    }

    return res.status(200).json({
      success: true,
      profile: profileResult.content
    });
  } catch (error) {
    console.error("PROFILE API ERROR:", error);

    return res.status(500).json({
      success: false,
      error: "Unable to load profile."
    });
  }
};
