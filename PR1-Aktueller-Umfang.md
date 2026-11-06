## Problem und Verhalten

Vor dem Absenden lagen Begehungsdaten überwiegend nur im Arbeitsspeicher. Neuladen oder Schließen konnte sie verlieren. Die App speichert jetzt den vollständigen Entwurf lokal in IndexedDB und stellt ihn vor der Bearbeitung wieder her. Der bisherige PDF-Bericht und der vorhandene PDF-Maildienst bleiben erhalten.

- Formular, Bewertungen, Notizen, Prüfpunkt-Fotos und persönliche Unterschrift werden gesichert. Die Unterschrift bleibt auf ausdrücklichen Benutzerwunsch auch bei einer neuen Begehung erhalten, bis sie gelöscht oder ersetzt wird.
- „Neue Begehung“ fragt nach, archiviert den bisherigen Stand und leert projektbezogene Daten. Der allgemeine Foto-Upload bleibt entfernt; Prüfpunkt-Fotos bleiben im Bericht.
- Test- und offizieller App-Pfad verwenden getrennte Speicherbereiche, auch auf demselben GitHub-Pages-Host. Bestehende Testentwürfe und Archive bleiben erhalten. Die bisherige persönliche Unterschrift des offiziellen App-Pfads wird übernommen.
- Vor dem Netzwerkaufruf wird die konkrete PDF-Mail-Anfrage gespeichert. Ein Speicherfehler verhindert den Aufruf. Erfolgreich bestätigte Entwürfe werden schreibgeschützt und nicht erneut abgesendet.
- Das bisherige Mail-Script hat keinen Dublettenschutz. Bei unklarem Ausgang gibt es deshalb keinen automatischen oder direkten Wiederholversand. Ein manueller lokaler Abschluss nach Klärung verschickt nichts und gibt denselben Entwurf nicht wieder zum Senden frei.

Ein produktives Google-Begehungsregister ist ausdrücklich nicht Teil dieser Änderung. Der Mailaufruf enthält exakt die bisherigen elf Felder; keine Register-/Mängeldatenübertragung. Das vorhandene Apps Script bleibt unverändert.

## Validierung

Produktionsbuild erfolgreich. Neun Datenbank-/Migrations-/Konfigurationsprüfungen und drei Transport-/Zielprüfungen bestanden. PDF-Anweisungen, Fotolayout, Tabellen-, Logo-, Datums-/Fußzeilenhilfen und alle Kataloge entsprechen nach normalisiertem Syntaxvergleich dem bisherigen produktiven main-Stand 5f59c82. Kein neues PDF-Layout.

Browserprüfungen bestanden: vollständige Entwurfswiederherstellung, Fotos, sichtbare Signatur mit Maus und simuliertem Touch, Archivierung, persönliche Unterschrift, Speicherfehler, konkurrierende Tabs, unveränderter Mailvertrag, verlorene Antwort ohne Retry, fehlgeschlagene lokale Versandbestätigung, manueller Abschluss ohne Mail, ältere Testdaten und getrennte Speicher/Voreinstellungen auf demselben Host. Alle Mailanfragen abgefangen oder simuliert; keine echte Mail, keine Google-Datenänderung.

Noch offen: diesen finalen kleineren Stand am echten iPhone nachtesten, PDF visuell prüfen und einen echten Mailtest gegebenenfalls gesondert freigeben. Lokale Speicherung ist kein Cloud-Backup und der Client-Schutz keine systemweite Exactly-once-Garantie.

Details: docs/decisions/2026-11-06_mail-entwurf.md. Kein Merge und kein produktives Deployment ausgeführt.
