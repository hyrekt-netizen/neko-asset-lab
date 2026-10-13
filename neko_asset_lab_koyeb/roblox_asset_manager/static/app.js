const $ = (id) => document.getElementById(id);
const state = {
  music: readStore("neko_asset_music_v1"),
  animation: readStore("neko_asset_animation_v1")
};
function readStore(key) {
  try { const value = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(value) ? value : []; }
  catch { return []; }
}
function saveStore(type) { localStorage.setItem(`neko_asset_${type}_v1`, JSON.stringify(state[type])); render(type); }
function toast(message) {
  const el = $("toast"); el.textContent = message; el.classList.add("show");
  clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove("show"), 2600);
}
function cleanId(value) {
  let id = String(value || "").trim();
  id = id.replace(/^rbxassetid:\/\//i, "").replace(/^https?:\/\/www\.roblox\.com\/library\//i, "");
  id = id.replace(/^https?:\/\/create\.roblox\.com\/store\/asset\//i, "");
  const match = id.match(/\d{5,}/);
  return match ? match[0] : "";
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function render(type) {
  const isMusic = type === "music";
  const search = $(isMusic ? "musicSearch" : "animationSearch").value.toLowerCase().trim();
  const rows = $(isMusic ? "musicRows" : "animationRows");
  const items = state[type].filter(x => `${x.name} ${x.id}`.toLowerCase().includes(search));
  rows.innerHTML = items.map(item => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.id)}</td><td><div class="row-actions"><button class="mini-btn" data-copy="${escapeHtml(item.id)}">Salin ID</button><button class="mini-btn danger" data-delete="${escapeHtml(item.key)}" data-type="${type}">Hapus</button></div></td></tr>`).join("");
  $(isMusic ? "musicEmpty" : "animationEmpty").classList.toggle("hidden", items.length > 0);
  if (isMusic) $("musicCount").textContent = state.music.length;
}
function addItem(type, form) {
  const name = form.elements.name.value.trim();
  const id = cleanId(form.elements.id.value);
  if (!name || !id) { toast("Isi nama dan Asset ID numerik yang valid."); return; }
  if (state[type].some(x => x.id === id)) { toast("ID tersebut sudah ada di daftar."); return; }
  state[type].unshift({key: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, name, id});
  saveStore(type); form.reset(); toast("Item ditambahkan ke daftar lokal.");
}
$("musicForm").addEventListener("submit", e => { e.preventDefault(); addItem("music", e.currentTarget); });
$("animationForm").addEventListener("submit", e => { e.preventDefault(); addItem("animation", e.currentTarget); });
$("musicSearch").addEventListener("input", () => render("music"));
$("animationSearch").addEventListener("input", () => render("animation"));
document.addEventListener("click", async e => {
  const copy = e.target.closest("[data-copy]");
  const del = e.target.closest("[data-delete]");
  if (copy) {
    try { await navigator.clipboard.writeText(copy.dataset.copy); toast("ID disalin."); }
    catch { toast(`ID: ${copy.dataset.copy}`); }
  }
  if (del) {
    const type = del.dataset.type;
    state[type] = state[type].filter(x => x.key !== del.dataset.delete);
    saveStore(type); toast("Item dihapus.");
  }
});
function exportJson(type) {
  const blob = new Blob([JSON.stringify(state[type].map(({name,id})=>({name,id})), null, 2)], {type:"application/json"});
  downloadBlob(blob, `${type}-assets.json`);
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
function luaString(s) { return `"${String(s).replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g," ")}"`; }
function exportLua(type) {
  const list = state[type].map(x => `\t{${luaString(x.name)}, ${x.id}},`).join("\n");
  const content = `-- Exported by Neko Asset Lab\n-- Confirm asset permissions before using in an experience.\nlocal ${type === "music" ? "MusicAssets" : "AnimationAssets"} = {\n${list}\n}\n\nreturn ${type === "music" ? "MusicAssets" : "AnimationAssets"}\n`;
  downloadBlob(new Blob([content], {type:"text/plain;charset=utf-8"}), `${type}-assets.lua`);
}
$("exportMusic").addEventListener("click", () => exportLua("music"));
$("exportAnimation").addEventListener("click", () => exportLua("animation"));
$("importMusicBtn").addEventListener("click", () => $("importMusicFile").click());
$("importAnimationBtn").addEventListener("click", () => $("importAnimationFile").click());
function importJson(type, input) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!Array.isArray(parsed)) throw new Error("JSON harus berupa array.");
      const existing = new Set(state[type].map(x=>x.id));
      let added = 0;
      parsed.forEach(item => {
        const name = String(item.name || item.SongName || item.AnimationName || "").trim();
        const id = cleanId(item.id || item.SoundId || item.AnimationId || "");
        if (name && id && !existing.has(id)) {
          state[type].push({key: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,name,id});
          existing.add(id); added++;
        }
      });
      saveStore(type); toast(`${added} item berhasil diimpor.`);
    } catch (err) { toast("Gagal impor JSON: " + err.message); }
    input.value = "";
  };
  reader.readAsText(file);
}
$("importMusicFile").addEventListener("change", e => importJson("music", e.currentTarget));
$("importAnimationFile").addEventListener("change", e => importJson("animation", e.currentTarget));
document.querySelectorAll(".nav").forEach(btn => btn.addEventListener("click", () => {
  document.querySelectorAll(".nav").forEach(n=>n.classList.toggle("active", n===btn));
  document.querySelectorAll(".tab-panel").forEach(p=>p.classList.toggle("active", p.id === `tab-${btn.dataset.tab}`));
  $("pageTitle").textContent = ({music:"Music ID Manager",animation:"Animation ID Manager",converter:"Audio Converter"})[btn.dataset.tab];
}));
const audioFile = $("audioFile");
audioFile.addEventListener("change", () => { $("fileName").textContent = audioFile.files[0]?.name || "Pilih file atau jatuhkan di sini"; });
const dropzone = $("dropzone");
["dragenter","dragover"].forEach(ev => dropzone.addEventListener(ev, e => { e.preventDefault(); dropzone.style.borderColor="#c09bff"; }));
["dragleave","drop"].forEach(ev => dropzone.addEventListener(ev, e => { e.preventDefault(); dropzone.style.borderColor=""; }));
dropzone.addEventListener("drop", e => { if (e.dataTransfer.files.length) { audioFile.files = e.dataTransfer.files; audioFile.dispatchEvent(new Event("change")); }});
$("convertForm").addEventListener("submit", async e => {
  e.preventDefault();
  const file = audioFile.files[0]; if (!file) return;
  if (file.size > 25*1024*1024) { showConvertNotice("File lebih besar dari batas 25 MB.", true); return; }
  const form = new FormData(e.currentTarget);
  $("convertBtn").disabled = true; $("convertBtn").textContent = "Memproses…";
  $("progress").classList.remove("hidden"); $("convertNotice").classList.add("hidden");
  try {
    const response = await fetch("/convert", {method:"POST", body:form});
    if (!response.ok) {
      let message = "Konversi gagal.";
      try { message = (await response.json()).error || message; } catch {}
      throw new Error(message);
    }
    const blob = await response.blob();
    const disposition = response.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename="?([^"]+)"?/i);
    const filename = match ? match[1] : `converted.${form.get("format")}`;
    downloadBlob(blob, filename);
    showConvertNotice("Selesai! File hasil konversi sudah diunduh. Dengarkan hasilnya sebelum digunakan.", false);
  } catch(err) { showConvertNotice(err.message || "Terjadi kesalahan saat konversi.", true); }
  finally { $("convertBtn").disabled = false; $("convertBtn").textContent = "⇄ Konversi & unduh"; $("progress").classList.add("hidden"); }
});
function showConvertNotice(message, error) {
  const el = $("convertNotice"); el.textContent = message; el.classList.remove("hidden","error"); if(error) el.classList.add("error");
}
render("music"); render("animation");
