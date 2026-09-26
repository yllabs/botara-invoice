const OWNER_REPO = process.env.BIOFYIT_DATA_REPO;
const TOKEN = process.env.GITHUB_TOKEN;

async function github(path, options = {}) {
  const response = await fetch(
    `https://api.github.com/repos/${OWNER_REPO}/contents/${path}`,
    {
      ...options,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    }
  );

  return response;
}

async function getFile(path) {
  const response = await github(path);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("GitHub request failed");
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
    throw new Error(error);
  }

  return response.json();
}

module.exports = {
  github,
  getFile,
  saveFile
};
