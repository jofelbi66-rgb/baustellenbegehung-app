# Backlog / ToDos

## Offen

- [ ] Firmenspezifische Checklisten und Logo-Zuordnung prüfen (vier Begehungsbereiche und Mehrfachauswahl bereits umgesetzt)
- [ ] Excel-/CSV-Import für Checklisten entwickeln (Schema vorbereitet; Importfunktion noch nicht umgesetzt)
- [ ] PDF-Checklisten als fachliche Referenz verwenden; automatischen PDF-Import vorerst nicht vorsehen
- [ ] PDF-Fotolayout: Darstellung von zwei Fotos nebeneinander und Seitenumbrüche bei umfangreichen Fotoberichten bei Bedarf prüfen (aktueller Test mit drei Fotos erfolgreich)
- [ ] Kamera und Foto-Upload auf unterschiedlichen Geräten weiter testen; gelegentliche Aufnahme- und Decodierungsfehler beobachten und bei erneutem Auftreten untersuchen

## In Arbeit

- [ ] —

## Erledigt

- [x] Unterschrift im PDF unter der Checkliste platzieren
- [x] Foto-Seiten nach Unterschrift wieder korrekt generieren
- [x] Verzerrung der Fotos behoben (kein Stretch)
- [x] Vier Begehungsbereiche eingerichtet: Allgemein / Werkstatt, Mobilkran, Bau, Montage / Einbringung
- [x] Insgesamt 65 unterschiedliche Prüfpunkte integriert
- [x] Mehrfachauswahl der Begehungsbereiche umgesetzt und getestet
- [x] Begehungsbereiche in PDF, E-Mail-Betreff und Dateinamen integriert
- [x] Automatischen Zeilenumbruch für Prüfpunktbeschreibungen auf PDF-Fotoseiten umgesetzt
- [ ] 
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

