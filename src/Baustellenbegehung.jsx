import React, { useMemo, useRef, useState, useEffect } from "react";
import emailjs from "@emailjs/browser";
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

function autoPickLogoByCompany(companyName) {
  if (!companyName) return;
  const hit = FIRM_MATCH.find(m => m.re.test(companyName));
  if (!hit) return;
  const preset = DEFAULT_LOGOS.find(l => l.id === hit.logoId);
  if (!preset) return;
  setLogoChoice(hit.logoId);
  setLogoSrc(preset.url);
}




/* ===================== Konfiguration ===================== */
const EMAILJS_CONFIG = {
  PUBLIC_KEY: "b21Z2RnKpe9VYl79W",
  SERVICE_ID: "service_f2lezug",
  TEMPLATE_ID: "template_3q4kf4r",
};

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
// ==============================================
// Kamera-Funktion pro Checkpunkt (Foto aufnehmen)
// ==============================================
const onCapturePhoto = (catKey, itemIndex) => async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    // vorhandene Funktion zum Verkleinern nutzen
    const dataUrl = await resizeImageFromFile(file, 1280, 0.8);

    setChecklist((prev) => {
      const next = { ...prev };
      const entry = { ...next[catKey][itemIndex] };
      entry.photos = Array.isArray(entry.photos) ? [...entry.photos, dataUrl] : [dataUrl];
      next[catKey] = [...next[catKey]];
      next[catKey][itemIndex] = entry;
      return next;
    });
  } catch (err) {
    console.error("Foto aufnehmen fehlgeschlagen:", err);
    setMsg?.({ type: "error", text: "Konnte Foto nicht aufnehmen." });
  } finally {
    // damit man gleich das nächste Bild machen kann
    e.target.value = "";
  }
};

/* ===================== Hilfsfunktionen ===================== */
function useNowISOLocal() {
  return useMemo(() => new Date().toISOString().slice(0, 16), []);
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

/* ===================== Komponente ===================== */
export default function BaustellenbegehungEmailJS() {
  const now = useNowISOLocal();
  const [form, setForm] = useState({
    project: "",
    location: "",
    company: "",
    date: now,
    inspector: "",
    weather: "",
    remarks: "",
  });

 const [checklist, setChecklist] = useState(() => {
  const init = {};
  for (const cat of CATEGORIES) init[cat.key] = cat.items.map(() => ({ rating: "ok", note: "", photos: [] }));
  // Foto direkt mit Kamera aufnehmen (mobil): speichert als verkleinertes DataURL
const onCapturePhoto = (catKey, itemIndex) => async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    // Du hast bereits resizeImageFromFile(f, maxWidth, quality) -> wir nutzen das
    const dataUrl = await resizeImageFromFile(file, 1280, 0.8);
    setChecklist(prev => {
      const next = { ...prev };
      const entry = { ...next[catKey][itemIndex] };
      entry.photos = Array.isArray(entry.photos) ? [...entry.photos, dataUrl] : [dataUrl];
      next[catKey] = [...next[catKey]];
      next[catKey][itemIndex] = entry;
      return next;
    });
  } catch (err) {
    console.error("Foto aufnehmen fehlgeschlagen:", err);
    setMsg?.({ type: "error", text: "Konnte Foto nicht aufnehmen." });
  } finally {
    // Eingabeelement zurücksetzen, damit man direkt ein weiteres Foto machen kann
    e.target.value = "";
  }
};
 
  return init;
});


  const [images, setImages] = useState([]); // dataURLs
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

// Logo-Auswahl speichern
const [logoChoice, setLogoChoice] = useState(() =>
  localStorage.getItem("app.logoChoice") || "felbermayr"
);
const [logoSrc, setLogoSrc] = useState(() =>
  localStorage.getItem("app.logoSrc") || (DEFAULT_LOGOS[0]?.url || "")
);

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

  // ---------- Unterschrift (Signaturfeld) ----------
  const sigCanvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureDataURL, setSignatureDataURL] = useState("");

  const startDraw = (e) => {
    const canvas = sigCanvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "#111";
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.beginPath(); ctx.moveTo(x, y);
    setIsDrawing(true);
  };
  const drawMove = (e) => {
    if (!isDrawing) return; const canvas = sigCanvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.lineTo(x, y); ctx.stroke();
  };
  const endDraw = () => {
    setIsDrawing(false);
    const canvas = sigCanvasRef.current; if (!canvas) return;
    setSignatureDataURL(canvas.toDataURL("image/png"));
  };
  const clearSignature = () => {
    const canvas = sigCanvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureDataURL("");
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

  // Prüfen, ob überhaupt Fotos existieren
  const hasAny = CATEGORIES.some(cat =>
    (checklist[cat.key] || []).some(r => (r.photos || []).length)
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

  function ensure(h) {
    if (y + h > pageH - margin) { doc.addPage(); y = margin; }
  }

  for (const cat of CATEGORIES) {
    const rows = checklist[cat.key] || [];
    for (let i = 0; i < rows.length; i++) {
      const photos = rows[i]?.photos || [];
      if (!photos.length) continue;

      ensure(10);
      doc.setFont("helvetica", "bold"); doc.setFontSize(11);
      doc.text(`${cat.title} – ${cat.items[i]}`, margin, y);
      y += 4;
      doc.setFont("helvetica", "normal"); doc.setFontSize(10);

      for (let p = 0; p < photos.length; p++) {
        const col = p % 2;
        if (col === 0) ensure(cellH + 8);

        const px = margin + col * (cellW + gap);
        const py = y;
        const data = await toDataUrl(photos[p]);
        if (data) {
          doc.addImage(data, "PNG", px, py, cellW, cellH, undefined, "FAST");
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
    for (const cat of CATEGORIES) {
      cat.items.forEach((label, i) => {
        const row = checklist?.[cat.key]?.[i] || { rating: "", note: "" };
        const ratingMap = { ok: "OK", defect: "Mangel", note: "Notiz" };
        rows.push([cat.title, label, ratingMap[row.rating] || "", row.note || ""]);
      });
    }
    return rows;
  };

  // Header endgültig deaktiviert
const drawHeader = () => {};

 
  const drawFooter = (doc, pageW, margin, page, total) => {
    const footerTextLeft = "Empfänger: EHS Felbermayr Deutschland GmbH";
    const footerTextRight = `Seite ${page}/${total}`;
    doc.setFontSize(8);
    doc.text(footerTextLeft, margin, 287);
    doc.text(footerTextRight, pageW - margin, 287, { align: "right" });
  };

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
      const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      await addLogoTopRight(doc, logoSrc);

      const pageW = doc.internal.pageSize.getWidth();
      const margin = 10;

// --- Kopfzeile entfernt ---
// Logo wird bereits oben rechts über addLogoTopRight eingefügt.
// drawHeader() nicht mehr aufrufen.



      // Titel
      const titleY = 40;
      doc.setFontSize(16);
      doc.text("Baustellenbegehung – Bericht", pageW / 2, titleY, { align: "center" });

      // Stammdaten
      doc.setFontSize(11);
      const meta = [
        ["Projekt", form.project || "-"],
        ["Ort", form.location || "-"],
        ["Firma/AG", form.company || "-"],
        ["Datum/Uhrzeit", form.date || "-"],
        ["Begehende Person", form.inspector || "-"],
        ["Wetter", form.weather || "-"],
        ["Bemerkungen", form.remarks || "-"],
      ];

      autoTable(doc, {
        startY: titleY + 8,
        styles: { fontSize: 10, cellPadding: 2 },
        head: [["Feld", "Wert"]],
        body: meta,
        theme: "grid",
        headStyles: { fillColor: [248, 250, 252], textColor: 0, lineWidth: 0.1 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });

      // Checkliste mit Zebra
      const rows = buildChecklistRows();
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 6,
        styles: { fontSize: 9, cellPadding: 2 },
        head: [["Kategorie", "Prüfpunkt", "Bewertung", "Notiz"]],
        body: rows,
        theme: "grid",
        headStyles: { fillColor: [241, 245, 249], textColor: 0, lineWidth: 0.1 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 0: { cellWidth: 36 }, 1: { cellWidth: 82 }, 2: { cellWidth: 26 }, 3: { cellWidth: 46 } },
      });

      // Unterschrift (falls vorhanden)
      let y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : 50;
      if (signatureDataURL) {
        doc.setFontSize(12);
        doc.text("Unterschrift", margin, y);
        y += 4;
        // Kleinere Einbettung
        doc.addImage(signatureDataURL, "PNG", margin, y, 60, 20, undefined, "FAST");
        y += 24;
      }

      // Fotos (2 pro Zeile Raster) – vorher neu komprimieren auf att.maxPx / att.q
      const pageWmm = pageW, colGap = 6, cols = 2;
      const maxWPerCol = (pageWmm - margin * 2 - colGap) / cols; // mm
      const maxHmm = 60; // mm pro Bild

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
          if (y + h > 287) { doc.addPage(); drawHeader(doc, pageW, margin); y = 20; col = 0; }

          const x = margin + col * (maxWPerCol + colGap);
          doc.setFontSize(10);
          doc.text(`Foto ${i + 1}`, x, y);
          y += 4;
          doc.addImage(recompressed, "JPEG", x, y, w, h, undefined, "FAST");

          // Caption, falls Notiz existiert
          y += h + 3;
          const caption = findNoteForPhoto(i);
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

      // Größe prüfen
      const blob = doc.output("blob");
      const sizeMB = blob.size / (1024 * 1024);
      if (sizeMB <= 1.0) {
        const safeName = (form.project || "Projekt").replace(/[^\w-]+/g, "_");
       await addPhotosSection(doc, checklist, CATEGORIES);
 
        doc.save(`Begehung_${safeName}.pdf`);
        return true;
      }
      // andernfalls nächsten Versuch mit stärkerer Kompression
    }
    // Falls alle Versuche > 1 MB sind, letzten trotzdem speichern
    const fallback = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    fallback.text("Bericht überschreitet 1 MB trotz Kompression.", 10, 10);
    const safeName = (form.project || "Projekt").replace(/[^\w-]+/g, "_");
    fallback.save(`Begehung_${safeName}.pdf`);
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
emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);

await emailjs.send(
  EMAILJS_CONFIG.SERVICE_ID,
  EMAILJS_CONFIG.TEMPLATE_ID,
  {
    date: form.date,
    project: form.project,
    location: form.location,
    inspector: form.inspector,
  }
);
setMsg({ type: "ok", text: "E-Mail verschickt (Kurzinfo ohne Berichtstext)." });
    
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

  
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Baustellenbegehung – Variante A (EmailJS)</h1>
          <p className="text-gray-600 mt-1">Einfache Web-App zur Dokumentation, mit GPS-Ortung, Unterschrift, Fotos, PDF-Export (≤1 MB) & E-Mail.</p>
        </header>

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
          className="h-10 object-contain border rounded-md bg-white px-2"
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
              <input className="border rounded-xl p-2" value={form.inspector} onChange={onField("inspector")} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-600">Wetter</span>
              <input className="border rounded-xl p-2" value={form.weather} onChange={onField("weather")} />
            </label>
            <label className="md:col-span-2 flex flex-col gap-1">
              <span className="text-sm text-gray-600">Allgemeine Bemerkungen</span>
              <textarea className="border rounded-xl p-2" rows={3} value={form.remarks} onChange={onField("remarks")} />
            </label>
          </section>

          {/* Checkliste mit farbigen Buttons & Zebra-Hintergrund */}
          {CATEGORIES.map((cat) => (
            <section key={cat.key} className="bg-white p-4 rounded-2xl shadow">
              <h2 className="text-lg font-semibold mb-3">{cat.title}</h2>
              <div className="divide-y">
 {cat.items.map((label, i) => {
  const row =
    checklist?.[cat.key]?.[i] || { rating: "ok", note: "", photos: [] };

  return (
    <div
      key={i}
      className={`grid md:grid-cols-6 items-start gap-3 py-3 ${
        i % 2 === 0 ? "bg-slate-50" : "bg-white"
      }`}
    >
      {/* Punkt-Text */}
      <div className="md:col-span-3 font-medium">{label}</div>

      {/* rechte Spalte: Aktionen */}
      <div className="md:col-span-3 space-y-2">

        {/* Bewertungs-Buttons */}
        <div className="flex gap-2 flex-wrap">
          {RATING_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                const next = { ...checklist };
                const arr = [...next[cat.key]];
                const entry = { ...arr[i], rating: opt.value };
                arr[i] = entry;
                next[cat.key] = arr;
                setChecklist(next);
              }}
              className={`px-3 py-1 rounded-xl border ${opt.color} ${opt.border}`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Notizfeld */}
        <input
          className="w-full border rounded-xl p-2"
          placeholder="Notiz…"
          value={row.note}
          onChange={(e) => {
            const next = { ...checklist };
            const arr = [...next[cat.key]];
            const entry = { ...arr[i], note: e.target.value };
            arr[i] = entry;
            next[cat.key] = arr;
            setChecklist(next);
          }}
        />

        {/* Kamera + Thumbnails */}
        <div className="flex items-center gap-2">
          {/* unsichtbares Input, wird über Label getriggert */}
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
            📷 Foto aufnehmen
          </label>

          {/* kleine Vorschaubilder */}
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
                width={500}
                height={120}
                className="w-full border rounded-xl bg-white"
                onMouseDown={startDraw}
                onMouseMove={drawMove}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={drawMove}
                onTouchEnd={endDraw}
              />
              <div className="flex gap-2">
                <button type="button" onClick={clearSignature} className="px-3 py-2 rounded-xl border">Löschen</button>
                <span className="text-gray-500 text-sm">Bitte mit Maus/Finger unterschreiben.</span>
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
            <button type="button" onClick={exportPdfWithLimits} className="px-5 py-3 rounded-2xl border">
              PDF-Bericht speichern (≤1 MB)
            </button>
            <span className="text-gray-500 text-sm">E-Mail via EmailJS oder lokale PDF-Ablage. Logo nur auf Seite 1.</span>
          </div>
        </form>
      </div>
    </div>
  );
}
