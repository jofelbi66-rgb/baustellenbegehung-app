# Backlog / ToDos

## Offen

- [ ] Mehrere Checklisten je Firma/Logo-Auswahl (Konzept + Umsetzung)
- [ ] Checklisten-Import per Excel/CSV (Schema vorhanden)
- [ ] Klärung: PDF-Checklisten nur als Referenz oder automatischer Import?
- [ ] Foto-Layout im PDF final abstimmen (aktuell ok, keine weiteren Experimente)
- [ ] Fehler/Edge-Cases: Kamera/Upload robust halten (Decode/404-Themen beobachten)

## In Arbeit

- [ ] —

## Erledigt

- [x] Unterschrift im PDF unter der Checkliste platzieren
- [x] Foto-Seiten nach Unterschrift wieder korrekt generieren
- [x] Verzerrung der Fotos behoben (kein Stretch)
# Backlog / ToDo

## A) Checklisten-Strategie (firmenspezifisch)
- [ ] Entscheidung treffen: 
  - Option 1: Eine App, lädt Checkliste dynamisch nach Logo/Firma
  - Option 2: Mehrere Apps (gleiches Grundgerüst, je Firma eigene Checkliste)
- [ ] Datenformat finalisieren: Excel/CSV-Import (Template vorhanden)
- [ ] Mapping-Regeln definieren:
  - company + site → Auswahl/Filter
  - category + item_id/item_text → Darstellung in UI
  - rating_options → OK|Mangel|n.a. etc.
  - photo_required / note_required_on_defect → Validierungslogik

## B) Import-Pipeline
- [ ] CSV/Excel Upload/Import-Screen (Admin/Setup) oder statische Ablage im Repo
- [ ] Validierung: fehlende Pflichtfelder, Duplikate item_id, ungültige rating_options
- [ ] Versionierung: Checklisten-Version + Datum (Change-Log)

## C) PDF-Output (später)
- [ ] Optional: Foto-Titel/Untertitel/Notiz je Foto verknüpfen
- [ ] Optional: Bildqualität/Kompression feinjustieren (Dateigrößen vs. Lesbarkeit)
- [ ] Optional: Seitenkopf/-fuß konsistent für Foto-Seiten

## D) Technisches Debt / Hygiene
- [ ] Sicherstellen, dass jede Funktion nur einmal definiert ist (kein *_OLD im produktiven Pfad)
- [ ] Lint/CI Check: Build muss sauber durchlaufen

