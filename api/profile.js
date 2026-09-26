const REPO = process.env.BIOFYIT_DATA_REPO;
const TOKEN = process.env.GITHUB_TOKEN;

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed." });
  }

  const username = String(req.query.username || "").trim().toLowerCase();

  if (!/^[a-z0-9_]{3,32}$/.test(username)) {
    return res.status(400).json({ success: false, error: "Invalid username." });
  }

  if (!REPO || !TOKEN) {
    console.error("Missing BIOFYIT_DATA_REPO or GITHUB_TOKEN");
    return res.status(500).json({ success: false, error: "Server configuration error." });
  }

  try {
    const githubURL = `https://api.github.com/repos/${REPO}/contents/profiles/${username}.json`;

    const response = await fetch(githubURL, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28"
      }
    });

    if (response.status === 404) {
      return res.status(404).json({
        success: false,
        error: "Profile not found."
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("GitHub error:", errorText);

      return res.status(500).json({
        success: false,
        error: "Unable to access profile."
      });
    }

    const file = await response.json();

    if (!file.content) {
      return res.status(404).json({
        success: false,
        error: "Profile not found."
      });
    }

    const profile = JSON.parse(
      Buffer.from(file.content.replace(/\n/g, ""), "base64").toString("utf8")
    );

    return res.status(200).json({
      success: true,
      profile
    });
  } catch (error) {
    console.error("Profile API error:", error);

    return res.status(500).json({
      success: false,
      error: "Unable to load profile."
    });
  }
};
