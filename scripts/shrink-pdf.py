"""Shrink a report PDF without visible quality loss.

Chrome embeds every image at full size and stores the 3D renders as huge PNGs.
This downsamples only images printed above 330 dpi to 300 dpi, re-encodes photo-like
images (renders) as JPEG, and leaves line art (schematics) lossless. Bookmarks are kept.

    python scripts/shrink-pdf.py <file.pdf>
"""
import os, sys
import pymupdf

path = sys.argv[1]
before = os.path.getsize(path)
doc = pymupdf.open(path)
doc.rewrite_images(dpi_threshold=330, dpi_target=300, lossy=False)
tmp = path + '.tmp'
doc.save(tmp, garbage=4, deflate=True)
doc.close()
os.replace(tmp, path)
print(f'  shrunk {before // 1024} KB -> {os.path.getsize(path) // 1024} KB')
