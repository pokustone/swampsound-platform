import { useState, useEffect, useCallback, useRef } from "react";
import QRCode from 'qrcode';
import { onAuth, login as fbLogin, registerWithInvite, validateToken, logout as fbLogout, resetPassword } from './lib/auth.js';
import * as DB from './lib/db.js';

/* ═══ QR ═════════════════════════════════════════════════════════ */
function QrSvg({ data, size = 120 }) {
  const [url, setUrl] = useState(null);
  useEffect(() => { QRCode.toDataURL(data, { width: size * 2, margin: 1, errorCorrectionLevel: 'M' }).then(setUrl).catch(() => {}); }, [data, size]);
  if (!url) return <div style={{ width: size, height: size, background: "#eee", borderRadius: 4 }} />;
  return <img src={url} width={size} height={size} style={{ display: "block", borderRadius: 3 }} alt="QR" />;
}

/* ═══ File reading helper ════════════════════════════════════════ */
function readFileAsDataUrl(file) {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => resolve(null);
    r.readAsDataURL(file);
  });
}

/* ═══ Helpers ═════════════════════════════════════════════════════ */
const valPw = pw => { if (pw.length < 8) return "Min. 8 znaků"; if (!/[A-Z]/.test(pw)) return "Velké písmeno"; if (!/[a-z]/.test(pw)) return "Malé písmeno"; if (!/[0-9]/.test(pw)) return "Číslice"; return null; };
const fmtT = ts => { if (!ts) return "—"; const d = Date.now() - ts; if (d < 60000) return "teď"; if (d < 3600000) return `${Math.floor(d / 60000)}m`; if (d < 86400000) return `${Math.floor(d / 3600000)}h`; return new Date(ts).toLocaleDateString("cs-CZ"); };
const fmtDate = ts => { if (!ts) return "—"; return new Date(ts).toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" }); };
const fmtDur = s => { const m = Math.floor(s / 60), h = Math.floor(m / 60); return h ? `${h}h ${m % 60}m` : `${m}m`; };
const parseUrl = url => { if (!url) return null; const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/); if (yt) return { type: "youtube", id: yt[1] }; if (url.match(/soundcloud\.com/)) return { type: "soundcloud", url }; return null; };

/* ═══ Firestore timestamp → ms ═══════════════════════════════════ */
const tsToMs = (ts) => {
  if (!ts) return 0;
  if (typeof ts === 'number') return ts;
  if (ts.toMillis) return ts.toMillis();
  if (ts.seconds) return ts.seconds * 1000;
  return 0;
};

/* ═══ Theme ══════════════════════════════════════════════════════ */
const C = { acc: "#c8a84e", accD: "#8a7435", grn: "#2a5a2a", grnL: "#3d8a3d", grnD: "#0d1f0d", red: "#a83232", srf: "#111a11", srfL: "#1a2a1a", brd: "#2a3a2a", txM: "#7a7a6a", tx: "#d4cfba", bg: "#0a0f0a" };

/* ═══ Base Components ════════════════════════════════════════════ */
function Inp({ label, type = "text", value, onChange, placeholder, error, required, style: es }) {
  return <div style={{ marginBottom: 14, ...es }}>{label && <label style={{ display: "block", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: C.acc, marginBottom: 5, fontFamily: "inherit" }}>{label}{required && <span style={{ color: C.red }}> *</span>}</label>}{type === "textarea" ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} style={{ width: "100%", padding: "10px 12px", background: C.grnD, border: `1px solid ${error ? C.red : C.brd}`, borderRadius: 4, color: C.tx, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box", resize: "vertical" }} /> : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ width: "100%", padding: "10px 12px", background: C.grnD, border: `1px solid ${error ? C.red : C.brd}`, borderRadius: 4, color: C.tx, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} onFocus={e => e.target.style.borderColor = C.acc} onBlur={e => e.target.style.borderColor = error ? C.red : C.brd} />}{error && <div style={{ color: C.red, fontSize: 11, marginTop: 3 }}>{error}</div>}</div>;
}
function Btn({ children, onClick, v = "primary", disabled, style: es }) {
  const s = { primary: { background: C.acc, color: "#0a0f0a" }, secondary: { background: "transparent", color: C.acc, border: `1px solid ${C.accD}` }, small: { background: C.srfL, color: C.tx, border: `1px solid ${C.brd}`, padding: "5px 10px", fontSize: 11 } };
  return <button onClick={disabled ? undefined : onClick} style={{ padding: "9px 20px", borderRadius: 4, fontSize: 12, fontFamily: "inherit", letterSpacing: 1.5, textTransform: "uppercase", cursor: disabled ? "not-allowed" : "pointer", fontWeight: "bold", opacity: disabled ? .5 : 1, border: "none", transition: "all .15s", ...s[v], ...es }}>{children}</button>;
}
function Crd({ children, onClick, hov, style: es }) {
  const [h, setH] = useState(false);
  return <div onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{ background: C.srf, border: `1px solid ${h && hov ? C.accD : C.brd}`, borderRadius: 6, padding: 18, marginBottom: 12, cursor: hov ? "pointer" : "default", transition: "all .15s", ...es }}>{children}</div>;
}
function Badge({ children, color = C.grnL }) { return <span style={{ padding: "3px 10px", borderRadius: 3, fontSize: 10, fontWeight: "bold", letterSpacing: 1, textTransform: "uppercase", background: color + "22", color, whiteSpace: "nowrap" }}>{children}</span>; }
function Sec({ title, right, children }) { return <><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, marginTop: 28 }}><div style={{ fontSize: 10, letterSpacing: 3, color: C.accD, textTransform: "uppercase" }}>{title}</div>{right}</div>{children}</>; }
function EvLink({ event, onNav }) { if (!event) return null; return <button onClick={e => { e.stopPropagation(); onNav("events:" + event.id); }} style={{ background: "none", border: "none", color: C.acc, fontSize: 11, cursor: "pointer", fontFamily: "inherit", padding: 0, textDecoration: "underline" }}>{event.title} →</button>; }
function Loading({ text = "Načítání..." }) { return <div style={{ textAlign: "center", padding: 40, color: C.txM, fontSize: 13 }}>{text}</div>; }

/* ═══ Photo ══════════════════════════════════════════════════════ */
function PhotoImg({ photo, size = 140, onClick }) {
  if (photo.url) {
    return <div onClick={onClick} style={{ width: size, height: size, borderRadius: 4, overflow: "hidden", flexShrink: 0, cursor: onClick ? "pointer" : "default", border: `1px solid ${C.brd}` }}>
      <img src={photo.url} alt={photo.caption} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
    </div>;
  }
  const cols = ["#1a3a2a", "#2a3a1a", "#1a2a3a", "#3a2a1a", "#2a1a3a"];
  const c = cols[Math.abs([...(photo.ph || "x")].reduce((a, b) => a + b.charCodeAt(0), 0)) % cols.length];
  return <div onClick={onClick} style={{ width: size, height: size, borderRadius: 4, background: c, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.brd}`, flexShrink: 0, cursor: onClick ? "pointer" : "default", position: "relative" }}>
    <svg width={size * .3} height={size * .3} viewBox="0 0 24 24" fill="none" stroke={C.txM} strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
    <div style={{ position: "absolute", fontSize: 9, color: C.txM, bottom: 4 }}>foto</div>
  </div>;
}

/* ═══ Lightbox ═══════════════════════════════════════════════════ */
function Lightbox({ photos, currentIndex, onClose, onNav }) {
  const p = photos[currentIndex];
  const hasPrev = currentIndex > 0, hasNext = currentIndex < photos.length - 1;
  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); if (e.key === "ArrowLeft" && hasPrev) onNav(currentIndex - 1); if (e.key === "ArrowRight" && hasNext) onNav(currentIndex + 1); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [currentIndex, hasPrev, hasNext, onClose, onNav]);
  if (!p) return null;
  const imgSize = Math.min(500, window.innerWidth - 120);
  return (
    <div onClick={onClose} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, flexDirection: "column" }}>
      <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: `1px solid ${C.brd}`, color: C.tx, width: 36, height: 36, borderRadius: "50%", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>×</button>
      <div style={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)", fontSize: 12, color: C.txM }}>{currentIndex + 1} / {photos.length}</div>
      <div onClick={e => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 16px" }}>
        <button onClick={() => hasPrev && onNav(currentIndex - 1)} style={{ background: "none", border: "none", color: hasPrev ? C.tx : "transparent", fontSize: 40, cursor: hasPrev ? "pointer" : "default", padding: "20px 12px", userSelect: "none", flexShrink: 0 }}>‹</button>
        <div style={{ textAlign: "center" }}>
          {p.url ? <img src={p.url} alt={p.caption} style={{ maxWidth: imgSize, maxHeight: imgSize, borderRadius: 4, display: "block" }} /> : <PhotoImg photo={p} size={imgSize} />}
          <div style={{ color: C.tx, fontSize: 14, marginTop: 12 }}>{p.caption}</div>
        </div>
        <button onClick={() => hasNext && onNav(currentIndex + 1)} style={{ background: "none", border: "none", color: hasNext ? C.tx : "transparent", fontSize: 40, cursor: hasNext ? "pointer" : "default", padding: "20px 12px", userSelect: "none", flexShrink: 0 }}>›</button>
      </div>
      <div style={{ fontSize: 11, color: C.txM, marginTop: 16 }}>← → šipky · ESC zavřít</div>
    </div>
  );
}

/* ═══ Uploads ═════════════════════════════════════════════════════ */
function DropZone({ onFiles, label, accept }) {
  const ref = useRef(null); const [drag, setDrag] = useState(false);
  return <div onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files.length) onFiles([...e.dataTransfer.files]); }} onClick={() => ref.current?.click()} style={{ border: `2px dashed ${drag ? C.acc : C.brd}`, borderRadius: 6, padding: "20px 16px", textAlign: "center", cursor: "pointer", background: drag ? C.acc + "10" : "transparent", marginBottom: 12 }}><input ref={ref} type="file" multiple accept={accept} onChange={e => { if (e.target.files.length) onFiles([...e.target.files]); e.target.value = ""; }} style={{ display: "none" }} /><div style={{ fontSize: 20, marginBottom: 4, color: C.accD }}>+</div><div style={{ fontSize: 12, color: C.txM }}>{label}</div></div>;
}
function EmbedInput({ onAdd, placeholder }) {
  const [url, setUrl] = useState(""); const [err, setErr] = useState("");
  const p = parseUrl(url);
  return <div style={{ marginBottom: 12 }}><div style={{ display: "flex", gap: 8 }}><Inp label="" value={url} onChange={v => { setUrl(v); setErr(""); }} placeholder={placeholder} error={err} style={{ flex: 1, marginBottom: 0 }} /><Btn v="small" onClick={() => { if (!p) { setErr("Neplatná URL"); return; } onAdd({ url, ...p }); setUrl(""); }}>Přidat</Btn></div>{p && <div style={{ fontSize: 11, color: C.grnL, marginTop: 6 }}>{p.type === "youtube" ? `YouTube (${p.id})` : "SoundCloud"}</div>}</div>;
}

/* ═══ YouTube embed ══════════════════════════════════════════════ */
function YtEmbed({ videoId, title }) {
  return <div><div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: 4, overflow: "hidden", marginBottom: 8 }}><iframe src={`https://www.youtube.com/embed/${videoId}`} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={title} /></div><div style={{ fontSize: 13, color: C.tx }}>{title}</div></div>;
}

/* ═══ SoundCloud embed ═══════════════════════════════════════════ */
function ScEmbed({ url, title }) {
  const src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23c8a84e&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=true`;
  return <div><iframe width="100%" height="166" scrolling="no" frameBorder="no" allow="autoplay" src={src} style={{ borderRadius: 4, marginBottom: 8 }} title={title} /><div style={{ fontSize: 13, color: C.tx }}>{title}</div></div>;
}

/* ═══ Audio Player ═══════════════════════════════════════════════ */
function AudioPlayer({ track }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurTime] = useState(0);
  const [duration, setDuration] = useState(track.duration || 0);
  const toggle = () => { if (!audioRef.current) return; if (playing) audioRef.current.pause(); else audioRef.current.play().catch(() => {}); setPlaying(!playing); };
  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    const onTime = () => { setCurTime(a.currentTime); setProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0); };
    const onMeta = () => setDuration(a.duration);
    const onEnd = () => { setPlaying(false); setProgress(0); };
    a.addEventListener("timeupdate", onTime); a.addEventListener("loadedmetadata", onMeta); a.addEventListener("ended", onEnd);
    return () => { a.removeEventListener("timeupdate", onTime); a.removeEventListener("loadedmetadata", onMeta); a.removeEventListener("ended", onEnd); };
  }, []);
  const fmtSec = s => { const m = Math.floor(s / 60); return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`; };
  if (track.src === "soundcloud" && track.embedUrl) return <ScEmbed url={track.embedUrl} title={track.title} />;
  return <div>
    {track.fileUrl && <audio ref={audioRef} src={track.fileUrl} preload="metadata" />}
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <button onClick={toggle} disabled={!track.fileUrl} style={{ width: 40, height: 40, borderRadius: "50%", border: `1px solid ${C.acc}`, background: playing ? C.acc : "transparent", color: playing ? "#0a0f0a" : C.acc, cursor: track.fileUrl ? "pointer" : "not-allowed", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: track.fileUrl ? 1 : .4 }}>{playing ? "▮▮" : "▶"}</button>
      <div style={{ flex: 1 }}><div style={{ fontSize: 14, color: C.tx }}>{track.title}</div>{!track.fileUrl && !track.embedUrl && <div style={{ fontSize: 10, color: C.txM, marginTop: 2 }}>Audio soubor — nahrávání přes Storage zatím nedostupné</div>}</div>
    </div>
    {track.fileUrl && <div style={{ marginTop: 8 }}>
      <div style={{ height: 4, background: C.brd, borderRadius: 2, overflow: "hidden", cursor: "pointer" }} onClick={e => { const r = e.currentTarget.getBoundingClientRect(); const pct = (e.clientX - r.left) / r.width; if (audioRef.current) audioRef.current.currentTime = pct * audioRef.current.duration; }}>
        <div style={{ width: `${progress}%`, height: "100%", background: C.acc, borderRadius: 2, transition: "width .1s" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3, fontSize: 10, color: C.txM }}><span>{fmtSec(currentTime)}</span><span>{duration > 0 ? fmtSec(duration) : "--:--"}</span></div>
    </div>}
  </div>;
}

/* ═══ Chat (Firebase real-time) ══════════════════════════════════ */
function MiniChat({ user, room, events = [], showLabels = false, allRooms = false, onRoomClick }) {
  const [msgs, setMsgs] = useState([]); const [txt, setTxt] = useState(""); const btm = useRef(null);
  const roomLabel = id => { if (id === "general") return "Hlavní chat"; return events.find(e => e.id === id)?.title || id; };
  useEffect(() => { return allRooms ? DB.onAllMessages(setMsgs, 200) : DB.onMessages(room, setMsgs, 100); }, [room, allRooms]);
  useEffect(() => { btm.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);
  const send = async () => {
    if (!txt.trim()) return; const t = txt; setTxt("");
    try { await DB.sendMessage({ room: room || "general", text: t, authorName: user.nickname || user.fullName, authorId: user.uid }); } catch (e) { console.error("Send:", e); }
  };
  return <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
    <div style={{ flex: 1, overflowY: "auto", padding: 12, background: C.srf, border: `1px solid ${C.brd}`, borderRadius: 6, marginBottom: 8 }}>
      {msgs.length === 0 && <div style={{ textAlign: "center", padding: 20, color: C.txM, fontSize: 12 }}>Zatím žádné zprávy.</div>}
      {msgs.map(m => { const me = m.authorName === (user.nickname || user.fullName); return <div key={m.id} style={{ marginBottom: 10 }}>
        {showLabels && <button onClick={e => { e.stopPropagation(); onRoomClick?.(m.room); }} style={{ fontSize: 10, color: m.room === "general" ? C.grnL : C.acc, background: (m.room === "general" ? C.grnL : C.acc) + "15", padding: "1px 8px", borderRadius: 3, marginBottom: 3, display: "inline-block", border: "none", cursor: "pointer", fontFamily: "inherit" }}>{roomLabel(m.room)} →</button>}
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}><span style={{ fontSize: 12, fontWeight: "bold", color: me ? C.acc : C.grnL }}>{m.authorName}</span><span style={{ fontSize: 10, color: C.txM }}>{fmtT(m.ts)}</span></div>
        <div style={{ fontSize: 13, color: C.tx, lineHeight: 1.5, marginTop: 1 }}>{m.text}</div>
      </div>; })}
      <div ref={btm} />
    </div>
    <div style={{ display: "flex", gap: 8 }}><input value={txt} onChange={e => setTxt(e.target.value)} onKeyDown={e => { if (e.key === "Enter") send(); }} placeholder={allRooms ? "Piš do hlavního chatu..." : "Napiš zprávu..."} style={{ flex: 1, padding: "10px 12px", background: C.grnD, border: `1px solid ${C.brd}`, borderRadius: 4, color: C.tx, fontSize: 13, fontFamily: "inherit", outline: "none" }} /><Btn onClick={send}>Odeslat</Btn></div>
  </div>;
}

/* ═══ Nav ═════════════════════════════════════════════════════════ */
function Nav({ user, onNav, page }) {
  const links = user ? [{ id: "dashboard", l: "Nástěnka" }, { id: "events", l: "Akce" }, { id: "gallery", l: "Galerie" }, { id: "media", l: "Audio/Video" }, { id: "chat", l: "Chat" }, ...(user.role === "admin" ? [{ id: "admin", l: "Admin" }] : [])] : [];
  const ap = page.split(":")[0];
  return <nav style={{ background: C.grnD, borderBottom: `1px solid ${C.brd}`, padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52, position: "sticky", top: 0, zIndex: 100, overflowX: "auto", gap: 8 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", flexShrink: 0 }} onClick={() => onNav(user ? "dashboard" : "landing")}><span style={{ fontSize: 18, color: C.acc, fontWeight: "bold" }}>///</span><span style={{ fontSize: 13, fontWeight: "bold", letterSpacing: 3, color: C.tx, textTransform: "uppercase" }}>SwampSound</span></div>
    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>{links.map(li => <button key={li.id} onClick={() => onNav(li.id)} style={{ background: ap === li.id ? C.srfL : "transparent", border: "none", color: ap === li.id ? C.acc : C.txM, padding: "5px 10px", borderRadius: 4, fontSize: 11, fontFamily: "inherit", letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", whiteSpace: "nowrap" }}>{li.l}</button>)}{user && <button onClick={() => onNav("logout")} style={{ background: "transparent", border: `1px solid ${C.brd}`, color: C.txM, padding: "4px 10px", borderRadius: 4, fontSize: 10, fontFamily: "inherit", letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", marginLeft: 6 }}>Odhlásit</button>}</div>
  </nav>;
}

/* ═══ Landing / Login / Register ═════════════════════════════════ */
function Landing({ onNav }) {
  return <div style={{ maxWidth: 640, margin: "0 auto", padding: "60px 20px", textAlign: "center" }}><div style={{ fontSize: 10, letterSpacing: 6, color: C.accD, textTransform: "uppercase", marginBottom: 10 }}>Est. 2004</div><h1 style={{ fontSize: 40, fontWeight: "bold", color: C.acc, letterSpacing: 4, margin: "0 0 6px", textTransform: "uppercase", fontFamily: "inherit" }}>SwampSound</h1><h2 style={{ fontSize: 15, fontWeight: "normal", color: C.txM, letterSpacing: 4, margin: "0 0 40px", textTransform: "uppercase" }}>System</h2><div style={{ width: 50, height: 1, background: C.acc, margin: "0 auto 36px", opacity: .4 }} /><p style={{ fontSize: 15, color: C.txM, lineHeight: 1.8, maxWidth: 460, margin: "0 auto 36px" }}>Přes 20 let basů, dubu a přátelství. Taneční akce po celé Evropě. Uzavřená komunita pro ty, kteří vědí.</p><div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}><Btn onClick={() => onNav("login")}>Přihlásit se</Btn><Btn v="secondary" onClick={() => onNav("register")}>Mám pozvánku</Btn></div></div>;
}

function Login({ onNav }) {
  const [em, setEm] = useState(""); const [pw, setPw] = useState(""); const [err, setErr] = useState(""); const [loading, setLoading] = useState(false);
  const go = async () => {
    if (!em || !pw) { setErr("Vyplňte email a heslo"); return; }
    setLoading(true); setErr("");
    try { await fbLogin(em, pw); }
    catch (e) {
      if (e.code === "auth/user-not-found" || e.code === "auth/invalid-credential") setErr("Nesprávný email nebo heslo");
      else if (e.code === "auth/wrong-password") setErr("Nesprávné heslo");
      else if (e.code === "auth/too-many-requests") setErr("Příliš mnoho pokusů, zkuste později");
      else setErr(e.message || "Chyba přihlášení");
      setLoading(false);
    }
  };
  const handleReset = async () => {
    if (!em) { setErr("Vyplňte email pro reset"); return; }
    try { await resetPassword(em); setErr(""); alert("Email s odkazem na reset hesla byl odeslán."); } catch (e) { setErr("Chyba: " + (e.message || "")); }
  };
  return <div style={{ maxWidth: 360, margin: "0 auto", padding: "60px 20px" }}><div style={{ textAlign: "center", marginBottom: 36 }}><div style={{ fontSize: 10, letterSpacing: 4, color: C.accD, textTransform: "uppercase", marginBottom: 6 }}>SwampSound</div><h1 style={{ fontSize: 22, color: C.acc, letterSpacing: 2, margin: 0, textTransform: "uppercase", fontFamily: "inherit" }}>Přihlášení</h1></div><Crd><Inp label="Email" type="email" value={em} onChange={v => { setEm(v); setErr(""); }} placeholder="vas@email.cz" required /><Inp label="Heslo" type="password" value={pw} onChange={v => { setPw(v); setErr(""); }} placeholder="••••••••" required />{err && <div style={{ color: C.red, fontSize: 12, marginBottom: 10, padding: "7px 10px", background: "rgba(168,50,50,0.1)", borderRadius: 4 }}>{err}</div>}<Btn onClick={go} disabled={loading} style={{ width: "100%" }}>{loading ? "Přihlašuji..." : "Vstoupit"}</Btn><div style={{ textAlign: "center", marginTop: 14, display: "flex", justifyContent: "center", gap: 16 }}><button onClick={() => onNav("register")} style={{ background: "none", border: "none", color: C.accD, fontSize: 11, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}>Mám pozvánku</button><button onClick={handleReset} style={{ background: "none", border: "none", color: C.txM, fontSize: 11, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}>Zapomenuté heslo</button></div></Crd></div>;
}

function Register({ onNav }) {
  const [step, setStep] = useState(1); const [tok, setTok] = useState(""); const [tokErr, setTokErr] = useState(""); const [vTok, setVTok] = useState(null);
  const [f, setF] = useState({ fn: "", em: "", ph: "", pw: "", pw2: "", nick: "" }); const [errs, setErrs] = useState({}); const [sub, setSub] = useState(false);
  const check = async () => {
    const t = tok.trim().toUpperCase(); if (!t) { setTokErr("Zadejte kód"); return; }
    try {
      const r = await validateToken(t);
      if (r.valid) { setVTok({ ...r, token: t }); if (r.type === "email" && r.email) setF(p => ({ ...p, em: r.email })); setStep(2); }
      else setTokErr(r.reason || "Neplatný kód");
    } catch (e) { setTokErr("Chyba: " + (e.message || "")); }
  };
  const submit = async () => {
    const e = {}; if (!f.fn.trim()) e.fn = "Vyplňte"; if (!f.em.includes("@")) e.em = "Neplatný"; if (f.ph.length < 9) e.ph = "Vyplňte"; const pe = valPw(f.pw); if (pe) e.pw = pe; if (f.pw !== f.pw2) e.pw2 = "Neshodují se";
    if (Object.keys(e).length) { setErrs(e); return; }
    setSub(true);
    try { await registerWithInvite({ token: vTok.token, fullName: f.fn, email: f.em, phone: f.ph, password: f.pw, nickname: f.nick || null }); }
    catch (err) {
      if (err.code === "auth/email-already-in-use") setErrs({ em: "Email je již registrován" });
      else setErrs({ fn: err.message || "Chyba registrace" });
      setSub(false);
    }
  };
  const up = (k, v) => { setF(p => ({ ...p, [k]: v })); setErrs(p => ({ ...p, [k]: undefined })); };
  return <div style={{ maxWidth: 400, margin: "0 auto", padding: "60px 20px" }}><div style={{ textAlign: "center", marginBottom: 30 }}><h1 style={{ fontSize: 22, color: C.acc, letterSpacing: 2, margin: 0, textTransform: "uppercase", fontFamily: "inherit" }}>Registrace</h1></div><div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 24 }}><div style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: "bold", background: C.acc, color: "#0a0f0a" }}>1</div><div style={{ width: 36, height: 1, background: step >= 2 ? C.acc : C.brd }} /><div style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: "bold", background: step >= 2 ? C.acc : C.brd, color: step >= 2 ? "#0a0f0a" : C.txM }}>2</div></div>{step === 1 && <Crd><Inp label="Kód pozvánky" value={tok} onChange={v => { setTok(v.toUpperCase()); setTokErr(""); }} placeholder="SWAMP-XXXX-XXXX-XXXX" error={tokErr} required /><Btn onClick={check} style={{ width: "100%" }}>Ověřit</Btn></Crd>}{step === 2 && <Crd><Inp label="Celé jméno" value={f.fn} onChange={v => up("fn", v)} error={errs.fn} required /><Inp label="Email" type="email" value={f.em} onChange={v => up("em", v)} error={errs.em} required /><Inp label="Telefon" value={f.ph} onChange={v => up("ph", v)} placeholder="+420 ..." error={errs.ph} required /><Inp label="Heslo" type="password" value={f.pw} onChange={v => up("pw", v)} placeholder="Min. 8, A-z, 0-9" error={errs.pw} required /><Inp label="Heslo znovu" type="password" value={f.pw2} onChange={v => up("pw2", v)} error={errs.pw2} required /><Inp label="Přezdívka (volitelné)" value={f.nick} onChange={v => up("nick", v)} /><Btn onClick={submit} disabled={sub} style={{ width: "100%" }}>{sub ? "Vytvářím..." : "Registrovat"}</Btn></Crd>}<div style={{ textAlign: "center", marginTop: 10 }}><button onClick={() => onNav("landing")} style={{ background: "none", border: "none", color: C.txM, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>Zpět</button></div></div>;
}

/* ═══ Dashboard ══════════════════════════════════════════════════ */
function Dashboard({ user, events, onNav }) {
  const up = events.filter(e => e.status === "upcoming"), past = events.filter(e => e.status === "past").slice(0, 3);
  return <div style={{ maxWidth: 620, margin: "0 auto", padding: "28px 20px" }}><div style={{ marginBottom: 24 }}><div style={{ fontSize: 10, letterSpacing: 3, color: C.accD, textTransform: "uppercase", marginBottom: 3 }}>Vítej zpět</div><h1 style={{ fontSize: 24, color: C.acc, margin: 0, fontFamily: "inherit" }}>{user.nickname || user.fullName}</h1></div><Sec title="Nadcházející akce">{up.length === 0 && <Crd><div style={{ fontSize: 12, color: C.txM }}>Žádné nadcházející akce.</div></Crd>}{up.map(ev => <Crd key={ev.id} hov onClick={() => onNav("events:" + ev.id)}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}><div><h3 style={{ margin: "0 0 5px", fontSize: 15, color: C.tx, fontFamily: "inherit" }}>{ev.title}</h3><div style={{ fontSize: 12, color: C.acc }}>{ev.date} — {ev.location}</div></div><Badge color={C.acc}>SOON</Badge></div></Crd>)}</Sec><Sec title="Proběhlé">{past.length === 0 && <Crd><div style={{ fontSize: 12, color: C.txM }}>Zatím žádné.</div></Crd>}{past.map(ev => <Crd key={ev.id} hov onClick={() => onNav("events:" + ev.id)} style={{ opacity: .75 }}><h3 style={{ margin: 0, fontSize: 14, color: C.txM, fontFamily: "inherit" }}>{ev.title}</h3><div style={{ fontSize: 11, color: C.accD }}>{ev.date}</div></Crd>)}</Sec></div>;
}

/* ═══ Event Detail ═══════════════════════════════════════════════ */
function EvDetail({ eid, user, events, onNav }) {
  const ev = events.find(e => e.id === eid);
  if (!ev) return <div style={{ padding: 40, color: C.txM }}>Nenalezena</div>;
  const isA = user.role === "admin";
  const [gals, setGals] = useState([]); const [auds, setAuds] = useState([]); const [vids, setVids] = useState([]);
  const [msgCount, setMsgCount] = useState(0); const [showChat, setShowChat] = useState(false); const [showUp, setShowUp] = useState(null);
  const [upPhotos, setUpPhotos] = useState([]); const [lbPhotos, setLbPhotos] = useState(null); const [lbIdx, setLbIdx] = useState(0); const [saving, setSaving] = useState(false);

  useEffect(() => {
    const u = []; u.push(DB.onGalleryByEvent(eid, setGals)); u.push(DB.onAudio(all => setAuds(all.filter(a => a.eventId === eid)))); u.push(DB.onVideos(all => setVids(all.filter(v => v.eventId === eid)))); u.push(DB.onMessages(eid, ms => setMsgCount(ms.length), 200));
    return () => u.forEach(fn => fn());
  }, [eid]);

  const handlePhotoFiles = async (files) => { const np = []; for (const f of files) { const url = await readFileAsDataUrl(f); np.push({ id: "up" + Date.now() + Math.random(), caption: f.name.replace(/\.[^.]+$/, ""), ph: f.name, url }); } setUpPhotos(p => [...p, ...np]); };

  const savePhotos = async () => {
    if (!upPhotos.length) return; setSaving(true);
    try {
      const { addDoc, updateDoc: fbUpdate, doc: fbDoc, collection, serverTimestamp } = await import('firebase/firestore');
      const { db: fireDb } = await import('./lib/firebase.js');
      const photos = upPhotos.map(p => ({ id: p.id, caption: p.caption, ph: p.ph, url: null }));
      if (gals.length > 0) { await fbUpdate(fbDoc(fireDb, 'gallery', gals[0].id), { photos: [...(gals[0].photos || []), ...photos] }); }
      else { await addDoc(collection(fireDb, 'gallery'), { eventId: eid, title: ev.title + " — Fotky", photos, uploadedBy: user.uid, createdAt: serverTimestamp() }); }
      setUpPhotos([]); setShowUp(null);
    } catch (e) { console.error(e); alert("Chyba: " + e.message); }
    setSaving(false);
  };
  const addVideo = async ({ url }) => { try { await DB.addVideo({ title: `Video — ${ev.title}`, embedUrl: url, eventId: eid }); setShowUp(null); } catch (e) { console.error(e); } };
  const addScAudio = async (url) => { try { await DB.addAudio({ title: "SoundCloud track", eventId: eid, embedUrl: url, uploadedBy: user.uid }); setShowUp(null); } catch (e) { console.error(e); } };
  const handleAudioFiles = async (files) => { for (const f of files) { await DB.addAudio({ title: f.name.replace(/\.[^.]+$/, ""), eventId: eid, embedUrl: null, uploadedBy: user.uid }); } setShowUp(null); };

  return <div style={{ maxWidth: 620, margin: "0 auto", padding: "28px 20px" }}>
    {lbPhotos && <Lightbox photos={lbPhotos} currentIndex={lbIdx} onClose={() => setLbPhotos(null)} onNav={setLbIdx} />}
    <button onClick={() => onNav("events")} style={{ background: "none", border: "none", color: C.accD, fontSize: 12, cursor: "pointer", fontFamily: "inherit", marginBottom: 16, padding: 0 }}>← Zpět na akce</button>
    <h1 style={{ fontSize: 22, color: C.acc, margin: "0 0 6px", fontFamily: "inherit" }}>{ev.title}</h1>
    <div style={{ fontSize: 13, color: C.grnL, marginBottom: 20 }}>{ev.date} — {ev.location}</div>
    <Crd><p style={{ margin: 0, fontSize: 14, color: C.tx, lineHeight: 1.7 }}>{ev.description}</p></Crd>
    {ev.lineup?.length > 0 && <Sec title="Lineup"><Crd><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{ev.lineup.map((a, i) => <span key={i} style={{ padding: "5px 14px", borderRadius: 20, fontSize: 12, background: C.srfL, color: C.tx, border: `1px solid ${C.brd}` }}>{a}</span>)}</div></Crd></Sec>}
    <Sec title="Fotogalerie" right={isA && <Btn v="small" onClick={() => setShowUp(showUp === "photos" ? null : "photos")}>{showUp === "photos" ? "Zavřít" : "+ Fotky"}</Btn>}>
      {showUp === "photos" && <Crd style={{ borderColor: C.acc }}><DropZone onFiles={handlePhotoFiles} label="Přetáhni fotky (JPG, PNG, WebP)" accept="image/*" />{upPhotos.length > 0 && <><div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>{upPhotos.map(p => <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 6 }}><PhotoImg photo={p} size={48} /><span style={{ fontSize: 11, color: C.tx }}>{p.caption}</span><button onClick={() => setUpPhotos(ps => ps.filter(x => x.id !== p.id))} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 14, padding: 0 }}>×</button></div>)}</div><Btn onClick={savePhotos} disabled={saving}>{saving ? "Ukládám..." : `Uložit ${upPhotos.length} fotek`}</Btn></>}</Crd>}
      {gals.map(g => <Crd key={g.id}><div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>{(g.photos || []).map((p, i) => <PhotoImg key={p.id} photo={p} size={90} onClick={() => { setLbPhotos(g.photos); setLbIdx(i); }} />)}</div></Crd>)}
      {!gals.length && !showUp && <Crd><div style={{ fontSize: 12, color: C.txM, textAlign: "center" }}>Žádné fotky.</div></Crd>}
    </Sec>
    <Sec title="Audio" right={isA && <Btn v="small" onClick={() => setShowUp(showUp === "audio" ? null : "audio")}>{showUp === "audio" ? "Zavřít" : "+ Audio"}</Btn>}>
      {showUp === "audio" && <Crd style={{ borderColor: C.acc }}><DropZone onFiles={handleAudioFiles} label="MP3, WAV, FLAC, OGG..." accept="audio/*" /><div style={{ fontSize: 10, letterSpacing: 2, color: C.acc, textTransform: "uppercase", margin: "8px 0 10px" }}>Nebo SoundCloud</div><EmbedInput onAdd={({ url }) => addScAudio(url)} placeholder="https://soundcloud.com/..." /></Crd>}
      {auds.map(a => <Crd key={a.id}><AudioPlayer track={a} /></Crd>)}
      {!auds.length && !showUp && <Crd><div style={{ fontSize: 12, color: C.txM, textAlign: "center" }}>Žádné nahrávky.</div></Crd>}
    </Sec>
    <Sec title="Videa" right={isA && <Btn v="small" onClick={() => setShowUp(showUp === "video" ? null : "video")}>{showUp === "video" ? "Zavřít" : "+ Video"}</Btn>}>
      {showUp === "video" && <Crd style={{ borderColor: C.acc }}><EmbedInput onAdd={addVideo} placeholder="https://youtube.com/watch?v=..." /></Crd>}
      {vids.map(v => { const p = parseUrl(v.embedUrl); return <Crd key={v.id}>{p?.type === "youtube" ? <YtEmbed videoId={p.id} title={v.title} /> : <div>{v.title}</div>}</Crd>; })}
      {!vids.length && !showUp && <Crd><div style={{ fontSize: 12, color: C.txM, textAlign: "center" }}>Žádná videa.</div></Crd>}
    </Sec>
    <Sec title={`Diskuze (${msgCount})`} right={<Btn v="small" onClick={() => setShowChat(!showChat)}>{showChat ? "Skrýt" : "Zobrazit"}</Btn>}>
      {showChat && <div style={{ height: 350 }}><MiniChat user={user} room={eid} events={events} /></div>}
      {!showChat && <Crd hov onClick={() => setShowChat(true)}><div style={{ fontSize: 12, color: C.txM }}>{msgCount > 0 ? `${msgCount} zpráv` : "Začni diskuzi!"}</div></Crd>}
    </Sec>
  </div>;
}

/* ═══ Events List ════════════════════════════════════════════════ */
function Events({ user, events, onNav }) {
  const [show, setShow] = useState(false); const [f, setF] = useState({ t: "", d: "", l: "", desc: "", lin: "" }); const [saving, setSaving] = useState(false);
  const add = async () => {
    if (!f.t || !f.d || !f.l) return; setSaving(true);
    try { await DB.createEvent({ title: f.t, date: f.d, location: f.l, description: f.desc, status: "upcoming", lineup: f.lin ? f.lin.split(",").map(s => s.trim()) : [] }); setShow(false); setF({ t: "", d: "", l: "", desc: "", lin: "" }); } catch (e) { console.error(e); }
    setSaving(false);
  };
  return <div style={{ maxWidth: 620, margin: "0 auto", padding: "28px 20px" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}><h1 style={{ fontSize: 20, color: C.acc, margin: 0, fontFamily: "inherit", letterSpacing: 2, textTransform: "uppercase" }}>Akce</h1>{user.role === "admin" && <Btn v="secondary" onClick={() => setShow(!show)}>{show ? "Zrušit" : "+ Přidat"}</Btn>}</div>{show && <Crd style={{ borderColor: C.acc }}><Inp label="Název" value={f.t} onChange={v => setF(p => ({ ...p, t: v }))} required /><Inp label="Datum" type="date" value={f.d} onChange={v => setF(p => ({ ...p, d: v }))} required /><Inp label="Místo" value={f.l} onChange={v => setF(p => ({ ...p, l: v }))} required /><Inp label="Popis" type="textarea" value={f.desc} onChange={v => setF(p => ({ ...p, desc: v }))} /><Inp label="Lineup (čárkou)" value={f.lin} onChange={v => setF(p => ({ ...p, lin: v }))} /><Btn onClick={add} disabled={saving}>{saving ? "Ukládám..." : "Uložit"}</Btn></Crd>}{events.map(ev => <Crd key={ev.id} hov onClick={() => onNav("events:" + ev.id)}><h3 style={{ margin: "0 0 4px", fontSize: 15, color: C.tx, fontFamily: "inherit" }}>{ev.title}</h3><div style={{ fontSize: 12, color: C.acc, marginBottom: 4 }}>{ev.date} — {ev.location}</div><p style={{ fontSize: 12, color: C.txM, margin: 0 }}>{(ev.description || "").slice(0, 80)}...</p></Crd>)}</div>;
}

/* ═══ Gallery ════════════════════════════════════════════════════ */
function GalList({ onNav, user, events }) {
  const isA = user?.role === "admin"; const [showAdd, setShowAdd] = useState(false);
  const [folderName, setFolderName] = useState(""); const [eventLink, setEventLink] = useState(""); const [upPhotos, setUpPhotos] = useState([]);
  const [gals, setGals] = useState([]); const [saving, setSaving] = useState(false);
  useEffect(() => DB.onGallery(setGals), []);
  const handleFiles = async (files) => { const np = []; for (const f of files) { const url = await readFileAsDataUrl(f); np.push({ id: "up" + Date.now() + Math.random(), caption: f.name.replace(/\.[^.]+$/, ""), ph: f.name, url }); } setUpPhotos(p => [...p, ...np]); };
  const save = async () => {
    if (!folderName.trim() || !upPhotos.length) return; setSaving(true);
    try {
      const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
      const { db: fireDb } = await import('./lib/firebase.js');
      await addDoc(collection(fireDb, 'gallery'), { eventId: eventLink || null, title: folderName, photos: upPhotos.map(p => ({ id: p.id, caption: p.caption, ph: p.ph, url: null })), uploadedBy: user.uid, createdAt: serverTimestamp() });
      setShowAdd(false); setFolderName(""); setEventLink(""); setUpPhotos([]);
    } catch (e) { console.error(e); alert("Chyba: " + e.message); }
    setSaving(false);
  };
  return <div style={{ maxWidth: 620, margin: "0 auto", padding: "28px 20px" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}><h1 style={{ fontSize: 20, color: C.acc, margin: 0, fontFamily: "inherit", letterSpacing: 2, textTransform: "uppercase" }}>Galerie</h1>{isA && <Btn v="secondary" onClick={() => setShowAdd(!showAdd)}>{showAdd ? "Zrušit" : "+ Nová složka"}</Btn>}</div>
    {showAdd && <Crd style={{ borderColor: C.acc }}><Inp label="Název složky" value={folderName} onChange={setFolderName} required /><div style={{ marginBottom: 14 }}><label style={{ display: "block", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: C.acc, marginBottom: 5, fontFamily: "inherit" }}>K akci (volitelné)</label><select value={eventLink} onChange={e => setEventLink(e.target.value)} style={{ width: "100%", padding: "10px 12px", background: C.grnD, border: `1px solid ${C.brd}`, borderRadius: 4, color: C.tx, fontSize: 13, fontFamily: "inherit" }}><option value="">— bez přiřazení —</option>{events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}</select></div><DropZone onFiles={handleFiles} label="Přetáhni fotky" accept="image/*" />{upPhotos.length > 0 && <><div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>{upPhotos.map(p => <PhotoImg key={p.id} photo={p} size={48} />)}</div><Btn onClick={save} disabled={saving}>{saving ? "Ukládám..." : `Vytvořit (${upPhotos.length} fotek)`}</Btn></>}</Crd>}
    {gals.map(g => { const ev = g.eventId ? events.find(e => e.id === g.eventId) : null; return <Crd key={g.id} hov onClick={() => onNav("gallery:" + g.id)}><div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6 }}>{(g.photos || []).slice(0, 5).map(p => <PhotoImg key={p.id} photo={p} size={90} />)}</div><h3 style={{ margin: "10px 0 3px", fontSize: 14, color: C.tx, fontFamily: "inherit" }}>{g.title}</h3><div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 11, color: C.txM }}>{(g.photos || []).length} fotek</span>{ev && <EvLink event={ev} onNav={onNav} />}</div></Crd>; })}
  </div>;
}
function GalDetail({ gid, onNav, backTo }) {
  const [g, setG] = useState(null); const [lbIdx, setLbIdx] = useState(null);
  useEffect(() => DB.onGallery(gs => setG(gs.find(x => x.id === gid) || null)), [gid]);
  if (!g) return <Loading />;
  const bk = backTo?.startsWith("events:") ? backTo : "gallery";
  return <div style={{ maxWidth: 620, margin: "0 auto", padding: "28px 20px" }}>
    {lbIdx !== null && <Lightbox photos={g.photos || []} currentIndex={lbIdx} onClose={() => setLbIdx(null)} onNav={setLbIdx} />}
    <button onClick={() => onNav(bk)} style={{ background: "none", border: "none", color: C.accD, fontSize: 12, cursor: "pointer", fontFamily: "inherit", marginBottom: 16, padding: 0 }}>← Zpět</button>
    <h1 style={{ fontSize: 20, color: C.acc, margin: "0 0 20px", fontFamily: "inherit" }}>{g.title}</h1>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>{(g.photos || []).map((p, i) => <div key={p.id}><PhotoImg photo={p} size={160} onClick={() => setLbIdx(i)} /><div style={{ fontSize: 11, color: C.txM, marginTop: 4, textAlign: "center" }}>{p.caption}</div></div>)}</div>
  </div>;
}

/* ═══ Media ═══════════════════════════════════════════════════════ */
function MediaPage({ user, events, onNav }) {
  const [tab, setTab] = useState("audio"); const isA = user?.role === "admin"; const [showAdd, setShowAdd] = useState(false);
  const [auds, setAuds] = useState([]); const [vids, setVids] = useState([]);
  const [addTitle, setAddTitle] = useState(""); const [addEvent, setAddEvent] = useState("");
  useEffect(() => { const u = []; u.push(DB.onAudio(setAuds)); u.push(DB.onVideos(setVids)); return () => u.forEach(fn => fn()); }, []);
  const handleAudioFiles = async (files) => { for (const f of files) { await DB.addAudio({ title: addTitle || f.name.replace(/\.[^.]+$/, ""), eventId: addEvent || null, embedUrl: null, uploadedBy: user.uid }); } setShowAdd(false); setAddTitle(""); setAddEvent(""); };
  const addScTrack = async (url) => { await DB.addAudio({ title: addTitle || "SoundCloud track", eventId: addEvent || null, embedUrl: url, uploadedBy: user.uid }); setShowAdd(false); setAddTitle(""); setAddEvent(""); };
  const addVid = async ({ url }) => { await DB.addVideo({ title: addTitle || "Video", embedUrl: url, eventId: addEvent || null }); setShowAdd(false); setAddTitle(""); setAddEvent(""); };
  return <div style={{ maxWidth: 620, margin: "0 auto", padding: "28px 20px" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h1 style={{ fontSize: 20, color: C.acc, margin: 0, fontFamily: "inherit", letterSpacing: 2, textTransform: "uppercase" }}>Audio / Video</h1>{isA && <Btn v="secondary" onClick={() => setShowAdd(!showAdd)}>{showAdd ? "Zrušit" : "+ Přidat"}</Btn>}</div>
    <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>{["audio", "video"].map(t => <button key={t} onClick={() => { setTab(t); setShowAdd(false); }} style={{ background: tab === t ? C.acc : "transparent", color: tab === t ? "#0a0f0a" : C.txM, border: "none", padding: "6px 16px", borderRadius: 4, fontSize: 11, fontFamily: "inherit", letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", fontWeight: tab === t ? "bold" : "normal" }}>{t}</button>)}</div>
    {showAdd && <Crd style={{ borderColor: C.acc }}><Inp label="Název" value={addTitle} onChange={setAddTitle} placeholder={tab === "audio" ? "Název nahrávky" : "Název videa"} /><div style={{ marginBottom: 14 }}><label style={{ display: "block", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: C.acc, marginBottom: 5, fontFamily: "inherit" }}>K akci (volitelné)</label><select value={addEvent} onChange={e => setAddEvent(e.target.value)} style={{ width: "100%", padding: "10px 12px", background: C.grnD, border: `1px solid ${C.brd}`, borderRadius: 4, color: C.tx, fontSize: 13, fontFamily: "inherit" }}><option value="">— bez —</option>{events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}</select></div>
    {tab === "audio" && <><DropZone onFiles={handleAudioFiles} label="MP3, WAV, FLAC..." accept="audio/*" /><div style={{ fontSize: 10, letterSpacing: 2, color: C.acc, textTransform: "uppercase", margin: "8px 0 10px" }}>Nebo SoundCloud</div><EmbedInput onAdd={({ url }) => addScTrack(url)} placeholder="https://soundcloud.com/..." /></>}
    {tab === "video" && <EmbedInput onAdd={addVid} placeholder="https://youtube.com/watch?v=..." />}
    </Crd>}
    {tab === "audio" && auds.map(a => { const ev = a.eventId ? events.find(e => e.id === a.eventId) : null; return <Crd key={a.id}><AudioPlayer track={a} />{ev && <div style={{ marginTop: 6 }}><EvLink event={ev} onNav={onNav} /></div>}</Crd>; })}
    {tab === "video" && vids.map(v => { const p = parseUrl(v.embedUrl); const ev = v.eventId ? events.find(e => e.id === v.eventId) : null; return <Crd key={v.id}>{p?.type === "youtube" ? <YtEmbed videoId={p.id} title={v.title} /> : <div>{v.title}</div>}{ev && <div style={{ marginTop: 6 }}><EvLink event={ev} onNav={onNav} /></div>}</Crd>; })}
  </div>;
}

/* ═══ Chat Page ══════════════════════════════════════════════════ */
function ChatPage({ user, events }) {
  const [mode, setMode] = useState("all");
  const rooms = [{ id: "all", l: "Vše" }, { id: "general", l: "Hlavní" }, ...events.map(e => ({ id: e.id, l: e.title.length > 18 ? e.title.slice(0, 18) + "…" : e.title }))];
  return <div style={{ maxWidth: 620, margin: "0 auto", padding: "28px 20px", display: "flex", flexDirection: "column", height: "calc(100vh - 100px)" }}><h1 style={{ fontSize: 20, color: C.acc, margin: "0 0 12px", fontFamily: "inherit", letterSpacing: 2, textTransform: "uppercase" }}>Chat</h1><div style={{ display: "flex", gap: 4, marginBottom: 12, overflowX: "auto", paddingBottom: 4 }}>{rooms.map(r => <button key={r.id} onClick={() => setMode(r.id)} style={{ background: mode === r.id ? C.acc : "transparent", color: mode === r.id ? "#0a0f0a" : C.txM, border: `1px solid ${mode === r.id ? C.acc : C.brd}`, padding: "4px 12px", borderRadius: 4, fontSize: 10, fontFamily: "inherit", letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", whiteSpace: "nowrap", fontWeight: mode === r.id ? "bold" : "normal" }}>{r.l}</button>)}</div><div style={{ flex: 1 }}><MiniChat user={user} room={mode === "all" ? "general" : mode} events={events} showLabels={mode === "all"} allRooms={mode === "all"} onRoomClick={id => setMode(id)} /></div></div>;
}

/* ═══ Admin ═══════════════════════════════════════════════════════ */
function Admin({ user }) {
  const [tab, setTab] = useState("invites"); const [bsz, setBsz] = useState("10"); const [perA4, setPerA4] = useState("10"); const [batchName, setBatchName] = useState("");
  const [batch, setBatch] = useState(null); const [invs, setInvs] = useState([]); const [showQr, setShowQr] = useState(false);
  const [eInvs, setEInvs] = useState([]); const [mEm, setMEm] = useState(""); const [mRole, setMRole] = useState("member"); const [mSent, setMSent] = useState(null);
  const [users, setUsers] = useState([]); const [genLoading, setGenLoading] = useState(false);
  useEffect(() => { const u = []; u.push(DB.onInvites(setInvs)); u.push(DB.onEmailInvites(setEInvs)); u.push(DB.onUsers(setUsers)); return () => u.forEach(fn => fn()); }, []);

  const genBatch = async () => {
    if (!batchName.trim()) return; setGenLoading(true);
    try {
      const r = await DB.generateInviteBatch({ count: parseInt(bsz) || 10, batchName: batchName.trim() });
      setBatch(r.tokens.map(t => ({ token: t, status: "unused", batchName: r.batchName }))); setBatchName("");
    } catch (e) { console.error(e); alert("Chyba: " + e.message); }
    setGenLoading(false);
  };
  const sendEmail = async () => {
    if (!mEm?.includes("@")) return;
    if (users.find(u => u.email === mEm)) { setMSent({ err: "Registrován" }); return; }
    try { const r = await DB.sendEmailInvite({ email: mEm, role: mRole, sentBy: user.uid }); setMSent({ ok: true, email: r.email, token: r.token }); setMEm(""); setMRole("member"); }
    catch (e) { setMSent({ err: e.message }); }
  };
  const pp = Math.max(1, parseInt(perA4) || 10);
  const qrSz = pp <= 2 ? 200 : pp <= 4 ? 160 : pp <= 6 ? 130 : pp <= 10 ? 100 : 80;
  const gc = pp <= 2 ? 2 : pp <= 4 ? 2 : pp <= 6 ? 3 : pp <= 10 ? 5 : 5;
  const tabs = [{ id: "invites", l: "QR pozvánky" }, { id: "email", l: "Email" }, { id: "users", l: "Uživatelé" }];
  const batches = [...new Set(invs.map(i => i.batchName).filter(Boolean))];

  return <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 20px" }}>
    <h1 style={{ fontSize: 20, color: C.acc, margin: "0 0 16px", fontFamily: "inherit", letterSpacing: 2, textTransform: "uppercase" }}>Admin</h1>
    <div style={{ display: "flex", gap: 4, marginBottom: 18, borderBottom: `1px solid ${C.brd}`, paddingBottom: 8, flexWrap: "wrap" }}>{tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={{ background: tab === t.id ? C.acc : "transparent", color: tab === t.id ? "#0a0f0a" : C.txM, border: "none", padding: "6px 14px", borderRadius: 4, fontSize: 11, fontFamily: "inherit", letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", fontWeight: tab === t.id ? "bold" : "normal" }}>{t.l}</button>)}</div>

    {tab === "invites" && <>
      <Crd style={{ borderColor: C.accD }}><div style={{ fontSize: 10, letterSpacing: 2, color: C.acc, textTransform: "uppercase", marginBottom: 14 }}>Generovat dávku</div><Inp label="Název dávky" value={batchName} onChange={setBatchName} placeholder="Např. Swamp Session #127" required /><div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}><div style={{ flex: 1, minWidth: 80 }}><Inp label="Kusů" type="number" value={bsz} onChange={setBsz} /></div><div style={{ flex: 1, minWidth: 80 }}><Inp label="Na A4" type="number" value={perA4} onChange={setPerA4} /></div><Btn onClick={genBatch} disabled={!batchName.trim() || genLoading} style={{ marginBottom: 14 }}>{genLoading ? "Generuji..." : "Generovat"}</Btn></div></Crd>
      {batch && <Crd style={{ borderColor: C.grnL }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><div style={{ fontSize: 10, letterSpacing: 2, color: C.grnL, textTransform: "uppercase" }}>Vygenerováno {batch.length}</div><Btn v="small" onClick={() => setShowQr(!showQr)}>{showQr ? "Skrýt" : "QR kódy"}</Btn></div>
        {showQr && <div style={{ display: "grid", gridTemplateColumns: `repeat(${gc}, 1fr)`, gap: 10, marginBottom: 12, padding: 12, background: "#fff", borderRadius: 4 }}>{batch.map(inv => <div key={inv.token} style={{ textAlign: "center" }}><QrSvg data={inv.token} size={qrSz} /><div style={{ fontSize: 7, color: "#333", wordBreak: "break-all", lineHeight: 1.2, marginTop: 2, fontFamily: "monospace" }}>{inv.token}</div></div>)}</div>}
      </Crd>}
      {batches.map(bn => { const bi = invs.filter(i => i.batchName === bn); const used = bi.filter(i => i.status === "used").length; return <Sec key={bn} title={`${bn} (${used}/${bi.length})`}>{bi.map(inv => <div key={inv.token || inv.id} style={{ padding: "6px 0", borderBottom: `1px solid ${C.brd}`, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11 }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><QrSvg data={inv.token} size={28} /><span style={{ color: C.tx }}>{inv.token}</span></div><Badge color={inv.status === "unused" ? C.grnL : C.red}>{inv.status}</Badge></div>)}</Sec>; })}
    </>}

    {tab === "email" && <><Crd style={{ borderColor: C.accD }}><Inp label="Email" type="email" value={mEm} onChange={v => { setMEm(v); setMSent(null); }} placeholder="kamarad@email.cz" required /><div style={{ marginBottom: 14 }}><label style={{ display: "block", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: C.acc, marginBottom: 5 }}>Role</label><div style={{ display: "flex", gap: 8 }}>{[{ v: "member", l: "Člen" }, { v: "admin", l: "Admin" }].map(r => <button key={r.v} onClick={() => setMRole(r.v)} style={{ padding: "7px 18px", borderRadius: 4, fontSize: 12, fontFamily: "inherit", cursor: "pointer", background: mRole === r.v ? C.acc : "transparent", color: mRole === r.v ? "#0a0f0a" : C.txM, border: `1px solid ${mRole === r.v ? "transparent" : C.brd}` }}>{r.l}</button>)}</div></div><Btn onClick={sendEmail}>Odeslat</Btn>{mSent?.ok && <div style={{ marginTop: 12, fontSize: 12, color: C.grnL }}>Odesláno → {mSent.email} · {mSent.token}</div>}{mSent?.err && <div style={{ marginTop: 12, fontSize: 12, color: C.red }}>{mSent.err}</div>}</Crd><Sec title={`Email pozvánky (${eInvs.length})`}>{eInvs.map(inv => <Crd key={inv.id}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ fontSize: 13, color: C.tx }}>{inv.email}<div style={{ fontSize: 11, color: C.txM }}>{inv.role} · {fmtT(tsToMs(inv.createdAt))}</div></div><Badge color={inv.status === "pending" ? C.acc : C.grnL}>{inv.status === "pending" ? "Čeká" : "OK"}</Badge></div></Crd>)}</Sec></>}

    {tab === "users" && <Sec title={`Uživatelé (${users.length})`}>{users.map(u => <Crd key={u.uid}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}><div><div style={{ fontSize: 14, color: C.tx, fontWeight: "bold" }}>{u.fullName}{u.nickname && <span style={{ fontWeight: "normal", color: C.txM }}> ({u.nickname})</span>}</div><div style={{ fontSize: 11, color: C.txM, marginTop: 3 }}>{u.email} · {u.phone}</div><div style={{ fontSize: 11, color: C.txM, marginTop: 4 }}>Registrace: {fmtDate(tsToMs(u.createdAt))} · Login: {fmtT(tsToMs(u.lastLogin))}</div>{u.batchName && <div style={{ fontSize: 10, color: C.accD, marginTop: 2 }}>Dávka: {u.batchName}</div>}</div><Badge color={u.role === "admin" ? C.acc : C.grnL}>{u.role}</Badge></div></Crd>)}</Sec>}
  </div>;
}

/* ═══ App ═════════════════════════════════════════════════════════ */
export default function App() {
  const [page, setPage] = useState("landing"); const [user, setUser] = useState(null); const [authLoading, setAuthLoading] = useState(true); const [prev, setPrev] = useState(null); const [events, setEvents] = useState([]);

  // Firebase Auth listener
  useEffect(() => onAuth((u) => {
    setUser(u); setAuthLoading(false);
    if (u) setPage(p => ["landing", "login", "register"].includes(p) ? "dashboard" : p);
    else setPage("landing");
  }), []);

  // Events listener (global)
  useEffect(() => { if (!user) { setEvents([]); return; } return DB.onEvents(setEvents); }, [user]);

  const nav = useCallback((t, from) => { if (t === "logout") { fbLogout(); return; } setPrev(from || page); setPage(t); }, [page]);
  const [base, param] = page.split(":");

  if (authLoading) return <div style={{ fontFamily: "'Courier New', monospace", background: C.bg, color: C.tx, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ textAlign: "center" }}><div style={{ fontSize: 18, color: C.acc, fontWeight: "bold", marginBottom: 8 }}>///</div><div style={{ fontSize: 11, color: C.txM, letterSpacing: 2, textTransform: "uppercase" }}>SwampSound System</div><div style={{ fontSize: 12, color: C.txM, marginTop: 12 }}>Načítání...</div></div></div>;

  return <div style={{ fontFamily: "'Courier New', monospace", background: C.bg, color: C.tx, minHeight: "100vh", lineHeight: 1.6 }}>
    <Nav user={user} onNav={nav} page={page} />
    {base === "landing" && <Landing onNav={nav} />}
    {base === "login" && <Login onNav={nav} />}
    {base === "register" && <Register onNav={nav} />}
    {base === "dashboard" && user && <Dashboard user={user} events={events} onNav={nav} />}
    {base === "events" && !param && user && <Events user={user} events={events} onNav={nav} />}
    {base === "events" && param && user && <EvDetail eid={param} user={user} events={events} onNav={nav} />}
    {base === "gallery" && !param && user && <GalList onNav={nav} user={user} events={events} />}
    {base === "gallery" && param && user && <GalDetail gid={param} onNav={nav} backTo={prev} />}
    {base === "media" && user && <MediaPage user={user} events={events} onNav={nav} />}
    {base === "chat" && user && <ChatPage user={user} events={events} />}
    {base === "admin" && user?.role === "admin" && <Admin user={user} />}
  </div>;
}
