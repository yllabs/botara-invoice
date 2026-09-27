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
    req.query?.discordId || ""
  ).trim();

  if (!/^\d{17,20}$/.test(discordId)) {
    return res.status(400).json({
      success: false,
      error: "Invalid Discord ID."
    });
  }

  try {
    const url =
      PRESENCE_API_URL.replace(/\/+$/, "") +
      "/v1/users/" +
      encodeURIComponent(discordId);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-Key": PRESENCE_API_KEY,
        "Accept": "application/json"
      },
      cache: "no-store"
    });

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    if (!response.ok) {
      console.error(
        "PRESENCE SERVER:",
        response.status,
        text
      );

      return res.status(response.status).json({
        success: false,
        error:
          data?.error ||
          `Presence server returned HTTP ${response.status}.`
      });
    }

    return res.status(200).json({
      success: true,
      presence: data
    });
  } catch (error) {
    console.error("PRESENCE BRIDGE ERROR:", error);

    return res.status(502).json({
      success: false,
      error: "Unable to reach the presence service."
    });
  }
};
