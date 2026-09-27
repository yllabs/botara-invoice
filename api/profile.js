const { getFile, saveFile } = require("../github");

const COOKIE_NAME = "biofyit_user";

const PLATFORMS = [
  "discord","instagram","tiktok","youtube","x","facebook","snapchat",
  "twitch","kick","github","reddit","spotify","soundcloud","steam",
  "roblox","xbox","playstation","linkedin","threads","bluesky","telegram",
  "pinterest","tumblr","gitlab","codepen","patreon","kofi","cashapp",
  "venmo","paypal","custom"
];

const FONTS = [
  "Inter",
  "DM Sans",
  "Manrope",
  "Montserrat",
  "Outfit",
  "Poppins",
  "Space Grotesk"
];

const NAME_STYLES = [
  "normal",
  "gradient",
  "uppercase",
  "wide"
];

function getCookie(req, name) {
  const cookieHeader = req.headers?.cookie || "";

  for (const item of cookieHeader.split(";")) {
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

async function getUser(req) {
  const id = getCookie(req, COOKIE_NAME);

  if (!id) return null;

  const file = await getFile("users.json");
  const users = Array.isArray(file?.content) ? file.content : [];

  return users.find(user => user.id === id) || null;
}

function text(value, length) {
  return String(value ?? "").trim().slice(0, length);
}

function media(value, oldValue = "") {
  if (typeof value !== "string") return oldValue;

  const result = value.trim();

  if (!result) return oldValue;

  if (
    result.startsWith("/api/media?path=") ||
    result.startsWith("https://") ||
    result.startsWith("http://")
  ) {
    return result.slice(0, 1000);
  }

  return oldValue;
}

function url(value) {
  if (typeof value !== "string") return "";

  const valueTrimmed = value.trim();

  if (!valueTrimmed) return "";

  try {
    const parsed = new URL(valueTrimmed);

    if (
      parsed.protocol !== "https:" &&
      parsed.protocol !== "http:"
    ) {
      return "";
    }

    return parsed.toString();
  } catch {
    return "";
  }
}

function cleanLinks(input) {
  if (!Array.isArray(input)) return [];

  return input
    .slice(0, 10)
    .map(item => {
      if (!item || typeof item !== "object") return null;

      const platform = String(item.platform || "")
        .trim()
        .toLowerCase();

      if (!PLATFORMS.includes(platform)) return null;

      const link = url(item.url);

      if (!link) return null;

      return {
        platform,
        title: text(item.title || platform, 40),
        url: link
      };
    })
    .filter(Boolean);
}

function cleanCustomization(input, old = {}) {
  const data =
    input && typeof input === "object"
      ? input
      : {};

  return {
    font: FONTS.includes(data.font)
      ? data.font
      : FONTS.includes(old.font)
        ? old.font
        : "Inter",

    nameStyle: NAME_STYLES.includes(data.nameStyle)
      ? data.nameStyle
      : NAME_STYLES.includes(old.nameStyle)
        ? old.nameStyle
        : "normal",

    nameGlow:
      data.nameGlow !== undefined
        ? Boolean(data.nameGlow)
        : Boolean(old.nameGlow),

    bioGlow:
      data.bioGlow !== undefined
        ? Boolean(data.bioGlow)
        : Boolean(old.bioGlow)
  };
}

function cleanLanyard(input, old = {}) {
  const data =
    input && typeof input === "object"
      ? input
      : {};

  return {
    enabled:
      data.enabled !== undefined
        ? Boolean(data.enabled)
        : Boolean(old.enabled),

    id:
      typeof data.id === "string"
        ? data.id.slice(0, 32)
        : old.id || null,

    verified:
      data.verified !== undefined
        ? Boolean(data.verified)
        : Boolean(old.verified),

    guildId:
      typeof data.guildId === "string"
        ? data.guildId.slice(0, 32)
        : old.guildId || null
  };
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const username = String(req.query?.username || "")
        .trim()
        .toLowerCase();

      if (!/^[a-z0-9_]{3,32}$/.test(username)) {
        return res.status(400).json({
          success: false,
          error: "Invalid username."
        });
      }

      const file = await getFile(`profiles/${username}.json`);

      if (!file) {
        return res.status(404).json({
          success: false,
          error: "Profile not found."
        });
      }

      const profile = file.content || {};

      return res.status(200).json({
        success: true,
        profile: {
          username: profile.username || username,
          displayName: profile.displayName || username,
          bio: profile.bio || "",
          profilePicture: profile.profilePicture || "",
          background: profile.background || "",
          music: profile.music || "",
          lanyard: profile.lanyard || {
            enabled: false,
            id: null
          },
          links: Array.isArray(profile.links)
            ? profile.links
            : [],
          customization: cleanCustomization(
            profile.customization
          )
        }
      });
    }

    if (req.method !== "POST") {
      return res.status(405).json({
        success: false,
        error: "Method not allowed."
      });
    }

    const user = await getUser(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required."
      });
    }

    const username = String(user.username || "")
      .trim()
      .toLowerCase();

    if (!/^[a-z0-9_]{3,32}$/.test(username)) {
      return res.status(400).json({
        success: false,
        error: "Invalid account username."
      });
    }

    const path = `profiles/${username}.json`;
    const file = await getFile(path);

    if (!file) {
      return res.status(404).json({
        success: false,
        error: "Profile does not exist."
      });
    }

    const old = file.content || {};
    const body =
      req.body && typeof req.body === "object"
        ? req.body
        : {};

    const profile = {
      username,
      displayName:
        text(body.displayName, 50) ||
        old.displayName ||
        username,

      bio:
        typeof body.bio === "string"
          ? text(body.bio, 300)
          : old.bio || "",

      profilePicture:
        body.profilePicture !== undefined
          ? media(body.profilePicture, old.profilePicture || "")
          : old.profilePicture || "",

      background:
        body.background !== undefined
          ? media(body.background, old.background || "")
          : old.background || "",

      music:
        body.music !== undefined
          ? media(body.music, old.music || "")
          : old.music || "",

      lanyard: cleanLanyard(
        body.lanyard,
        old.lanyard || {}
      ),

      links:
        body.links !== undefined
          ? cleanLinks(body.links)
          : cleanLinks(old.links || []),

      customization: cleanCustomization(
        body.customization,
        old.customization || {}
      )
    };

    await saveFile(
      path,
      profile,
      file.sha,
      `Update Biofyit profile ${username}`
    );

    return res.status(200).json({
      success: true,
      message: "Profile saved.",
      profile
    });
  } catch (error) {
    console.error("PROFILE ERROR:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Unable to save profile."
    });
  }
};
