const crypto = require("crypto");
const { getFile, saveFile } = require("../github");

function getCookie(req, name) {
  const cookies = req.headers.cookie || "";

  const match = cookies
    .split(";")
    .map(item => item.trim())
    .find(item => item.startsWith(`${name}=`));

  if (!match) {
    return null;
  }

  return decodeURIComponent(
    match.substring(name.length + 1)
  );
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(
    password,
    salt,
    64
  ).toString("hex");

  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const parts = String(stored || "").split(":");

  if (parts.length !== 2) {
    return false;
  }

  const salt = parts[0];
  const originalHash = parts[1];

  try {
    const hash = crypto.scryptSync(
      password,
      salt,
      64
    ).toString("hex");

    return crypto.timingSafeEqual(
      Buffer.from(hash, "hex"),
      Buffer.from(originalHash, "hex")
    );
  } catch {
    return false;
  }
}

function validUsername(username) {
  return /^[a-z0-9_]{3,32}$/.test(username);
}

async function register(req, res) {
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

  if (String(password).length < 8) {
    return res.status(400).json({
      success: false,
      error: "Password must be at least 8 characters."
    });
  }

  const result = await getFile("users.json");
  const users = result?.content || [];

  if (
    users.some(
      user =>
        String(user.email || "").toLowerCase() === cleanEmail
    )
  ) {
    return res.status(409).json({
      success: false,
      error: "An account with that email already exists."
    });
  }

  if (
    users.some(
      user =>
        String(user.username || "").toLowerCase() === cleanUsername
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
    passwordHash: hashPassword(String(password)),
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
      lanyard: {
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
}

async function login(req, res) {
  const {
    email,
    password
  } = req.body || {};

  const cleanEmail = String(email || "")
    .trim()
    .toLowerCase();

  if (!cleanEmail || !password) {
    return res.status(400).json({
      success: false,
      error: "Email and password are required."
    });
  }

  const result = await getFile("users.json");
  const users = result?.content || [];

  const user = users.find(
    item =>
      String(item.email || "").toLowerCase() === cleanEmail
  );

  if (
    !user ||
    !verifyPassword(
      String(password),
      user.passwordHash
    )
  ) {
    return res.status(401).json({
      success: false,
      error: "Invalid email or password."
    });
  }

  res.setHeader(
    "Set-Cookie",
    `biofyit_user=${encodeURIComponent(user.id)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`
  );

  return res.status(200).json({
    success: true,
    username: user.username
  });
}

async function session(req, res) {
  const userId = getCookie(
    req,
    "biofyit_user"
  );

  if (!userId) {
    return res.status(401).json({
      authenticated: false
    });
  }

  const result = await getFile("users.json");
  const users = result?.content || [];

  const user = users.find(
    item =>
      String(item.id) === String(userId)
  );

  if (!user) {
    return res.status(401).json({
      authenticated: false
    });
  }

  return res.status(200).json({
    authenticated: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email
    }
  });
}

async function logout(req, res) {
  res.setHeader(
    "Set-Cookie",
    "biofyit_user=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
  );

  return res.status(200).json({
    success: true
  });
}

async function usernameCheck(req, res) {
  const username = String(
    req.query.username || ""
  )
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
    user =>
      String(user.username || "").toLowerCase() === username
  );

  return res.status(200).json({
    success: true,
    available: !taken,
    username
  });
}

module.exports = async function handler(req, res) {
  try {
    const action = String(
      req.query.action || ""
    ).toLowerCase();

    if (action === "register") {
      if (req.method !== "POST") {
        return res.status(405).json({
          success: false,
          error: "Method not allowed."
        });
      }

      return await register(req, res);
    }

    if (action === "login") {
      if (req.method !== "POST") {
        return res.status(405).json({
          success: false,
          error: "Method not allowed."
        });
      }

      return await login(req, res);
    }

    if (action === "session") {
      return await session(req, res);
    }

    if (action === "logout") {
      return await logout(req, res);
    }

    if (action === "username") {
      if (req.method !== "GET") {
        return res.status(405).json({
          success: false,
          error: "Method not allowed."
        });
      }

      return await usernameCheck(req, res);
    }

    return res.status(400).json({
      success: false,
      error: "Invalid authentication action."
    });
  } catch (error) {
    console.error("AUTH ERROR:", error);

    return res.status(500).json({
      success: false,
      error: "Unable to complete the request."
    });
  }
};
