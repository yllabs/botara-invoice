const crypto = require("crypto");
const { getFile, saveFile } = require("../github");

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, originalHash] = stored.split(":");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(hash, "hex"),
      Buffer.from(originalHash, "hex")
    );
  } catch {
    return false;
  }
}

function createSession(username) {
  const data = `${username}:${Date.now()}:${crypto.randomBytes(32).toString("hex")}`;
  return Buffer.from(data).toString("base64url");
}

function getSession(req) {
  const cookie = req.cookies?.biofyit_user;
  if (!cookie) return null;

  try {
    const decoded = Buffer.from(cookie, "base64url").toString("utf8");
    const parts = decoded.split(":");

    if (parts.length < 3) return null;

    return parts[0];
  } catch {
    return null;
  }
}

function setSessionCookie(res, username) {
  const session = createSession(username);

  res.setHeader(
    "Set-Cookie",
    `biofyit_user=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
  );

  return session;
}

function clearSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    "biofyit_user=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
  );
}

module.exports = async function handler(req, res) {
  const action = String(req.query.action || "").toLowerCase();

  try {
    const usersFile = await getFile("users.json");
    const users = usersFile?.content || [];

    if (action === "register") {
      if (req.method !== "POST") {
        return res.status(405).json({ success: false, error: "Method not allowed." });
      }

      const body = req.body || {};
      const email = String(body.email || "").trim().toLowerCase();
      const username = String(body.username || "").trim().toLowerCase();
      const password = String(body.password || "");

      if (!email || !username || !password) {
        return res.status(400).json({
          success: false,
          error: "All fields are required."
        });
      }

      if (!/^[a-z0-9_]{3,32}$/.test(username)) {
        return res.status(400).json({
          success: false,
          error: "Username must be 3 to 32 characters and use only letters, numbers, and underscores."
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          error: "Password must be at least 8 characters."
        });
      }

      if (users.some(user => user.email === email)) {
        return res.status(409).json({
          success: false,
          error: "An account with that email already exists."
        });
      }

      if (users.some(user => user.username === username)) {
        return res.status(409).json({
          success: false,
          error: "That username is already taken."
        });
      }

      const user = {
        id: `user_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
        email,
        username,
        passwordHash: hashPassword(password),
        createdAt: new Date().toISOString()
      };

      users.push(user);

      await saveFile(
        "users.json",
        users,
        usersFile?.sha,
        `Create Biofyit user ${username}`
      );

      const profilePath = `profiles/${username}.json`;

      await saveFile(
        profilePath,
        {
          username,
          displayName: username,
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
        `Create Biofyit profile ${username}`
      );

      setSessionCookie(res, username);

      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username
        }
      });
    }

    if (action === "login") {
      if (req.method !== "POST") {
        return res.status(405).json({
          success: false,
          error: "Method not allowed."
        });
      }

      const body = req.body || {};
      const identifier = String(body.email || body.username || "")
        .trim()
        .toLowerCase();

      const password = String(body.password || "");

      if (!identifier || !password) {
        return res.status(400).json({
          success: false,
          error: "Email/username and password are required."
        });
      }

      const user = users.find(
        item =>
          item.email === identifier ||
          item.username === identifier
      );

      if (!user || !verifyPassword(password, user.passwordHash)) {
        return res.status(401).json({
          success: false,
          error: "Invalid login details."
        });
      }

      setSessionCookie(res, user.username);

      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username
        }
      });
    }

    if (action === "session") {
      if (req.method !== "GET") {
        return res.status(405).json({
          success: false,
          error: "Method not allowed."
        });
      }

      const username = getSession(req);

      if (!username) {
        return res.status(401).json({
          success: false,
          error: "Not signed in."
        });
      }

      const user = users.find(item => item.username === username);

      if (!user) {
        clearSessionCookie(res);

        return res.status(401).json({
          success: false,
          error: "Session expired."
        });
      }

      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username
        }
      });
    }

    if (action === "logout") {
      clearSessionCookie(res);

      return res.status(200).json({
        success: true
      });
    }

    if (action === "username") {
      if (req.method !== "GET") {
        return res.status(405).json({
          success: false,
          error: "Method not allowed."
        });
      }

      const username = String(req.query.username || "")
        .trim()
        .toLowerCase();

      if (!/^[a-z0-9_]{3,32}$/.test(username)) {
        return res.status(200).json({
          success: true,
          available: false
        });
      }

      return res.status(200).json({
        success: true,
        available: !users.some(user => user.username === username)
      });
    }

    return res.status(400).json({
      success: false,
      error: "Invalid authentication action."
    });
  } catch (error) {
    console.error("AUTH ERROR:", error);

    return res.status(500).json({
      success: false,
      error: "Authentication service error."
    });
  }
};
