# Entscheidungen (ADRs)

In diesem Ordner dokumentieren wir Architektur- und Produktentscheidungen als ADRs
(Architecture Decision Records). Jede Entscheidung ist eine eigene Datei.

## Namensschema
YYYY-MM-DD_<kurzer-titel>.md  
Beispiel: 2026-01-23_checklisten-import-excel.md

## Vorlage (kopieren)
```md
# ADR: <Titel>

- Datum: YYYY-MM-DD
- Status: vorgeschlagen | angenommen | verworfen | ersetzt
- Kontext:
  - Warum steht diese Entscheidung an?
- Entscheidung:
  - Was wird genau entschieden?
- Alternativen:
  - Welche Optionen gab es?
- Konsequenzen:
  - Positiv:
  - Negativ:
- Umsetzung/Notizen:
  - Was ist konkret zu tun?

---

## 2) `docs/chatlogs/README.md` anlegen (Ablage-Regeln + Namensschema)

**Ziel:** Chat-Inhalte landen strukturiert im Repo, und du findest in 6 Monaten noch alles wieder.

### Schritte in GitHub (Browser)
1. Ordner **`docs/chatlogs/`** öffnen
2. **Add file** → **Create new file**
3. Dateiname: **`README.md`**
4. Inhalt reinkopieren (siehe Block)
5. Commit: Message z. B. **“Add chatlogs README”** → Commit.

**Inhalt für `docs/chatlogs/README.md`:**
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

## Regeln
- Eine ADR pro Entscheidung (nicht pro Diskussion).
- Kurz und eindeutig formulieren: Kontext → Entscheidung → Konsequenzen.
- Titel und Dateiname müssen zusammenpassen.
- Status pflegen:
  - vorgeschlagen: noch nicht entschieden
  - angenommen: gilt ab jetzt
  - verworfen: bewusst nicht gewählt
  - ersetzt: durch neue ADR abgelöst (mit Link/Dateiname)
- Wenn sich eine Entscheidung ändert:
  - Neue ADR anlegen
  - Alte ADR bekommt Status „ersetzt“ und verweist auf die neue Datei
- Umsetzung gehört nur als Stichpunkte rein (keine langen How-Tos).
- Bei größeren Auswirkungen: konkrete Konsequenzen nennen (z. B. Migration nötig, Breaking Change, Mehraufwand).
- Wenn möglich: Betroffene Dateien/Module nennen (zur Orientierung).


