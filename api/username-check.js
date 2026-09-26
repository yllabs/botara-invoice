const { getFile } = require("./github");

function validUsername(username) {
  return /^[a-z0-9_]{3,32}$/.test(username);
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed."
    });
  }

  try {
    const username = String(req.query.username || "")
      .trim()
      .toLowerCase();

    if (!username) {
      return res.status(400).json({
        success: false,
        available: false,
        error: "Username is required."
      });
    }

    if (!validUsername(username)) {
      return res.status(200).json({
        success: true,
        available: false,
        error: "Username must be 3-32 characters and use only letters, numbers, and underscores."
      });
    }

    const result = await getFile("users.json");
    const users = result?.content || [];

    const taken = users.some(
      user => String(user.username || "").toLowerCase() === username
    );

    return res.status(200).json({
      success: true,
      available: !taken,
      username
    });

  } catch (error) {
    console.error("USERNAME CHECK ERROR:", error);

    return res.status(500).json({
      success: false,
      available: false,
      error: error.message || "Unable to check username."
    });
  }
};
