# Seed content sources

Everything in `files/` is built by `build-content.sh`. This file records where
each piece comes from and why we can redistribute it.

## Rebuilding

```bash
apps/backend/scripts/seed-data/build-content.sh          # build anything missing
apps/backend/scripts/seed-data/build-content.sh --force  # rebuild everything
```

Downloads are cached in `$SEED_CACHE` (default `/tmp/seed-content-cache`).
Required tools: `curl`, `qpdf`, `pdftoppm` (poppler-utils), `pandoc`,
LibreOffice with Calc, Writer and Impress, `ffmpeg`, ImageMagick 7, `gnuplot`
and `zip`.

## Downloaded (public domain)

Works of the US federal government are not subject to copyright
(17 U.S.C. § 105).

| Output | Source | Notes |
| --- | --- | --- |
| `nfip-flood-insurance-manual-*.pdf`, `nfip-severe-repetitive-loss-properties.pdf`, `nfip-underwriting-sample-scenarios.pdf`, `nfip-documentation-requirements-guide.pdf`, `nfip-definitions-and-acronyms.pdf` | FEMA, *NFIP Flood Insurance Manual*, October 2025, via [agents.floodsmart.gov](https://agents.floodsmart.gov/manuals) | Chapters split out by page range |
| `nfip-claims-*.pdf`, `nfip-underwriting-methodology.pdf` | FEMA, *NFIP Claims Manual*, June 2025, via agents.floodsmart.gov | Chapters split out by page range |
| `nfip-policyholder-rights.pdf`, `icc-*.pdf`, `assignment-of-coverage-d.pdf` | FEMA claims manual appendices, via agents.floodsmart.gov | |
| `nfip-litigation-manual-2023.pdf`, `wyo-bulletin-*.pdf` | FEMA, via agents.floodsmart.gov | |
| `sfip-*-form.pdf` | 44 CFR Part 61 Appendices A(1)–A(3), 2024 edition, via [govinfo.gov](https://www.govinfo.gov/) | The Standard Flood Insurance Policy forms |
| `sfip-dwelling-form-scanned-copy.pdf`, `icc-checklist-scan.png` | Pages of the above, rasterised and degraded | Simulated scans to exercise OCR |
| `fema-hurricane-harvey-shelter-in-place-psa.mp4` | FEMA, *Accessible Hurricane Harvey — Shelter in Place*, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:FEMA_Accessible_Hurricane_Harvey_-_Shelter_in_Place.webm) | 45 s excerpt, re-encoded |
| `noaa-flash-flooding-satellite-briefing.webm`, `flash-flooding-satellite-loop.gif` | NOAA NESDIS, *Kentucky and Missouri Devastated by Flash Flooding*, Wikimedia Commons | Excerpts, re-encoded |
| `nfip-director-remarks*.{mp3,wav,ogg,m4a,aac,flac}` | FEMA, remarks by NFIP Director Roy Wright, Wikimedia Commons | Audio excerpts in every supported format |
| `flooded-street-missouri.jpg` | FEMA photo 34508, Wikimedia Commons | Downscaled |
| `damaged-home-interior-kentucky.jpg` | FEMA photo 41326, Wikimedia Commons | Downscaled |

## Written for this project

All company names, people, figures and procedures below are fictional
("Cobalt Harbor Mutual"). Sources live in `sources/`.

| Output | Source |
| --- | --- |
| `residential-flood-underwriting-guidelines.docx`, `new-business-referral-checklist.docx` (+ legacy `.doc`), `claims-intake-business-requirements.docx`, `adjuster-assignment-procedure.docx` | Markdown → pandoc |
| `q3-claims-process-review.pptx`, `catastrophe-response-playbook.pptx` (+ legacy `.ppt`) | Markdown → pandoc |
| `document-retention-policy.html` | Markdown → pandoc |
| `residential-flood-rate-indication-summary.md`, `content-portal-onboarding-guide.md`, `after-hours-escalation-contacts.txt` | Copied as-is |
| `weekly-claims-export.csv`, `premium-by-territory.csv` | Copied as-is |
| `paid-loss-development-triangle.xlsx` (+ legacy `.xls`), `policy-rating-worksheet.xlsx`, `premium-by-territory-summary.xlsx` | CSV → LibreOffice |
| `claims-workflow-diagram.svg` / `.png`, `organization-chart.webp` | Hand-written SVG (PNG/WebP via ImageMagick) |
| `loss-ratio-by-accident-year.png` | gnuplot script |
| `icc-claim-forms-packet.zip` | Four of the FEMA PDFs above, zipped |

## Links

`links.ts` lists the link content items. They point at third-party pages and
videos and are not downloaded. Each one was checked to load (YouTube links via
oEmbed) when the list was written.
