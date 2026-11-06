# Entwurfssicherung und Google-Begehungsregister

> **Historischer Zwischenstand:** Der Benutzer hat den Umfang auf lokale Sicherung und den bisherigen PDF-Mailversand ohne produktives Google-Register begrenzt. Maßgeblich ist [der aktuelle Mail-/Entwurfsstand](2026-11-06_mail-entwurf.md). Frühere Register- und Wiederholversandpläne gelten nicht mehr.

Stand: 06.11.2026. Entwicklungszweig `feature/indexeddb-entwurfssicherung`; keine Zusammenführung und keine produktive Veröffentlichung.

## Verbindliche Basis

Die Register-Anbindung und der bewährte PDF-Bericht stammen aus `jofelbi66-rgb-patch-1`, Commit `394a6a09fb1ac800aee176bbd57dca44953b0f5f`. Der bisherige Sicherungszweig basierte auf dem älteren `main`, der die Pilot-Registerfelder noch nicht enthält. Dieser Unterschied ist nun in der App integriert. Die Pilotfunktionen `createReportPdf`, `downloadPdf`, `buildFeststellungen` und `countBewertetePruefpunkte` wurden byteweise mit diesem Pilotstand verglichen: unverändert. Kein neues PDF-Layout.

Die bereits getestete persönliche Unterschrift bleibt bei „Neue Begehung“ erhalten; bewusstes Löschen und Ersetzen bleiben möglich. Der allgemeine Foto-Upload bleibt entfernt. Fotos an Prüfpunkten und deren PDF-Ausgabe bleiben erhalten.

## Identität und Speicherung

Das Entwurfsformat hat Version 2 und enthält eine dauerhafte `begehungsId` sowie `dispatch` mit dem Versandstatus. Beim Wiederöffnen wird dieselbe ID wiederhergestellt. Eine neue ID wird für einen neuen, noch nicht vorhandenen Entwurf oder ausdrücklich bei „Neue Begehung“ erzeugt. Archivierung und neue aktive Begehung bleiben atomar und durch die vorhandene Revisionsprüfung vor konkurrierenden Tabs geschützt.

Ältere Version-1-Entwürfe enthalten keine verlässliche Register-ID. Sie werden nach erfolgreichem Lesen und Validieren mit unveränderten Eingaben, Fotos und Unterschrift in derselben Datenbank auf Version 2 überführt; die Revision wird atomar geprüft. Der Status lautet zunächst `unverified`. Ein erneutes Öffnen erzeugt keine weitere ID. Der Versand bleibt gesperrt, bis der Benutzer nach Prüfung des Registers ausdrücklich bestätigt, dass der Altentwurf noch nicht versendet wurde. Der alte Versandverlauf oder eine frühere flüchtige Pilot-ID kann aus diesen Daten nicht rekonstruiert werden. Bestätigung oder eine neue Begehung dürfen nicht als Ersatz für diese Prüfung verwendet werden.

## Versandzustände

- `draft`: bearbeitbarer, noch nicht abgeschlossener Entwurf.
- `unverified`: Altentwurf ohne bekannten Versandverlauf; Versand nach expliziter Bestätigung möglich.
- `pending`: vorbereitet; Ergebnis kann noch offen oder unklar sein. Eingaben und „Neue Begehung“ sind gesperrt.
- `sent`: Serverantwort exakt `OK` nach Trimmen empfangen und lokal gesichert. Der Bericht ist schreibgeschützt. Für weitere Begehungen „Neue Begehung“ verwenden.

Vor dem ersten Netzwerkaufruf wird die vollständige konkrete Anfrage inklusive PDF-Base64, Begehungs-ID, Feststellungen, bewerteten Prüfpunkten, Gesellschaft, übrigen Pilotfeldern und ursprünglicher Backend-Adresse als `pending` gespeichert. Erst nach Transaktionsabschluss wird die Anfrage gesendet. Ein Speicherfehler verhindert den Netzwerkaufruf. Der zusätzliche PDF-Speicherbedarf kann deshalb bei großen Berichten zu einer sichtbaren Speichergrenze führen; die bisherigen Daten werden nicht gelöscht.

Ein erneuter Versuch erfolgt ausschließlich auf ausdrückliche Benutzeraktion. Er verwendet dieselbe gespeicherte Adresse und exakt dieselben Felder und PDF-Bytes. Das erneute lokale Speichern prüft vor dem Netzwerkaufruf die Revision, damit ein veralteter Tab nicht senden kann. Die Eingaben bleiben während des unklaren Zustands unverändert. Eine geänderte Zielkonfiguration lenkt einen bereits vorbereiteten Versuch nicht in ein anderes Register um: Weicht die gespeicherte Zieladresse vom ausdrücklich konfigurierten Ziel ab, bleibt der Auftrag erhalten, aber der Wiederholknopf gesperrt. Zuerst muss die Bereitstellung zugeordnet werden.

Der Transport akzeptiert nur HTTP-Erfolg plus Text `OK`. HTML-Seiten, andere Antworttexte und Fehler werden nicht als Erfolg interpretiert. Nach 60 Sekunden wird das Warten auf die HTTP-Anfrage beendet; dies ist KEIN Abbruch oder Rückgängigmachen einer möglicherweise laufenden Google-Verarbeitung. Der Status bleibt dann `pending`. Keine automatischen Wiederholungen.

Ist die Google-Antwort erfolgreich, aber die lokale Bestätigung scheitert, bleibt auf dem Datenträger der vorbereitete Versuch erhalten. Die Oberfläche weist auf die lokal fehlende Bestätigung hin. Nach Neuladen ist ein unveränderter Versuch unter derselben ID möglich; das gezeigte Apps Script gibt bei bereits versendeter ID `OK` zurück, ohne erneut zu senden. Es wird kein neuer Entwurf und keine neue ID erzeugt, um einen unklaren Versand zu umgehen.

PDF-Download ohne Versand bleibt verfügbar, auch für schreibgeschützte Begehungen. Das ist dieselbe Pilot-PDF-Erzeugung. Die für einen Versand vorbereiteten PDF-Bytes bleiben für Wiederholungen unverändert gespeichert.

## Zusammenspiel mit dem vom Benutzer gelieferten Apps Script

Der gelieferte Code verlangt `begehungsId`, `feststellungen`, `anzahlBewertet` und die übrigen Pilotfelder. Unter einem ScriptLock prüft er den Registerstatus. `Versendet` führt bei gleicher ID zu `OK` ohne erneute Mail. `Versand läuft` oder `Prüfung erforderlich` blockieren einen neuen Mailaufruf. Bei einer neuen ID handelt es sich für den Server um eine neue Begehung. `OK` bestätigt den MailApp-Aufruf bzw. einen früheren Abschluss, nicht die tatsächliche Zustellung beim Empfänger.

Lokale Simulationen des gelieferten Scripts mit ausschließlich in-memory Tabellen und einem simulierten Maildienst bestätigten: gleicher Auftrag zweimal -> eine Begehung, eine Feststellung, eine simulierte Mail; neue ID -> neue Verarbeitung; unklarer Mailfehler bzw. fehlgeschlagene Statusaktualisierung -> kein automatischer weiterer Mailaufruf; identische Wiederholung nach Teilspeicherung -> keine doppelte Feststellung. Geänderter Inhalt nach Abschluss wird vom Script ignoriert; nach einer Teilspeicherung können positionsbasierte Feststellungs-IDs alte Inhalte behalten. Deshalb friert die App den gesamten Auftrag vor der ersten Übermittlung ein.

Der Apps-Script-Code wurde nicht verändert und nicht in das Repository kopiert. Keine echten Google-Tabellen oder E-Mail-Dienste wurden in den Tests angesprochen.

## Ausgeführte Prüfungen

- Produktionsbuild erfolgreich; die bekannte Vite-Bundlegrößenwarnung bleibt bestehen.
- Sieben Datenbank-/Migrations-/Konfigurationsprüfungen: vollständige Daten, feste Prüfpunktzuordnung, konkurrierende Revisionen, Archivierung/persönliche Unterschrift, fehlerhafte Daten und Schreiben, einmalige V1-Migration mit gesperrter unbekannter Versandhistorie.
- Zwei Transportprüfungen: konkrete vorbereitete Felder/ID, strenge OK-Erkennung, Fehler-/HTML-Antworten, Netzwerkfehler ohne automatische Wiederholung.
- Register-Browserprüfung: stabile ID nach Neuladen; echte Pilot-PDF-Erzeugung und vollständiger strukturierter Payload; Speicherung vor Netzwerk; verlorene Antwort; bytegleicher Retry; nur eine simulierte Mail; endgültiger Schreibschutz; neue ID nur bei neuer Begehung; Sperre bei abweichender gespeicherter Backend-Adresse; Speicherfehler vor Versand und nach Serverbestätigung; konkurrierende Tabs; Altentwurf-Migration einschließlich expliziter Bestätigung; unklare Backend-Antwort.
- Bestehende Browserregression: Formular, Bereiche, Bewertungen, Notizen, Prüfpunkt-Fotos, sichtbare Unterschrift, Neuladen, Schließen/Wiederöffnen, vollständiger Chromium-Neustart, persönlicher Signaturerhalt, Archivierung, Speicherfehler, alte allgemeine Fotos nicht gelöscht. Die Löschprüfung wartet ausdrücklich auf den tatsächlichen Datenbankabschluss vor Neuladen.
- Sichtbare Signaturpixel: Maus, simulierter Touch bei hoher Pixeldichte, mehrere Striche, Neuladen, Größenänderung und absichtliches Löschen.
- Speicher-Voreinstellungen: gesperrte localStorage-Eigenschaft, fehlgeschlagenes Lesen/Schreiben, voller Speicher, beide Speicher ausgefallen, Altwerte erhalten.

Werkzeuge liegen wie bisher ausschließlich unter `/tmp/baustellen-qa`. Befehle aus dem Repository:

```sh
node tests/draftStore.test.mjs
node tests/mailTransport.test.mjs
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/TEST-NO-REAL-SERVICE/exec npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
# Gegen diesen lokalen Entwicklungsserver, jeweils isolierte Testprofile:
node tests/register-browser.mjs
node tests/draft-browser.mjs
node tests/signature-browser.mjs
node tests/preference-browser.mjs
npm run build
```

Alle Google-Aufrufe in den Browserprüfungen werden abgefangen. Die reale Google-Verarbeitung und Zustellung wurden ausdrücklich nicht getestet.

## Noch vor einer produktiven Freigabe zu klären

1. Am 06.11.2026 hat der Benutzer die zugehörige Web-App-URL aus der Bereitstellungsverwaltung übermittelt. Die App verwendet diese ausdrücklich angegebene Adresse für neue Versandvorgänge statt der davon abweichenden ursprünglichen Pilotadresse. Der Benutzer hat anschließend klargestellt, dass diese Adresse ausschließlich zu einer Demo-Liste gehört. Sie darf nicht als Produktivziel verwendet werden. Statt eines fest einkompilierten Ziels verlangt die App nun die ausdrückliche Build-Konfiguration `VITE_APPS_SCRIPT_URL`. Ohne gültige Konfiguration bleiben Erstversand und Wiederholung gesperrt; lokale Entwürfe und PDF-Download bleiben verfügbar. Die ursprüngliche Produktivanbindung ist weiterhin ungeklärt. Ein bereits vorbereiteter Versand bleibt an seine gespeicherte ursprüngliche Adresse gebunden; bei abweichender aktueller Konfiguration wird auch die Wiederholung gesperrt. Unterschiedliche Alt-/Pilotbereitstellungen dürfen nicht verwechselt werden.
2. Ein gezielt freigegebener echter Integrationstest für PDF, Mail und Register ist weiterhin erforderlich. Aus dem Quellcode oder einer simulierten `OK`-Antwort lässt sich die veröffentlichte Google-Version nicht beweisen.
3. Ein unklarer Google-Status erfordert manuelle Prüfung im Register durch die zuständige Person. Die App überschreibt den Serverstatus nicht und bietet keinen ungesicherten „trotzdem senden“-Umweg.
4. Neue UI-Abläufe, insbesondere Altentwurf-Bestätigung und abgeschlossene Begehungen, sind auf dem echten iPhone nachzutesten. Bisherige iPhone-Tests betrafen den Stand vor dieser Registerintegration.
5. Kein geräteübergreifendes Backup, keine Synchronisation der IDs zwischen unabhängig begonnenen Begehungen auf mehreren Geräten und keine Beseitigung bereits vorhandener Dubletten. Alte Clients können weiterhin neue IDs erzeugen. Nach Umstellung müssen die vorgesehenen Geräte die neue Version verwenden.
6. Vor der Umstellung noch offene Eingaben in alten Pilot-Tabs sichern bzw. die Begehungen abschließen. Eine bisher nur im Arbeitsspeicher liegende Begehung kann die neue Version nach einem Neuladen nicht nachträglich retten. Version-2-Entwürfe bei einem Rückwechsel auf eine ältere Version nicht löschen.
7. PDF- und Bildmengen auf echten Geräten prüfen; der persistierte Versandauftrag enthält zusätzlich zum Entwurf das fertige PDF. Browserdatenlöschung oder Geräteverlust können lokal gespeicherte Daten entfernen.

Für diese Integration wurde kein Merge, kein produktives GitHub-Pages-Deployment und keine Änderung am Google-Script oder an Registerdaten ausgeführt.


## Klarstellung Demo/Produktion

Die am 06.11.2026 übermittelte Web-App-Adresse gehört nach ausdrücklicher Klarstellung des Benutzers zu einer Demo-Liste. Diese Zuordnung bestätigt keine Produktivanbindung und auch nicht die dort veröffentlichte Codeversion. Die Demo-Adresse ist deshalb nicht als automatische Vorgabe im Programm hinterlegt. Build- und Hosting-Konfiguration müssen das Ziel ausdrücklich bestimmen. `VITE_APPS_SCRIPT_URL` ist eine öffentliche Zieladresse, kein Geheimnis und kein Ersatz für eine Authentisierung.

Ein fehlendes gebundenes Apps-Script-Projekt in einer Liste beweist nicht, dass kein eigenständiges Script diese Liste beschreibt. Vor der produktiven Freigabe muss der tatsächlich genutzte App-/Versandweg zurückverfolgt werden. Keine neue Automatisierung an der ursprünglichen Liste anlegen, bevor die vorhandene Verbindung geklärt ist.

Zusätzliche Prüfung des Builds ohne `VITE_APPS_SCRIPT_URL`: Nach `npm run build` den lokalen Build mit `npm run preview -- --host 127.0.0.1 --port 5174 --strictPort` starten, dann `node tests/target-configuration-browser.mjs`. Sichtbare Warnung, gesperrter Versand auch bei synthetischem Formularereignis, keine Netzwerkübermittlung, lokale Wiederherstellung und PDF-Download verfügbar. Die Registertests verwenden ausdrücklich eine nicht existente simulierte Testadresse und fangen jeden Aufruf ab. Die echte Demo-Liste und die ursprüngliche Liste werden nicht angesprochen.
