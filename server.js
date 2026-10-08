// Zero-dependency server: serves ./public and exposes POST /api/chat.
// The chatbot answers ONLY from the documents in ./docs.
// With ANTHROPIC_API_KEY set, Claude answers from the retrieved passages;
// without it, the best-matching passage is returned (offline fallback).
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const DOCS_DIR = path.join(__dirname, "docs");
// Built Angular app (run "npm run build" in ./client)
const PUBLIC_DIR = path.join(__dirname, "client", "dist", "client", "browser");
const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5-5";

// ---- Load documents and split into chunks (one per heading section) ----
function loadChunks() {
  const chunks = [];
  for (const file of fs.readdirSync(DOCS_DIR)) {
    if (!/\.(md|txt)$/i.test(file)) continue;
    const text = fs.readFileSync(path.join(DOCS_DIR, file), "utf8");
    for (const part of text.split(/\n(?=#{1,3} )/)) {
      if (part.trim()) chunks.push({ source: file, text: part.trim() });
    }
  }
  return chunks;
}
let chunks = loadChunks();

const STOP = new Set("a an the is are was were do does did i you we my your our of to in on for and or can how what when where who which with at it be if this that about".split(" "));
const tokenize = (s) =>
  s.toLowerCase().match(/[a-z0-9$]+/g)?.filter((w) => !STOP.has(w)) ?? [];

function retrieve(question, k = 3) {
  const q = new Set(tokenize(question));
  return chunks
    .map((c) => {
      const words = tokenize(c.text);
      const heading = new Set(tokenize(c.text.split("\n")[0]));
      let score = 0;
      for (const w of words) if (q.has(w)) score += 1;
      for (const w of heading) if (q.has(w)) score += 5; // heading matches count more
      return { c, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((x) => x.c);
}

async function answer(question, history) {
  const hits = retrieve(question);
  if (!hits.length) {
    return "I couldn't find that in our documents. Please contact us at hello@acmecoffee.example.";
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return hits[0].text.replace(/^#+\s*/, "") + "\n\n(Offline mode: set ANTHROPIC_API_KEY for natural-language answers.)";
  }
  const context = hits.map((h) => h.text).join("\n\n---\n\n");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 500,
      system:
        "You are a helpful support assistant for Acme Coffee Roasters. Answer using ONLY the document excerpts below. " +
        "If the answer is not in them, say you don't know and suggest emailing hello@acmecoffee.example. Be concise.\n\n" +
        "<documents>\n" + context + "\n</documents>",
      messages: [...history.slice(-6), { role: "user", content: question }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content.map((b) => b.text ?? "").join("");
}

const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".ico": "image/x-icon", ".json": "application/json", ".map": "application/json" };

http
  .createServer(async (req, res) => {
    if (req.method === "POST" && req.url === "/api/chat") {
      let body = "";
      for await (const part of req) body += part;
      try {
        const { message, history = [] } = JSON.parse(body);
        chunks = loadChunks(); // pick up document edits without restarting
        const reply = await answer(String(message || ""), history);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ reply }));
      } catch (e) {
        console.error(e);
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ reply: "Sorry, something went wrong." }));
      }
      return;
    }
    const rel = req.url === "/" ? "index.html" : decodeURIComponent(req.url.split("?")[0]);
    const file = path.join(PUBLIC_DIR, path.normalize(rel));
    if (!file.startsWith(PUBLIC_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      return res.end("Not found. Build the Angular app first: cd client && npm run build");
    }
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  })
  .listen(PORT, () => console.log(`Open http://localhost:${PORT}`));
