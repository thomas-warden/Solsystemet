# Solsystemet app icon

Original generated Saturn illustration, created for Solsystemet on 23 October 2026. This is brand artwork, not a spacecraft photograph or a scientific texture. The 1254 × 1254 opaque PNG master is retained here; it is not included in the static-site export.

The production files in `assets/icons/` are opaque sRGB PNG derivatives. The artwork fills a square with no baked-in corner mask; iOS supplies its own rounded corners.

- `solsystemet-180-v1.png`: 180 × 180 Apple touch icon for iPhone.
- `solsystemet-32-v1.png`: 32 × 32 browser favicon.

To export the same artwork with ImageMagick, run from the repository root:

```sh
magick design/app-icon/solsystemet-master-v1.png -filter Lanczos -resize 180x180 -colorspace sRGB -alpha off -strip PNG24:assets/icons/solsystemet-180-v1.png
magick design/app-icon/solsystemet-master-v1.png -filter Lanczos -resize 32x32 -colorspace sRGB -alpha off -strip PNG24:assets/icons/solsystemet-32-v1.png
```

Use a new asset filename when replacing the artwork, and update the HTML links. An already-saved iOS Home Screen shortcut may still need to be removed and added again because its icon is cached by the device.
