import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from flask import Flask, render_template, request, send_file, jsonify
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 25 * 1024 * 1024  # 25 MB upload limit
ALLOWED_EXTENSIONS = {"mp3", "wav", "ogg", "flac", "m4a", "aac", "webm"}
OUTPUT_FORMATS = {"mp3", "wav", "ogg", "flac"}

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

@app.get("/")
def index():
    return render_template("index.html")

@app.get("/health")
def health():
    return jsonify({"ok": True, "service": "Roblox Asset Manager"})

@app.post("/convert")
def convert_audio():
    if shutil.which("ffmpeg") is None:
        return jsonify({"error": "FFmpeg belum tersedia di server. Pastikan deploy memakai Dockerfile proyek ini."}), 500

    uploaded = request.files.get("audio")
    output_format = (request.form.get("format") or "mp3").lower()
    if not uploaded or not uploaded.filename:
        return jsonify({"error": "Pilih file audio terlebih dahulu."}), 400
    if not allowed_file(uploaded.filename):
        return jsonify({"error": "Format input tidak didukung. Gunakan MP3, WAV, OGG, FLAC, M4A, AAC, atau WEBM."}), 400
    if output_format not in OUTPUT_FORMATS:
        return jsonify({"error": "Format keluaran tidak valid."}), 400

    original_name = secure_filename(uploaded.filename) or "audio"
    stem = Path(original_name).stem[:80] or "audio"

    with tempfile.TemporaryDirectory(prefix="asset-manager-") as tmp:
        tmpdir = Path(tmp)
        input_path = tmpdir / f"input{Path(original_name).suffix.lower()}"
        output_path = tmpdir / f"{stem}.{output_format}"
        uploaded.save(input_path)

        command = ["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-i", str(input_path)]
        if output_format == "mp3":
            command += ["-vn", "-codec:a", "libmp3lame", "-q:a", "3"]
        elif output_format == "wav":
            command += ["-vn", "-codec:a", "pcm_s16le"]
        elif output_format == "ogg":
            command += ["-vn", "-codec:a", "libvorbis", "-q:a", "5"]
        elif output_format == "flac":
            command += ["-vn", "-codec:a", "flac"]
        command.append(str(output_path))

        try:
            result = subprocess.run(command, capture_output=True, text=True, timeout=120)
        except subprocess.TimeoutExpired:
            return jsonify({"error": "Konversi melewati batas waktu 120 detik. Coba file yang lebih pendek."}), 408

        if result.returncode != 0 or not output_path.exists() or output_path.stat().st_size == 0:
            message = (result.stderr or "File audio tidak dapat dikonversi.")[-800:]
            return jsonify({"error": message}), 422

        # send_file streams the result before the temporary directory is removed;
        # use an in-memory response to avoid temporary-file lifetime issues.
        from io import BytesIO
        data = output_path.read_bytes()
        mimetypes = {
            "mp3": "audio/mpeg",
            "wav": "audio/wav",
            "ogg": "audio/ogg",
            "flac": "audio/flac",
        }
        return send_file(
            BytesIO(data),
            mimetype=mimetypes[output_format],
            as_attachment=True,
            download_name=f"{stem}_converted.{output_format}",
            max_age=0,
        )

@app.errorhandler(413)
def too_large(_error):
    return jsonify({"error": "File terlalu besar. Batas unggahan aplikasi ini 25 MB."}), 413

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "8000")))
