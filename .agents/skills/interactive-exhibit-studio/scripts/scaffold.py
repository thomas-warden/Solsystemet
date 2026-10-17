#!/usr/bin/env python3
"""Copy the complete Earth reference into a new project without changing it.

The result remains an Earth exhibit. Adapt its design, model, text, and sources
deliberately before using it to represent another subject.
"""

import argparse
import os
from pathlib import Path
import shutil
import sys
import tempfile

from validate import inside, validate_project


def create_project(destination):
    root = Path(__file__).resolve().parents[1]
    reference = root / "assets" / "reference"
    requested = Path(destination).expanduser()
    if requested.exists() or requested.is_symlink():
        raise ValueError("--output already exists; choose a new directory.")
    output = requested.resolve()
    if inside(output, root):
        raise ValueError("--output must be outside the skill package.")
    if not output.parent.is_dir():
        raise ValueError("The --output parent directory must already exist.")
    if not reference.is_dir() or reference.is_symlink():
        raise ValueError("The bundled assets/reference directory is missing or is a symlink.")
    if any(path.is_symlink() for path in reference.rglob("*")):
        raise ValueError("The reference contains symlinks; it must be self-contained.")
    if not (reference / "README.md").is_file():
        raise ValueError("The bundled Earth reference README.md is missing.")
    errors = validate_project(reference)
    if errors:
        raise ValueError("Bundled Earth reference failed validation: " + " ".join(errors))

    staging = Path(tempfile.mkdtemp(prefix=".earth-reference-", dir=output.parent))
    reservation = None
    try:
        shutil.copytree(reference, staging, dirs_exist_ok=True)
        errors = validate_project(staging)
        if errors:
            raise ValueError("Copied Earth reference failed validation: " + " ".join(errors))
        # Reserve the destination exclusively. Replace only our own empty
        # directory, never a project created by someone else while copying.
        output.mkdir()
        reservation = output.stat()
        os.replace(staging, output)
        reservation = None
    finally:
        if staging.exists():
            shutil.rmtree(staging)
        if reservation is not None:
            try:
                current = output.stat()
                if (current.st_dev, current.st_ino) == (reservation.st_dev, reservation.st_ino):
                    output.rmdir()
            except OSError:
                pass
    return output


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path,
                        help="New directory outside the skill; its parent must exist.")
    args = parser.parse_args()
    try:
        output = create_project(args.output)
    except ValueError as error:
        print(f"Cannot create project: {error}", file=sys.stderr)
        return 1
    except (OSError, RuntimeError):
        print("Cannot create project: a file operation failed; no existing project was overwritten.", file=sys.stderr)
        return 1
    print(f"Copied the Earth reference unchanged: {output}")
    print("This is an Earth exhibit. Read README.md and adapt its design, content, and sources for another subject.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
