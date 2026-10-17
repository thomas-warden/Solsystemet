#!/usr/bin/env python3
"""Check a static exhibit's local file references and optional sources.json.

Only literal HTML/CSS URLs and common JavaScript references are checked. This
does not evaluate visual quality, facts, accessibility, or runtime behavior;
constructed URLs and external services need browser and editorial review.
"""

import argparse
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit


TEXT_EXTENSIONS = {".html", ".htm", ".svg", ".css", ".js", ".mjs"}
SKIP_DIRECTORIES = {".git", "node_modules", "__pycache__", ".pytest_cache"}


def inside(path, root):
    try:
        path.relative_to(root)
        return True
    except ValueError:
        return False


def nonempty_string(value):
    return isinstance(value, str) and bool(value.strip())


def valid_https_url(value):
    if not nonempty_string(value) or any(char.isspace() for char in value):
        return False
    try:
        parsed = urlsplit(value)
        parsed.port
        return (parsed.scheme == "https" and bool(parsed.hostname)
                and parsed.username is None and parsed.password is None)
    except ValueError:
        return False


def without_comments(text, javascript=False):
    # A quote in a JavaScript regular expression must not start a string that
    # swallows later documentation. Ordinary quoted strings cannot span raw
    # newlines; escaped line continuations can.
    strings = r'''"(?:\\[\s\S]|[^"\\\r\n])*"|'(?:\\[\s\S]|[^'\\\r\n])*' '''.rstrip()
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
    for match in re.finditer(r'''\b(?:fetch|import|load)\s*\(\s*(["'])([^"'\n]+)\1\s*[,)]''', text):
        yield match.group(2)
    for match in re.finditer(r'''\b(?:import|export)\s+(?:[^;()]*?\bfrom\s*)?(["'])([^"'\n]+)\1''', text):
        value = match.group(2)
        if value.startswith((".", "/")):
            yield value
    for match in re.finditer(r'''\bnew\s+URL\s*\(\s*(["'])([^"'\n]+)\1\s*,''', text):
        yield match.group(2)
    for match in re.finditer(r'''\.(?:src|href|poster)\s*=\s*(["'])([^"'\n]+)\1\s*[;\n}]''', text):
        yield match.group(2)
    # Texture paths often live in configuration objects, outside load() calls.
    # Ignore concatenated prefixes; runtime-built paths need browser testing.
    for match in re.finditer(r'''(["'])(\.{1,2}/[^"'\n]*)\1''', text):
        if not text[match.end():].lstrip().startswith("+"):
            yield match.group(2)


class HTMLReferences(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.references = []
        self.inline_tag = None
        self.import_map = False

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        for key, value in attrs:
            if value is None:
                continue
            if key in {"src", "href", "xlink:href", "poster", "data"}:
                self.references.append(value)
            elif key == "style":
                self.references.extend(css_references(value))
            elif key == "srcset" and not value.lstrip().startswith("data:"):
                self.references.extend(part.strip().split()[0] for part in value.split(",") if part.strip())
        if tag in {"script", "style"}:
            self.inline_tag = tag
            self.import_map = tag == "script" and attributes.get("type") == "importmap"

    def handle_endtag(self, tag):
        if tag == self.inline_tag:
            self.inline_tag = None
            self.import_map = False

    def handle_data(self, data):
        if self.import_map:
            try:
                mapping = json.loads(data)
            except json.JSONDecodeError:
                return  # Import-map syntax is exercised by browser checks.
            if isinstance(mapping, dict):
                groups = [mapping.get("imports", {})]
                scopes = mapping.get("scopes", {})
                if isinstance(scopes, dict):
                    groups.extend(scopes.values())
                for group in groups:
                    if isinstance(group, dict):
                        self.references.extend(value for value in group.values() if isinstance(value, str))
        elif self.inline_tag == "script":
            self.references.extend(js_references(data))
        elif self.inline_tag == "style":
            self.references.extend(css_references(data))


def check_local_reference(reference, origin, root, errors, local_only=False):
    label = origin.relative_to(root).as_posix()
    if not reference or reference.startswith("#") or "${" in reference:
        if local_only:
            errors.append(f"{label}: source files must name local project files.")
        return
    try:
        parsed = urlsplit(reference.strip())
    except ValueError:
        errors.append(f"{label}: malformed asset URL.")
        return
    if parsed.scheme or parsed.netloc:
        if local_only or parsed.scheme.lower() == "file":
            errors.append(f"{label}: expected a relative local project file.")
        return
    path = unquote(parsed.path)
    if not path:
        if local_only:
            errors.append(f"{label}: source files must name local project files.")
        return
    if path.startswith("/"):
        errors.append(f"{label}: root-relative URLs are not portable to a hosted subdirectory.")
        return
    if "\x00" in path or "\\" in path:
        errors.append(f"{label}: local asset paths must use portable URL separators.")
        return
    candidate = (origin.parent / path).resolve()
    if not inside(candidate, root):
        errors.append(f"{label}: a local asset reference escapes the project directory.")
    elif not candidate.is_file() and not (not local_only and candidate.is_dir()):
        errors.append(f"{label}: missing local asset {candidate.relative_to(root).as_posix()}.")


def validate_sources(root, errors):
    path = root / "sources.json"
    if not path.exists() and not path.is_symlink():
        return
    if not inside(path.resolve(), root):
        errors.append("sources.json: manifest escapes the project directory.")
        return
    try:
        registry = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        errors.append(f"sources.json: invalid JSON at line {error.lineno}, column {error.colno}.")
        return
    except (OSError, UnicodeError):
        errors.append("sources.json: could not read UTF-8 JSON.")
        return
    if not isinstance(registry, dict) or not isinstance(registry.get("sources"), list):
        errors.append("sources.json: expected an object containing a sources array.")
        return
    if type(registry.get("schemaVersion")) is not int or registry["schemaVersion"] != 1:
        errors.append("sources.json: schemaVersion must be the integer 1.")
    identifiers = set()
    for index, entry in enumerate(registry["sources"]):
        label = f"sources.json: sources[{index}]"
        if not isinstance(entry, dict):
            errors.append(f"{label} must be an object.")
            continue
        for field in ("id", "title"):
            if not nonempty_string(entry.get(field)):
                errors.append(f"{label}.{field} must be a nonempty string.")
        identifier = entry.get("id")
        if nonempty_string(identifier):
            if identifier in identifiers:
                errors.append(f"{label}.id duplicates an earlier source id.")
            identifiers.add(identifier)
        if not valid_https_url(entry.get("url")):
            errors.append(f"{label}.url must be an HTTPS URL without embedded credentials.")
        for field in ("credit", "license"):
            if field in entry and not nonempty_string(entry[field]):
                errors.append(f"{label}.{field} must be a nonempty string when provided.")
        if "licenseUrl" in entry and not valid_https_url(entry["licenseUrl"]):
            errors.append(f"{label}.licenseUrl must be an HTTPS URL without embedded credentials.")
        for field in ("processing", "limitations"):
            if field in entry and not (isinstance(entry[field], str) or
                    isinstance(entry[field], list) and all(nonempty_string(item) for item in entry[field])):
                errors.append(f"{label}.{field} must be text or an array of nonempty strings.")
        if "files" in entry:
            if not isinstance(entry["files"], list) or any(not nonempty_string(item) for item in entry["files"]):
                errors.append(f"{label}.files must be an array of nonempty relative file paths.")
            else:
                for item in entry["files"]:
                    check_local_reference(item, path, root, errors, local_only=True)


def validate_project(project):
    """Return structural errors without fetching URLs or evaluating code."""
    root = Path(project).expanduser().resolve()
    errors = []
    if not root.is_dir():
        return ["Project path must be an existing directory."]
    entry = root / "index.html"
    if not entry.is_file() or not inside(entry.resolve(), root):
        return ["A local index.html entry point is required."]
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
        if path.suffix.lower() in {".html", ".htm", ".svg"}:
            parser = HTMLReferences()
            parser.feed(text)
            references = parser.references
        elif path.suffix.lower() == ".css":
            references = css_references(text)
        else:
            references = js_references(text)
        for reference in sorted(set(references)):
            check_local_reference(reference, path, root, errors)
    validate_sources(root, errors)
    return list(dict.fromkeys(errors))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("project", type=Path, help="Static project directory containing index.html.")
    args = parser.parse_args()
    try:
        errors = validate_project(args.project)
    except (OSError, ValueError, RuntimeError):
        print("Validation failed: project paths could not be read safely.", file=sys.stderr)
        return 1
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print("Structural checks passed.")
    print("Visual quality, factual accuracy, accessibility, and browser behavior still require review.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
