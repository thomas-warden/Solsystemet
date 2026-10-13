# Solsystemet

Working title: ATLAS — Living Worlds (Version 10). This repository is the starting point for Solsystemet, an interactive astronomical atlas designed for ages 8 and up.

A work-in-progress interactive astronomical experience focused on Earth, Jupiter and Saturn.

## Start

Run a static server in this directory:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080/`. A Chromium / Safari browser with WebGL2 is recommended. No JavaScript packages need installing.

The `/assets` directory is part of the application. Do not separate it from `index.html`, `style.css` and `app.js`.

## What is implemented

- WebGL2 fragment-shader renderer (no pre-rendered rotation-frame playback).
- Earth: independently moving cloud sampling, fixed solar direction, day/night lighting, night lights, selectable locations, solar-time comparison and continuous rotation.
- Jupiter: atmospheric latitude distortion, multiple oscillation bands, stylised storm reconstruction, approach and Earth-size reference.
- Saturn: spatially intersected ring plane with banded material, changing camera angle and differentially moving illustrative ice particles.
- Responsive editorial interface, controls, keyboard focus, spoken explanations, reduced-motion consideration and illustration fallback when GPU unavailable.

## Scientific and design limitations

- This is a visual prototype, not a scientific fluid simulation or film-quality production renderer. Jupiter's wind field, Great Red Spot reconstruction and Saturn's ice visualization are artistic representations.
- Atmospheric cloud data is a reused synthetic/derived layer and not a live Earth weather feed.
- Earth local solar time is simplified by longitude, rather than civil time zones, equation of time or seasons. It should not be described as local clock time.
- Ring geometry is simplified, not a full ring dynamics calculation. Relative inner/outer speed follows Keplerian scaling conceptually.
- The origin and downstream licensing of inherited synthetic Jupiter/Saturn assets should be audited before public distribution.
- Physical iPad performance and shader compatibility have not yet been tested. The sandbox Chromium navigation was blocked by administrator policy; visual QA could not be completed here.

## Version quality gate

Test in actual Safari on an iPad and Chrome on desktop, capture Earth/Jupiter/Saturn in motion, inspect cloud texture continuity, rendering speed, ring perspective, screenshot composition and touch semantics, then refine based on observed problems. Do not call this a 10/10 or production-ready build without that review.
