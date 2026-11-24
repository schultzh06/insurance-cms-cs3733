# Renders the loss ratio chart PNG. Called by build-content.sh with
# `gnuplot -e "outfile='...'" loss-ratio-chart.gp`.
set terminal pngcairo size 1000,560 font "Helvetica,13" background "#ffffff"
set output outfile
set title "Residential Flood — Loss Ratio by Accident Year" font "Helvetica,17"
set style data histograms
set style histogram clustered gap 1
set style fill solid 0.85 border -1
set boxwidth 0.9
set ylabel "Loss ratio (%)"
set yrange [0:140]
set grid ytics lc rgb "#e2e8f0"
set key top left
set arrow from graph 0, first 83 to graph 1, first 83 nohead lc rgb "#dc2626" dt 2 lw 2
set label "Permissible loss ratio 83%" at graph 0.02, first 88 tc rgb "#dc2626"
$data << EOD
2019 61 68
2020 74 79
2021 42 47
2022 118 126
2023 69 75
2024 97 104
2025 58 81
EOD
plot $data using 2:xtic(1) title "Paid" lc rgb "#2563eb", \
     '' using 3 title "Incurred" lc rgb "#94a3b8"
