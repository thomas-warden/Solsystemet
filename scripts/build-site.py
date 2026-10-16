#!/usr/bin/env python3
"""Export the committed static application with revisioned module URLs."""

import argparse
import datetime
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--description', default='Solsystemet static site')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    output = args.output.resolve()
    if output.exists():
        parser.error('Output already exists; choose a new directory.')
    status = subprocess.check_output(['git', 'status', '--porcelain'], cwd=root, text=True)
    if status.strip():
        parser.error('Commit source changes before creating a publication build.')
    revision = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.solsystemet-export-', dir=output.parent) as staging:
        stage = Path(staging) / 'site'
        stage.mkdir()
        for source in [root / 'index.html', root / 'sources.html', root / 'style.css', *root.glob('*.js')]:
            text = re.sub(r'(\.(?:js|css)\?v=)[A-Za-z0-9._-]+',
                          lambda match: match[1] + revision[:12], source.read_text())
            (stage / source.name).write_text(text)
        for directory in ('assets', 'vendor'):
            shutil.copytree(root / directory, stage / directory)
        (stage / '.nojekyll').touch()
        (stage / 'build-info.json').write_text(json.dumps({
            'source_commit': revision,
            'built_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'description': args.description,
        }, indent=2) + '\n')
        stage.rename(output)
    print(f'Exported {revision[:12]} to {output}')


if __name__ == '__main__':
    main()
