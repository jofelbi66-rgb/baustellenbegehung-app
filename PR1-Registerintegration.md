# Entwurfssicherung mit bestehendem Google-Register verbinden

Die bisherige Alt-main-Basis enthielt die Registerfelder des Piloten nicht. Der Entwicklungszweig integriert nun Pilotstand 394a6a0 mit der lokalen Entwurfssicherung. Der bewährte PDF-Bericht und PDF-Download bleiben bytegleich mit dem Pilotstand.

- Dauerhafte Begehungs-ID im lokalen Entwurf; neue ID erst bei neuer Begehung.
- Vollständiger Pilot-Payload einschließlich Feststellungen, Bewertungszahl und Gesellschaft.
- Vollständigen Auftrag samt PDF und Zieladresse vor Netzwerkaufruf sichern; Wiederholung mit identischen Daten und derselben ID.
- Nach bestätigtem Versand schreibgeschützt; unklarer Status bleibt gesperrt und erfordert Registerprüfung.
- Ältere lokale Entwürfe ohne bekannte ID bleiben erhalten, werden einmalig migriert und benötigen eine ausdrückliche Prüfung der Versandhistorie.
- Persönliche Unterschrift bleibt erhalten; allgemeiner Foto-Upload bleibt entfernt.

Validierung: Produktionsbuild, sechs Datenbank-/Migrationsprüfungen, zwei Transportprüfungen, sieben Register-Browserszenarien und bestehende Entwurfs-, Signatur- und Speicherfehler-Regressionsprüfungen bestanden. Google-Anfragen sämtlich simuliert/abgefangen; kein echter Versand.

Vor Freigabe: tatsächlich eingesetzte Apps-Script-Bereitstellung eindeutig bestätigen, freigegebenen echten Integrationstest durchführen und neue Abläufe auf echtem iPhone prüfen. Details: docs/decisions/2026-11-06_registerintegration.md. Kein Merge oder produktives Deployment ausgeführt.
