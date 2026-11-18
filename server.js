const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require("docx");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "store.json");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], notes: [] }, null, 2));

function readDB() { return JSON.parse(fs.readFileSync(DB_FILE, "utf8")); }
function writeDB(data) {
  const temp = DB_FILE + ".tmp";
  fs.writeFileSync(temp, JSON.stringify(data, null, 2));
  fs.renameSync(temp, DB_FILE);
}
function safeText(value, max = 100000) { return String(value ?? "").slice(0, max); }
function slug(value) {
  return safeText(value, 100).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "note";
}
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: "Please sign in to continue." });
  next();
}
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "1mb" }));
app.use(session({
  name: "noteit.sid",
  secret: process.env.SESSION_SECRET || "replace-this-session-secret-before-deploying",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 7 * 24 * 60 * 60 * 1000 }
}));
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, limit: 250, standardHeaders: "draft-8", legacyHeaders: false }));
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/register", async (req, res) => {
  const username = safeText(req.body.username, 32).trim().toLowerCase();
  const password = String(req.body.password || "");
  if (!/^[a-z0-9_]{3,32}$/.test(username)) return res.status(400).json({ error: "Username must be 3–32 characters using letters, numbers, or underscores." });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
  const db = readDB();
  if (db.users.some(u => u.username === username)) return res.status(409).json({ error: "That username is already taken." });
  const user = { id: require("crypto").randomUUID(), username, password: await bcrypt.hash(password, 12), createdAt: new Date().toISOString() };
  db.users.push(user); writeDB(db); req.session.userId = user.id;
  res.json({ user: { username } });
});
app.post("/api/login", async (req, res) => {
  const username = safeText(req.body.username, 32).trim().toLowerCase();
  const db = readDB();
  const user = db.users.find(u => u.username === username);
  if (!user || !(await bcrypt.compare(String(req.body.password || ""), user.password))) return res.status(401).json({ error: "Incorrect username or password." });
  req.session.userId = user.id;
  res.json({ user: { username } });
});
app.post("/api/logout", (req, res) => req.session.destroy(() => res.json({ ok: true })));
app.get("/api/me", (req, res) => {
  const db = readDB(), user = db.users.find(u => u.id === req.session.userId);
  if (!user) return res.status(401).json({ error: "Not signed in." });
  res.json({ user: { username: user.username } });
});
app.get("/api/notes", requireAuth, (req, res) => {
  const db = readDB();
  res.json(db.notes.filter(n => n.userId === req.session.userId).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)));
});
app.post("/api/notes", requireAuth, (req, res) => {
  const db = readDB();
  const now = new Date().toISOString();
  const note = {
    id: safeText(req.body.id, 80) || require("crypto").randomUUID(),
    userId: req.session.userId,
    title: safeText(req.body.title, 180) || "Untitled note",
    content: safeText(req.body.content, 100000),
    folder: safeText(req.body.folder, 60) || "General",
    favorite: Boolean(req.body.favorite),
    createdAt: now,
    updatedAt: now
  };
  const existing = db.notes.find(n => n.id === note.id && n.userId === req.session.userId);
  if (existing) {
    note.createdAt = existing.createdAt;
    Object.assign(existing, note, { updatedAt: now });
    writeDB(db); return res.json(existing);
  }
  db.notes.push(note); writeDB(db); res.status(201).json(note);
});
app.delete("/api/notes/:id", requireAuth, (req, res) => {
  const db = readDB();
  const before = db.notes.length;
  db.notes = db.notes.filter(n => !(n.id === req.params.id && n.userId === req.session.userId));
  writeDB(db);
  res.json({ deleted: db.notes.length < before });
});

app.get("/api/export/:id/:format", requireAuth, async (req, res) => {
  const db = readDB();
  const note = db.notes.find(n => n.id === req.params.id && n.userId === req.session.userId);
  if (!note) return res.status(404).send("Note not found.");
  const name = slug(note.title);
  const plain = note.content.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|h[1-6]|li)>/gi, "\n").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  if (req.params.format === "txt" || req.params.format === "md") {
    res.type("text/plain").attachment(`${name}.${req.params.format}`).send(req.params.format === "md" ? `# ${note.title}\n\n${plain}` : `${note.title}\n\n${plain}`);
  } else if (req.params.format === "pdf") {
    res.setHeader("Content-Type", "application/pdf"); res.setHeader("Content-Disposition", `attachment; filename="${name}.pdf"`);
    const pdf = new PDFDocument({ margin: 55 }); pdf.pipe(res);
    pdf.fontSize(22).font("Helvetica-Bold").text(note.title); pdf.moveDown();
    pdf.fontSize(11).font("Helvetica").text(plain, { lineGap: 5 }); pdf.end();
  } else if (req.params.format === "docx") {
    const paragraphs = [new Paragraph({ text: note.title, heading: HeadingLevel.TITLE })];
    plain.split(/\n+/).filter(Boolean).forEach(line => paragraphs.push(new Paragraph({ children: [new TextRun(line)] })));
    const doc = new Document({ sections: [{ children: paragraphs }] });
    const buffer = await Packer.toBuffer(doc);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${name}.docx"`); res.send(buffer);
  } else return res.status(400).send("Unsupported export format.");
});

app.get("/{*splat}", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.listen(PORT, () => console.log(`Noteit is running on port ${PORT}`));
