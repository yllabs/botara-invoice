const PRESENCE_API_URL = process.env.PRESENCE_API_URL;
const PRESENCE_API_KEY = process.env.PRESENCE_API_KEY;

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed."
    });
  }

  if (!PRESENCE_API_URL || !PRESENCE_API_KEY) {
    return res.status(500).json({
      success: false,
      error: "Presence service is not configured."
    });
  }

  const discordId = String(
    req.query.discordId || ""
  ).trim();

  if (!/^\d{17,20}$/.test(discordId)) {
    return res.status(400).json({
      success: false,
      error: "Invalid Discord user ID."
    });
  }

  try {
    const baseUrl = PRESENCE_API_URL.replace(/\/+$/, "");

    const response = await fetch(
      `${baseUrl}/v1/users/${encodeURIComponent(discordId)}`,
      {
        headers: {
          "X-API-Key": PRESENCE_API_KEY
        }
      }
    );

    const result = await response.json().catch(() => null);

    if (!response.ok || !result) {
      return res.status(response.status || 502).json({
        success: false,
        error: result?.error || "Presence unavailable."
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("PRESENCE API ERROR:", error);

    return res.status(502).json({
      success: false,
      error: "Unable to reach the presence service."
    });
  }
};
