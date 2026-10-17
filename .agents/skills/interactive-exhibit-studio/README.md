# Interactive Exhibit Studio

A Codex skill and working visual reference for creating ambitious interactive web exhibits. Version 1.0.0.

The package carries over the parts of Solsystemet that establish its visual quality: detailed credited assets, a dominant scene, considered typography, coherent manipulation and movement, and browser-based visual refinement. It also retains sourcing, accessibility, and meaningful learning.

## Install and invoke

Extract the ZIP into a project's `.agents/skills/` directory, or into `~/.agents/skills/` for personal reuse. The installed path should end in:

```text
.agents/skills/interactive-exhibit-studio/SKILL.md
```

Start a new Codex session or refresh skill discovery. In this repository the source package is already in that location.

Install the complete package, including its `assets/`, `references/`, and `scripts/` directories. Copying only `SKILL.md` omits the visual reference and implementation kit. If a cloud skill installation exposes only instruction text, also make the extracted package available in the execution workspace.

Invoke it explicitly:

```text
Use $interactive-exhibit-studio to build Into the Deep: an impressive ocean
explorer for an eight-year-old, with a memorable descent and creatures to inspect.
```

Use this skill in place of `interactive-learning-worlds` when visual ambition is the priority. The earlier package remains available for its activity demonstrations; invoking this skill explicitly selects the new production workflow. Installing this directory does not update a previously uploaded cloud copy automatically.

## What is included

- A practical art-direction and asset-production workflow.
- A finished Earth exhibit with local imagery, fonts, and rendering dependencies.
- Reusable motion, scene-lifecycle, camera-transition, and label patterns.
- Guidance for oceans, dinosaurs, cultures, machines, and scientific systems.
- Visual-review criteria and reference captures.
- Safe scaffolding, portability checks, and reproducible ZIP packaging.
- A second worked example, the illustrated Into the Deep ocean exhibit, and a record of its fresh-project trial.

The reference is a worked Earth exhibit. Another subject needs appropriate content and visual assets; the scaffolder intentionally preserves the example's identity and attribution.

## Run the reference

From the skill directory, with Python 3 installed:

```sh
python3 -m http.server 8080 --bind 127.0.0.1 --directory assets/reference
```

Open `http://127.0.0.1:8080/`. Its JavaScript modules and assets must be served over HTTP. Runtime dependencies are bundled; the reference needs no API keys or external runtime service. The interactive reference uses WebGL with a still-image fallback.

To copy the reference into a new project:

```sh
python3 scripts/scaffold.py --output /tmp/my-exhibit
python3 scripts/validate.py /tmp/my-exhibit
```

The output directory must be new. Read its README before adapting the scene. Prefer a narrower finished exhibit to a large unfinished catalogue.

## Try the ocean example

Serve `examples/into-the-deep/` over HTTP, or export a portable HTML file with all of its images, fonts, code, and credits embedded:

```sh
python3 scripts/export-ocean.py --output /tmp/Into-the-Deep.html
```

Open that HTML file in a modern browser. It works offline; following its external scientific-source links needs a network connection. The exporter is specific to this illustrated example, rather than a general WebGL bundler.

## Review and packaging

See [the skill procedure](SKILL.md), [visual review](references/visual-review.md), [reference captures](examples/reference-captures.md), and [the transfer trial](examples/transfer-trial.md).

```sh
python3 scripts/package.py --output /tmp/interactive-exhibit-studio-1.0.0.zip
```

The archive contains one installable directory, an integrity manifest, and a separate checksum. The packager excludes hidden files and build caches. No new blanket license is assigned to the user's work; bundled third-party assets retain their recorded rights and attribution. See [NOTICE](NOTICE.md).

Rendering and interaction checks do not establish that a child can use an exhibit unaided or that it maintains a particular frame rate on a physical phone. Those results require observation on the intended devices and with the intended learners.
