#!/usr/bin/env python3
"""Create a deterministic installable skill ZIP, manifest, and SHA-256 sidecar.

Uses an allowlist; skips hidden files, conventional secret/key filenames, caches,
and generated archives. This is not a comprehensive secret scanner.
"""

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import tempfile
import zipfile


INCLUDE = ("SKILL.md", "README.md", "VERSION", "NOTICE.md", "agents",
           "references", "assets", "scripts", "examples")
REQUIRED = ("SKILL.md", "README.md", "VERSION", "NOTICE.md", "assets/reference", "scripts")
EXCLUDED_NAMES = {"__pycache__", "node_modules", "cache", "caches", "id_rsa",
                  "id_dsa", "id_ecdsa", "id_ed25519", "authorized_keys"}
SECRET_WORDS = {"secret", "secrets", "credential", "credentials", "password", "passwords"}
SECRET_STEMS = {"token", "tokens", "access-token", "api-token", "refresh-token", "auth-token",
                "service-account", "service_account"}
EXCLUDED_SUFFIXES = {".pyc", ".pyo", ".zip", ".log", ".tmp", ".bak", ".pem", ".key", ".p12", ".pfx", ".env"}


def inside(path, root):
    try:
        path.relative_to(root)
        return True
    except ValueError:
        return False


def excluded(relative):
    for part in relative.parts:
        lowered = part.lower()
        if (part.startswith(".") or lowered in EXCLUDED_NAMES
                or Path(lowered).stem in SECRET_STEMS
                or SECRET_WORDS.intersection(re.split(r"[._-]", lowered))):
            return True
    return relative.suffix.lower() in EXCLUDED_SUFFIXES


def package_metadata(root):
    skill = (root / "SKILL.md").read_text(encoding="utf-8")
    frontmatter = re.match(r"\A---\r?\n(.*?)\r?\n---(?:\r?\n|$)", skill, re.S)
    names = re.findall(r"^name:\s*([a-z0-9]+(?:-[a-z0-9]+)*)\s*$", frontmatter.group(1), re.M) if frontmatter else []
    if len(names) != 1 or len(names[0]) > 64:
        raise ValueError("SKILL.md must have one lowercase, hyphenated name in YAML frontmatter.")
    version = (root / "VERSION").read_text(encoding="utf-8").strip()
    if not re.fullmatch(r"\d+\.\d+\.\d+", version):
        raise ValueError("VERSION must contain a version such as 1.0.0.")
    return names[0], version


def package_files(root):
    for name in REQUIRED:
        if not (root / name).exists():
            raise ValueError(f"Missing package entry: {name}.")
    result = []
    for name in INCLUDE:
        source = root / name
        if not source.exists() and not source.is_symlink():
            continue
        paths = [source, *source.rglob("*")] if source.is_dir() else [source]
        for path in paths:
            relative = path.relative_to(root)
            if excluded(relative):
                continue
            if path.is_symlink():
                raise ValueError(f"Symlinks are not packaged: {relative.as_posix()}.")
            if path.is_file():
                contents = path.read_bytes()
                if re.search(rb"-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----", contents):
                    raise ValueError("A private-key header was found in an included file; packaging stopped.")
                result.append((relative.as_posix(), contents))
    return sorted(result)


def add_file(archive, skill_name, name, contents):
    entry = zipfile.ZipInfo(f"{skill_name}/{name}", date_time=(1980, 1, 1, 0, 0, 0))
    entry.compress_type = zipfile.ZIP_DEFLATED
    entry.create_system = 3
    permissions = 0o100755 if name.startswith("scripts/") and name.endswith(".py") else 0o100644
    entry.external_attr = permissions << 16
    archive.writestr(entry, contents, compresslevel=9)


def create_package(destination):
    root = Path(__file__).resolve().parents[1]
    requested = Path(destination).expanduser()
    requested_checksum = requested.with_name(requested.name + ".sha256")
    if any(path.exists() or path.is_symlink() for path in (requested, requested_checksum)):
        raise ValueError("Output or checksum already exists; choose a new filename.")
    output = requested.resolve()
    checksum = output.with_name(output.name + ".sha256")
    if inside(output, root):
        raise ValueError("Choose an output outside the skill directory.")
    if output.suffix.lower() != ".zip":
        raise ValueError("--output must name a .zip file.")
    if not output.parent.is_dir():
        raise ValueError("The --output parent directory must already exist.")
    name, version = package_metadata(root)
    files = package_files(root)
    manifest = {
        "name": name, "version": version, "hashAlgorithm": "sha256",
        "files": [{"path": path, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}
                  for path, data in files],
    }
    with tempfile.TemporaryDirectory(prefix=".exhibit-package-", dir=output.parent) as staging:
        staged_zip = Path(staging) / "skill.zip"
        staged_checksum = Path(staging) / "skill.sha256"
        with zipfile.ZipFile(staged_zip, "w") as archive:
            for path, contents in files:
                add_file(archive, name, path, contents)
            add_file(archive, name, "manifest.json",
                     (json.dumps(manifest, indent=2, ensure_ascii=False) + "\n").encode("utf-8"))
        digest = hashlib.sha256(staged_zip.read_bytes()).hexdigest()
        staged_checksum.write_text(f"{digest}  {output.name}\n", encoding="utf-8")
        published = []
        try:
            # Staging and outputs share a filesystem. Hard links publish each
            # completed file atomically and fail if a destination already exists.
            for source, target in ((staged_zip, output), (staged_checksum, checksum)):
                os.link(source, target)
                published.append((source, target))
        except OSError:
            for source, target in published:
                try:
                    if os.path.samefile(source, target):
                        target.unlink()
                except OSError:
                    pass
            raise
    return name, version, output, digest, len(files)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True,
                        help="New ZIP filename outside the skill; its parent must exist.")
    args = parser.parse_args()
    try:
        name, version, output, digest, count = create_package(args.output)
    except (ValueError, UnicodeError) as error:
        print(f"Cannot package skill: {error}", file=sys.stderr)
        return 1
    except (OSError, RuntimeError):
        print("Cannot package skill: a file operation failed; existing outputs were not overwritten.", file=sys.stderr)
        return 1
    print(f"Packaged {name} {version}: {count} files plus manifest")
    print(f"ZIP: {output}")
    print(f"SHA-256: {digest}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
