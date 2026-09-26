const OWNER_REPO = process.env.BIOFYIT_DATA_REPO;
const TOKEN = process.env.GITHUB_TOKEN;

async function github(path, options = {}) {
  if (!OWNER_REPO || !TOKEN) {
    throw new Error("GitHub environment variables are missing.");
  }

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

async function getFile(path) {
  const response = await github(path);

  if (response.status === 404) {
    return null;
  }

  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    console.error("GitHub returned invalid JSON:", text);
    throw new Error("GitHub returned an invalid response.");
  }

  if (!response.ok) {
    console.error("GitHub API error:", data);
    throw new Error(data.message || "GitHub request failed.");
  }

  if (!data.content) {
    throw new Error("GitHub file content was missing.");
  }

  const content = Buffer.from(
    data.content.replace(/\n/g, ""),
    "base64"
  ).toString("utf8");

  try {
    return {
      content: JSON.parse(content),
      sha: data.sha
    };
  } catch {
    console.error("GitHub file contains invalid JSON:", content);
    throw new Error("Stored Biofyit data is invalid.");
  }
}

async function saveFile(path, content, sha, message) {
  const body = {
    message,
    content: Buffer.from(
      JSON.stringify(content, null, 2)
    ).toString("base64")
  };

  if (sha) {
    body.sha = sha;
  }

  const response = await github(path, {
    method: "PUT",
    body: JSON.stringify(body)
  });

  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    console.error("GitHub save returned invalid JSON:", text);
    throw new Error("GitHub returned an invalid response while saving.");
  }

  if (!response.ok) {
    console.error("GitHub save error:", data);
    throw new Error(data.message || "Unable to save to GitHub.");
  }

  return data;
}

module.exports = {
  github,
  getFile,
  saveFile
};
