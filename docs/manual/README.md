# Cyber Psychosis game manual

The table's manual in the style of a real cabinet's: the playfield with numbered callouts, every
shot and feature, the heist and its jobs, multiball, scoring, the display, strategy from measured
shot odds, the two apron cards and an operator's section. It describes software version 20.

| File | What it is |
|---|---|
| `index.html` | The manual. Open it in a browser: US Letter pages on a desktop, one flowing column on a phone. |
| `cyber-psychosis-manual.pdf` | The same, 20 Letter pages, for printing. |
| `img/` | The pictures: close-ups and the full table from the game's flat view, the tilted table for the cover, and dot-matrix display screens. |
| `tools/` | The scripts that make the pictures and the PDF. |

The rules in it were written from the code after the October 2026 audit (see `AUDIT.md` at the
repo root), and the shot odds come from `npm run measure windows`.

## Rebuilding after the game changes

With the dev server running (`npm run dev`, port 5173) and Playwright with Chromium:

```bash
mkdir -p /tmp/manual/dmd
OUT=/tmp/manual node docs/manual/tools/capture-table.cjs        # table-flat.png
python3 docs/manual/tools/crop.py /tmp/manual docs/manual/img    # close-ups and table.jpg
OUT=/tmp/manual/dmd node docs/manual/tools/capture-display.cjs  # display screens
cp /tmp/manual/dmd/*.png docs/manual/img/
DIR=$PWD/docs/manual OUT=$PWD/docs/manual/cyber-psychosis-manual.pdf FILE=index.html node docs/manual/tools/make-pdf.cjs
```

The cover's tilted table comes from `art/palettes/capture.cjs` (`phone.png`, cropped to the table).
Any rule or value that changes needs the text in `index.html` changing by hand.
