#!/usr/bin/env bash
# Builds the demo seed files in seed-data/files/ from:
#   - public-domain downloads (FEMA / govinfo / Wikimedia Commons), cached in $SEED_CACHE
#   - hand-written sources in seed-data/sources/ (Markdown, CSV, SVG, gnuplot)
#
# Idempotent: every output is skipped if it already exists. Pass --force to
# rebuild everything (downloads stay cached; delete $SEED_CACHE to refetch).
#
# Usage:
#   apps/backend/scripts/seed-data/build-content.sh [--force]
#
# Requires: curl, qpdf, pdftoppm, pandoc, libreoffice (soffice), ffmpeg,
# ImageMagick 7 (magick), gnuplot, zip.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$DIR/sources"
OUT="$DIR/files"
CACHE="${SEED_CACHE:-/tmp/seed-content-cache}"
FORCE=0
[[ "${1:-}" == "--force" ]] && FORCE=1

# Browser-like UA: the FloodSmart host rejects curl's default one.
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36"
FLOODSMART="https://agents.floodsmart.gov/sites/default/files"
GOVINFO="https://www.govinfo.gov/content/pkg/CFR-2024-title44-vol1/pdf"
COMMONS="https://upload.wikimedia.org/wikipedia/commons"

mkdir -p "$OUT" "$CACHE"

for tool in curl qpdf pdftoppm pandoc soffice ffmpeg magick gnuplot zip; do
    command -v "$tool" >/dev/null || { echo "Missing required tool: $tool" >&2; exit 1; }
done

# Returns success when $1 needs building (missing, or --force).
needs() { [[ $FORCE -eq 1 || ! -s "$1" ]]; }

log() { printf '  %-58s %s\n' "$(basename "$1")" "$2"; }

# fetch <cache-name> <url>: download once into the cache; prints the cached path.
fetch() {
    local dest="$CACHE/$1"
    if [[ ! -s "$dest" ]]; then
        curl -sfL -A "$UA" --retry 3 --max-time 600 -o "$dest.part" "$2"
        mv "$dest.part" "$dest"
    fi
    printf '%s' "$dest"
}

# LibreOffice conversion into a temp dir, then move to the final name.
# A private profile dir avoids clashing with a running LibreOffice instance.
soffice_convert() { # <input> <target-ext> <output>
    local tmp; tmp="$(mktemp -d "$CACHE/lo-XXXX")"
    if ! soffice -env:UserInstallation="file://$CACHE/lo-profile" --headless \
        --convert-to "$2" --outdir "$tmp" "$1" >/dev/null 2>&1; then
        rm -rf "$tmp"
        echo "LibreOffice failed to convert $1 — are libreoffice-calc/-writer/-impress installed?" >&2
        exit 1
    fi
    mv "$tmp"/* "$3"
    rmdir "$tmp"
}

# ---------------------------------------------------------------------------
echo "== PDFs: FEMA manual chapters (split from the full manuals)"
FIM="$(fetch fim-2025-10.pdf "$FLOODSMART/media/document/2025-09/fema_nfip-FloodInsuranceManual-October2025-508c.pdf")"
CLAIMS="$(fetch claims-2025-06.pdf "$FLOODSMART/media/document/2025-08/fema_nfip-ClaimsManual-June2025-508c.pdf")"

# <source> <page range> <output name>. Ranges come from each manual's bookmarks.
while read -r src range name; do
    out="$OUT/$name.pdf"
    if needs "$out"; then
        case "$src" in fim) in="$FIM" ;; claims) in="$CLAIMS" ;; esac
        qpdf --empty --pages "$in" "$range" -- "$out"
        log "$out" built
    fi
done <<'EOF'
fim 27-34 nfip-flood-insurance-manual-1-introduction
fim 35-61 nfip-flood-insurance-manual-2-before-you-start
fim 62-142 nfip-flood-insurance-manual-3-how-to-write
fim 143-157 nfip-flood-insurance-manual-4-how-to-endorse
fim 166-181 nfip-flood-insurance-manual-6-how-to-cancel
fim 313-320 nfip-flood-insurance-manual-quick-start-guide
fim 335-343 nfip-severe-repetitive-loss-properties
fim 427-435 nfip-underwriting-sample-scenarios
fim 436-438 nfip-documentation-requirements-guide
fim 439-452 nfip-definitions-and-acronyms
claims 31-110 nfip-claims-manual-claims-journey
claims 175-194 nfip-claims-manual-increased-cost-of-compliance
claims 195-206 nfip-claims-manual-special-handling-for-adjusters
claims 275-286 nfip-claims-structural-drying
claims 293-298 nfip-claims-bvla-method-and-faqs
claims 301-308 nfip-underwriting-methodology
EOF

echo "== PDFs: standalone documents"
while read -r name url; do
    out="$OUT/$name.pdf"
    if needs "$out"; then
        cp "$(fetch "$name.pdf" "$url")" "$out"
        log "$out" copied
    fi
done <<EOF
nfip-policyholder-rights $FLOODSMART/media/document/2025-08/Appendix_F_Policyholder%20Rights.pdf
icc-policyholder-processing-checklist $FLOODSMART/media/document/2025-08/Appendix_H_ICC%20Policyholder%E2%80%99s%20Processing%20Checklist.pdf
icc-fee-schedule $FLOODSMART/media/document/2025-08/Appendix_C_ICC_Fee_Schedule.pdf
assignment-of-coverage-d $FLOODSMART/media/document/2025-08/Appendix_G_Assignment%20of%20Coverage%20D.pdf
nfip-litigation-manual-2023 $FLOODSMART/media/document/2025-07/nfip-litigation-manual-jan-2023.pdf
wyo-bulletin-w-23013 $FLOODSMART/bulletins/W-23013/w-23013.pdf
wyo-bulletin-w-13025a $FLOODSMART/bulletins/W-13025a/w-13025a.pdf
sfip-dwelling-form $GOVINFO/CFR-2024-title44-vol1-part61-appA1.pdf
sfip-general-property-form $GOVINFO/CFR-2024-title44-vol1-part61-appA2.pdf
sfip-residential-condominium-building-form $GOVINFO/CFR-2024-title44-vol1-part61-appA3.pdf
EOF

echo "== PDF + PNG: simulated scans (exercise the OCR path)"
# Rasterise a real page, then degrade it: slight skew, grey paper, noise.
scan() { # <input pdf> <page> <output>
    local tmp="$CACHE/scan-$$"
    pdftoppm -f "$2" -l "$2" -r 150 -gray -png "$1" "$tmp"
    magick "$tmp"-*.png -background white -rotate 0.8 -fill '#f2efe6' -tint 30 \
        -attenuate 0.4 +noise Gaussian -colorspace Gray "$3"
    rm -f "$tmp"-*.png
}
out="$OUT/sfip-dwelling-form-scanned-copy.pdf"
needs "$out" && { scan "$OUT/sfip-dwelling-form.pdf" 2 "$out"; log "$out" built; }
out="$OUT/icc-checklist-scan.png"
needs "$out" && { scan "$OUT/icc-policyholder-processing-checklist.pdf" 1 "$out"; log "$out" built; }

# ---------------------------------------------------------------------------
echo "== Video and audio (public-domain FEMA / NOAA footage from Wikimedia Commons)"
HARVEY="$(fetch harvey-shelter-in-place.webm "$COMMONS/b/b1/FEMA_Accessible_Hurricane_Harvey_-_Shelter_in_Place.webm")"
WRIGHT="$(fetch nfip-director-roy-wright.webm "$COMMONS/5/5f/Roy_Wright%2C_Director_of_the_National_Flood_Insurance_Program%2C_is_live_to_debu....webm")"
FLASH="$(fetch noaa-ky-mo-flash-flooding.webm "$COMMONS/9/93/Kentucky_and_Missouri_Devastated_by_Flash_Flooding_%28NESDIS_2022-08-04_2022_08_04_KYandMODevastatedbyFlashFlooding_TWITTER%29.webm")"
FF=(ffmpeg -v error -y)

# FEMA's accessible PSA (presented with an ASL interpreter).
out="$OUT/fema-hurricane-harvey-shelter-in-place-psa.mp4"
needs "$out" && { "${FF[@]}" -ss 20 -t 45 -i "$HARVEY" -vf scale=-2:360 -c:v libx264 -crf 30 -preset slow \
    -c:a aac -b:a 64k -movflags +faststart "$out"; log "$out" encoded; }
out="$OUT/noaa-flash-flooding-satellite-briefing.webm"
needs "$out" && { "${FF[@]}" -t 25 -i "$FLASH" -vf scale=-2:360 -c:v libvpx-vp9 -crf 46 -b:v 0 \
    -c:a libopus -b:a 48k "$out"; log "$out" encoded; }

# One 60 s speech excerpt, then the same audio in every supported audio format.
out="$OUT/nfip-director-remarks.mp3"
needs "$out" && { "${FF[@]}" -ss 30 -t 60 -i "$WRIGHT" -vn -ac 1 -c:a libmp3lame -b:a 64k "$out"; log "$out" encoded; }
while read -r ext args; do
    out="$OUT/nfip-director-remarks-excerpt.$ext"
    # Shorter 20 s excerpt keeps the lossless formats small.
    # shellcheck disable=SC2086
    needs "$out" && { "${FF[@]}" -ss 30 -t 20 -i "$WRIGHT" -vn -ac 1 $args "$out"; log "$out" encoded; }
done <<'EOF'
wav -ar 16000 -c:a pcm_s16le
ogg -c:a libvorbis -q:a 3
m4a -c:a aac -b:a 64k
aac -c:a aac -b:a 64k
flac -ar 16000 -c:a flac
EOF

echo "== Images"
# Public-domain FEMA photos, downscaled so they stay small.
while read -r name url; do
    out="$OUT/$name.jpg"
    needs "$out" && { magick "$(fetch "$name.jpg" "$url")" -resize '1600x1600>' -quality 82 "$out"; log "$out" built; }
done <<EOF
flooded-street-missouri $COMMONS/8/85/FEMA_-_34508_-_Flooded_street_in_Missouri.jpg
damaged-home-interior-kentucky $COMMONS/b/b4/FEMA_-_41326_-_Damaged_home_interior_in_Kentucky.jpg
EOF
out="$OUT/flash-flooding-satellite-loop.gif"
# Two-pass palette keeps the GIF small and avoids banding.
needs "$out" && { "${FF[@]}" -ss 15 -t 4 -i "$FLASH" -filter_complex \
    "fps=8,scale=360:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=64[p];[b][p]paletteuse" "$out"; log "$out" built; }
out="$OUT/claims-workflow-diagram.svg"
needs "$out" && { cp "$SRC/claims-workflow.svg" "$out"; log "$out" copied; }
out="$OUT/claims-workflow-diagram.png"
needs "$out" && { magick -density 150 "$SRC/claims-workflow.svg" "$out"; log "$out" built; }
out="$OUT/organization-chart.webp"
needs "$out" && { magick -density 150 "$SRC/org-chart.svg" -quality 85 "$out"; log "$out" built; }
out="$OUT/loss-ratio-by-accident-year.png"
needs "$out" && { gnuplot -e "outfile='$out'" "$SRC/loss-ratio-chart.gp"; log "$out" built; }

# ---------------------------------------------------------------------------
echo "== Documents from Markdown (pandoc)"
while read -r src fmt name; do
    out="$OUT/$name.$fmt"
    needs "$out" && { pandoc "$SRC/$src" -s -o "$out"; log "$out" built; }
done <<'EOF'
underwriting-guidelines-residential-flood.md docx residential-flood-underwriting-guidelines
new-business-referral-checklist.md docx new-business-referral-checklist
claims-intake-requirements.md docx claims-intake-business-requirements
adjuster-assignment-procedure.md docx adjuster-assignment-procedure
q3-claims-process-review.md pptx q3-claims-process-review
catastrophe-response-playbook.md pptx catastrophe-response-playbook
document-retention-policy.md html document-retention-policy
EOF

echo "== Plain files copied as-is"
while read -r src name; do
    out="$OUT/$name"
    needs "$out" && { cp "$SRC/$src" "$out"; log "$out" copied; }
done <<'EOF'
rate-indication-summary.md residential-flood-rate-indication-summary.md
portal-onboarding-guide.md content-portal-onboarding-guide.md
after-hours-escalation-contacts.txt after-hours-escalation-contacts.txt
weekly-claims-export.csv weekly-claims-export.csv
premium-by-territory.csv premium-by-territory.csv
EOF

echo "== Spreadsheets from CSV (LibreOffice)"
while read -r src name; do
    out="$OUT/$name.xlsx"
    needs "$out" && { soffice_convert "$SRC/$src" xlsx "$out"; log "$out" built; }
done <<'EOF'
loss-development-triangle.csv paid-loss-development-triangle
policy-rating-worksheet.csv policy-rating-worksheet
premium-by-territory.csv premium-by-territory-summary
EOF

echo "== Legacy Office formats (LibreOffice)"
while read -r src ext name; do
    out="$OUT/$name.$ext"
    needs "$out" && { soffice_convert "$OUT/$src" "$ext" "$out"; log "$out" built; }
done <<'EOF'
new-business-referral-checklist.docx doc new-business-referral-checklist-legacy
paid-loss-development-triangle.xlsx xls paid-loss-development-triangle-legacy
catastrophe-response-playbook.pptx ppt catastrophe-response-playbook-legacy
EOF

echo "== Archive"
out="$OUT/icc-claim-forms-packet.zip"
# -X drops extra file attributes and -j flattens paths, so contents are stable.
needs "$out" && { (cd "$OUT" && zip -q -X -j "$out" icc-policyholder-processing-checklist.pdf \
    icc-fee-schedule.pdf assignment-of-coverage-d.pdf nfip-policyholder-rights.pdf); log "$out" built; }

echo
echo "Done: $(find "$OUT" -type f | wc -l) files, $(du -sh "$OUT" | cut -f1) in $OUT"
