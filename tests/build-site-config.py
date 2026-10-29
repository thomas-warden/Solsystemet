"""Check config-only cache changes without using a real credential."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

source = Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='solsystemet-config-test-') as directory:
    root = Path(directory) / 'repo'
    (root / 'scripts').mkdir(parents=True)
    shutil.copy2(source / 'scripts/build-site.py', root / 'scripts/build-site.py')
    for folder in ('assets', 'vendor'):
        (root / folder).mkdir()
        (root / folder / 'fixture.txt').write_text('fixture')
    for name in ('index.html', 'sources.html', 'style.css'):
        (root / name).write_text('<script type="module" src="app.js?v=fixture"></script>')
    (root / 'app.js').write_text("import { GOOGLE_MAPS_BROWSER_KEY } from './site-config.js?v=fixture';")
    (root / 'site-config.js').write_text("export const GOOGLE_MAPS_BROWSER_KEY = '';")
    def git(*args):
        return subprocess.run(['git', *args], cwd=root, check=True, capture_output=True)
    git('init', '-q'); git('add', '.')
    git('-c', 'user.name=Config test', '-c', 'user.email=config-test@example.invalid', 'commit', '-qm', 'Fixture')
    clean_env = os.environ.copy()
    clean_env.pop('GOOGLE_MAPS_BROWSER_KEY', None)
    def build(label, key=None, require=False):
        out = Path(directory) / label
        env = clean_env.copy()
        if key is not None:
            env['GOOGLE_MAPS_BROWSER_KEY'] = key
        args = ['python3', str(root / 'scripts/build-site.py'), '--output', str(out)]
        if require: args.append('--require-google-maps')
        result = subprocess.run(args, env=env, capture_output=True, text=True)
        return out, result
    _, rejected = build('required', require=True)
    assert rejected.returncode != 0
    versions = []
    for label, key in [('empty', None), ('configured', 'fixture-public-browser-key-one'), ('rotated', 'fixture-public-browser-key-two')]:
        out, result = build(label, key, bool(key))
        assert result.returncode == 0, result.stderr
        info = json.loads((out / 'build-info.json').read_text())
        versions.append(info)
        assert info['google_maps_configured'] == bool(key)
        assert info['asset_revision'] in (out / 'index.html').read_text()
        assert info['asset_revision'] in (out / 'app.js').read_text()
        if key:
            assert key in (out / 'site-config.js').read_text()
            assert key not in (out / 'app.js').read_text() + (out / 'build-info.json').read_text() + result.stdout
    assert len({v['source_commit'] for v in versions}) == 1
    assert len({v['asset_revision'] for v in versions}) == 3
print('PASS required key gate, source provenance and config-only import cache invalidation')
