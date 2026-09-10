Anything uploaded through Pages CMS lands here — your photo, your resume,
organisation logos, schematic exports, measurement plots.

Reference them from pages as /uploads/<filename>.

Uploading works for images and PDFs because `.pages.yml` sets
`media.categories: [image, document]`. Without that line the picker silently
refuses anything that is not an image.
