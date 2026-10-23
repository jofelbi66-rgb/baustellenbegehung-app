# Projektstatus – Baustellenbegehung-App

**Stand: 23.10.2026** · **Status: technisch getestete Pilotversion, keine firmenweite Freigabe**

## 1. Versionen und Ablage

- Repository: `jofelbi66-rgb/baustellenbegehung-app`
- Produktiver Branch: `main`. Bisherige GitHub-Pages-App ist weiterhin im Einsatz und versendet PDFs; **über diese Altversion erfasste Begehungen werden noch nicht automatisch im Register dokumentiert**.
- Getesteter Entwicklungsbranch: `jofelbi66-rgb-patch-1`. GitHub Actions Build-Test wurde am 23.10.2026 als erfolgreich bestätigt; Code wurde aus Codespaces committet und gepusht.
- Pilot-App wurde im GitHub Codespace via Vite auf Port 5173 getestet. Codespace-Port ist **keine dauerhafte Produktivadresse**.
- Das angelegte zusätzliche Repository `baustellenbegehung-test` ist nicht die führende Codebasis. Keine Änderungen daran für die Freigabe erforderlich.
- Google Apps Script: gesonderte Test-Web-App-Bereitstellung, altes produktives Deployment unverändert. **URL und Bereitstellung vor Freigabe eindeutig zuordnen; keine Test-URL in ein produktives Release übernehmen.**

## 2. Funktionsumfang und beobachtete Tests

- Vier Begehungsbereiche: Allgemein/Werkstatt, Mobilkran, Bau, Montage/Einbringung; Mehrfachauswahl.
- 65 unterschiedliche Prüfpunkte (37 allgemein, 6 Mobilkran, 12 Bau, 10 Montage).
- Bewertungen: OK, Mangel, Notiz; Bemerkungen und Fotos direkt an Prüfpunkten.
- Separate, nicht zugeordnete Foto-Upload-Fläche im unteren Formularbereich aus der Pilotversion entfernt.
- Button „Neue Begehung“ setzt Begehungs-ID, Eingaben, Checkliste, Fotos und Unterschrift zurück; Begehenden-Namen beibehalten.
- PDF-Download ohne Versand; PDF mit Unterschrift und Fotos aus zugeordneten Prüfpunkten.
- PDF-Versand per E-Mail über Apps Script sowie automatische Speicherung in Google Sheets.
- Praktische Prüfung am 23.10.2026: Vite-Start und Build grün; neue Begehung zurücksetzen erfolgreich; PDF mit Mangel und Unterschrift lesbar; Prüfpunkt-Foto im PDF; E-Mail mit PDF erfolgreich gemeldet; 1 Testbegehung mit 2 Bewertungen (1 Mangel/1 Notiz) und beide Feststellungen im Register nachgewiesen; Status „Versendet“ angezeigt.
- **Nicht als geprüft behaupten:** Lasttest, unabhängiger Security-Test, echte Zustellung aller E-Mails, Wiederherstellung, parallele gleichzeitige API-Aufrufe, Microsoft-365-Migration.

## 3. Register und bestehende Daten

Google Sheet `HSE_Begehungsregister` mit Tabellenblättern:

1. **Begehungen**: A Begehungs-ID, B Datum, C Gesellschaft, D Standort, E Projekt, F Begehungsbereich, G begehende Person, H Prüfpunkte bewertet, I Mängel, J Hinweise, K PDF-Dateiname, L Erfasst am, M E-Mail-Versandstatus.
2. **Feststellungen**: A Feststellungs-ID, B Begehungs-ID, C Datum, D Gesellschaft, E Standort, F Projekt, G Begehungsbereich, H Prüfpunkt-ID, I Prüfkategorie, J Prüfpunkt, K Bewertung, L Beschreibung/Notiz, M Maßnahmenstatus, N Verantwortlich, O Maßnahme fällig am.

Die Begehungs-ID ist derzeit eine UUID und die technische Verknüpfung. Firma/AG im Formular ist **nicht** notwendigerweise die ausführende Felbermayr-Gesellschaft. Für die Gesellschaftszuordnung wird derzeit die Logoauswahl genutzt; dies vor endgültiger KPI-Freigabe fachlich validieren.

Testdatensätze wie `TEST-AUTO-0001`, `TEST-AUTO-0002` und `TEST HSE REGISTER` von späteren KPI-Auswertungen ausnehmen bzw. nach dokumentierter Freigabe bereinigen. Die bislang über `main` gesendeten Berichte fehlen im Register; Stichtag für Vollständigkeit festlegen.

## 4. Offene Punkte vor firmenweiter Freigabe

- Zugriffsschutz: Der aktuelle Apps-Script-Endpunkt ist von außen erreichbar; im gezeigten privaten Script-Projekt ist kein `TOKEN` hinterlegt. Ein Token im öffentlichen React-Frontend wäre ohnehin kein ausreichendes Geheimnis. Vor Verarbeitung weiterer echter Betriebsdaten sichere, firmenverwaltete Schnittstelle abstimmen.
- Ausführende Gesellschaft und Firma/AG fachlich trennen; Firmenlogo allein nicht unbesehen als rechtliche Entität auswerten.
- Verbindliche Zuordnung von Test- und Produktiv-Apps-Script-URLs; keine doppelte Bereitstellung versehentlich aktivieren.
- Mail-/Registerzustände einschließlich Wiederholung bei Teilfehlern und Parallelversand robust überprüfen; MailApp-Erfolg bedeutet keine garantierte Zustellung.
- Datenschutz: Mitarbeitendennamen, Fotos und Projektdaten; Zweck, Aufbewahrungsfristen, Berechtigungen, Datenablage und Löschung.
- Firmen-IT: künftiger Betrieb über Microsoft-365-Unternehmenskonten, SharePoint/Lists, Dokumentbibliothek und geeignete serverseitige API; Lizenz-/Berechtigungsprüfung.
- Quellcodepflege: alte, möglicherweise ungenutzte PDF-/Bildfunktionen in späterer separater Bereinigung prüfen. Diese nicht vor Pilotabnahme ungetestet entfernen.
- Standardtest auf Smartphone mit Fotoaufnahme, Mehrfachauswahl, PDF, Mail, Register und erneutem Versand durchführen.

## 5. Freigaberegel

`main` und die vorhandene produktive Apps-Script-Web-App **nicht** durch reine Dokumentationsänderungen berühren. Nach Freigabe: Pilotbranch überprüfen, finalen Build, geprüfte Backend-Bereitstellung und IT-/Datenschutzentscheidung dokumentieren, Testdatensätze trennen, Umstellungsstichtag kommunizieren.
