import React, { useMemo, useRef, useState, useEffect } from "react";
import { useLocalStorageState } from "./hooks/useLocalStorageState";


import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Logos, die in der App auswählbar sind
// ================== Firmenlogos für Bericht ==================
const DEFAULT_LOGOS = [
  { id: "felbermayr", label: "Felbermayr", url: `${import.meta.env.BASE_URL}felbermayr-logo.png` },
  { id: "hagn",       label: "HAGN",       url: `${import.meta.env.BASE_URL}hagn-logo.png` },
  { id: "domarin",    label: "Domarin",    url: `${import.meta.env.BASE_URL}domarin-logo.png` },
  { id: "wimmer",     label: "Wimmer",     url: `${import.meta.env.BASE_URL}wimmer-logo.png` },
  { id: "custom",     label: "Eigenes Logo (Upload)", url: "" },
];

// Automatische Zuordnung nach Firmenname (Firma/AG-Feld)
const FIRM_MATCH = [
  { re: /felbermayr/i, logoId: "felbermayr" },
  { re: /hagn/i,       logoId: "hagn" },
  { re: /domarin/i,    logoId: "domarin" },
  { re: /wimmer/i,     logoId: "wimmer" },
];






/* ===================== Konfiguration ===================== */

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwQ4iCoCwQIqLfOFzkq8QHfZfgORdCrag4myM-S8G59zfnH4UeLijBQQsuhLwrmmFLR/exec";
const APPS_SCRIPT_TOKEN = ""; // nur falls du im Apps Script einen TOKEN gesetzt hast

// Logo für PDF (nur Seite 1). GitHub RAW-URL, z. B. https://raw.githubusercontent.com/<user>/<repo>/main/felbermayr_logo.png
const LOGO_URL = "https://github.com/jofelbi66-rgb/Fahrzeugkontrolle/blob/main/felbermayr_logo.png";

/* ===================== Checklisten-Daten ===================== */
const CATEGORIES = [
  {
    key: "ordnung",
    title: "Ordnung & Sauberkeit",
    items: [
      "Arbeitsplätze frei von Stolperstellen",
      "Materialien fachgerecht gelagert",
      "Zugänge/Rettungswege freigehalten",
    ],
  },
  {
    key: "verkehrswege",
    title: "Verkehrswege & Absperrungen",
    items: [
      "Wege gekennzeichnet und sicher",
      "Absperrungen vollständig und standsicher",
      "Fahrwege/Einweiser geregelt",
    ],
  },
  {
    key: "absturz",
    title: "Absturzsicherung",
    items: [
      "Geländer/Netze vorhanden",
      "PSAgA genutzt",
      "Aussparungen abgedeckt",
    ],
  },
  {
  key: "psa",
  title: "Persönliche Schutzausrüstung",
  items: [
    "Sicherheitsschuhe getragen",
    "Schutzhelm getragen (wo erforderlich)",
    "Warnweste / Warnkleidung getragen (wo erforderlich)",
    "Handschutz passend zur Tätigkeit",
    "Augenschutz vorhanden und genutzt (wo erforderlich)",
    "Gehörschutz vorhanden und genutzt (wo erforderlich)",
    "Atemschutz vorhanden und genutzt (wo erforderlich)",
    "PSAgA korrekt genutzt (wo erforderlich)",
  ],
},

  {
    key: "hebezeuge",
    title: "Hebezeuge & Hublifte",
    items: [
      "Tägliche Prüfungen dokumentiert",
      "Anschlagmittel i.O.",
      "Befähigte Bediener/Einweiser",
    ],
  },
  {
    key: "elektrik",
    title: "Elektrik",
    items: [
      "Kabel/Verteiler spritzwassergeschützt",
      "FI-Schutzschalter vorhanden",
      "Prüfplaketten gültig",
    ],
  },
  {
    key: "gefahrstoffe",
    title: "Gefahrstoffe",
    items: [
      "Sicherheitsdatenblätter verfügbar",
      "Kennzeichnung/Behälter i.O.",
      "Lagerung/Entsorgung gemäß Vorgaben",
    ],
  },
];

// Bewertungsoptionen: grün=OK, rot=Mangel, gelb=Notiz
const RATING_OPTIONS = [
  { value: "ok", label: "OK", color: "bg-green-600 text-white", border: "border-green-600" },
  { value: "defect", label: "Mangel", color: "bg-red-600 text-white", border: "border-red-600" },
  { value: "note", label: "Notiz", color: "bg-yellow-400 text-black", border: "border-yellow-500" },
];

// Versionsstand (UI)
const APP_STAND = "Stand: 01/2026";

// ==============================================
// Kamera-Funktion pro Checkpunkt (Foto aufnehmen)
// ==============================================

/* ===================== Hilfsfunktionen ===================== */
function useNowISOLocal() {
  return useMemo(() => {
    const d = new Date();
    // in lokale Zeit umrechnen (MEZ/MESZ je nach Datum)
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }, []);
}
function formatDEDateTime(isoLocal) {
  if (!isoLocal) return "-";

  // erwartet z.B. "2026-01-09T10:24"
  const [dPart, tPart = ""] = String(isoLocal).split("T");
  const [y, m, d] = dPart.split("-").map(Number);
  const [hh = 0, mm = 0] = tPart.split(":").map(Number);

  // lokal interpretieren (Browser-Zeitzone des Geräts)
  const dt = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0);

  const pad = (n) => String(n).padStart(2, "0");
  const tz = dt.getTimezoneOffset() === -60 ? "MEZ" : (dt.getTimezoneOffset() === -120 ? "MESZ" : "");

  return `${pad(d)}.${pad(m)}.${y} ${pad(hh)}:${pad(mm)}${tz ? " " + tz : ""}`;
}


async function resizeImageFromFile(file, maxSize = 1280, quality = 0.8) {
  const img = document.createElement("img");
  const reader = new FileReader();
  const dataURL = await new Promise((resolve, reject) => {
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  await new Promise((r) => {
    img.onload = r;
    img.src = dataURL;
  });
  return recompressImage(img, maxSize, quality);
}

function recompressImage(imgOrDataURL, maxSizePx = 1280, quality = 0.8) {
  return new Promise(async (resolve) => {
    let img = imgOrDataURL;
    if (typeof imgOrDataURL === "string") {
      img = new Image();
      await new Promise((r) => {
        img.onload = r;
        img.src = imgOrDataURL;
      });
    }
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const ratio = Math.min(maxSizePx / img.width, maxSizePx / img.height, 1);
    canvas.width = Math.max(1, Math.round(img.width * ratio));
    canvas.height = Math.max(1, Math.round(img.height * ratio));
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    resolve(canvas.toDataURL("image/jpeg", quality));
  });
}
const att = { maxPx: 1280, q: 0.8 };

/* ===================== Komponente ===================== */
export default function BaustellenbegehungApp() {
  const now = useNowISOLocal();

  // HIER EINFÜGEN:
  const [inspectorName, setInspectorName] =
  useLocalStorageState("app.inspectorName", "");


  const [form, setForm] = useState({
    project: "",
    location: "",
    company: "",
    date: now,
    inspector: inspectorName,   // das ändern wir gleich
    weather: "",
    remarks: "",
  });
const updateInspector = (v) => {

  setForm((prev) => ({ ...prev, inspector: v }));
  setInspectorName(v);
};

  
const [ccEmail, setCcEmail] = useState(() =>
  localStorage.getItem("app.ccEmail") || ""
);

useEffect(() => {
  localStorage.setItem("app.ccEmail", ccEmail);
}, [ccEmail]);
const [showOnlyOpen, setShowOnlyOpen] = useState(false);
const [openCats, setOpenCats] = useState(() => {
  const init = {};
  for (const cat of CATEGORIES) init[cat.key] = false; // alles zu
  return init;
});

const [checklist, setChecklist] = useState(() => {
  const init = {};
  for (const cat of CATEGORIES) {
    init[cat.key] = cat.items.map(() => ({ rating: "", note: "", photos: [] }));
  }
  return init;
});



  const [images, setImages] = useState([]); // dataURLs
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
// Kamera-Funktion pro Checkpunkt (Foto aufnehmen)
const onCapturePhoto = (catKey, itemIndex) => async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const dataUrl = await resizeImageFromFile(file, 1280, 0.8);
    setChecklist((prev) => {
      const next = { ...prev };
      const entry = { ...next[catKey][itemIndex] };
      entry.photos = Array.isArray(entry.photos)
        ? [...entry.photos, dataUrl]
        : [dataUrl];
      next[catKey] = [...next[catKey]];
      next[catKey][itemIndex] = entry;
      return next;
    });
  } catch (err) {
    console.error("Foto aufnehmen fehlgeschlagen:", err);
    setMsg?.({ type: "error", text: "Konnte Foto nicht aufnehmen." });
  } finally {
    e.target.value = "";
  }
};


// Logo-Auswahl speichern
const [logoChoice, setLogoChoice] = useState(() =>
  localStorage.getItem("app.logoChoice") || "felbermayr"
);
const [logoSrc, setLogoSrc] = useState(() =>
  localStorage.getItem("app.logoSrc") || (DEFAULT_LOGOS[0]?.url || "")
);

// Automatische Zuordnung nach Firmenname (Firma/AG-Feld)
function autoPickLogoByCompany(companyName) {
  if (!companyName) return;
  const hit = FIRM_MATCH.find((m) => m.re.test(companyName));
  if (!hit) return;
  const preset = DEFAULT_LOGOS.find((l) => l.id === hit.logoId);
  if (!preset) return;
  setLogoChoice(hit.logoId);
  setLogoSrc(preset.url);
}

  
// persistieren
useEffect(() => localStorage.setItem("app.logoChoice", logoChoice), [logoChoice]);
useEffect(() => logoSrc && localStorage.setItem("app.logoSrc", logoSrc), [logoSrc]);


  
  // Geoposition & Reverse Geocoding
  const [coords, setCoords] = useState(null); // {lat, lon, accuracy}
  const [locating, setLocating] = useState(false);

  const onField = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  const updateChecklist = (catKey, idx, patch) => {
    setChecklist((s) => ({
      ...s,
      [catKey]: s[catKey].map((row, i) => (i === idx ? { ...row, ...patch } : row)),
    }));
  };

const onPickImages = async (e) => {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  setBusy(true);

  try {
    const resized = [];
    for (const f of files.slice(0, 12)) {
      const durl = await resizeImageFromFile(f, 1280, 0.8);
      resized.push(durl);
    }
    setImages((prev) => [...prev, ...resized].slice(0, 24));
  } catch (err) {
    console.error(err);
    setMsg({ type: "error", text: "Bilder konnten nicht verarbeitet werden." });
  } finally {
    setBusy(false);
    e.target.value = "";
  }
};


  // ---------- Geolocation ----------
  const getBrowserPosition = (opts = { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }) =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("Geolocation nicht verfügbar"));
      navigator.geolocation.getCurrentPosition(resolve, reject, opts);
    });

  const reverseGeocode = async (lat, lon) => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=16&addressdetails=1`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("Reverse Geocoding fehlgeschlagen");
    return await res.json();
  };

const onLocate = async () => {
  setLocating(true);

  try {
    const pos = await getBrowserPosition();
    const { latitude: lat, longitude: lon, accuracy } = pos.coords;

    setCoords({ lat, lon, accuracy });

    const info = await reverseGeocode(lat, lon);
    const nice = info?.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;

    setForm((s) => ({ ...s, location: nice }));
    setMsg({ type: "ok", text: "Standort übernommen." });
  } catch (e) {
    console.error(e);

    let t = "Standort konnte nicht ermittelt werden.";
    if (e && e.code === 1) t = "Standort-Berechtigung verweigert.";

    setMsg({ type: "error", text: t });
  } finally {
    setLocating(false);
  }
};


// -------- Unterschrift (Signaturfeld) --------
const sigCanvasRef = React.useRef(null);
const isDrawingRef = React.useRef(false);
const [signatureDataURL, setSignatureDataURL] =
  useLocalStorageState("app.signature_v1", "");
const [signatureCapturedAt, setSignatureCapturedAt] =
  useLocalStorageState("app.signatureCapturedAt_v1", "");

  

React.useEffect(() => {
  const canvas = sigCanvasRef.current;
  if (!canvas) return;

  // iOS Safari: verhindert Scroll/Zoom-Gesten im Canvas
  canvas.style.touchAction = "none";

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const setup = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Canvas intern auf dpr skalieren, aber in CSS-Pixeln zeichnen
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111";
  };

  const getPoint = (ev) => {
    const rect = canvas.getBoundingClientRect();
    const p =
      ev.touches?.[0] ??
      ev.changedTouches?.[0] ??
      ev;
    return { x: p.clientX - rect.left, y: p.clientY - rect.top };
  };
// einmal initial setzen (skaliert Canvas)
setup();

// gespeicherte Unterschrift wiederherstellen (muss NACH setup passieren)
if (signatureDataURL) {
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };
  img.src = signatureDataURL;
}

  const start = (ev) => {
    ev.preventDefault();
    setup(); // falls Layout sich geändert hat (Rotation etc.)

    isDrawingRef.current = true;
    const { x, y } = getPoint(ev);

    ctx.beginPath();
    ctx.moveTo(x, y);

    // Pointer capture (wenn PointerEvent)
    if (ev.pointerId != null && canvas.setPointerCapture) {
      try { canvas.setPointerCapture(ev.pointerId); } catch {}
    }
  };

  const move = (ev) => {
    if (!isDrawingRef.current) return;
    ev.preventDefault();

    const { x, y } = getPoint(ev);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const end = (ev) => {
    if (!isDrawingRef.current) return;
    ev.preventDefault();

    isDrawingRef.current = false;
    setSignatureDataURL(canvas.toDataURL("image/png"));

    if (ev.pointerId != null && canvas.releasePointerCapture) {
      try { canvas.releasePointerCapture(ev.pointerId); } catch {}
    }
  };
const handleResize = () => {
  setup();

  if (signatureDataURL) {
    const img = new Image();
    img.onload = () => {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    };
    img.src = signatureDataURL;
  }
};

  handleResize();
  // Restore: gespeicherte Unterschrift nach setup() wieder ins Canvas zeichnen
if (signatureDataURL) {
  const img = new Image();
  img.onload = () => {
    // In Gerätepixeln arbeiten, damit es mit deinem DPR-Setup sauber bleibt
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  };
  img.src = signatureDataURL;
}
window.addEventListener("resize", handleResize);
  

  // Native Listener (WICHTIG: passive:false für iOS)
  canvas.addEventListener("pointerdown", start, { passive: false });
  canvas.addEventListener("pointermove", move, { passive: false });
  canvas.addEventListener("pointerup", end, { passive: false });
  canvas.addEventListener("pointercancel", end, { passive: false });

  canvas.addEventListener("touchstart", start, { passive: false });
  canvas.addEventListener("touchmove", move, { passive: false });
  canvas.addEventListener("touchend", end, { passive: false });
  canvas.addEventListener("touchcancel", end, { passive: false });

  return () => {
   window.removeEventListener("resize", handleResize);


    canvas.removeEventListener("pointerdown", start);
    canvas.removeEventListener("pointermove", move);
    canvas.removeEventListener("pointerup", end);
    canvas.removeEventListener("pointercancel", end);

    canvas.removeEventListener("touchstart", start);
    canvas.removeEventListener("touchmove", move);
    canvas.removeEventListener("touchend", end);
    canvas.removeEventListener("touchcancel", end);
  };
}, [signatureDataURL]);


const clearSignature = () => {
  const canvas = sigCanvasRef.current;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  setSignatureDataURL("");
  setSignatureCapturedAt("");

  isDrawingRef.current = false;
};

const saveSignature = () => {
  const canvas = sigCanvasRef.current;
  if (!canvas) return;
if (!canvas.width || !canvas.height) return; 
  
  try {
    const dataUrl = canvas.toDataURL("image/png");
    setSignatureDataUrl(dataUrl);
   setSignatureCapturedAt(
  new Date().toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })
);

  } catch {
    // falls etwas schief geht, einfach nichts speichern
  }
};


  /* ---------- E-Mail HTML ---------- */
  const buildSummaryHTML = () => {
    const rows = [];
    for (const cat of CATEGORIES) {
      rows.push(`<tr style=\"background:#f8fafc\"><td colspan=\"3\" style=\"padding:8px 6px;font-weight:600;border-top:1px solid #e5e7eb\">${cat.title}</td></tr>`);
      cat.items.forEach((label, i) => {
        const row = checklist?.[cat.key]?.[i] || { rating: "", note: "" };
        const ratingMap = { ok: "OK", defect: "Mangel", note: "Notiz" };
        rows.push(
          `<tr>` +
            `<td style=\"padding:6px 8px;border-bottom:1px solid #eee\">${label}</td>` +
            `<td style=\"padding:6px 8px;border-bottom:1px solid #eee\">${ratingMap[row.rating] ?? ""}</td>` +
            `<td style=\"padding:6px 8px;border-bottom:1px solid #eee\">${(row.note || "").replace(/</g, "&lt;")}</td>` +
          `</tr>`
        );
      });
    }
    return `
      <table style=\"border-collapse:collapse;width:100%;font-family:Arial,Helvetica,sans-serif;font-size:14px\">
        <thead>
          <tr>
            <th align=\"left\" style=\"padding:6px 8px;border-bottom:2px solid #ddd\">Prüfpunkt</th>
            <th align=\"left\" style=\"padding:6px 8px;border-bottom:2px solid #ddd\">Bewertung</th>
            <th align=\"left\" style=\"padding:6px 8px;border-bottom:2px solid #ddd\">Notiz</th>
          </tr>
        </thead>
        <tbody>${rows.join("")}</tbody>
      </table>`;
  };

  const buildImagesHTML = () => {
    if (!images.length) return "";
    const blocks = images.map(
      (d, i) => `
        <div style=\"margin:8px 0\">` +
          `<div style=\"font:600 14px Arial,Helvetica,sans-serif;margin-bottom:4px\">Foto ${i + 1}</div>` +
          `<img src=\"${d}\" alt=\"Foto ${i + 1}\" style=\"max-width:100%;height:auto;border:1px solid #eee\"/>` +
        `</div>`
    );
    return blocks.join("");
  };

// URL/DataURL -> DataURL umwandeln (für Logos aus /public und Kamera-Fotos)
async function toDataUrl(src) {
  if (!src) return null;
  if (src.startsWith("data:")) return src;
  try {
    const r = await fetch(src, { cache: "no-store" });
    const b = await r.blob();
    return await new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = rej;
      fr.readAsDataURL(b);
    });
  } catch (e) {
    console.warn("Bild laden fehlgeschlagen:", src, e);
    return null;
  }
}

// Logo nur auf Seite 1 oben rechts einblenden – berührt dein Layout nicht
// Ersetzt die alte addLogoTopRight: setzt das Logo proportional oben rechts
async function addLogoTopRight(doc, logoSrc, margin = 15) {
  if (!logoSrc) return 0;

  // vorhandene Hilfsfunktion toDataUrl nutzen – falls bei dir anders heißt, bitte anpassen
  const data = await toDataUrl(logoSrc);
  if (!data) return 0;

  // natürliche Größe ermitteln
  const img = new Image();
  img.src = data;
  await new Promise((res) => (img.onload = res));

  const pageW = doc.internal.pageSize.getWidth();

  // Rahmen, in den das Logo hineinpasst (kannst du bei Bedarf ändern)
  const maxW = 40;   // mm
  const maxH = 14;   // mm

  // Maßstab berechnen – Verhältnis bleibt erhalten (keine Verzerrung)
  const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
  const w = Math.max(1, img.naturalWidth * scale);
  const h = Math.max(1, img.naturalHeight * scale);

  const x = pageW - margin - w;
  const y = margin;

  // Format bestimmen
  const isJpg = /\.jpe?g($|\?)/i.test(logoSrc);
  doc.addImage(data, isJpg ? "JPEG" : "PNG", x, y, w, h, undefined, "FAST");

  // Wir geben die tatsächlich belegte Höhe zurück, damit du darunter Abstand setzen kannst
  return h;
}


// Fotos als eigene Schluss-Sektion (neue Seiten nach Bedarf)
async function addPhotosSection(doc, checklist, CATEGORIES) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;

  checklist = checklist || {};

  // Prüfen, ob überhaupt Fotos existieren
  const cats = Array.isArray(CATEGORIES) ? CATEGORIES : [];
const hasAny = cats.some(cat =>
  Array.isArray(checklist?.[cat.key]) &&
  checklist[cat.key].some(r => Array.isArray(r?.photos) && r.photos.length > 0)
);

  if (!hasAny) return;

  // neue Seite für den Fototeil anhängen
  doc.addPage();
  let y = margin;

  doc.setFont("helvetica", "bold"); doc.setFontSize(14);
  doc.text("Fotos", margin, y); y += 6;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);

  const gap = 6;
  const cellW = (pageW - 2 * margin - gap) / 2;
  const cellH = 50;

  function ensureSpace(h) {
    if (y + h > pageH - margin) { doc.addPage(); y = margin; }
  }

  for (const cat of CATEGORIES) {
    const rows = checklist[cat.key] || [];
    for (let i = 0; i < rows.length; i++) {
      const photos = rows[i]?.photos || [];
      if (!photos.length) continue;

      ensureSpace(10);
      doc.setFont("helvetica", "bold"); doc.setFontSize(11);
      doc.text(`${cat.title} – ${cat.items[i]}`, margin, y);
      y += 4;
      doc.setFont("helvetica", "normal"); doc.setFontSize(10);

      for (let p = 0; p < photos.length; p++) {
        const col = p % 2;
        if (col === 0) ensureSpace(cellH + 8);

        const px = margin + col * (cellW + gap);
        const py = y;
        const data = await toDataUrl(photos[p]);
        if (data) {
         
const fmt = data.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
doc.addImage(data, fmt, px, py, cellW, cellH, undefined, "FAST");

 
        }
        doc.setDrawColor(200); doc.rect(px, py, cellW, cellH);
        doc.setFontSize(8); doc.text(`#${p + 1}`, px + 2, py + cellH + 4);

        if (col === 1) y += cellH + 8; // Zeilenumbruch nach 2 Bildern
      }
      if (photos.length % 2 === 1) y += cellH + 8; // letzte Einzelfoto-Zeile abschließen
    }
  }
}



  
  /* ---------- PDF / Header-Footer / Logo & Tabellen ---------- */
  const dataURLFromURL = async (url) => {
    try {
      const res = await fetch(url, { cache: "reload" });
      const blob = await res.blob();
      return await new Promise((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const buildChecklistRows = () => {
  const rows = [];
  const ratingMap = { ok: "OK", defect: "Mangel", note: "Notiz" };

  for (const cat of CATEGORIES) {
    cat.items.forEach((label, i) => {
      const row = checklist?.[cat.key]?.[i] || { rating: "", note: "", photos: [] };

      const hasRating = !!row.rating; // ok/defect/note oder ""
      const hasNote = !!(row.note || "").trim();
      const hasPhoto = Array.isArray(row.photos) && row.photos.length > 0;

      // Nur übernehmen, wenn wirklich etwas dokumentiert wurde
      if (!(hasRating || hasNote || hasPhoto)) return;

      rows.push([
        cat.title,
        label,
        ratingMap[row.rating] || "-", // wenn nur Notiz/Foto ohne Status
        row.note || "",
      ]);
    });
  }

  return rows;
};

  // Header endgültig deaktiviert
const drawHeader = () => {};

 
 

  // PDF Generator mit Größenlimit (≈1 MB)
  const exportPdfWithLimits = async () => {
    // Versuche nacheinander stärkere Kompression
    const attempts = [
      { maxPx: 1280, q: 0.8 },
      { maxPx: 1024, q: 0.75 },
      { maxPx: 900, q: 0.7 },
      { maxPx: 800, q: 0.65 },
      { maxPx: 700, q: 0.6 },
      { maxPx: 640, q: 0.55 },
    ];

    // Originalbilder ggf. weiter komprimieren pro Versuch
    for (const att of attempts) {
      const doc = new ({ unit: "mm", format: "a4", orientation: "portrait" });
      await addLogoTopRight(doc, logoSrc);

      const pageW = doc.internal.pageSize.getWidth();
      const margin = 10;

// --- Kopfzeile entfernt ---
// Logo wird bereits oben rechts über addLogoTopRight eingefügt.
// drawHeader() nicht mehr aufrufen.



      // Titel
      const titleY = 40;
      doc.setFontSize(16);
    doc.text("Baustellenbegehung – Bericht (DEBUG-AKTIV)", pageW / 2, titleY, { align: "center" });


      // Stammdaten
      doc.setFontSize(11);
      const meta = [
        ["Projekt", form.project || "-"],
        ["Ort", form.location || "-"],
        ["Firma/AG", form.company || "-"],
       ["Datum/Uhrzeit", formatDEDateTime(form.date)],

        ["Begehende Person", form.inspector || "-"],
        ["Wetter", form.weather || "-"],
        ["Bemerkungen", form.remarks || "-"],
        ["Prüfumfang", "Im Bericht sind alle bewerteten Prüfpunkte aufgeführt. Nicht aufgeführte Punkte wurden nicht dokumentiert."],
["DEBUG", "META-ARRAY IST AKTIV"],

      ];
autoTable(doc, {
  startY: y,
  margin: { left: 15, right: 15 },
  head: [["Feld", "Wert"]],
  body: meta,
  theme: "grid",
  styles: { fontSize: 10, cellPadding: 2, overflow: "linebreak" },

  headStyles: { fillColor: [0, 150, 136] },
  columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: "auto" } },

});

y = autoTable.previous.finalY + 8;

      // y sollte der aktuelle Startpunkt *unter* dem Logo sein.
// Falls du kein y nutzt, ersetze startY unten durch deinen Wert (z. B. 30–40).
autoTable(doc, {
  startY: y,                                 // beginnt unter dem Logo
  margin: { left: 15, right: 15 },           // wie dein margin
  head: [["Kategorie", "Punkt", "Status", "Notiz"]],
  body: checklistRows,                        // deine vorbereitete Liste
  theme: "grid",
  styles: { fontSize: 10, cellPadding: 2 },
  headStyles: { fillColor: [230, 230, 230] }, // Kopf hellgrau
  alternateRowStyles: { fillColor: [245, 245, 245] } // Zebra
});

// danach y neu setzen, falls du weiter unten noch zeichnest:
y = autoTable.previous.finalY + 8;


      // Checkliste mit Zebra
      const rows = buildChecklistRows();
    autoTable(doc, {
      
  head: [["Feld", "Wert"]],
  body: [
    ["Projekt", form.project || "-"],
    ["Ort", form.location || "-"],
    ["Firma/AG", form.company || "-"],
    ["Datum/Uhrzeit", formatDEDateTime(form.date)],
    ["Begehende Person", form.inspector || "-"],
    ["Wetter", form.weather || "-"],
    ["Bemerkungen", form.remarks || "-"],
  ],
  margin: { left: margin, right: margin, top: startY + 6 },
  theme: "grid",
  styles: { fontSize: 10, cellPadding: 2 },
  alternateRowStyles: { fillColor: [245, 245, 245] }, // Zebra
});
const tableEndY = doc.lastAutoTable.finalY;
let y = tableEndY + 8;


    

      // Fotos (2 pro Zeile Raster) – vorher neu komprimieren auf att.maxPx / att.q
      const pageWmm = pageW, colGap = 6, cols = 2;
      const maxWPerCol = (pageWmm - margin * 2 - colGap) / cols; // mm
      const maxHmm = 60; // mm pro Bild
const att = { maxPx: 1600, q: 0.8 };

      let col = 0;
      for (let i = 0; i < images.length; i++) {
        try {
          const recompressed = await recompressImage(images[i], att.maxPx, att.q);
          // Größe bestimmen
          const tmp = new Image();
          await new Promise((r) => { tmp.onload = r; tmp.src = recompressed; });
          const px2mm = 0.264583;
          let w = tmp.width * px2mm, h = tmp.height * px2mm;
          const ratio = Math.min(maxWPerCol / w, maxHmm / h, 1);
          w = Math.max(10, Math.round(w * ratio));
          h = Math.max(10, Math.round(h * ratio));

          // Seitenumbruch
        const pageHeight = doc.internal.pageSize.getHeight();
const bottomLimit = pageHeight - margin;

// Seitenumbruch (mit Margin statt harter 287)
const caption = findNoteForPhoto(i);
const captionH = caption ? 5 : 0;
const neededH = 4 + h + 3 + captionH; // 4=Fototitel, h=Bild, 3=Abstand, captionH optional

if (y + neededH > bottomLimit) {
  doc.addPage();
  drawHeader(doc, pageW, margin);
  y = margin + 5;
  col = 0;
}


          const x = margin + col * (maxWPerCol + colGap);
          doc.setFontSize(10);
          doc.text(`Foto ${i + 1}`, x, y);
          y += 4;
          doc.addImage(recompressed, "JPEG", x, y, w, h, undefined, "FAST");

          // Caption, falls Notiz existiert
          y += h + 3;
          // caption ist bereits oben ermittelt

          if (caption) { doc.setFontSize(9); doc.text(String(caption).slice(0, 120), x, y); y += 5; }

          // Nächste Spalte / Zeile
          col = (col + 1) % cols;
          if (col === 0) y += 6;
        } catch {}
      }

      // Seitenzähler + Fußzeile auf alle Seiten nachträglich
      const total = doc.internal.getNumberOfPages();
      for (let p = 1; p <= total; p++) {
        doc.setPage(p);
        drawFooter(doc, pageW, margin, p, total);
      }

// Unterschrift direkt unter der Checkliste (dynamisch)
doc.setPage(doc.lastAutoTable.pageNumber);
y = doc.lastAutoTable.finalY + 8;

const pageH = doc.internal.pageSize.getHeight();
const signatureBlockHeight = signatureCapturedAt ? 38 : 30;


// Wenn nicht genug Platz: neue Seite VOR der Unterschrift
if (y + signatureBlockHeight > pageH - margin) {
  doc.addPage();
  drawHeader(doc, pageW, margin);
  y = margin + 5;
}

// Unterschrift zeichnen (Feld + optionales Signaturbild)
doc.setFont("helvetica", "bold");
doc.setFontSize(11);
doc.text("Unterschrift", margin, y);

// Box-Groessen wie vorher (aber jetzt dynamisch)
const boxW = 80;
const boxH = 18;

// Box unter der Überschrift platzieren
const boxY = y + 6;

doc.setLineWidth(0.6);
doc.setDrawColor(0);
doc.setFillColor(245, 245, 245);
doc.rect(margin, boxY, boxW, boxH, "FD");



// Signaturbild (falls vorhanden) in die Box einpassen
if (signatureDataURL) {
  doc.addImage(signatureDataURL, "PNG", margin + 2, boxY + 2, boxW - 4, boxH - 4, undefined, "FAST");

  // Zeitstempel unterhalb der Box (falls vorhanden)
  if (signatureCapturedAt) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Unterschrift erfasst am: ${signatureCapturedAt}`, margin, boxY + boxH + 6);
    doc.setTextColor(0);
  }
}

doc.setFont("helvetica", "normal");

// Cursor unterhalb der Unterschrift weiter setzen
y = boxY + boxH + (signatureCapturedAt ? 10 : 6);
      
      // Größe prüfen
      const blob = doc.output("blob");
      const sizeMB = blob.size / (1024 * 1024);
      if (sizeMB <= 1.0) {
        const safeName = (form.project || "Projekt").replace(/[^\w-]+/g, "_");
    

const total = doc.getNumberOfPages();
for (let i = 1; i <= total; i++) {
  doc.setPage(i);
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(
    `Seite ${i} / ${total}`,
    pageW - margin,
    pageH - 6,
    { align: "right" }
  );
}
doc.setTextColor(0);
        
        
        doc.save(`Begehung_${safeName}.pdf`);
        return true;
      }
      // andernfalls nächsten Versuch mit stärkerer Kompression
    }
// Falls alle Versuche > 1 MB sind: den erstellten Bericht trotzdem speichern (NICHT neues leeres PDF)
const safeName = (form.project || "Projekt").replace(/[^\w-]+/g, "_");
doc.save(`Begehung_${safeName}.pdf`);
return false;

  };

  const findNoteForPhoto = (index) => {
    // Einfache Heuristik: erste Notiz aus der Checkliste, die zu Bildindex passt (optional erweiterbar)
    // Hier lassen wir es leer, damit die Funktion existiert – Du kannst sie später an Checklisten-Fotos koppeln
    return "";
  };

  /* ---------- Versand per EmailJS ---------- */
  const validate = () => {
    if (!form.project || !form.location || !form.inspector) return "Bitte Projekt, Ort und Begehende Person ausfüllen.";
    return null;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setMsg({ type: "error", text: err }); return; }
    setBusy(true); setMsg(null);
    try {
await sendPdfToMail();
setMsg({ type: "ok", text: "E-Mail mit PDF-Anhang wurde versendet." });

    
    } finally { setBusy(false); }
  };

  /* ===================== UI ===================== */
// ----------------------
// Datei -> DataURL (für Logo-Upload)
// ----------------------
async function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// ----------------------
// Eigenes Logo hochladen und verkleinern
// ----------------------
async function onLogoUpload(e) {
  const f = e.target.files?.[0];
  if (!f) return;

  // Bild laden
  const img = document.createElement("img");
  img.src = await fileToDataURL(f);
  await new Promise((r) => (img.onload = r));

  // moderat verkleinern (max 400px Kantenlänge)
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const max = 400;
  const ratio = Math.min(max / img.width, max / img.height, 1);
  canvas.width = Math.round(img.width * ratio);
  canvas.height = Math.round(img.height * ratio);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const data = canvas.toDataURL("image/png", 0.9); // kompakt
  setLogoSrc(data);
}

  const exportPdfQuick = async () => {
  try {
    const margin = 15;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();

    // Logo proportional oben rechts (falls logoSrc gesetzt ist)
    const toDataUrl = async (src) => {
      if (!src) return null;
      if (src.startsWith("data:")) return src;
      const r = await fetch(src, { cache: "no-store" });
      const b = await r.blob();
      return await new Promise((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(fr.result);
        fr.onerror = rej;
        fr.readAsDataURL(b);
      });
    };

    if (logoSrc) {
      const data = await toDataUrl(logoSrc);
      if (data) {
        const img = new Image();
        img.src = data;
        await new Promise((r) => (img.onload = r));
        const maxW = 40, maxH = 14;
        const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
        const w = Math.max(1, img.naturalWidth * scale);
        const h = Math.max(1, img.naturalHeight * scale);
        const x = pageW - margin - w;
        const y = margin;
        const isJpg = /\.jpe?g($|\?)/i.test(logoSrc);
        doc.addImage(data, isJpg ? "JPEG" : "PNG", x, y, w, h, undefined, "FAST");
      }
    }

    let y = margin + 18; // etwas Abstand unter dem Logo
    doc.setFont("helvetica", "bold"); doc.setFontSize(18);
    doc.text("Baustellenbegehung (Kurztest)", margin, y); y += 8;

    doc.setFont("helvetica", "normal"); doc.setFontSize(11);
    doc.text(`Ort: ${form.location || "-"}`, margin, y); y += 6;
    doc.text(`Datum: ${new Date(form.date).toLocaleString()}`, margin, y); y += 6;
    doc.text(`Ersteller: ${form.inspector || "-"}`, margin, y); y += 6;

    doc.save("bericht-test.pdf");
  } catch (err) {
    console.error("PDF-Fehler:", err);
    alert("PDF konnte nicht erzeugt werden. Details in der Konsole.");
  }
};
 const drawFooter = (doc, page, total, margin = 15) => {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const dateStr = form.date ? new Date(form.date).toLocaleDateString() : "-";
  const inspector = form.inspector || "-";

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  doc.text(`${dateStr} · ${inspector}`, margin, pageH - 6);
  doc.text(`Seite ${page} von ${total}`, pageW - margin, pageH - 6, { align: "right" });
};

const drawSignatureBlockOnFirstPage = (doc, margin = 15) => {
  const pageH = doc.internal.pageSize.getHeight();


};
 

 const sendPdfToMail = async () => {
  // PDF erzeugen (Report)
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;

  const logoH = await addLogoTopRight(doc, logoSrc, margin);
  const startY = Math.max(margin + logoH + 8, 24);

  doc.setFontSize(16);
doc.text("Baustellenbegehung – Bericht", pageW / 2, startY, { align: "center" });

  autoTable(doc, {
    head: [["Feld", "Wert"]],
    body: [
      ["Projekt", form.project || "-"],
      ["Ort", form.location || "-"],
      ["Firma/AG", form.company || "-"],
      ["Datum/Uhrzeit", formatDEDateTime(form.date)],

      ["Begehende Person", form.inspector || "-"],
      ["Wetter", form.weather || "-"],
      ["Bemerkungen", form.remarks || "-"],
      ["Prüfumfang", "Im Bericht sind alle bewerteten Prüfpunkte aufgeführt. Nicht aufgeführte Punkte wurden nicht dokumentiert."],

    ],
    margin: { left: margin, right: margin, top: startY + 6 },
    styles: { fontSize: 10, cellPadding: 2 },
    theme: "grid",
  });

 const rows = buildChecklistRows();

if (rows.length === 0) {
  rows.push(["-", "Keine Einträge erfasst", "-", "-"]);
}

autoTable(doc, {
  head: [["Kategorie", "Prüfpunkt", "Bewertung", "Notiz"]],
  body: rows,
 startY: ((doc.lastAutoTable?.finalY ?? (startY + 10)) + 6),

  margin: { left: margin, right: margin },
  theme: "grid",
  
  styles: { fontSize: 10, cellPadding: 2, overflow: "linebreak" },
columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: "auto" } },

  alternateRowStyles: { fillColor: [245, 245, 245] }, // Zebra
});



  let y = (doc.lastAutoTable?.finalY || startY + 10) + 10;
 
// Unterschrift immer auf Seite 1 unten einzeichnen
drawSignatureBlockOnFirstPage(doc, margin);

 y = await addPhotosSection(doc, images, att, y, pageW, margin);

   // Footer auf alle Seiten: Datum · Begeher | Seite x von y
const total = doc.internal.getNumberOfPages();
for (let p = 1; p <= total; p++) {
  doc.setPage(p);
  drawFooter(doc, p, total, margin);
}


  const dataUri = doc.output("datauristring");
  const pdfBase64 = dataUri.split(",")[1];

  const safeName = (form.project || "Projekt").replace(/[^\w-]+/g, "_");
  const filename = `Begehung_${safeName}.pdf`;

  const params = new URLSearchParams({
    token: APPS_SCRIPT_TOKEN || "",
    filename,
    pdfBase64,
    cc: ccEmail || "",

    subject: "Baustellenbegehung – Bericht",
    body: "Im Anhang der PDF-Bericht.",
    project: form.project || "",
    location: form.location || "",
    inspector: form.inspector || "",
    date: form.date || "",
  });

  const res = await fetch(APPS_SCRIPT_URL, { method: "POST", body: params });
  const txt = await res.text();
  console.log("AppsScript Antwort:", txt);

  if (!res.ok || /^ERROR/i.test(txt) || /^Unauthorized/i.test(txt)) {
    throw new Error(txt || `HTTP ${res.status}`);
  }
};
 
// ... deine bisherigen States und Funktionen (z. B. onCapturePhoto, resizeImageFromFile usw.)

// === einfache PDF-Erzeugung ===
const sharePdf = async () => {
  try {
    // Erzeuge PDF genauso wie beim Speichern:
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 15;

    const logoH = await addLogoTopRight(doc, logoSrc, margin);
    const startY = Math.max(margin + logoH + 8, 24);

    doc.setFontSize(16);
    doc.text("Baustellenbegehung – Bericht", pageW / 2, startY, { align: "center" });

    autoTable(doc, {
      head: [["Feld", "Wert"]],
      body: [
        ["Projekt", form.project || "-"],
        ["Ort", form.location || "-"],
        ["Firma/AG", form.company || "-"],
       ["Datum/Uhrzeit", formatDEDateTime(form.date)],

        ["Begehende Person", form.inspector || "-"],
        ["Wetter", form.weather || "-"],
        ["Bemerkungen", form.remarks || "-"],
      ],
      margin: { left: margin, right: margin, top: startY + 6 },
      styles: { fontSize: 10 },
      theme: "grid",
    });

    const rows = buildChecklistRows();
    autoTable(doc, {
      head: [["Kategorie", "Prüfpunkt", "Bewertung", "Notiz"]],
      body: rows,
      startY: (doc.lastAutoTable?.finalY || startY + 10) + 6,
      margin: { left: margin, right: margin },
      styles: { fontSize: 9 },
      theme: "grid",
    });


    


   
// Checkpunkt-Fotos
/* ===========================
   1) AUFRUFSTELLE ERSETZEN
   ===========================

   Suche diese Zeile (bei dir nach der Unterschrift, ca. Zeile 1293):
     await addPhotosSection(doc, checklist, CATEGORIES);

   Ersetze sie 1:1 durch:
*/
y = await addPhotosSection(doc, checklist, CATEGORIES, y);


/* ===========================
   2) FUNKTIONSDEFINITION 1:1 ERSETZEN
   ===========================

   Suche die komplette Funktion `addPhotosSection` in deiner Datei und ersetze sie
   vollständig durch diese Version.

   WICHTIG:
   - Diese Version startet exakt bei `startY` (also unter der Unterschrift).
   - Sie zeichnet bei Seitenumbruch den Header nach (drawHeader).
   - Sie arbeitet mit deinem vorhandenen findNoteForPhoto(i), recompressImage(...),
     images-Array, pageW, margin, drawHeader(...) — genauso wie dein bisheriger Loop.
*/

async function addPhotosSection(doc, images, att, startY, pageW, margin) {
  let y = startY;

  // Titel (damit man sofort sieht, dass der Abschnitt überhaupt läuft)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text("Fotos", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");

  // Wenn keine Fotos da sind: sichtbar ins PDF schreiben und sauber zurück
  if (!Array.isArray(images) || images.length === 0) {
    doc.setFontSize(10);
    doc.text("Keine Fotos vorhanden.", margin, y);
    return y + 6;
  }

  const pageH = doc.internal.pageSize.getHeight();
  const bottomLimit = pageH - margin;

  const colGap = 6;
  const cols = 2;

  const maxWPerCol = (pageW - margin * 2 - colGap) / cols; // mm
  const maxHmm = 60; // mm pro Bild

  let col = 0;

  for (let i = 0; i < images.length; i++) {
    try {
      const recompressed = await recompressImage(images[i], att.maxPx, att.q);

      // Größe bestimmen
      const tmp = new Image();
      await new Promise((r) => {
        tmp.onload = r;
        tmp.src = recompressed;
      });

      const px2mm = 0.264583;
      let w = tmp.width * px2mm;
      let h = tmp.height * px2mm;

      const ratio = Math.min(maxWPerCol / w, maxHmm / h, 1);
      w = Math.max(10, Math.round(w * ratio));
      h = Math.max(10, Math.round(h * ratio));

      // Caption vor Platzprüfung ermitteln
      const caption = typeof findNoteForPhoto === "function" ? findNoteForPhoto(i) : "";
      const captionH = caption ? 5 : 0;

      const neededH = 4 + h + 3 + captionH;

      // Seitenumbruch
      if (y + neededH > bottomLimit) {
        doc.addPage();
        if (typeof drawHeader === "function") drawHeader(doc, pageW, margin);
        y = margin + 5;
        col = 0;
      }

      const x = margin + col * (maxWPerCol + colGap);

      doc.setFontSize(10);
      doc.text(`Foto ${i + 1}`, x, y);
      y += 4;

      doc.addImage(recompressed, "JPEG", x, y, w, h, undefined, "FAST");
      y += h + 3;

      if (caption) {
        doc.setFontSize(9);
        doc.text(String(caption).slice(0, 120), x, y);
        y += 5;
      }

      // Nächste Spalte / Zeile
      col = (col + 1) % cols;
      if (col === 0) y += 6;
    } catch (err) {
      // Sichtbarer Hinweis im PDF, statt "still nichts"
      doc.setFontSize(9);
      doc.setTextColor(200, 0, 0);
      doc.text(`Foto ${i + 1} konnte nicht geladen werden.`, margin, y);
      doc.setTextColor(0);

      y += 6;
      col = 0;

      // Optional: auf neuer Seite weitermachen, falls unten eng
      if (y > bottomLimit) {
        doc.addPage();
        if (typeof drawHeader === "function") drawHeader(doc, pageW, margin);
        y = margin + 5;
      }

      console.error("Foto-Render-Fehler:", err);
    }
  }

  return y;
}




// Dateiname
const safeName = (form.project || "Projekt").replace(/[^\w-]+/g, "_");
const fileName = `Begehung_${safeName}.pdf`;

// PDF als Datei bauen
const blob = doc.output("blob");
const file = new File([blob], fileName, { type: "application/pdf" });

// Teilen (wenn möglich), sonst speichern
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: "Baustellenbegehung – Bericht",
        text: "PDF-Bericht im Anhang.",
        files: [file],
      });
    } catch (err) {
      // Teilen kann auch bei Abbruch/Cancel hier landen
      console.error("PDF teilen fehlgeschlagen/abgebrochen:", err);
      doc.save(fileName);
      alert("Teilen abgebrochen/fehlgeschlagen – PDF wurde gespeichert.");
    }
  } else {
    doc.save(fileName);
    alert("Teilen wird von diesem Browser/Gerät nicht unterstützt – PDF wurde gespeichert.");
  }

} catch (err) {
  console.error("PDF-Fehler:", err);
  alert("PDF konnte nicht erstellt werden. Details in der Konsole.");
}
};


// === ab hier beginnt dein UI ===
return (
<div className="min-h-screen bg-gray-50 p-3 md:p-8 overflow-x-hidden">

      <div className="max-w-5xl mx-auto">
    <header className="mb-6">
  <div className="flex items-start justify-between gap-4">
    <div>
      <h1 className="text-2xl md:text-3xl font-bold">Baustellenbegehung – Dokumentation</h1>
    <p className="text-gray-600 mt-1 text-sm md:text-base break-words">

        Digitale Begehungsdokumentation mit Standortermittlung, Checkliste, Fotonachweisen, Unterschrift und automatischem Versand inkl. PDF-Bericht.
      </p>
    </div>

    <div className="text-right shrink-0">
      <span className="inline-block text-xs md:text-sm text-gray-500 border rounded-lg px-2 py-1 bg-white">
        {APP_STAND}
      </span>
    </div>
  </div>
</header>

  
 
         
       <div className="mt-3 flex flex-col md:flex-row md:items-center gap-2">
  <label className="text-sm text-gray-600 md:w-12">CC:</label>
  <input
    className="border rounded-xl p-2 flex-1"
    value={ccEmail}
    onChange={(e) => setCcEmail(e.target.value)}
    placeholder="z.B. joachim@firma.de"
  />
  <span className="text-xs text-gray-500 md:w-56">
    Optional. Lokal gespeichert.
  </span>
</div>
<div className="mt-2 flex items-center gap-2">
  <input
    id="only-open"
    type="checkbox"
    className="h-4 w-4"
    checked={showOnlyOpen}
    onChange={(e) => setShowOnlyOpen(e.target.checked)}
  />
  <label htmlFor="only-open" className="text-sm text-gray-700">
    Nur offene Punkte (Mangel / Notiz / Foto) anzeigen
  </label>
</div>

        


        <form onSubmit={onSubmit} className="space-y-6">
          {/* Stammdaten */}
          <section className="grid md:grid-cols-2 gap-4 bg-white p-4 rounded-2xl shadow">
            <h2 className="md:col-span-2 text-lg font-semibold">Stammdaten</h2>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-600">Projekt *</span>
              <input className="border rounded-xl p-2" value={form.project} onChange={onField("project")} placeholder="z.B. Schleusenmodernisierung XY"/>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-600">Ort *</span>
              <div className="flex gap-2">
                <input className="border rounded-xl p-2 flex-1" value={form.location} onChange={onField("location")} placeholder="Adresse oder automatisch ermitteln"/>
                <button type="button" onClick={onLocate} className="px-3 py-2 rounded-xl border whitespace-nowrap" disabled={locating}>
                  {locating ? "Ermittle…" : "Standort übernehmen"}
                </button>
              </div>
            </label>
 <label className="flex flex-col gap-1">
  <span className="text-sm text-gray-600">Firma/AG</span>
  <input
    className="border rounded-xl p-2"
    value={form.company}
    onChange={(e) => {
      onField("company")(e);
      autoPickLogoByCompany(e.target.value);
    }}
  />
</label>


 
              
{/* ================= Logo-Auswahl ================= */}
<label className="flex flex-col gap-1 md:col-span-2">
  <span className="text-sm text-gray-600">Logo für Bericht</span>

  <div className="flex flex-col gap-2">
    {/* Auswahlmenü */}
    <div className="flex gap-2 flex-wrap">
      <select
        className="border rounded-xl p-2"
        value={logoChoice}
        onChange={(e) => {
          const val = e.target.value;
          setLogoChoice(val);
          const preset = DEFAULT_LOGOS.find((l) => l.id === val);
          if (preset && preset.url) setLogoSrc(preset.url);
          if (val === "custom") {
            const stored = localStorage.getItem("app.logoSrc");
            if (stored) setLogoSrc(stored);
          }
        }}
      >
        {DEFAULT_LOGOS.map((l) => (
          <option key={l.id} value={l.id}>
            {l.label}
          </option>
        ))}
      </select>

      {/* Datei-Upload nur bei "Eigenes Logo" */}
      {logoChoice === "custom" && (
        <input
          type="file"
          accept="image/*"
          onChange={onLogoUpload}
          className="border rounded-xl p-2"
        />
      )}
    </div>

    {/* Logo-Vorschau */}
    {logoSrc ? (
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">Vorschau:</span>
        <img
          src={logoSrc}
          alt="Logo"
         className={`${logoChoice === "wimmer" ? "h-6 max-w-[120px]" : "h-8 max-w-[140px]"} w-auto object-contain border rounded-md bg-white px-2 shrink-0`}


        />
        <button
          type="button"
          className="px-3 py-2 rounded-xl border"
          onClick={() => {
            setLogoChoice("felbermayr");
            setLogoSrc(DEFAULT_LOGOS[0].url);
          }}
        >
          Zurücksetzen
        </button>
      </div>
    ) : (
      <span className="text-sm text-amber-600">
        Bitte Logo auswählen oder hochladen.
      </span>
    )}
  </div>
</label>







            
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-600">Datum/Uhrzeit</span>
              <input type="datetime-local" className="border rounded-xl p-2" value={form.date} onChange={onField("date")} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-600">Begehende Person *</span>
              <input
  className="border rounded-xl p-2"
  value={form.inspector}
  onChange={(e) => updateInspector(e.target.value)}
/>
<span className="text-xs text-gray-500">
  Wird lokal auf diesem Gerät gespeichert.
</span>

            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-600">Wetter</span>
              <input className="border rounded-xl p-2" value={form.weather} onChange={onField("weather")} />
            </label>
            <label className="md:col-span-2 flex flex-col gap-1">
<span className="text-sm text-gray-600">
  Management-Kurzinfo (Mängel & Sofortmaßnahmen)
</span>

<textarea
  className="border rounded-xl p-2"
  rows={6}
  placeholder={`Anzahl festgestellter Mängel: 0

Sofortmaßnahmen (sofort abgestellt):
- Beispiel: Absperrung ergänzt / Kabel entfernt / PSA nachgereicht

Offene Mängel (noch zu beheben):
- Beispiel: Verantwortlich: ___ / Frist: ___`}
  value={form.remarks}
  onChange={onField("remarks")}
/>

<span className="text-xs text-gray-500">
  Bitte Anzahl der Mängel sowie Sofortmaßnahmen (direkt abgestellt) und offene Punkte kurz zusammenfassen.
</span>


            </label>
          </section>

          {/* Checkliste mit farbigen Buttons & Zebra-Hintergrund */}
{CATEGORIES.map((cat) => (
  <section key={cat.key} className="bg-white p-4 rounded-2xl shadow">
    <button
      type="button"
      onClick={() => setOpenCats((s) => ({ ...s, [cat.key]: !s[cat.key] }))}
      className="w-full flex items-center justify-between text-left mb-3"
    >
      <span className="text-lg font-semibold">{cat.title}</span>
      <span className="text-sm text-gray-500">{openCats?.[cat.key] ? "−" : "+"}</span>
    </button>

    {openCats?.[cat.key] && (
      <div className="divide-y">
        {cat.items.map((label, i) => {
          const row = checklist?.[cat.key]?.[i] || { rating: "", note: "", photos: [] };

          const hasRating = !!row.rating;
          const hasNote = !!(row.note || "").trim();
          const hasPhoto = Array.isArray(row.photos) && row.photos.length > 0;
          const isOpen = hasRating || hasNote || hasPhoto;

          if (showOnlyOpen && !isOpen) return null;

          return (
            <div
              key={i}
              className={`grid md:grid-cols-6 items-start gap-3 py-3 ${
                i % 2 === 0 ? "bg-slate-50" : "bg-white"
              }`}
            >
              <div className="md:col-span-3 font-medium">{label}</div>

              <div className="md:col-span-3 space-y-2">
                <div className="flex gap-2 flex-wrap">
                  {RATING_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        const next = { ...checklist };
                        const arr = [...next[cat.key]];
                        const nextRating = row.rating === opt.value ? "" : opt.value;
                        arr[i] = { ...arr[i], rating: nextRating };
                        next[cat.key] = arr;
                        setChecklist(next);
                      }}
                      className={`px-3 py-1 rounded-xl border transition ${
                        row.rating === opt.value
                          ? `${opt.color} ${opt.border}`
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <input
                  className="w-full border rounded-xl p-2"
                  placeholder="Notiz…"
                  value={row.note}
                  onChange={(e) => {
                    const next = { ...checklist };
                    const arr = [...next[cat.key]];
                    arr[i] = { ...arr[i], note: e.target.value };
                    next[cat.key] = arr;
                    setChecklist(next);
                  }}
                />

                <div className="flex items-center gap-2">
                  <input
                    id={`cam-${cat.key}-${i}`}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={onCapturePhoto(cat.key, i)}
                    className="hidden"
                  />
                  <label
                    htmlFor={`cam-${cat.key}-${i}`}
                    className="px-3 py-1 rounded-xl border cursor-pointer select-none"
                  >
                    Foto aufnehmen
                  </label>

                  {(row.photos || []).slice(0, 3).map((p, idx) => (
                    <img
                      key={idx}
                      src={p}
                      alt="Foto"
                      className="h-10 w-10 object-cover rounded border"
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </section>
))}


          {/* Fotos */}
          <section className="bg-white p-4 rounded-2xl shadow">
            <h2 className="text-lg font-semibold mb-3">Fotos (werden verkleinert)</h2>
            <input type="file" accept="image/*" multiple capture="environment" onChange={onPickImages} className="mb-3" />
            {!!images.length && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {images.map((src, i) => (
                  <div key={i} className="relative group">
                    <img src={src} alt={`Foto ${i + 1}`} className="w-full h-32 object-cover rounded-xl border" />
                    <button
                      type="button"
                      onClick={() => setImages((arr) => arr.filter((_, idx) => idx !== i))}
                      className="absolute top-2 right-2 bg-white/90 border rounded-lg px-2 py-1 text-sm"
                    >
                      Entfernen
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

{/* Unterschrift */}
<section className="bg-white p-4 rounded-2xl shadow">
  <h2 className="text-lg font-semibold mb-3">Unterschrift</h2>

  <div className="space-y-2">
 <canvas
  ref={sigCanvasRef}
  className="border rounded bg-white w-full h-40 block"
  onPointerUp={saveSignature}
  onPointerLeave={saveSignature}
/>


<div className="flex gap-2 items-center flex-wrap">
  <button
    type="button"
    onClick={clearSignature}
    className="px-3 py-2 rounded-xl border"
  >
    Löschen
  </button>
 <span className="text-gray-500 text-sm">
  Bitte mit Finger/Maus unterschreiben. Wird lokal auf diesem Gerät gespeichert (bis „Löschen“).
</span>

</div>

  </div>
</section>


          {/* Meldungen & Aktionen */}
          {msg && (
            <div className={`p-3 rounded-xl ${msg.type === "ok" ? "bg-green-100" : "bg-red-100"}`}>{msg.text}</div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <button type="submit" disabled={busy} className="px-5 py-3 rounded-2xl bg-black text-white disabled:opacity-60">
              {busy ? "Sende…" : "Begehung per E-Mail senden"}
            </button>



            <span className="text-gray-500 text-sm">E-Mail via EmailJS oder lokale PDF-Ablage. Logo nur auf Seite 1.</span>
          </div>
        </form>
      </div>
    </div>
  );
}
