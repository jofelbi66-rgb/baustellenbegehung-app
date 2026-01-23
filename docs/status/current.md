# Projektstatus – baustellenbegehung-app

## Stand heute
- PDF-Erzeugung per E-Mail-Versand (sendPdfToMail) ist die relevante Export-Route (kein separater Share-Button aktiv).
- Unterschriftenfeld wird im PDF angezeigt.
- Foto-Seite(n) werden am Ende als eigene Foto-Sektion ausgegeben.
- Foto-Stretching/Verzerrung wurde behoben (Fotos wirken nicht mehr zu breit gestreckt).

## Aktuelle Funktionslogik (kurz)
1. Nutzer erfasst Stammdaten + Checklisteinträge + Fotos + Unterschrift.
2. Beim Absenden wird PDF erzeugt und per EmailJS versendet.
3. PDF-Struktur:
   - Titel/Deckbereich
   - Checkliste als Tabelle
   - Unterschriftenblock unter der Checkliste (auf der passenden Seite)
   - Foto-Sektion als Schlusskapitel (neue Seiten nach Bedarf)

## Bekannte Stolpersteine aus der Historie (zur Erinnerung)
- Doppelte Funktionsdefinitionen (z. B. sendPdfToMail mehrfach) führten zu Build-Fehlern ("already been declared").
- Referenzen auf stillgelegte Funktionen mit *_OLD verursachten Runtime-Fehler ("is not defined").
- Foto-Decode-Fehler ("image could not be decoded") wurde über robustere Bildverarbeitung stabilisiert.
- Unterschriftenblock war zeitweise doppelt/verschoben und verschwand dadurch aus dem finalen PDF.

## Offene Punkte
- Konzept: Mehrere firmenspezifische Checklisten per Logo-Auswahl (Datenquelle: Excel/CSV).
- Abstimmung intern: Checklisten je Firma/Bereich sammeln.
- Entscheidung: Ein App-Grundgerüst für mehrere Firmen-Varianten vs. eine App mit dynamischem Checklist-Loading.

