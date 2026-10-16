#!/usr/bin/env python3
"""Check a learning-world project's structure, references, and source metadata.

This is not a fact checker or a test of educational effectiveness. Static asset
checks cover literal HTML/CSS URLs and common JavaScript imports/fetches; runtime
constructed URLs and browser behavior still need browser testing.
"""

import argparse
from datetime import date
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit


REQUIRED_FILES = ("index.html", "style.css", "app.js", "content.json", "sources.json")
SOURCE_FIELDS = ("id", "title", "url", "publisher", "accessed", "license", "notes")
DATE_PATTERN = re.compile(r"\d{4}-\d{2}-\d{2}\Z")
TEXT_EXTENSIONS = {".html", ".htm", ".css", ".js", ".mjs"}
SKIP_DIRECTORIES = {".git", "node_modules", "__pycache__"}


def inside(path, root):
    try:
        path.relative_to(root)
        return True
    except ValueError:
        return False


def nonempty_string(value):
    return isinstance(value, str) and bool(value.strip())


def read_json(path, label, errors):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        errors.append(f"{label}: invalid JSON at line {error.lineno}, column {error.colno}.")
    except (OSError, UnicodeError):
        errors.append(f"{label}: could not read UTF-8 JSON.")
    return None


def validate_content(content, errors, release):
    if not isinstance(content, dict):
        errors.append("content.json: the top level must be an object.")
        return
    if type(content.get("schemaVersion")) is not int or content["schemaVersion"] != 1:
        errors.append("content.json: schemaVersion must be the integer 1.")
    for field in ("title", "topic", "intro"):
        if not nonempty_string(content.get(field)):
            errors.append(f"content.json: {field} must be a nonempty string.")
    ages = content.get("ageRange")
    if not (isinstance(ages, list) and len(ages) == 2
            and all(type(age) is int for age in ages)
            and 1 <= ages[0] <= ages[1] <= 120):
        errors.append("content.json: ageRange must contain two ordered integer ages from 1 to 120.")
    status = content.get("status")
    if status not in ("prototype", "ready"):
        errors.append("content.json: status must be 'prototype' or 'ready'.")
    if release and status == "prototype":
        errors.append("content.json: --release rejects prototype status; finish review before marking ready.")
    goals = content.get("learningGoals")
    if not isinstance(goals, list) or len(goals) != 3 or any(not nonempty_string(goal) for goal in goals):
        errors.append("content.json: schemaVersion 1 requires exactly three nonempty learningGoals strings.")
    if not isinstance(content.get("sourceIds"), list):
        errors.append("content.json: sourceIds must be an array.")
    elif release and not content["sourceIds"]:
        errors.append("content.json: --release requires at least one referenced source.")


def valid_source_url(value):
    if not nonempty_string(value) or any(char.isspace() for char in value):
        return False
    try:
        parsed = urlsplit(value)
        # Accessing port also detects malformed port syntax, without printing URLs.
        parsed.port
        return (parsed.scheme == "https" and bool(parsed.hostname)
                and parsed.username is None and parsed.password is None)
    except ValueError:
        return False


def validate_sources(registry, errors, release):
    if not isinstance(registry, dict) or not isinstance(registry.get("sources"), list):
        errors.append("sources.json: expected an object containing a sources array.")
        return set()
    entries = registry["sources"]
    if release and not entries:
        errors.append("sources.json: --release requires at least one source.")
    identifiers = set()
    for index, entry in enumerate(entries):
        label = f"sources.json: sources[{index}]"
        if not isinstance(entry, dict):
            errors.append(f"{label} must be an object.")
            continue
        for field in SOURCE_FIELDS:
            value = entry.get(field)
            if not isinstance(value, str) or (field != "notes" and not value.strip()):
                errors.append(f"{label}.{field} must be {'a string' if field == 'notes' else 'a nonempty string'}.")
        identifier = entry.get("id")
        if nonempty_string(identifier):
            if identifier in identifiers:
                errors.append(f"{label}.id duplicates an earlier source id.")
            identifiers.add(identifier)
        if not valid_source_url(entry.get("url")):
            errors.append(f"{label}.url must be an absolute HTTPS URL without embedded credentials.")
        accessed = entry.get("accessed")
        try:
            if not isinstance(accessed, str) or not DATE_PATTERN.fullmatch(accessed):
                raise ValueError
            date.fromisoformat(accessed)
        except ValueError:
            errors.append(f"{label}.accessed must be a real ISO date in YYYY-MM-DD format.")
    return identifiers


def validate_source_references(value, identifiers, errors):
    """Allow future lessons to carry sourceIds without changing the validator."""
    if isinstance(value, dict):
        for key, child in value.items():
            if key == "sourceIds":
                if not isinstance(child, list):
                    errors.append("content.json: every sourceIds field must be an array.")
                    continue
                seen = set()
                for index, identifier in enumerate(child):
                    label = f"content.json: sourceIds entry {index}"
                    if not nonempty_string(identifier):
                        errors.append(f"{label} must be a nonempty string.")
                    elif identifier in seen:
                        errors.append(f"{label} duplicates an id in the same reference list.")
                    else:
                        seen.add(identifier)
                        if identifier not in identifiers:
                            errors.append(f"{label} has no matching id in sources.json.")
            else:
                validate_source_references(child, identifiers, errors)
    elif isinstance(value, list):
        for child in value:
            validate_source_references(child, identifiers, errors)


def without_comments(text, javascript=False):
    strings = r'''"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*' '''.rstrip()
    if javascript:
        strings += r"|`(?:\\.|[^`\\])*`"
    comments = r"/\*[\s\S]*?\*/" + (r"|//[^\r\n]*" if javascript else "")
    return re.sub(f"({strings})|{comments}", lambda match: match.group(1) or " ", text)


def css_references(text):
    text = without_comments(text)
    for match in re.finditer(r'''url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)''', text, re.I):
        value = next(group for group in match.groups() if group is not None).strip()
        if not value.startswith("var("):
            yield value
    for match in re.finditer(r'''@import\s+["']([^"']+)["']''', text, re.I):
        yield match.group(1)


def js_references(text):
    text = without_comments(text, javascript=True)
    # Deliberately check complete literal expressions, not concatenated prefixes.
    for match in re.finditer(r'''\b(?:fetch|import)\s*\(\s*(["'])([^"'\n]+)\1\s*[,)]''', text):
        yield match.group(2)
    for match in re.finditer(r'''\b(?:import|export)\s+(?:[^;()]*?\bfrom\s*)?(["'])([^"'\n]+)\1''', text):
        value = match.group(2)
        if value.startswith((".", "/")):
            yield value
    for match in re.finditer(r'''\bnew\s+URL\s*\(\s*(["'])([^"'\n]+)\1\s*,''', text):
        yield match.group(2)
    for match in re.finditer(r'''\.(?:src|href|poster)\s*=\s*(["'])([^"'\n]+)\1\s*[;\n}]''', text):
        yield match.group(2)


class HTMLReferences(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.references = []
        self.inline_tag = None

    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if value is None:
                continue
            if key in {"src", "href", "poster", "data"}:
                self.references.append(value)
            elif key == "style":
                self.references.extend(css_references(value))
            elif key == "srcset" and not value.lstrip().startswith("data:"):
                self.references.extend(part.strip().split()[0] for part in value.split(",") if part.strip())
        if tag in {"script", "style"}:
            self.inline_tag = tag

    def handle_endtag(self, tag):
        if tag == self.inline_tag:
            self.inline_tag = None

    def handle_data(self, data):
        if self.inline_tag == "script":
            self.references.extend(js_references(data))
        elif self.inline_tag == "style":
            self.references.extend(css_references(data))


def check_local_reference(reference, origin, root, errors):
    if not reference or reference.startswith("#") or "${" in reference:
        return
    label = origin.relative_to(root).as_posix()
    try:
        parsed = urlsplit(reference.strip())
    except ValueError:
        errors.append(f"{label}: malformed asset URL.")
        return
    if parsed.scheme or parsed.netloc:
        if parsed.scheme.lower() == "file":
            errors.append(f"{label}: file URLs are not portable project assets.")
        return
    path = unquote(parsed.path)
    if not path:
        return
    if "\x00" in path or "\\" in path:
        errors.append(f"{label}: local asset paths must use portable URL separators.")
        return
    candidate = (root / path.lstrip("/") if path.startswith("/") else origin.parent / path).resolve()
    if not inside(candidate, root):
        errors.append(f"{label}: a local asset reference escapes the project directory.")
    elif not candidate.is_file() and not (candidate.is_dir() and (candidate / "index.html").is_file()):
        errors.append(f"{label}: missing local asset {candidate.relative_to(root).as_posix()}.")


def validate_assets(root, errors):
    for path in sorted(root.rglob("*")):
        if any(part in SKIP_DIRECTORIES for part in path.relative_to(root).parts):
            continue
        if not inside(path.resolve(), root):
            errors.append("Project contains a symlink or path that escapes its directory.")
            continue
        if not path.is_file() or path.suffix.lower() not in TEXT_EXTENSIONS:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except (OSError, UnicodeError):
            errors.append(f"{path.relative_to(root).as_posix()}: could not read UTF-8 text.")
            continue
        if path.suffix.lower() in {".html", ".htm"}:
            parser = HTMLReferences()
            parser.feed(text)
            references = parser.references
        elif path.suffix.lower() == ".css":
            references = css_references(text)
        else:
            references = js_references(text)
        for reference in set(references):
            check_local_reference(reference, path, root, errors)


def validate_project(project, release=False):
    """Return structural errors; never fetch URLs or evaluate project code."""
    root = Path(project).expanduser().resolve()
    errors = []
    if not root.is_dir():
        return ["Project path must be an existing directory."]
    for name in REQUIRED_FILES:
        path = root / name
        if not inside(path.resolve(), root):
            errors.append(f"{name}: required file escapes the project directory.")
        elif not path.is_file():
            errors.append(f"Missing required file: {name}.")
    if errors:
        return errors
    content = read_json(root / "content.json", "content.json", errors)
    sources = read_json(root / "sources.json", "sources.json", errors)
    validate_content(content, errors, release)
    identifiers = validate_sources(sources, errors, release)
    validate_source_references(content, identifiers, errors)
    validate_assets(root, errors)
    return list(dict.fromkeys(errors))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("project", type=Path, help="Directory containing the static project.")
    parser.add_argument("--release", action="store_true", help="Require ready status and cited sources in addition to the schema checks.")
    args = parser.parse_args()
    try:
        errors = validate_project(args.project, args.release)
    except (OSError, ValueError, RuntimeError):
        print("Validation failed: project paths could not be read safely.", file=sys.stderr)
        return 1
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print("Structural release checks passed." if args.release else "Structural prototype checks passed.")
    print("Factual accuracy, educational effectiveness, and runtime behavior still require review.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
