# Aktueller Umfang: lokale Entwurfssicherung und bisheriger PDF-Mailversand

Stand: 06.11.2026. Vom Benutzer nach Klärung der bisherigen Bereitstellung ausdrücklich bestätigt. Diese Entscheidung ersetzt die zwischenzeitliche Planung einer produktiven Google-Registerintegration.

## Ziel

Eingaben vor dem Absenden auf demselben Gerät sichern und wiederherstellen. Bestehenden Bericht und Mailweg beibehalten. Keine produktive Google-Liste einführen, kein Apps Script ändern, kein Merge oder Deployment ohne gesonderte Freigabe.

- IndexedDB sichert Formular, Bereiche, Bewertungen, Notizen, Prüfpunkt-Fotos und persönliche Unterschrift.
- Erst lesen und validieren, dann bearbeiten und schreiben. Konflikte zwischen Tabs werden vor einem überschreibenden Schreibvorgang abgewiesen.
- „Neue Begehung“ fragt nach, archiviert den bisherigen Stand und leert projektbezogene Daten. Die persönliche Unterschrift bleibt bis zum bewussten Löschen/Ersetzen erhalten.
- Allgemeines Foto-Uploadfeld bleibt entfernt. Fotos direkt an Prüfpunkten und deren Berichtsausgabe bleiben erhalten. Alte allgemeine Fotos in gespeicherten Entwürfen werden nicht ungefragt gelöscht.
- Die angezeigte lokale Begehungs-ID dient nur der Entwurfsidentität auf diesem Gerät. Sie wird nicht an den bisherigen Maildienst übertragen und ist keine zentrale Google-Register-ID.

## Test-/Produktivspeicher voneinander getrennt

GitHub-Projektseiten unter demselben Benutzerhost teilen einen Browserursprung. Deshalb werden Datenbankname und lokale Einstellungsschlüssel aus dem App-Basispfad abgeleitet: `/baustellenbegehung-app/` und `/baustellenbegehung-test/site/` verwenden unterschiedliche Datenbanken und Präfixe. Dies verhindert eine Übernahme von Testbegehungen beim späteren ersten Produktivstart. Ein relativer Standalone-Testbuild erhält entsprechend seinen eigenen Pfadbereich.

Die alte ungetrennte Entwurfsdatenbank wurde durch die bisherigen Testversionen eingeführt; die bisherige offizielle main-App hat keine solche Entwurfsdatenbank. Nur der bekannte Testpfad bzw. ein separater Standalone-Testroot darf den Altbestand einmalig vollständig in einen leeren Testbereich kopieren. Aktiver Entwurf und Archive werden atomar kopiert, Originale bleiben unverändert. Bereits vorhandene scoped Daten werden nicht überschrieben. Ein zweiter Tab kann keinen nichtleeren Bereich nachträglich durch einen Altstand ersetzen. Mehr Speicherplatz kann für diese Kopie nötig sein. Alte Test-Tabs vor dem Umstieg nach abgeschlossenem Speichern schließen; spätere Änderungen in einer alten Version werden nicht mit dem kopierten neuen Stand zusammengeführt.

Der offizielle App-Pfad liest dagegen keine alten ungetrennten Testentwürfe. Er darf die vorhandenen alten persönlichen Einstellungen und die bisher lokal gespeicherte Unterschrift aus den ursprünglichen Schlüsseln übernehmen. Ein bereits vorhandener neuer Entwurf ist maßgeblich, auch wenn seine Unterschrift bewusst geleert wurde. Testpfade lesen diese persönlichen Alt-Voreinstellungen nicht. Neue Einstellungen werden nur noch mit Pfadpräfix gespeichert, nicht in die gemeinsamen alten Schlüssel zurückgeschrieben. Originalwerte werden nicht gelöscht.

Frühere Testversionen haben Name/CC/Logo noch in gemeinsamen alten Schlüsseln gespeichert. Ihre vorherigen Werte lassen sich nicht sicher rekonstruieren. Vor Produktivumstellung diese persönlichen Voreinstellungen im bisherigen offiziellen Browser prüfen; es erfolgt keine eigenmächtige Rücksetzung. Die neue Trennung verhindert weitere gegenseitige Änderungen.

## Unveränderter bisheriger Maildienst

Der Benutzer hat die Bereitstellungs-ID des bisherigen produktiven Scripts anhand der offiziellen App bestätigt und den zugehörigen `doPost`-Code bereitgestellt. Dieser baut PDF und Mail auf, ruft `MailApp.sendEmail` auf und antwortet mit `OK`; er enthält keine Listenoperationen und keinen Dublettenschutz.

Standardziel der App ist deshalb wieder genau diese bestehende Mail-Bereitstellung, nicht eine Demo-/Pilotadresse. Für ausdrücklich abweichende Builds kann `VITE_APPS_SCRIPT_URL` gesetzt werden; ein explizit leerer oder ungültiger Wert sperrt den Versand. Keine automatisch verwendete Demo-Adresse. `VITE_DISABLE_MAIL=true` sperrt die Sendeaktion zusätzlich im Code des separaten Testbuilds; PDF und Entwürfe bleiben verfügbar. Das ursprüngliche Apps Script und seine Eigenschaften, Empfänger und Berechtigungen werden nicht geändert.

Übertragen werden ausschließlich die bisherigen elf Felder: `token`, `filename`, `pdfBase64`, `cc`, `subject`, `body`, `project`, `inspectionArea`, `location`, `inspector`, `date`. Keine Registerfelder, keine zentrale Begehungs-ID, keine Feststellungenliste und keine Kennzahlenübertragung. Die zwischenzeitlich übernommenen Register-Hilfsfunktionen sind aus dem Frontend entfernt.

## Bericht unverändert

Der aktuelle PDF-Aufbau wurde aus der bisherigen produktiven Funktion `sendPdfToMail` (main `5f59c82`) separiert, damit derselbe Bericht lokal heruntergeladen werden kann. Normalisierter Syntaxvergleich (ohne Kommentare und Quelltextformatierung) bestätigt identische PDF-Anweisungen. Ebenso identisch sind Fotolayout, Tabellen-, Logo-, Datums- und Fußzeilenhilfen sowie alle fünf Katalogdefinitionen.

`node tests/pdf-regression.mjs` prüft diese Gleichheit anhand normalisierter Referenz-Hashes des bisherigen produktiven Quellstands. Das ist eine Code-Regressionsprüfung und kein Ersatz für eine visuelle Prüfung auf dem tatsächlichen Gerät. Keine neue PDF-Formatierung.

## Konservativer Umgang mit Versand und Fehlern

Vor dem ersten Netzwerkaufruf wird die konkrete Anfrage einschließlich fertigem PDF und Zieladresse gespeichert (`pending`, Transport `pdf-mail`). Ein Speicherfehler verhindert den Versand. Ein Ref sperrt parallele lokale Submit-Aufrufe; die Datenbankrevision verhindert, dass ein konkurrierender Tab ebenfalls senden kann.

Nur HTTP-Erfolg mit Antworttext exakt `OK` (nach Trimmen) wird als bestätigt behandelt. Nach erfolgreicher lokaler Speicherung von `sent` bleibt der Bericht schreibgeschützt und weiteres Absenden dieses Entwurfs gesperrt, auch nach Neuladen. Dies bestätigt den erfolgreichen MailApp-Aufruf, nicht die tatsächliche Zustellung beim Empfänger.

Bei Netzwerkfehler, Zeitüberschreitung, Fehlerantwort oder nicht gesicherter lokaler Bestätigung bleibt `pending` erhalten. **Keine automatische und keine direkte manuelle Wiederholanfrage aus der App**, denn das bestehende Script würde jeden gültigen Aufruf erneut versenden. Auch das frühere Register-Retry ist entfernt. Ein Abbruch des Wartens nach 60 Sekunden stoppt keine möglicherweise bereits laufende Google-Verarbeitung.

Unklare Aufträge bleiben erhalten und schreibgeschützt; „Neue Begehung“ ist zunächst gesperrt. PDF-Download bleibt möglich. Der Benutzer muss den Versand anhand von Protokoll/Empfänger klären bzw. den Bericht bewusst anderweitig weitergeben. Erst die ausdrücklich bestätigte Aktion „Nach manueller Klärung abschließen“ setzt den lokalen Zustand auf `closed`. Sie versendet nichts, verändert keinen Serverstatus und erlaubt keinen erneuten Versand desselben Entwurfs. Danach kann der alte Stand archiviert und eine neue Begehung begonnen werden. `closed` ist absichtlich von einer bestätigten Serverantwort (`sent`) getrennt.

Dies ist ein lokaler Schutz vor versehentlichen Wiederholungen, keine systemweite Exactly-once-Garantie. Ein direkter Aufruf des bisherigen Scripts, ein anderes Gerät oder eine bewusst neu angelegte Begehung können weitere Mails auslösen. Vollständiger serverseitiger Wiederholschutz wäre ein separates Vorhaben.

## Alte Teststände bleiben erhalten

Formatversion 3 liest Version 1 und 2 weiter. Version 1 erhält einmalig eine lokale ID und den Status `unverified`, weil sein früherer Versandverlauf unbekannt ist. Ein Versand setzt eine bewusste Bestätigung voraus, dass er sicher noch nicht stattgefunden hat. Version-2-Entwürfe behalten ID, Inhalt und Versandstatus. Insbesondere bleiben offene frühere Register-Testaufträge vollständig gespeichert und gesperrt; sie werden weder wiederholt noch an den bisherigen Maildienst weitergeleitet.

## Qualitätssicherung

- Produktionsbuild erfolgreich, bekannte Bundlegrößenwarnung unverändert.
- Neun Datenbank-/Migrations-/Konfigurations-/Pfadprüfungen bestanden.
- Drei Transport-/Standardzielprüfungen bestanden.
- PDF-Regressionsprüfung: Berichtskörper, Fotolayout, Tabellen/Logo/Fußzeile/Datum und Kataloge entsprechen dem bisherigen produktiven Stand.
- Mail-Browserprüfung: genau bisherige Felder; PDF; dauerhafter Vorab-Speichervorgang; bestätigter Versand gesperrt; verlorene Antwort bleibt ohne Retry; manueller Abschluss mit Abbrechen/Bestätigen und ohne Mail; Speicherfehler vor Anfrage und nach Antwort; konkurrierende Tabs; Altentwürfe; alte offene Register-Testaufträge nicht weitergeleitet; Fehlerantwort nicht als Erfolg; Standardbuild verwendet nur das bisherige Ziel.
- Bestehende Entwurfs-, Foto-, Signatur- und Speicherfehler-Regressionsprüfungen bestanden.
- Isolationstest auf demselben lokalen Host: zwei App-Pfade, getrennte Datenbanken und Einstellungen, keine Übernahme alter Testdaten in den offiziellen Bereich, bisherige persönliche Alt-Unterschrift übernommen, alte Testarchive ohne Löschung kopiert, weitere Änderungen getrennt, bewusst gelöschte Unterschrift bleibt auch bei vorhandenem Altwert leer.
- Alle Mailanfragen abgefangen oder simuliert. Keine echte Mail und keine Google-Tabellenänderung.

Werkzeuge wie bisher extern unter `/tmp/baustellen-qa`; keine neuen Produktionsabhängigkeiten. Standardbuild und Vorschau sowie Entwicklungsserver mit rein simulierter Adresse:

```sh
node tests/draftStore.test.mjs
node tests/mailTransport.test.mjs
node tests/pdf-regression.mjs
npm run build
npm run preview -- --host 127.0.0.1 --port 5174 --strictPort
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/TEST-NO-REAL-SERVICE/exec npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
# In getrennten Sitzungen gegen die oben genannten lokalen Server:
node tests/mail-workflow-browser.mjs
node tests/draft-browser.mjs
node tests/signature-browser.mjs
node tests/preference-browser.mjs
```

Die Mailprüfung fängt auch die Anfrage des Standardbuilds an die tatsächliche alte Adresse vor dem Netzwerk ab. Die normale lokale Standardvorschau ist selbst keine gesperrte Demo und darf nicht manuell zum Versand verwendet werden; die bereitgestellte Test-ZIP wird dagegen mit `VITE_DISABLE_MAIL=true` gebaut und zusätzlich durch CSP/Submit-Sperre geschützt. Keine echte Übertragung. Die optionale `target-configuration-browser.mjs` benötigt einen separat mit explizit leerer `VITE_APPS_SCRIPT_URL` gebauten und lokal bereitgestellten Build (`UNCONFIGURED_APP_URL`).

## Noch vor Freigabe

- Aktuellen kleineren Umfang auf der separaten Testseite am Computer und iPhone nachtesten. Die früheren Registertests sind keine Freigabe dieses geänderten Mailablaufs.
- PDF visuell gegen einen bekannten Bericht prüfen. Reeller Mailtest nur nach gesonderter ausdrücklicher Freigabe.
- Bei einer Umstellung offene Eingaben in älteren App-Tabs vorher sichern/abschließen; neue Speicherung kann nach einem Neuladen keine vorher nur im RAM befindlichen Alt-Eingaben rekonstruieren.
- Lokale Speicherung ist kein Cloud-Backup: gleiche Website und gleicher Browser nötig; Browserdatenlöschung und Geräteverlust können Daten entfernen. Große Bilder plus gespeichertes PDF benötigen ausreichend Speicher.

Produktiver main, bestehendes Script, ursprüngliche Liste und Demo-Liste bleiben unverändert. Kein Merge und keine produktive Veröffentlichung ausgeführt.


### Isolationstest reproduzieren

Nach dem normalen Build zusätzlich einen relativen Vorschau-Build erstellen und beide Pfade über den lokalen Testserver bedienen:

```sh
VITE_DISABLE_MAIL=true npm run build -- --base=./ --outDir=/workspace/artifacts/baustellen-mail-vorschau/site
python3 tests/serve-isolation.py --production dist --test /workspace/artifacts/baustellen-mail-vorschau/site --port 5188
ISOLATION_TEST_HOST=http://127.0.0.1:5188 node tests/storage-isolation-browser.mjs
```

Der Test verwendet ein neues Browserprofil mit erfundenen Daten. Auch der normale Build ist dort durch eine abgefangene Google-Route gegen echte Übertragung geschützt. Der bewusst nicht konfigurierte Teststand kann separat gebaut werden:

```sh
VITE_APPS_SCRIPT_URL= npm run build -- --base=./ --outDir=/workspace/artifacts/baustellen-mail-noconfig/site
python3 -m http.server 5186 --bind 127.0.0.1 --directory /workspace/artifacts/baustellen-mail-noconfig/site
node tests/target-configuration-browser.mjs
```
