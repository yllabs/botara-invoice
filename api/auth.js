const crypto = require("crypto");
const { getFile, saveFile } = require("../github");

const COOKIE_NAME = "biofyit_user";
const MAX_AGE = 60 * 60 * 24 * 30;

function getCookie(req, name) {
  const header = req.headers?.cookie || "";

  for (const item of header.split(";")) {
    const index = item.indexOf("=");

    if (index === -1) continue;

    const key = item.slice(0, index).trim();
    const value = item.slice(index + 1).trim();

    if (key === name) {
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }

  return null;
}

function setSession(res, id) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(id)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`
  );
}

function clearSession(res) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
  );
}

function hash(password, salt) {
  return crypto
    .scryptSync(password, salt, 64)
    .toString("hex");
}

function createHash(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  return `${salt}:${hash(password, salt)}`;
}

function verify(password, stored) {
  if (!stored || !stored.includes(":")) {
    return false;
  }

  const [salt, storedHash] = stored.split(":");
  const calculated = hash(password, salt);

  if (
    calculated.length !== storedHash.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(calculated, "hex"),
    Buffer.from(storedHash, "hex")
  );
}

async function getUsers() {
  const file = await getFile("users.json");

  return {
    users: Array.isArray(file?.content)
      ? file.content
      : [],
    sha: file?.sha || null
  };
}

module.exports = async function handler(req, res) {
  try {
    const action = String(
      req.query?.action || ""
    ).toLowerCase();

    if (action === "session") {
      const id = getCookie(req, COOKIE_NAME);

      if (!id) {
        return res.status(401).json({
          success: false,
          error: "Not signed in."
        });
      }

      const data = await getUsers();

      const user = data.users.find(
        item => item.id === id
      );

      if (!user) {
        clearSession(res);

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
      clearSession(res);

      return res.status(200).json({
        success: true
      });
    }

    if (action === "login") {
      if (req.method !== "POST") {
        return res.status(405).json({
          success: false,
          error: "Method not allowed."
        });
      }

      const email = String(
        req.body?.email || ""
      ).trim().toLowerCase();

      const password = String(
        req.body?.password || ""
      );

      const data = await getUsers();

      const user = data.users.find(
        item => item.email === email
      );

      if (
        !user ||
        !verify(password, user.passwordHash)
      ) {
        return res.status(401).json({
          success: false,
          error: "Invalid email or password."
        });
      }

      setSession(res, user.id);

      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username
        }
      });
    }

    if (action === "username") {
      const username = String(
        req.query?.username || ""
      ).trim().toLowerCase();

      if (
        !/^[a-z0-9_]{3,32}$/.test(username)
      ) {
        return res.status(400).json({
          success: false,
          available: false
        });
      }

      const data = await getUsers();

      return res.status(200).json({
        success: true,
        available: !data.users.some(
          user => user.username === username
        )
      });
    }

    if (action === "register") {
      if (req.method !== "POST") {
        return res.status(405).json({
          success: false,
          error: "Method not allowed."
        });
      }

      const email = String(
        req.body?.email || ""
      ).trim().toLowerCase();

      const username = String(
        req.body?.username || ""
      ).trim().toLowerCase();

      const password = String(
        req.body?.password || ""
      );

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ) {
        return res.status(400).json({
          success: false,
          error: "Enter a valid email."
        });
      }

      if (
        !/^[a-z0-9_]{3,32}$/.test(username)
      ) {
        return res.status(400).json({
          success: false,
          error: "Username must be 3-32 characters."
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          error: "Password must be at least 8 characters."
        });
      }

      const data = await getUsers();

      if (
        data.users.some(
          user => user.email === email
        )
      ) {
        return res.status(409).json({
          success: false,
          error: "Email already exists."
        });
      }

      if (
        data.users.some(
          user => user.username === username
        )
      ) {
        return res.status(409).json({
          success: false,
          error: "Username already exists."
        });
      }

      const user = {
        id:
          "user_" +
          crypto.randomBytes(12).toString("hex"),

        email,
        username,
        passwordHash: createHash(password),
        createdAt: new Date().toISOString()
      };

      data.users.push(user);

      await saveFile(
        "users.json",
        data.users,
        data.sha,
        `Create Biofyit user ${username}`
      );

      await saveFile(
        `profiles/${username}.json`,
        {
          username,
          displayName: username,
          bio: "",
          profilePicture: "",
          background: "",
          music: "",
          lanyard: {
            enabled: false,
            id: null,
            verified: false,
            guildId: null
          },
          links: [],
          customization: {
            font: "Inter",
            nameStyle: "normal",
            nameGlow: false,
            bioGlow: false
          }
        },
        null,
        `Create Biofyit profile ${username}`
      );

      setSession(res, user.id);

      return res.status(201).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username
        }
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
      error: error.message || "Authentication error."
    });
  }
};
