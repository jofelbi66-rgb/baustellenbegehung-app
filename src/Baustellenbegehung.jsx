// src/Baustellenbegehung.jsx
import React, { useMemo, useRef, useState } from "react";
import emailjs from "@emailjs/browser";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ===================== Konfiguration ===================== */
const EMAILJS_CONFIG = {
  PUBLIC_KEY: "REPLACE_WITH_YOUR_PUBLIC_KEY",
  SERVICE_ID: "REPLACE_WITH_YOUR_SERVICE_ID",
  TEMPLATE_ID: "REPLACE_WITH_YOUR_TEMPLATE_ID",
};

// Logo für PDF (GitHub RAW-URL, z. B. https://raw.githubusercontent.com/<user>/<repo>/main/felbermayr_logo.png)
const LOGO_URL = "REPLACE_WITH_GITHUB_RAW_LOGO_URL";

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

const ratingOptions = [
  { value: "ok", label: "OK" },
  { value: "defect", label: "Mangel" },
  { value: "na", label: "N/A" },
];

/* ===================== Hilfsfunktionen ===================== */
function useNowISOLocal() {
  return useMemo(() => new Date().toISOString().slice(0, 16), []);
}

async function resizeImage(file, maxSize = 1280) {
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
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
  canvas.width = Math.round(img.width * ratio);
  canvas.height = Math.round(img.height * ratio);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

/* ===================== Komponente ===================== */
function BaustellenbegehungEmailJS() {
  const now = useNowISOLocal();
  const formRef = useRef(null);

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
    for (const cat of CATEGORIES) {
      init[cat.key] = cat.items.map(() => ({ rating: "ok", note: "" }));
    }
    return init;
  });

  const [images, setImages] = useState([]); // dataURLs
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

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
      for (const f of files.slice(0, 8)) {
        const durl = await resizeImage(f, 1280);
        resized.push(durl);
      }
      setImages((prev) => [...prev, ...resized].slice(0, 12)); // Deckel
    } catch (err) {
      console.error(err);
      setMsg({ type: "error", text: "Bilder konnten nicht verarbeitet werden." });
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  /* ---------- HTML für E-Mail ---------- */
  const buildSummaryHTML = () => {
    const rows = [];
    for (const cat of CATEGORIES) {
      rows.push(
        `<tr><td colspan="3" style="padding:8px 0;font-weight:600">${cat.title}</td></tr>`
      );
      cat.items.forEach((label, i) => {
        const row = checklist?.[cat.key]?.[i] || { rating: "", note: "" };
        const ratingMap = { ok: "OK", defect: "Mangel", na: "N/A" };
        rows.push(
          `<tr>
            <td style="padding:6px 8px;border-bottom:1px solid #eee">${label}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #eee">${ratingMap[row.rating] ?? ""}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #eee">${(row.note || "").replace(/</g,"&lt;")}</td>
          </tr>`
        );
      });
    }
    return `
      <table style="border-collapse:collapse;width:100%;font-family:Arial,Helvetica,sans-serif;font-size:14px">
        <thead>
          <tr>
            <th align="left" style="padding:6px 8px;border-bottom:2px solid #ddd">Prüfpunkt</th>
            <th align="left" style="padding:6px 8px;border-bottom:2px solid #ddd">Bewertung</th>
            <th align="left" style="padding:6px 8px;border-bottom:2px solid #ddd">Notiz</th>
          </tr>
        </thead>
        <tbody>${rows.join("")}</tbody>
      </table>
    `;
  };

  const buildImagesHTML = () => {
    if (!images.length) return "";
    const blocks = images.map(
      (d, i) => `
        <div style="margin:8px 0">
          <div style="font:600 14px Arial,Helvetica,sans-serif;margin-bottom:4px">Foto ${i + 1}</div>
          <img src="${d}" alt="Foto ${i + 1}" style="max-width:100%;height:auto;border:1px solid #eee"/>
        </div>`
    );
    return blocks.join("");
  };

  /* ---------- PDF / Header-Footer / Logo ---------- */
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
        const ratingMap = { ok: "OK", defect: "Mangel", na: "N/A" };
        rows.push([cat.title, label, ratingMap[row.rating] || "", row.note || ""]);
      });
    }
    return rows;
  };

  const drawHeaderFooter = (doc, pageW, margin) => {
    // Kopfzeile
    doc.setFontSize(9);
    const ort = form.location || "-";
    const datum = form.date || new Date().toLocaleString();
    const ersteller = form.inspector || "-";
    const headerText = `Ort: ${ort}   |   Datum: ${datum}   |   Ersteller: ${ersteller}`;
    doc.text(headerText, margin, 10);

    // Fußzeile
    const footerText = "Empfänger: EHS Felbermayr Deutschland GmbH";
    doc.setFontSize(8);
    doc.text(footerText, pageW / 2, 287, { align: "center" });
  };

  const onExportPDF = async () => {
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 10;

    drawHeaderFooter(doc, pageW, margin);

    // Logo oben rechts
    if (LOGO_URL && LOGO_URL.startsWith("http")) {
      const logoData = await dataURLFromURL(LOGO_URL);
      if (logoData) {
        try {
          const logoW = 40; // mm
          const logoH = 12; // mm (annähernd)
          const x = pageW - margin - logoW;
          doc.addImage(logoData, "PNG", x, 10, logoW, logoH, undefined, "FAST");
        } catch {}
      }
    }

    // Titel mit Abstand
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
    });

    // Checkliste
    const rows = buildChecklistRows();
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 6,
      styles: { fontSize: 9, cellPadding: 2 },
      head: [["Kategorie", "Prüfpunkt", "Bewertung", "Notiz"]],
      body: rows,
      columnStyles: { 0: { cellWidth: 36 }, 1: { cellWidth: 82 }, 2: { cellWidth: 26 }, 3: { cellWidth: 46 } },
      didDrawPage: () => {
        drawHeaderFooter(doc, pageW, margin);
        const page = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.text(`Seite ${page}`, pageW - margin, 287, { align: "right" });
      },
    });

    // Fotos
    let y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 6 : titleY + 16;
    const maxW = pageW - margin * 2; // mm
    const maxH = 90; // mm
    for (let i = 0; i < images.length; i++) {
      const src = images[i];
      try {
        const tmp = new Image();
        await new Promise((r) => {
          tmp.onload = r;
          tmp.src = src;
        });
        let wPx = tmp.width,
          hPx = tmp.height;
        const px2mm = 0.264583;
        let w = wPx * px2mm,
          h = hPx * px2mm;
        const ratio = Math.min(maxW / w, maxH / h, 1);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);

        if (y + h > 287) {
          doc.addPage();
          y = 20;
          drawHeaderFooter(doc, pageW, margin);
        }
        doc.setFontSize(11);
        doc.text(`Foto ${i + 1}`, margin, y);
        y += 4;
        doc.addImage(src, "JPEG", margin, y, w, h, undefined, "FAST");
        y += h + 8;
      } catch {}
    }

    const safeName = (form.project || "Projekt").replace(/[^\w-]+/g, "_");
    doc.save(`Begehung_${safeName}.pdf`);
  };

  /* ---------- Versand per EmailJS ---------- */
  const validate = () => {
    if (!form.project || !form.location || !form.inspector) {
      return "Bitte Projekt, Ort und Begehende Person ausfüllen.";
    }
    return null;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setMsg({ type: "error", text: err });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);
      const templateParams = {
        project: form.project,
        location: form.location,
        company: form.company,
        date: form.date,
        inspector: form.inspector,
        weather: form.weather,
        remarks: form.remarks,
        checklist_json: JSON.stringify(checklist),
        summary_html: buildSummaryHTML(),
        images_html: buildImagesHTML(),
      };
      await emailjs.send(
        EMAILJS_CONFIG.SERVICE_ID,
        EMAILJS_CONFIG.TEMPLATE_ID,
        templateParams
      );
      setMsg({ type: "ok", text: "E-Mail erfolgreich versendet." });
    } catch (error) {
      console.error(error);
      setMsg({ type: "error", text: "Senden fehlgeschlagen. Bitte Konfiguration prüfen." });
    } finally {
      setBusy(false);
    }
  };

  /* ===================== UI ===================== */
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">
            Baustellenbegehung – Variante A (EmailJS)
          </h1>
          <p className="text-gray-600 mt-1">
            Einfache Web-App zur Dokumentation mit PDF-Export & E-Mail ohne Backend.
          </p>
        </header>

        <form ref={formRef} onSubmit={onSubmit} className="space-y-6 bg-white p-4 rounded-2xl shadow">
          {/* Stammdaten */}
          <section className="grid md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-600">Projekt *</span>
              <input className="border rounded-xl p-2" value={form.project} onChange={onField("project")} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-600">Ort *</span>
              <input className="border rounded-xl p-2" value={form.location} onChange={onField("location")} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-600">Firma/AG</span>
              <input className="border rounded-xl p-2" value={form.company} onChange={onField("company")} />
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

          {/* Checkliste */}
          {CATEGORIES.map((cat) => (
            <section key={cat.key} className="bg-white rounded-xl border p-4">
              <h2 className="text-lg font-semibold mb-3">{cat.title}</h2>
              <div className="space-y-3">
                {cat.items.map((label, i) => {
                  const row = checklist?.[cat.key]?.[i] || { rating: "ok", note: "" };
                  return (
                    <div key={i} className="grid md:grid-cols-6 items-start gap-3 border-b pb-3">
                      <div className="md:col-span-3 font-medium">{label}</div>
                      <div className="flex gap-2 md:col-span-2">
                        {ratingOptions.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => updateChecklist(cat.key, i, { rating: opt.value })}
                            className={`px-3 py-2 rounded-xl border ${
                              row.rating === opt.value ? "bg-black text-white" : "bg-white"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <div className="md:col-span-1">
                        <input
                          className="w-full border rounded-xl p-2"
                          placeholder="Notiz"
                          value={row.note}
                          onChange={(e) => updateChecklist(cat.key, i, { note: e.target.value })}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          {/* Fotos */}
          <section className="bg-white rounded-xl border p-4">
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

          {/* Meldung + Aktionen */}
          {msg && (
            <div className={`p-3 rounded-xl ${msg.type === "ok" ? "bg-green-100" : "bg-red-100"}`}>
              {msg.text}
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-3 rounded-2xl bg-black text-white disabled:opacity-60"
            >
              {busy ? "Sende…" : "Begehung per E-Mail senden"}
            </button>
            <button type="button" onClick={onExportPDF} className="px-5 py-3 rounded-2xl border">
              PDF-Bericht speichern
            </button>
            <span className="text-gray-500 text-sm">E-Mail via EmailJS oder lokale PDF-Ablage.</span>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BaustellenbegehungEmailJS;
