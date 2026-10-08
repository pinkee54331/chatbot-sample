# Chatbot sample

A demo site (Angular) with a document chatbot (Node API).

- `client/` – Angular 19 app (standalone components): site in `AppComponent`, chat widget in `ChatComponent`, HTTP calls in `ChatService`.
- `server.js` – zero-dependency Node server: `POST /api/chat` plus static hosting of the built Angular app.
- `docs/` – the documents the bot answers from.

## Run (production-style, one server)

```powershell
cd client
npm install
npm run build
cd ..
$env:ANTHROPIC_API_KEY = "sk-ant-..."   # optional; without it the bot returns the best-matching passage
node server.js
```

Open http://localhost:3000 and click the chat bubble.

## Develop with live reload

Run `node server.js` in one terminal, then in another:

```powershell
cd client
npm start
```

Open http://localhost:4200. `/api` is proxied to port 3000 (`client/proxy.conf.json`).

The bot answers only from files in `docs/` (`.md` / `.txt`). Edit or add files there; changes are picked up on the next question.

Note: Angular 19 is used because the CLI for newer versions needs a newer Node.js than 22.6.
