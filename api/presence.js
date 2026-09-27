const PRESENCE_API_URL = process.env.PRESENCE_API_URL;
const PRESENCE_API_KEY = process.env.PRESENCE_API_KEY;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://biofyit.com");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  const discordId = String(req.query.discordId || "").trim();

  if (!discordId || !/^\d+$/.test(discordId)) {
    return res.status(400).json({
      success: false,
      error: "Invalid Discord ID"
    });
  }

  if (!PRESENCE_API_URL || !PRESENCE_API_KEY) {
    return res.status(500).json({
      success: false,
      error: "Presence service is not configured"
    });
  }

  try {
    const response = await fetch(
      `${PRESENCE_API_URL}/v1/users/${discordId}`,
      {
        headers: {
          "X-API-Key": PRESENCE_API_KEY,
          "Accept": "application/json"
        }
      }
    );

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({
        success: false,
        error: "Presence service returned invalid JSON"
      });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: data.error || "Presence service request failed"
      });
    }

    const source = data.presence || data;

    return res.status(200).json({
      success: true,
      discordId: source.id || discordId,
      username: source.username || "",
      display_name: source.display_name || source.global_name || "",
      global_name: source.global_name || "",
      avatar: source.avatar || source.avatar_url || "",
      status: source.status || "offline",
      activities: Array.isArray(source.activities) ? source.activities : [],
      spotify: source.spotify || null
    });
  } catch (error) {
    console.error("Presence API error:", error);

    return res.status(500).json({
      success: false,
      error: "Unable to connect to presence service"
    });
  }
}
