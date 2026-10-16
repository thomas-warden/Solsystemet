#!/usr/bin/env python3
"""Copy the bundled demonstration into a new, independent prototype project."""

import argparse
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile

from validate import inside, validate_project


def text_argument(value):
    value = value.strip()
    if not value or len(value) > 200 or any(ord(char) < 32 for char in value):
        raise argparse.ArgumentTypeError("Use 1–200 characters without control characters.")
    return value


def age_argument(value):
    try:
        age = int(value)
    except ValueError:
        raise argparse.ArgumentTypeError("Age must be an integer from 1 to 120.") from None
    if not 1 <= age <= 120:
        raise argparse.ArgumentTypeError("Age must be an integer from 1 to 120.")
    return age


def create_project(output, topic, title, age_min, age_max):
    skill_root = Path(__file__).resolve().parents[1]
    starter = skill_root / "assets" / "starter"
    requested_output = Path(output).expanduser()
    if requested_output.exists() or requested_output.is_symlink():
        raise ValueError("--output already exists; choose a new directory.")
    output = requested_output.resolve()
    if age_min > age_max:
        raise ValueError("--age-min must not exceed --age-max.")
    if inside(output, skill_root):
        raise ValueError("--output must be outside the skill package.")
    if output.exists() or output.is_symlink():
        raise ValueError("--output already exists; choose a new directory.")
    if not output.parent.is_dir():
        raise ValueError("The --output parent directory must already exist.")
    if not starter.is_dir():
        raise ValueError("The bundled assets/starter directory is missing.")
    if starter.is_symlink() or any(path.is_symlink() for path in starter.rglob("*")):
        raise ValueError("The starter contains symlinks; copying it would not be self-contained.")
    # Validate before creating even a staging directory. Do not copy an invalid
    # package and leave the user to discover missing files after publication.
    template_errors = validate_project(starter)
    if template_errors:
        raise ValueError("Bundled starter failed validation: " + " ".join(template_errors))
    content = json.loads((starter / "content.json").read_text(encoding="utf-8"))
    content.update({
        "title": title or topic,
        "topic": topic,
        "ageRange": [age_min, age_max],
        "status": "prototype",
    })
    staging = Path(tempfile.mkdtemp(prefix=".learning-world-", dir=output.parent))
    reservation = None
    try:
        shutil.copytree(starter, staging, dirs_exist_ok=True)
        (staging / "content.json").write_text(json.dumps(content, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        errors = validate_project(staging)
        if errors:
            raise ValueError("Generated project failed validation: " + " ".join(errors))
        # Reserve atomically to reject a target created while staging. Only this
        # newly created empty directory may be replaced by the completed tree.
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
                    output.rmdir()  # Never remove files another process added.
            except OSError:
                pass
    return output


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path, help="New directory outside the skill; its parent must exist.")
    parser.add_argument("--topic", required=True, type=text_argument, help="Topic to use in the prototype configuration.")
    parser.add_argument("--title", type=text_argument, help="Display title; defaults to the topic.")
    parser.add_argument("--age-min", type=age_argument, default=8)
    parser.add_argument("--age-max", type=age_argument, default=10)
    args = parser.parse_args()
    try:
        output = create_project(args.output, args.topic, args.title, args.age_min, args.age_max)
    except ValueError as error:
        print(f"Cannot create project: {error}", file=sys.stderr)
        return 1
    except (OSError, RuntimeError):
        print("Cannot create project: a file operation failed; no existing project was overwritten.", file=sys.stderr)
        return 1
    print(f"Created prototype: {output}")
    print("Replace the demonstration and draft goals with reviewed content before release.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
