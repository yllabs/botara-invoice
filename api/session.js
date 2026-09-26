const { getFile } = require("./github");

function getCookie(req, name) {
  const cookies = req.headers.cookie || "";

  const match = cookies
    .split(";")
    .map(item => item.trim())
    .find(item => item.startsWith(`${name}=`));

  if (!match) {
    return null;
  }

  return decodeURIComponent(
    match.substring(name.length + 1)
  );
}

module.exports = async function handler(req, res) {
  try {
    const userId = getCookie(req, "biofyit_user");

    if (!userId) {
      return res.status(401).json({
        authenticated: false
      });
    }

    const result = await getFile("users.json");
    const users = result?.content || [];

    const user = users.find(
      item => item.id === userId
    );

    if (!user) {
      return res.status(401).json({
        authenticated: false
      });
    }

    return res.status(200).json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });

  } catch {
    return res.status(500).json({
      authenticated: false
    });
  }
};
