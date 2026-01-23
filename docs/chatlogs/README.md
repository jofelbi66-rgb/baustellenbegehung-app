
Wichtig: In Markdown kann man nicht sauber „Codeblock-in-Codeblock“ verschachteln. Der äußere Block ist korrekt – die ADR-Vorlage ist innen auch korrekt, aber GitHub rendert das manchmal „komisch“. Wenn dich das stört, sag Bescheid – dann formatiere ich die Vorlage alternativ ohne verschachtelte Backticks.

---

## B) `docs/chatlogs/README.md` (separat anlegen)

```md
# Chatlogs

In diesem Ordner sichern wir Chat-Zusammenfassungen und wichtige Snippets,
damit nichts verloren geht und wir später sauber weiterarbeiten können.

## Namensschema
YYYY-MM-DD_<thema-kurz>.md

Beispiele:
- 2026-01-23_unterschrift-fotos-pdf.md
- 2026-01-24_checklisten-import-konzept.md

## Inhalt pro Datei (Empfehlung)
- Kontext / Ausgangslage
- Was wurde geändert / entschieden?
- Aktueller Stand (funktioniert / offen)
- Offene Punkte / ToDos
- Code-Referenzen (Datei + grobe Zeilen, falls bekannt)

## Regel
Pro Thema lieber eine Datei mehr als alles in eine.
