Portraits go here.

Reference them from the data files by path:

  _config.yml        lab.pi.photo: /assets/img/people/hyunwuk-lee.jpg
  _data/people.yml   photo: /assets/img/people/<name>.jpg

Frames are locked to 4:5 and the image is cropped to fill, so a portrait-
orientation photo works best. Leave `photo` out and the frame falls back to
centred initials.

Around 800px wide is plenty — the frame is 200px for the PI and roughly 250px
for members, so anything larger only costs load time.
