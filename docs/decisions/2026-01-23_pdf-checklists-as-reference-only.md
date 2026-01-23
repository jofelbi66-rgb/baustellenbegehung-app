# ADR: PDF-Checklisten werden als Referenz genutzt, nicht als Live-Datenquelle

- Datum: 2026-01-23
- Status: vorgeschlagen

## Kontext
Firmen liefern Checklisten häufig als PDF. Die App soll jedoch interaktiv arbeiten:
Bewertungen, Notizen, Fotos je Prüfpunkteintrag sowie automatisierte PDF-Reports.
Eine PDF ist primär ein Layout-Dokument und kein zuverlässiges Datenformat.

Aus dem Projektverlauf ist zudem bekannt, dass technische Komplexität im Browser (Parsing/OCR/Tabelleninterpretation)
die Stabilität gefährden kann.

## Entscheidung
- PDF-Checklisten dienen als **Referenz/Beleg** (Anzeige/Download/Anhang), nicht als primäre Datenquelle.
- Die interaktive Checkliste in der App basiert auf **strukturierten Daten** (Excel/CSV → JSON/CSV), die in ein festes Schema passen.
- Ein möglicher PDF→Daten-Import (OCR/Parsing) ist optional und wird nur als einmaliger Migrationsschritt betrachtet, nicht als Laufzeitfunktion.

## Alternativen
1) PDF live parsen (OCR/Tabellenanalyse im Browser)
- Vorteil: Firmen liefern nur PDF, keine zusätzliche Pflege
- Nachteil: fehleranfällig (Layoutvarianten, Scans), hoher Aufwand, instabil

2) Mehrere manuelle Checklisten im Code
- Vorteil: schnell
- Nachteil: Wartungsaufwand, Risiko für Regressionen, nicht skalierbar

## Konsequenzen
### Positiv
- Stabiler Betrieb, weniger technische Fehlerquellen.
- Einheitliche Pflege über Excel/CSV.
- Änderungen an PDFs beeinflussen nicht automatisch die App-Funktion.

### Negativ
- Checklisten müssen strukturiert geliefert oder einmalig strukturiert übertragen werden.
- Prozess/Verantwortung für Checklistenpflege muss intern geklärt werden.

## Umsetzung / Notizen
- Lieferformat bevorzugt: Excel/CSV nach Template (Schema in `docs/checklists/`).
- PDFs können zusätzlich im Projekt abgelegt werden (z. B. `docs/checklists/pdfs/`), aber ohne Parsing-Abhängigkeit.
