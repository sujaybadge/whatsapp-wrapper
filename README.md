# Baileys v7 + Postgres + QR handling

- Uses **@whiskeysockets/baileys** v7 (ESM)
- DB auth state with `makeCacheableSignalKeyStore`, `get/set/setMulti/clear`
- LID-ready (v7 migration)
- **QR handled via `connection.update`**: printed in terminal + served at `/qr.png`

## Run (local Postgres)
```bash
cp .env.example .env
npm install
npm start
```
Scan the QR in terminal or open `http://localhost:3000/qr.png`.

## Docker
```bash
cp .env.example .env
docker compose up --build
```

Problem checklist:
- If `npm install` fails in Docker, ensure `git` is installed in the image (see Dockerfile).
- If QR doesn't show: check logs for `New QR received` and visit `/qr.png`.
