# IT-Übergabe / Aufgabenabgrenzung – HSE-Begehungsapp

**Datum:** 23.10.2026  
**Status:** Pilottest technisch erfolgreich; keine Freigabe für unbeschränkten Firmenbetrieb.

## Ausgangspunkt

- React/Vite-App aus privatem GitHub; produktive Altversion auf `main`.
- Getestete Weiterentwicklung im Branch `jofelbi66-rgb-patch-1`.
- Datenübertragung via Google Apps Script in privates Google Sheets; PDF per MailApp. Testbereitstellung separat.
- Vorgesehen: Bedienung durch Führungskräfte mit Firmenhandys und bestehender Microsoft-365-Anmeldung.

## IT-Entscheidungen

1. Firmenverwaltetes Hosting für React-App bestimmen und technischen Betreiber benennen.
2. Anmeldung mit Microsoft Entra ID (idealerweise SSO) sowie autorisierte Gruppe von Führungskräften definieren.
3. Backend-Schnittstelle für kontrollierte Datenerfassung und Versand wählen; eine öffentliche Apps-Script-URL ohne echten serverseitigen Schutz nicht unverändert übernehmen.
4. Zwei Datenbestände `Begehungen` und `Feststellungen` unternehmensseitig verwalten und per UUID verknüpfen.
5. PDF-Berichte in berechtigter SharePoint-Dokumentbibliothek sichern; Versand, Nachvollziehbarkeit und Fehlerfall festlegen.
6. DSGVO-/Betriebsanforderungen prüfen: Fotos, Personendaten, Speicherdauer, Zugriff, Protokollierung, Backup, Wiederherstellung.
7. Historische Berichte vor dem Migrationsstichtag und Testdatensätze separat behandeln.

## Nachweis und offene Prüfpunkte

Pilot funktional getestet: Mehrfachauswahl, Mangel/Hinweis, point-of-inspection Foto, Unterschrift, PDF-Download, Mailversand, Sheets-Einträge. Nicht belegt: Lasttest, sichere Mehrbenutzer-Autorisierung, Datenschutzfreigabe, Ausfallsicherheit/Exactly-once-Versand, produktive M365-Integration.

## Übernahmeprotokoll (auszufüllen)

- Freigegebener Commit SHA: __________________
- Quellcode-Eigentümer / Firmenorganisation: __________________
- Web-App-Hosting/URL: __________________
- API/Backend-Verantwortliche: __________________
- Datenverantwortliche HSE: __________________
- Abnahmedatum, Prüfer und Freigabe: __________________
- Stichtag und Rückrollverfahren: __________________

**Keine Zugangstoken, Script-Properties oder personengebundenen Credentials in diesen Dateien ablegen.**
