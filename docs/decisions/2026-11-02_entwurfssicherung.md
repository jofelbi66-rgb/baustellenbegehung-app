# Automatische Entwurfssicherung – Entwicklung und Teststand

Stand: 02.11.2026. Lokaler Entwicklungszweig: `feature/indexeddb-entwurfssicherung`.
Keine Zusammenführung, kein Push, kein GitHub-Pages-Deployment.

## Verhalten

- IndexedDB `baustellenbegehung-drafts`, Version 1, Object Store `drafts`.
- Ein aktiver Entwurf (`active`) umfasst sämtliche Formularfelder, Begehungsbereiche, alle Checklisten einschließlich ausgeblendeter Bereiche, Bewertungen, Notizen, prüfpunktbezogene Fotos, allgemeine Fotos, Koordinaten, CC, Logo, Unterschrift und Zeitstempel. Filter und geöffnete Kategorien werden ebenfalls wiederhergestellt.
- Lesen und Validieren kommen vor dem Freigeben der Eingabe und vor dem ersten Schreiben. Ein bestehender Entwurf wird beim bloßen Öffnen nicht erneut geschrieben.
- Änderungen werden ohne absichtliche Verzögerung in einer seriellen Schreibwarteschlange gesichert. „Auf diesem Gerät gespeichert“ erscheint erst nach erfolgreichem Transaktionsabschluss.
- Jede Schreibtransaktion prüft die erwartete Revision atomar. Bei Konflikten mit einem anderen Tab stoppt die Speicherung mit sichtbarer Meldung. Es erfolgt keine automatische Zusammenführung oder Überschreibung. Ungesicherte Eingaben bleiben im betroffenen Tab sichtbar.
- „Neue Begehung“ verlangt eine Bestätigung. Zunächst wird der letzte Stand gesichert; danach werden Archivkopie und neuer aktiver Entwurf in derselben Transaktion geschrieben. Schlägt das fehl, wird das Formular nicht zurückgesetzt. Abbrechen verändert nichts.
- Die neue Begehung enthält keine Unterschrift und keinen Unterschriftszeitpunkt. Projektbezogene Daten und Fotos werden geleert; personenbezogene Voreinstellungen wie Name, CC und Logo bleiben erhalten.
- Während Wiederherstellung und Neustart ist die Bearbeitung gesperrt. Während laufender Foto-/Logo-Verarbeitung, Standortabfrage und Versand ist die Neustartaktion deaktiviert.
- Speicherfehler sind sichtbar. Nach einem Schreibfehler bleiben die aktuellen Eingaben für eine manuelle Sicherung bzw. den vorhandenen Versand zugänglich; weitere automatische Schreibversuche stoppen. Bei Ladefehlern bleibt die Eingabe gesperrt, um vorhandene Daten nicht durch einen leeren Entwurf zu ersetzen.

## Zuordnung und Altstände

Prüfpunkte werden im Speicher über das vollständige Paar aus Kategorie-Schlüssel und Prüfpunkttext zugeordnet, nicht über ihre Arrayposition. Reihenfolgeänderungen sind damit sicher; neue Punkte erhalten leere Werte. Wenn gespeicherte Schlüssel nicht mehr vorhanden sind (z. B. umbenannte oder entfernte Punkte), wird die Wiederherstellung bewusst blockiert und der gespeicherte Stand unverändert belassen. Eine automatische Interpretation ähnlicher Texte findet nicht statt. Solche Änderungen erfordern künftig eine ausdrücklich geprüfte Migration. Kategorien und Prüfpunkttexte wurden für diese Umsetzung nicht verändert.

Alte lokale `localStorage`-Einträge werden nicht gelöscht. Eine dort vorhandene, keiner Begehung zugeordnete Unterschrift wird bewusst nicht in eine neue Begehung übernommen. Neue Unterschriften gehören zum IndexedDB-Entwurf. Ein vorhandener Tippfehler im Unterschrifts-Setter wurde korrigiert, damit auch der Erfassungszeitpunkt gesichert wird.

Archive werden nicht automatisch gelöscht. Eine Archivübersicht bzw. Wiederherstellungsschaltfläche ist noch nicht Bestandteil dieser Änderung. Bei Bedarf kann die Betreuung die vollständigen Archivdatensätze aus dem Object Store `drafts` sichern und kontrolliert wiederherstellen. Vor Browserdatenbereinigung müssen benötigte Archive extern gesichert werden.

## Unveränderte Funktionen

Checklisten, Bewertungsauswahl, bestehende Formulare und deren Gestaltung bleiben erhalten. Ergänzt wurden die Statuszeile und „Neue Begehung“ sowie eine ansonsten neutrale Eingabesperre während des Ladens/Neustarts.

Die Funktionen für PDF-Tabellenzeilen, den aktiven PDF-Fototeil, PDF-Erzeugung und Google-Apps-Script-Versand einschließlich POST-Feldern sowie Versandvalidierung/Formularhandler wurden gegen den Ausgangsstand byteweise verglichen: unverändert. Auch die bestehenden Einschränkungen bleiben erhalten, insbesondere die separate allgemeine Fotoliste, die der aktive Versand bisher nicht in den PDF-Fototeil einbezieht. Ihre lokale Sicherung ist trotzdem enthalten.

## Ausgeführte Prüfungen

- Produktionsbuild mit Node 24.19.0/npm 11.9.0: erfolgreich. Bestehende Vite-Warnung für ein Bundle über 500 kB bleibt bestehen.
- Fünf Datenbanktests mit `fake-indexeddb`: vollständiger Roundtrip; stabile Zuordnung bei Umordnung; konkurrierende Schreiber/alte Revision; atomare Archivierung ohne Unterschriftsübernahme; Ablehnung unbekannter Formate/geänderter Prüfpunkte; Erhalt des letzten Standes bei fehlgeschlagenem Schreiben. Einige Tests prüfen mehrere dieser Fälle gemeinsam.
- Chromium mit Smartphone-Viewport (390 × 844): Formular, Bereichsauswahl, Bewertung, Notiz, Foto an einem Prüfpunkt, allgemeines Foto, Unterschrift und Zeitstempel nach Neuladen identisch wiederhergestellt.
- Tab schließen/neu öffnen: Entwurf wiederhergestellt.
- Sicherheitsabfrage abgebrochen: Daten unverändert. Bestätigter Neustart: Original vollständig archiviert, aktive Unterschrift und Zeitstempel leer.
- Zwei Tabs: veralteter Schreiber erhält sichtbare Fehlermeldung und überschreibt den neueren Stand nicht.
- Nicht verfügbare IndexedDB: sichtbare Fehlermeldung, keine Freigabe leerer Eingaben.
- Echte PDF-Erzeugung und POST-Payload geprüft; PDF-Kennung, Projekt und Bereichsdateiname kontrolliert. Google-Apps-Script-Endpunkt im Browser abgefangen und mit Testantwort beantwortet; keine reale E-Mail gesendet.

- Simulierter voller Speicher (`QuotaExceededError`): verständliche Meldung, letzter gespeicherter Datensatz unverändert, aktuelle Eingaben bleiben zugänglich.
- Vollständiger Chromium-Neustart mit demselben persistenten Browserprofil: Entwurf von der Festplatte wiederhergestellt.

Alle aufgeführten automatisierten Prüfungen sind erfolgreich abgeschlossen.

## Tests wiederholen

Die Testwerkzeuge sind ausschließlich unter `/tmp/baustellen-qa` installiert; Produktionsabhängigkeiten und Paketdefinitionen bleiben unverändert:

```sh
npm install --prefix /tmp/baustellen-qa --no-audit --no-fund playwright fake-indexeddb
cd /workspace/baustellenbegehung-app
node tests/draftStore.test.mjs
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
# In einer zweiten Sitzung:
node tests/draft-browser.mjs
npm run build
```

Die Tests verwenden isolierte Browserprofile und verschicken keine E-Mails. Abweichende Werkzeugpfade können über `FAKE_INDEXEDDB_MODULE`, `PLAYWRIGHT_MODULE` und `CHROMIUM_PATH` angegeben werden. Für lokale Server-/Browserprozesse kann die Cloud-Sandbox eine unterstützte Ausführungsfreigabe benötigen.

## Vor Freigabe weiterhin manuell prüfen

- Echte iPhones mit Safari und Android-Geräte mit Chrome: Kamera, Touch-Unterschrift, App-Wechsel, OS-bedingtes Beenden sowie harter Browser-/Geräteabsturz.
- Umfangreiche Begehungen mit vielen großen Fotos: Schreibgeschwindigkeit, Speicherbedarf und Bedienbarkeit auf schwächeren Geräten.
- Visuelle PDF-Kontrolle auf mehreren Seiten, unterschiedliche Fotoformate und Seitenumbrüche. Der automatisierte Test bestätigt PDF-Erzeugung, nicht die visuelle Richtigkeit jeder Seite.
- Reeller E-Mail-Empfang samt PDF-Anhang nur nach ausdrücklicher Versandfreigabe; derzeit ausschließlich abgefangener Testversand.

## Grenzen

Die Sicherung liegt nur auf diesem Gerät unter derselben Website-Origin und demselben Browserprofil. Privatmodus, Browserdatenlöschung, Geräteverlust und Speicherbereinigung können Daten entfernen. Ein Service Worker, Cloud-Synchronisation und ein geräteübergreifendes Backup sind nicht enthalten. Noch nicht abgeschlossene Fotoverarbeitung, Zeichenstriche oder Datenbanktransaktionen können bei abruptem Absturz verloren gehen. Eine Archivierung benötigt zusätzlichen Speicher; bei vollem Speicher bleibt der bisherige aktive Stand erhalten. Die komplette Momentaufnahme einschließlich Fotos wird pro Änderung gespeichert; die Leistung bei großen Begehungen muss auf echten Geräten geprüft werden.

## Nachbesserung nach Review, 05.11.2026

Die bisherigen direkten `localStorage`-Zugriffe für CC und Logo werden nun durch `usePreferenceState` abgesichert, einschließlich der Zugriffseigenschaft `window.localStorage` selbst und des Logo-Auswahlhandlers. Fehler beim Lesen oder Schreiben führen zu einer sichtbaren Warnung und verhindern die IndexedDB-Wiederherstellung nicht. Wenn beide Speicher nicht verfügbar sind, bleibt auch die IndexedDB-Fehlermeldung sichtbar und die Bearbeitung gesperrt. Bereits abgefangene Namens-Voreinstellungen bleiben unverändert; der vollständige Name ist weiterhin Bestandteil des Entwurfs.

Bestehende Schlüssel und ihr Rohtextformat werden beibehalten. Keine Browserdaten werden gelöscht. Nach einem fehlgeschlagenen Lesen wird der unbekannte vorhandene Wert nicht durch den Standardwert überschrieben. Der erfolgreiche IndexedDB-Speicherstatus und die Warnung zum alten Voreinstellungsspeicher werden getrennt angezeigt. Eine Warnung über einen fehlgeschlagenen Lesezugriff bleibt für die Sitzung sichtbar, auch wenn ein späterer Schreibzugriff gelingt.

Zusätzlicher Test: `node tests/preference-browser.mjs` (gleicher lokaler Vite-Server und dieselbe externe Playwright-Installation wie oben). Die isolierten Testprofile prüfen:

- Blockierter Zugriff auf die gesamte `localStorage`-Eigenschaft.
- Blockierte `getItem`-Aufrufe; nicht lesbarer Altwert wird beim Start nicht mit einem Standardwert überschrieben.
- `QuotaExceededError` bei `setItem`.
- Gleichzeitiger Ausfall von localStorage und IndexedDB.
- Erhalt und Wiederverwendung vorhandener Rohtext-Voreinstellungen und unbeteiligter Schlüssel.

Für die ersten drei Fehlerfälle wurden Bearbeitung, Auswahl „Eigenes Logo“ und Wiederherstellung von Projekt, CC und Logo aus IndexedDB nach Neuladen geprüft. Keine unbehandelten Browserfehler. Alle fünf Fehlerfall-/Kompatibilitätsszenarien erfolgreich. Auch die fünf Datenbanktests, die gesamte bisherige Browser-Regressionssuite einschließlich echtem PDF mit abgefangenem Versand und vollständigem Browserneustart sowie der Produktionsbuild sind erneut erfolgreich. Die Vite-Bundlegrößenwarnung bleibt bestehen.

PDF-, Versand- und Checklistenlogik bleiben durch diese Nachbesserung unverändert. Die weiterhin ausstehenden Tests auf echten Smartphones und die oben beschriebenen Grenzen gelten unverändert. Aktualisierung ausschließlich im bestehenden Entwicklungszweig; kein Merge und keine Veröffentlichung.
