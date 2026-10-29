#!/usr/bin/env python3
"""Export the committed static application with revisioned module URLs."""

import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--description', default='Solsystemet static site')
    parser.add_argument('--require-google-maps', action='store_true',
                        help='Refuse a city release without GOOGLE_MAPS_BROWSER_KEY.')
    args = parser.parse_args()
    maps_key = os.environ.get('GOOGLE_MAPS_BROWSER_KEY', '').strip()
    if args.require_google_maps and not maps_key:
        parser.error('GOOGLE_MAPS_BROWSER_KEY is required for this publication.')
    root = Path(__file__).resolve().parents[1]
    output = args.output.resolve()
    if output.exists():
        parser.error('Output already exists; choose a new directory.')
    status = subprocess.check_output(['git', 'status', '--porcelain'], cwd=root, text=True)
    if status.strip():
        parser.error('Commit source changes before creating a publication build.')
    revision = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
    # Activating/rotating a browser key must refresh the entire import chain,
    # even when the source commit is unchanged. Never put the key in a URL.
    asset_revision = revision[:12] + ('.' + hashlib.sha256(maps_key.encode()).hexdigest()[:10] if maps_key else '')
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.solsystemet-export-', dir=output.parent) as staging:
        stage = Path(staging) / 'site'
        stage.mkdir()
        for source in [root / 'index.html', root / 'sources.html', root / 'style.css', *root.glob('*.js')]:
            text = re.sub(r'(\.(?:js|css)\?v=)[A-Za-z0-9._-]+',
                          lambda match: match[1] + asset_revision, source.read_text())
            (stage / source.name).write_text(text)
        for directory in ('assets', 'vendor'):
            shutil.copytree(root / directory, stage / directory)
        # Google Maps browser keys are necessarily visible to site visitors.
        # Restrict this key to the published site's referrer and Maps JS API.
        if maps_key:
            (stage / 'site-config.js').write_text(
                '// Restricted public Google Maps browser key.\n'
                'export const GOOGLE_MAPS_BROWSER_KEY = ' + json.dumps(maps_key) + ';\n')
        (stage / '.nojekyll').touch()
        (stage / 'build-info.json').write_text(json.dumps({
            'source_commit': revision,
            'asset_revision': asset_revision,
            'built_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'description': args.description,
            'google_maps_configured': bool(maps_key),
        }, indent=2) + '\n')
        stage.rename(output)
    print(f'Exported {revision[:12]} to {output}')


if __name__ == '__main__':
    main()
