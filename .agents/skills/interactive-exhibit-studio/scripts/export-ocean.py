#!/usr/bin/env python3
"""Export the bundled ocean example as one HTML file that works offline.

This exporter is specific to examples/into-the-deep, whose JavaScript has no
module imports. It does not attempt to bundle arbitrary applications or WebGL.
"""

import argparse
import base64
import json
from pathlib import Path
import re


def export(destination):
    root = Path(__file__).resolve().parents[1] / 'examples' / 'into-the-deep'
    html = (root / 'index.html').read_text(encoding='utf-8')
    css = (root / 'style.css').read_text(encoding='utf-8')
    js = (root / 'app.js').read_text(encoding='utf-8')
    documents = {name: (root / name).read_text(encoding='utf-8')
                 for name in ('ASSET_CREDITS.md', 'SOURCES.md')}
    licenses = '\n\n'.join(path.read_text(encoding='utf-8')
                           for path in sorted((root / 'assets').glob('*OFL.txt')))
    if not licenses:
        raise ValueError('The bundled font licenses are missing.')
    documents['ASSET_CREDITS.md'] += '\n\n# Bundled font licenses\n\n' + licenses
    for path in sorted((root / 'assets').iterdir()):
        mime = {'.webp': 'image/webp', '.woff2': 'font/woff2'}.get(path.suffix)
        if mime:
            reference = 'assets/' + path.name
            data = 'data:' + mime + ';base64,' + base64.b64encode(path.read_bytes()).decode('ascii')
            html, css, js = (text.replace(reference, data) for text in (html, css, js))
    # A data URL already carries the asset; a cache-busting suffix corrupts it.
    js = js.replace("creatures[zone].image+'?retry='+Date.now()", 'creatures[zone].image')
    payload = json.dumps(documents, ensure_ascii=False).replace('</', '<\\/')
    js += '\nconst bundledDocuments = ' + payload + ';\n' + '''
document.addEventListener('click', event => {
  const link = event.target.closest('a');
  const name = link?.getAttribute('href');
  if (!Object.hasOwn(bundledDocuments, name)) return;
  event.preventDefault();
  const url = URL.createObjectURL(new Blob([bundledDocuments[name]], {type: 'text/plain;charset=utf-8'}));
  const download = document.createElement('a');
  download.href = url; download.download = name; download.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
document.querySelector('.identity').addEventListener('click', event => {
  event.preventDefault(); location.reload();
});
'''
    html, styles = re.subn(r'<link\s+rel="stylesheet"\s+href="style.css"\s*>',
                          lambda _: '<style>\n' + css + '\n</style>', html)
    html, scripts = re.subn(r'<script\s+type="module"\s+src="app.js"\s*>\s*</script>',
                           lambda _: '<script type="module">\n' + js.replace('</script', '<\\/script') + '\n</script>', html)
    if styles != 1 or scripts != 1:
        raise ValueError('The ocean entry-point contract changed; review this exporter.')
    destination = Path(destination).expanduser()
    if destination.suffix.lower() != '.html':
        raise ValueError('Choose a new .html output file.')
    if destination.is_symlink():
        raise ValueError('The output cannot be a symlink.')
    with destination.open('x', encoding='utf-8') as output:
        output.write(html)
    return destination.resolve()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    try:
        print('Exported offline ocean demo:', export(args.output))
    except (OSError, ValueError) as error:
        parser.error(str(error))


if __name__ == '__main__':
    main()
