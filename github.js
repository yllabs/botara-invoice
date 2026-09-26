const OWNER_REPO = process.env.BIOFYIT_DATA_REPO;
const TOKEN = process.env.GITHUB_TOKEN;

async function github(path, options = {}) {
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

  if (!response.ok) {
    const error = await response.text();
    console.error("GitHub GET ERROR:", error);
    throw new Error("GitHub request failed.");
  }

  const file = await response.json();

  const content = Buffer.from(
    file.content.replace(/\n/g, ""),
    "base64"
  ).toString("utf8");

  return {
    content: JSON.parse(content),
    sha: file.sha
  };
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

  if (!response.ok) {
    const error = await response.text();
    console.error("GitHub SAVE ERROR:", error);
    throw new Error("Unable to save data.");
  }

  return response.json();
}

module.exports = {
  github,
  getFile,
  saveFile
};
