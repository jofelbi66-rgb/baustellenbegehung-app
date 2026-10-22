# Architektur – Baustellenbegehung-App

Stand: 22.10.2026

## 1. Projektübersicht

Die Baustellenbegehung-App dient der digitalen Durchführung und Dokumentation von HSE-Begehungen.

Die Anwendung ermöglicht die Erfassung von Stammdaten, Bewertungen, Notizen, Fotos und Unterschriften. Die Ergebnisse werden in einem PDF-Bericht zusammengefasst und können per E-Mail versendet werden.

Die Anwendung ist als React-/Vite-Projekt umgesetzt und wird über GitHub Pages bereitgestellt.

## 2. Begehungsbereiche und Checklistenlogik

Die App unterstützt vier Begehungsbereiche:

- Allgemein / Werkstatt
- Mobilkran
- Bau
- Montage / Einbringung

Die Bereiche können einzeln oder kombiniert ausgewählt werden (Mehrfachauswahl).

Die Checklisten bestehen aus 37 allgemeinen Prüfpunkten und zusätzlichen fachbezogenen Prüfpunkten:

- Mobilkran: 6 zusätzliche Prüfpunkte
- Bau: 12 zusätzliche Prüfpunkte
- Montage / Einbringung: 10 zusätzliche Prüfpunkte

Insgesamt sind 65 unterschiedliche Prüfpunkte verfügbar. Die allgemeinen Prüfpunkte werden unabhängig von der Auswahl nur einmal eingebunden.

Die sichtbaren Prüfpunkte werden in `VISIBLE_CATEGORIES` anhand der Zustandsvariable `inspectionAreas` zusammengestellt. Bereits erfasste Bewertungen und Notizen bleiben beim Abwählen und erneuten Auswählen eines Bereichs erhalten.

## 3. PDF-Erstellung und E-Mail-Versand

Die Anwendung erzeugt PDF-Begehungsberichte mit folgenden Inhalten:

- Projekt- und Begehungsdaten einschließlich ausgewählter Begehungsbereiche
- Bewertete Prüfpunkte mit Bewertungen und Notizen
- Unterschrift unterhalb der Checkliste
- Fotodokumentation auf separaten PDF-Seiten
- Seitenzahlen und Firmenlogo

Für die PDF-Erstellung werden jsPDF und AutoTable verwendet.

Längere Prüfpunktbeschreibungen auf den Fotoseiten werden automatisch auf mehrere Zeilen umgebrochen.

Beim E-Mail-Versand wird der PDF-Bericht über die React-Funktion `sendPdfToMail` erzeugt. Die Daten werden an ein Google Apps Script übertragen, das die E-Mail mit dem PDF-Anhang versendet.

E-Mail-Betreff, Nachrichtentext und PDF-Dateiname enthalten die ausgewählten Begehungsbereiche. Eine kombinierte Begehung wird in einem einzigen PDF-Bericht dokumentiert.

## 4. Bereitstellung und Versionsverwaltung

Der Quellcode der Anwendung wird im GitHub-Repository `jofelbi66-rgb/baustellenbegehung-app` verwaltet.

- Hauptbranch: `main`
- Sicherheitskopie vor Einführung der Mehrfachauswahl: `backup-vor-mehrfachauswahl`
- Entwicklungsumgebung: React und Vite
- Hosting: GitHub Pages
- Automatisierte Veröffentlichung: GitHub Actions (`deploy.yml`)

Änderungen am Hauptbranch lösen den Build und das Deployment über GitHub Actions aus. Nach erfolgreicher Veröffentlichung steht die aktualisierte Anwendung über GitHub Pages zur Verfügung.

Vor größeren funktionalen Änderungen wird ein Sicherungsbranch erstellt. Neue Funktionen werden nach dem Deployment anhand praktischer Begehungsberichte getestet.

## 5. Technische Besonderheiten und Wartung

- Die zentralen React-Funktionen befinden sich in `src/Baustellenbegehung.jsx`.
- Die Checklisten werden derzeit direkt im Quellcode definiert.
- Der Import externer Excel-/CSV-Checklisten ist vorbereitet, aber noch nicht implementiert.
- Die PDF-Erstellung enthält mehrere historisch entstandene Foto- und Ausgabefunktionen. Vor einer Bereinigung müssen die tatsächlich verwendeten Funktionsaufrufe geprüft werden.
- Bei Änderungen an der Fotoausgabe müssen Textumbruch, Bildproportionen und Seitenumbrüche gemeinsam getestet werden.
- Der E-Mail-Versand erfolgt über Google Apps Script. Änderungen am Apps Script erfordern eine Aktualisierung der Web-App-Bereitstellung.
- Bekannte offene Aufgaben werden in `docs/todos/backlog.md` gepflegt.
- Der aktuelle Entwicklungsstand wird in `docs/status/current.md` dokumentiert.
