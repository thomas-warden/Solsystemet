#!/usr/bin/env python3
"""Package this skill as a reproducible ZIP with a file integrity manifest."""

import argparse
import hashlib
import json
from pathlib import Path
import re
import tempfile
import zipfile


NAME = 'interactive-learning-worlds'
INCLUDE = ('SKILL.md', 'README.md', 'VERSION', 'NOTICE.md', 'agents',
           'references', 'assets', 'scripts', 'examples')
EXCLUDE = {'__pycache__', '.DS_Store', '.git', 'node_modules', '.pytest_cache'}


def package_files(root):
    result = []
    for name in INCLUDE:
        source = root / name
        if not source.exists():
            raise ValueError(f'Missing package entry: {name}')
        paths = [source, *source.rglob('*')] if source.is_dir() else [source]
        for path in paths:
            relative = path.relative_to(root)
            if any(part in EXCLUDE or part.startswith('.') for part in relative.parts):
                continue
            if path.is_symlink():
                raise ValueError(f'Symlinks are not packaged: {relative}')
            if path.is_file() and path.suffix not in ('.pyc', '.zip', '.log'):
                result.append((relative.as_posix(), path.read_bytes()))
    return sorted(result)


def add_file(archive, name, contents):
    entry = zipfile.ZipInfo(f'{NAME}/{name}', date_time=(1980, 1, 1, 0, 0, 0))
    entry.compress_type = zipfile.ZIP_DEFLATED
    entry.create_system = 3
    entry.external_attr = 0o100644 << 16
    archive.writestr(entry, contents)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    output = args.output.expanduser().resolve()
    checksum = output.with_name(output.name + '.sha256')
    if output == root or root in output.parents:
        parser.error('Choose an output outside the skill directory.')
    if output.suffix.lower() != '.zip':
        parser.error('Output must be a .zip file.')
    if output.exists() or checksum.exists():
        parser.error('Output or checksum already exists; choose a new filename.')
    try:
        skill = (root / 'SKILL.md').read_text(encoding='utf-8')
        frontmatter = re.match(r'\A---\n(.*?)\n---(?:\n|$)', skill, re.S)
        if not frontmatter or not re.search(r'^name: ' + NAME + r'$', frontmatter.group(1), re.M):
            raise ValueError('SKILL.md must contain the expected skill name in frontmatter.')
        version = (root / 'VERSION').read_text(encoding='utf-8').strip()
        if not re.fullmatch(r'\d+\.\d+\.\d+', version):
            raise ValueError('VERSION must be a semantic version such as 1.0.0.')
        files = package_files(root)
    except (OSError, ValueError) as error:
        parser.error(str(error))
    manifest = {
        'name': NAME, 'version': version, 'hashAlgorithm': 'sha256',
        'files': [{'path': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
                  for name, data in files],
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.learning-skill-', dir=output.parent) as staging:
        archive_path = Path(staging) / output.name
        with zipfile.ZipFile(archive_path, 'w') as archive:
            for name, contents in files:
                add_file(archive, name, contents)
            add_file(archive, 'manifest.json',
                     (json.dumps(manifest, indent=2, ensure_ascii=False) + '\n').encode('utf-8'))
        digest = hashlib.sha256(archive_path.read_bytes()).hexdigest()
        checksum_path = Path(staging) / checksum.name
        checksum_path.write_text(f'{digest}  {output.name}\n', encoding='utf-8')
        if output.exists() or checksum.exists():
            parser.error('Output appeared during packaging; refusing to replace it.')
        archive_path.rename(output)
        checksum_path.rename(checksum)
    print(f'Packaged {NAME} {version}: {len(files)} files plus manifest')
    print(f'ZIP: {output}')
    print(f'SHA-256: {digest}')


if __name__ == '__main__':
    main()
