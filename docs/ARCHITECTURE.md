# Architektur – HSE-Begehungsapp

**Stand: 23.10.2026 – geprüfte Pilotarchitektur, Zielarchitektur noch abzustimmen**

## Zweck und Benutzer

Web-App für HSE-Begehungen durch Führungskräfte auf Firmenhandy, Tablet und PC. Vier kombinierbare Prüfkataloge: Allgemein/Werkstatt, Mobilkran, Bau und Montage/Einbringung. Insgesamt 65 Prüfpunkte. Ratings OK, Mangel, Notiz sowie Notizen und punktbezogene Fotos. Kein allgemeines unzugeordnetes Foto-Upload-Feld mehr in der Pilotoberfläche.

## Technische Pilotarchitektur

```text
React / Vite im Browser
  |-- Checklisten, Bilder, Signatur
  |-- jsPDF / jspdf-autotable -> PDF-Download lokal (ohne Übermittlung)
  `-- HTTPS POST (URLSearchParams, PDF Base64 + strukturierte Daten)
         |
         v
    Google Apps Script Web-App (doPost)
      |-- MailApp: PDF-Bericht an HSE-Empfänger
      `-- Google Sheets: HSE_Begehungsregister
           |-- Begehungen (ein Datensatz je UUID)
           `-- Feststellungen (je Mangel / Hinweis, mit Begehungs-ID)
```

Beobachteter Integrationstest: E-Mail-Meldung grün; Google Sheet mit Begehung, 1 Mangel und 1 Notiz, jeweils zur Begehungs-ID zugeordnet; Spalte M `Versendet`. Keine Garantie für E-Mail-Zustellung oder vollständige Ausfallsicherheit.

## Datenmodell

**Begehungen (A–M):** Begehungs-ID (UUID), Datum, Gesellschaft, Standort, Projekt, Begehungsbereich, begehende Person, Prüfpunkte bewertet, Mängel, Hinweise, PDF-Dateiname, Erfasst am, E-Mail-Versandstatus.

**Feststellungen (A–O):** Feststellungs-ID, Begehungs-ID, Datum, Gesellschaft, Standort, Projekt, Begehungsbereich, Prüfpunkt-ID, Prüfkategorie, Prüfpunkt, Bewertung, Beschreibung/Notiz, Maßnahmenstatus, Verantwortlich, Fälligkeit.

Zu beachten: `Firma/AG` ist Auftragsgeber/Freitext und darf nicht automatisch mit der ausführenden Gesellschaft gleichgesetzt werden. Letztere wird im Pilot über die Logoauswahl abgeleitet – fachlich zu verifizieren.

## GitHub / Umgebungen

- Original-Repo `jofelbi66-rgb/baustellenbegehung-app`, `main` = Altversion und Live GitHub Pages.
- `jofelbi66-rgb-patch-1` = getestete Pilotänderungen, Build über `.github/workflows/build-test.yml` (ohne Deploy).
- `.github/workflows/deploy.yml` = GitHub Pages Veröffentlichung bei Push auf `main`; nicht auf dem Test-Branch manuell mit Deployment starten.
- Zusätzliche Repository-Anlage `baustellenbegehung-test` derzeit nicht als Quellcode-Ziel verwenden.
- `node_modules/`, `dist/`, `package-lock.json` können im Codespace als untracked erscheinen. Nur gezielt gewünschte Dateien committen; Build-Artefakte nicht pauschal versionieren.
- Apps Script: bisherige produktive URL und neu eingerichtete Pilotbereitstellung sind verschieden. Konfiguration explizit je Umgebung validieren. Keine URLs, Tokens oder sonstigen Geheimnisse in öffentliche Übergabedokumentation aufnehmen.

## Betrieb und Sicherheit

Die aktuelle Pilotbereitstellung ist öffentlich erreichbar, die Google-Sheet-Daten liegen in einem privaten Google-Kontext. Das ist **keine empfohlene Dauerlösung für reale Betriebsdaten**. Kein Frontend-Token als alleinige Authentisierung verwenden. Backend-seitige Identitäts-/Raten-/Eingabeprüfung, Ereignisprotokoll, verlässliche Wiederholbarkeit von Versand und Registerverarbeitung sowie Datenschutzkonzept vor Firmenfreigabe klären.

## Zielarchitektur (noch kein Implementierungsstand)

Firmenverwaltetes Web-Hosting + Microsoft Entra ID für Führungskräfte; serverseitige API/Automation; SharePoint Lists für Begehungen/Feststellungen, SharePoint-Dokumentbibliothek für PDFs; optional Power BI / Power Query; Firmenlaufwerk als ergänzendes Archiv nach IT-Vorgabe. Technisches Berechtigungs-, Lizenzierungs- und Aufbewahrungskonzept entscheidet die Firmen-IT.

## Freigabegates

1. Finalen Testbranch-Commit referenzieren und Build grün.
2. Eindeutige Backend-Adresse, Rechte und Datenschutz freigeben.
3. Testfälle PDF, Bild, Signatur, Mail, Register, Duplikate und Teilfehler dokumentieren.
4. Neue Zielumgebung sichern, Umstellungsstichtag und Verantwortlichkeiten bestimmen.
5. `main` erst nach Freigabe aktualisieren; Rückrollplan dokumentieren.
