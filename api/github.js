const OWNER_REPO = process.env.BIOFYIT_DATA_REPO;
const TOKEN = process.env.GITHUB_TOKEN;

async function github(path, options = {}) {
  if (!OWNER_REPO) throw new Error("BIOFYIT_DATA_REPO is missing.");
  if (!TOKEN) throw new Error("GITHUB_TOKEN is missing.");

  return fetch(`https://api.github.com/repos/${OWNER_REPO}/contents/${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
}

async function readResponse(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    console.error("GitHub non-JSON response:", text);
    throw new Error("GitHub returned an invalid response.");
  }
}

async function getFile(path) {
  const response = await github(path);

  if (response.status === 404) {
    return null;
  }

  const data = await readResponse(response);

  if (!response.ok) {
    console.error("GitHub GET error:", data);
    throw new Error(data.message || "GitHub request failed.");
  }

  if (!data.content) {
    throw new Error("GitHub file content is missing.");
  }

  const decoded = Buffer.from(
    data.content.replace(/\s/g, ""),
    "base64"
  ).toString("utf8");

  let content;

  try {
    content = JSON.parse(decoded);
  } catch {
    console.error("Invalid stored JSON:", decoded);
    throw new Error("Biofyit data contains invalid JSON.");
  }

  return {
    content,
    sha: data.sha
  };
}

async function saveFile(path, content, sha, message) {
  const body = {
    message,
    content: Buffer.from(
      JSON.stringify(content, null, 2),
      "utf8"
    ).toString("base64")
  };

  if (sha) {
    body.sha = sha;
  }

  const response = await github(path, {
    method: "PUT",
    body: JSON.stringify(body)
  });

  const data = await readResponse(response);

  if (!response.ok) {
    console.error("GitHub SAVE error:", data);
    throw new Error(data.message || "Unable to save to GitHub.");
  }

  return data;
}

module.exports = {
  github,
  getFile,
  saveFile
};
