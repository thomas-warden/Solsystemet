# Interactive Learning Worlds

A portable Codex skill for creating educational web apps with exploration, meaningful interaction, short guided missions, and carefully tested motion. Version 1.0.0.

Inspired by the development and review of [Solsystemet](https://thomas-warden.github.io/Solsystemet/), including the lesson that static screenshots do not catch unstable animated labels.

## Install

The skill directory is already in this repository's `.agents/skills/` directory. Start a new Codex session in this repository so its skill discovery can pick it up.

To use the ZIP in another project, extract it into that project's `.agents/skills/` directory. The resulting path should be:

```text
your-project/.agents/skills/interactive-learning-worlds/SKILL.md
```

For personal reuse across projects, extract the same directory into `~/.agents/skills/` instead. Restart the session or refresh available skills after installing. The archive contains one top-level `interactive-learning-worlds/` directory, so do not add an extra directory of that name when extracting.

No API keys or account configuration are needed to install or run the starter.

## Use

```text
Use $interactive-learning-worlds to create a dinosaur explorer for ages 8–10.
Include three discovery missions, interactive size comparisons, and a fossil reveal.
```

Other starting points are an interactive periodic table, a cultural atlas, a machine museum, and an ocean explorer. See [example prompts](examples/prompts.md).

The skill tells Codex how to plan, implement, critique, test, and deliver an app. The generated app runs independently of Codex. A title or topic substitution does not turn the starter's abstract demonstrations into a researched subject app; building the actual content is part of the skill workflow.

## Included

| Path | Purpose |
| --- | --- |
| `SKILL.md` | Trigger guidance and the complete working procedure |
| `agents/openai.yaml` | Display name and default invocation prompt |
| `references/` | Learning design, five subject recipes, motion/accessibility, quality/publication |
| `assets/starter/` | Dependency-free working compare/reveal/order demonstration app |
| `assets/patterns/` | Optional reusable labels for moving objects |
| `scripts/scaffold.py` | Create a new starter without overwriting existing work |
| `scripts/validate.py` | Check project structure, content fields and source references |
| `scripts/package.py` | Build a ZIP with a file-hash manifest and archive checksum |
| `examples/` | A learning brief and example skill requests |

## Try the starter

Python 3 is the only tooling requirement. From the skill directory:

```sh
python3 scripts/scaffold.py --output /tmp/learning-world-demo --topic dinosaurs --title "Dinosaur Discovery"
python3 scripts/validate.py /tmp/learning-world-demo
python3 -m http.server 8080 --bind 127.0.0.1 --directory /tmp/learning-world-demo
```

Open `http://127.0.0.1:8080/`. Serve the files over HTTP: opening `index.html` directly as a local file will prevent its JSON fetches from working reliably. The starter needs a modern browser and uses no external runtime libraries or media assets.

After replacing the demonstration with reviewed subject content, populate the source ledger and use the release check described by `python3 scripts/validate.py --help`. A passing check is a structural result, not proof that a lesson is scientifically accurate or effective with children.

## Package or redistribute your copy

```sh
python3 scripts/package.py --output /tmp/interactive-learning-worlds-1.0.0.zip
```

The packager refuses to overwrite an existing ZIP or include files outside the package. It excludes hidden files (including `.env`), caches, and generated archives. It adds `manifest.json` with a SHA-256 for every packaged file and writes a `.sha256` checksum beside the ZIP. The installed package does not require that generated manifest to function.

The package includes authored code and documentation. Planetary imagery, fonts, Three.js, credentials, and local test artifacts from Solsystemet are not bundled. See [NOTICE](NOTICE.md) for provenance.

## Scope of validation

The shipped scripts check reproducibility and structure. Browser interaction checks should be adapted to the finished subject app, especially when it introduces WebGL, external assets, new mission logic, or hosting. Real-device motion quality and learning outcomes require observation on those devices and with the intended learners.
