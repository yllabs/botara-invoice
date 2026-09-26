const crypto = require("crypto");
const { getFile, saveFile } = require("./github");

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");

  const hash = crypto
    .scryptSync(password, salt, 64)
    .toString("hex");

  return `${salt}:${hash}`;
}

function validUsername(username) {
  return /^[a-z0-9_]{3,32}$/.test(username);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed."
    });
  }

  try {
    const {
      email,
      username,
      password
    } = req.body || {};

    const cleanEmail = String(email || "")
      .trim()
      .toLowerCase();

    const cleanUsername = String(username || "")
      .trim()
      .toLowerCase();

    if (!cleanEmail || !cleanUsername || !password) {
      return res.status(400).json({
        success: false,
        error: "All fields are required."
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        error: "Enter a valid email."
      });
    }

    if (!validUsername(cleanUsername)) {
      return res.status(400).json({
        success: false,
        error: "Username must be 3-32 characters and use only letters, numbers, and underscores."
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 8 characters."
      });
    }

    const result = await getFile("users.json");

    const users = result?.content || [];

    if (
      users.some(
        user => user.email.toLowerCase() === cleanEmail
      )
    ) {
      return res.status(409).json({
        success: false,
        error: "An account with that email already exists."
      });
    }

    if (
      users.some(
        user => user.username.toLowerCase() === cleanUsername
      )
    ) {
      return res.status(409).json({
        success: false,
        error: "That username is already taken."
      });
    }

    const user = {
      id: `user_${crypto.randomBytes(8).toString("hex")}`,
      email: cleanEmail,
      username: cleanUsername,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString()
    };

    users.push(user);

    await saveFile(
      "users.json",
      users,
      result?.sha,
      `Create Biofyit account: ${cleanUsername}`
    );

    await saveFile(
      `profiles/${cleanUsername}.json`,
      {
        username: cleanUsername,
        displayName: cleanUsername,
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
      null,
      `Create Biofyit profile: ${cleanUsername}`
    );

    res.setHeader(
      "Set-Cookie",
      `biofyit_user=${encodeURIComponent(user.id)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`
    );

    return res.status(201).json({
      success: true,
      username: cleanUsername
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Unable to create account."
    });
  }
};
