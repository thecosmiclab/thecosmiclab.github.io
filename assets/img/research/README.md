Research-area figures.

Drop a PNG here and point the matching `figure:` in `_data/thrusts.yml` at it:

    figure: /assets/img/research/co-design.png

That is the whole step — PNG and SVG are used as they are.

## Exporting from PowerPoint

Export the drawing, not the slide. Select the shapes, right-click, *Save as
Picture* — exporting the whole slide leaves the 16:9 empty space around it, and
the frame then shows a small diagram floating in a wide box.

Aim for roughly 1600px wide. The frame is about 400px on desktop, so that
covers retina with room to spare. If an export looks soft, enlarge the shapes
on the slide first and export again — PowerPoint rasterises at whatever size
the drawing happens to be.

A transparent background blends with the frame; a white one reads as a white
card inside the frame's hairline. Either looks fine, just be consistent across
the four.

## PDFs

`../../tools/figures.sh` converts any PDF in this folder to a 900px PNG, for
the case where a figure only exists as a PDF (a figure lifted from a paper,
say). Not needed when exporting from PowerPoint.
