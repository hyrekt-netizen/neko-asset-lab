# Neko Asset Lab — Roblox Asset Manager

Dark-purple web app for organizing Roblox music/audio IDs and animation IDs, exporting lists to Lua, and converting audio files.

## Features
- Music ID Manager: add, search, copy, delete, import/export JSON, export Lua.
- Animation ID Manager: add, search, copy, delete, import/export JSON, export Lua.
- Audio Converter: MP3, WAV, OGG, FLAC output using FFmpeg.
- ID lists are saved in the browser's `localStorage`; they are not sent to the Flask server.
- Audio conversion uploads a file temporarily to the server. The server uses a temporary directory and removes it after the request.
- No Roblox password, cookie, API key, or token is requested or stored.
- Does not bypass Roblox asset permissions and does not upload converted files to Roblox automatically.

## Run locally (Windows)
1. Install Python 3.11+ and Docker Desktop (or install FFmpeg separately and add it to PATH).
2. Extract this folder.
3. Open Terminal/PowerShell in the project folder.
4. Run:
   ```powershell
   py -m venv .venv
   .\.venv\Scripts\activate
   pip install -r requirements.txt
   ```
5. Ensure `ffmpeg -version` works in the terminal.
6. Start:
   ```powershell
   python app.py
   ```
7. Open `http://127.0.0.1:8000`.

Alternatively run with Docker:
```bash
docker build -t neko-asset-lab .
docker run --rm -p 8000:8000 neko-asset-lab
```

## Deploy to Koyeb with GitHub
1. Create a new private/public repository on GitHub and upload all files/folders from this project.
2. Open Koyeb and choose **Create Web Service**.
3. Select **GitHub** as the deployment method and connect the repository.
4. Choose **Dockerfile** as the builder (the included Dockerfile installs FFmpeg).
5. Set exposed port to `8000` if Koyeb asks. The app reads Koyeb's `PORT` environment variable.
6. Deploy. Open the `.koyeb.app` URL shown on the service page.
7. Visit `/health` to check that the service responds with `{"ok":true,...}`.

Koyeb's Git-driven deployment documentation: https://www.koyeb.com/docs/deploy/flask

## Important notes
- The browser's `localStorage` is local to that browser/device. If you clear browser data or switch devices, the list won't automatically follow you. Use JSON export/import for backups.
- This starter project does not integrate Roblox Open Cloud upload. To upload audio, use Roblox Creator Dashboard or Studio directly. Only upload audio you own or have permission to use and follow Roblox's current import limits and moderation rules.
- The converter accepts input formats MP3, WAV, OGG, FLAC, M4A, AAC, WEBM and writes MP3, WAV, OGG, or FLAC.
- The server has a 25 MB upload cap and 120-second conversion timeout. For a public service, add authentication and rate limiting before allowing many users to use it.
