# ADR: Mehrere Checklisten je Firma (Logo-Auswahl)

- Datum: 2026-01-23
- Status: vorgeschlagen

## Kontext
Die App wird perspektivisch für mehrere Firmen/Standorte genutzt. Die Kernlogik (Fotos, PDF-Report, Unterschrift, E-Mail-Versand)
soll stabil bleiben. Die Firmen unterscheiden sich primär in den Checklisten (Kategorien/Prüfpunkte und ggf. Bewertungssystem),
nicht zwingend im gesamten Workflow.

Aus dem Projektverlauf ist klar: Forks/duplizierte Codepfade erhöhen das Risiko von Instabilität (Buildfehler, doppelte Funktionen,
PDF-Elemente verschwinden, Regressionen).

## Entscheidung
Wir streben an:
- Eine gemeinsame App-Codebasis (ein Repo, ein Deployment)
- Firmen-/Logo-Auswahl steuert die geladene Checkliste (datengetrieben)
- Checklisten werden als Datenfiles (Excel/CSV als Quelle → JSON/CSV im Repo oder im `public/`) verwaltet
- Der bestehende UI/PDF-Flow bleibt unverändert, indem die geladenen Daten in das bestehende `CATEGORIES`-Format überführt werden
  (minimal-invasiver Import).

## Alternativen
1) Mehrere Apps (Fork pro Firma)
- Vorteil: maximale Trennung, einfaches Branding
- Nachteil: hoher Pflegeaufwand, Bugfixes müssen mehrfach ausgerollt werden, Drift-Risiko

2) PDF-Checkliste direkt als Datenquelle (Live-Parsing)
- Vorteil: Firmen liefern PDF, keine strukturierte Pflege
- Nachteil: fehleranfällig (Layout/OCR), hoher technischer Aufwand, instabil im Browser

3) Gemeinsame App, aber harte Code-Ifs je Firma
- Vorteil: schnell „zusammengeklickt“
- Nachteil: wird unübersichtlich, regressionsanfällig, schwer testbar

## Konsequenzen
### Positiv
- Ein Bugfix (z. B. PDF/Foto/Signatur) gilt für alle Firmen.
- Checklistenpflege wird zu einem Datenproblem (Excel/CSV), nicht zu Codeänderungen.
- Skalierung auf neue Firmen mit geringem Risiko.

### Negativ
- Wir benötigen ein eindeutiges Checklisten-Schema (Pflichtfelder, IDs).
- Für stabile Zuordnung ist mittelfristig eine `item_id`-Strategie nötig (Index-basierte Zuordnung ist fragil).
- Governance nötig: Freigabe/Versionierung von Checklisten.

## Umsetzung / Notizen
- Checklisten-Lieferformat: bevorzugt Excel/CSV nach Template.
- Import-Strategie Phase 1: CSV/JSON laden → zur Laufzeit `CATEGORIES` erzeugen (keine Umstellung des State-Modells nötig).
- Import-Strategie Phase 2 (optional): Ergebnisse `item_id`-basiert speichern (Migration der State-Struktur).
- Ablage der Checklisten-Daten: `docs/checklists/` (Schema/Beispiele) und später `public/checklists/` oder `src/checklists/`.
