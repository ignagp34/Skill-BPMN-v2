# Third-Party Notices

This project redistributes and/or depends on third-party software. Their
licenses and copyright notices are reproduced or referenced below, as required
by those licenses. Notation, schema, and documentation attributions are in
[`docs/ATTRIBUTION.md`](docs/ATTRIBUTION.md).

Dependencies are **not** vendored into this repository (`node_modules/` and
build output are git-ignored); they are installed via pnpm / pip and are linked
or bundled into the deployed applications. This file is the aggregated notice
for the components that ship in, or are used to build, those applications.

License texts: MIT <https://opensource.org/license/mit>, Apache-2.0
<https://www.apache.org/licenses/LICENSE-2.0>, ISC
<https://opensource.org/license/isc-license-txt>, BSD-2/3-Clause
<https://opensource.org/license/bsd-3-clause>, MPL-2.0
<https://www.mozilla.org/MPL/2.0/>, Blue Oak Model License 1.0.0
<https://blueoakcouncil.org/license/1.0.0>, CC-BY-4.0
<https://creativecommons.org/licenses/by/4.0/>.

---

## 1. bpmn.io toolkit — `bpmn-js`, `diagram-js` (special obligation)

**Packages:** `bpmn-js@17.11.1`, `diagram-js@14.11.3`, and related
`@bpmn-io/*` modules.
**Copyright (c) 2014-present Camunda Services GmbH.**
**License:** the bpmn.io License (MIT-style, with an added watermark clause).

The full license text, as distributed in `bpmn-js`, is reproduced verbatim:

```
Copyright (c) 2014-present Camunda Services GmbH

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in the
Software without restriction, including without limitation the rights to use, copy,
modify, merge, publish, distribute, sublicense, and/or sell copies of the Software,
and to permit persons to whom the Software is furnished to do so, subject to the
following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

The source code responsible for displaying the bpmn.io project watermark that
links back to https://bpmn.io as part of rendered diagrams MUST NOT be
removed or changed. When this software is being used in a website or application,
the watermark must stay fully visible and not visually overlapped by other elements.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE
OR OTHER DEALINGS IN THE SOFTWARE.
```

**Compliance statement.** This obligation is **honored**. Both applications
(`apps/tfm-lab` and `apps/company-web`) render diagrams with the unmodified
`bpmn-js` watermark (`<a class="bjs-powered-by" href="http://bpmn.io">`, bottom-
right of the canvas). The watermark element is never removed, resized, recolored,
made transparent, or otherwise altered. In `company-web`, the on-canvas zoom
control (`.canvas-zoom`) was repositioned upward (CSS only) so that it no longer
overlaps the watermark; the watermark stays fully visible and clickable. In
`tfm-lab`, no UI element overlaps the watermark.

---

## 2. Production / runtime dependencies (npm)

All runtime dependencies are permissive. Copyright holders shown where a notice
must be preserved.

### MIT License

| Package | Version | Copyright |
|---|---|---|
| `react`, `react-dom`, `scheduler` | 18.3.1 / 0.23.2 | © Facebook, Inc. and its affiliates (Meta) |
| `docx` | 9.7.1 | © 2016 Dolan Miu |
| `diagram-js`, `diagram-js-direct-editing` | 14.11.3 | © 2014-present Camunda Services GmbH |
| `bpmn-moddle`, `moddle`, `moddle-xml` | 8.1.0 / 6.2.3 | © 2014-present Camunda Services GmbH |
| `bpmn-auto-layout` | 0.5.0 | © bpmn.io / Camunda Services GmbH (a modified copy of its `dist/index.js` is vendored in `tools/layout-lab/harness/v12/auto-layout.js`, layout-lab only) |
| `min-dash`, `min-dom`, `tiny-svg`, `didi`, `ids`, `object-refs`, `saxen`, `@bpmn-io/diagram-js-ui` | — | © bpmn.io / Camunda Services GmbH |
| `jszip` | 3.10.1 | © 2009-2016 Stuart Knightley, David Duponchel, Franz Buchinger, António Afonso — **dual-licensed (MIT OR GPL-3.0-or-later); MIT elected here** |
| `nanoid` | 3.3.12 | © 2017 Andrey Sitnik |
| `clsx`, `domify`, `component-event`, `hash.js`, `immediate`, `lie`, `loose-envify`, `js-tokens`, `isarray`, `core-util-is`, `process-nextick-args`, `readable-stream`, `safe-buffer`, `string_decoder`, `util-deprecate`, `setimmediate`, `xml`, `xml-js`, `preact`, `path-intersection`, `@types/node`, `undici-types` | — | Respective authors (see each package's LICENSE) |

> `path-intersection` (MIT) bundles a NOTICE: its implementation is derived from
> intersection logic in Snap.svg, © 2013 Adobe Systems Incorporated, licensed
> under the Apache License 2.0.

### Apache License 2.0

| Package | Version | Copyright |
|---|---|---|
| `chevrotain` and `@chevrotain/*` (`cst-dts-gen`, `gast`, `regexp-to-ast`, `types`, `utils`) | 12.0.0 | © Chevrotain contributors (Shahar Soel and contributors) |
| `htm` | 3.1.1 | © Jason Miller |

> Apache-2.0 requires preserving the license and any `NOTICE` file. None of the
> Apache-2.0 runtime packages above ship a `NOTICE` file, so there is no NOTICE
> content to propagate beyond this attribution.

### ISC License

| Package | Copyright |
|---|---|
| `inherits`, `inherits-browser`, `minimalistic-assert` | Respective authors (see each package's LICENSE) |

### Blue Oak Model License 1.0.0

| Package | Version |
|---|---|
| `sax` | (as resolved) |

### Combined / dual

| Package | Version | License |
|---|---|---|
| `pako` | 1.0.11 | MIT AND Zlib — © 2014-2017 Vitaly Puzrin and Andrei Tuputcyn |
| `jszip` | 3.10.1 | MIT OR GPL-3.0-or-later — **MIT elected** (see above) |

---

## 3. Build / development tooling (npm, not shipped to end users)

Used to build, type-check, lint, bundle, and test the project. These do not ship
in the deployed application bundle, but are listed for completeness and because a
few carry reciprocal/attribution terms.

| Package | License | Note |
|---|---|---|
| `typescript`, `playwright`, `playwright-core` | Apache-2.0 | `playwright`/`playwright-core` ship a `NOTICE` (© Microsoft Corp.); preserved if these tools are redistributed. Build/test only. |
| `vite`, `@vitejs/plugin-react`, `vitest`, `tsx`, `esbuild`, `jsdom`, and their transitive deps | MIT / ISC / BSD (various) | Standard permissive toolchain. |
| `lightningcss`, `lightningcss-win32-x64-msvc` | **MPL-2.0** | Weak (file-level) copyleft, pulled in transitively by the build. Used unmodified as a build tool; no source-disclosure obligation is triggered by this usage. Source: <https://github.com/parcel-bundler/lightningcss>. |
| `caniuse-lite` | **CC-BY-4.0** | Browser-support **data** (via browserslist), build-time only, not shipped. Attribution: caniuse.com database, © Alexis Deveria and contributors, CC-BY-4.0. |
| `mdn-data` | CC0-1.0 | Public domain dedication. |

---

## 4. Python dependencies (`TFM-eval` / `bpmn-eval`)

All permissive; no copyleft.

| Package | License |
|---|---|
| `lxml` | BSD-3-Clause (bundles libxml2/libxslt, MIT) |
| `tiktoken` | MIT — © OpenAI |
| `pandas`, `scipy`, `seaborn`, `matplotlib` (viz extra) | BSD-3-Clause / Matplotlib (BSD-style) |
| `jupyterlab` (viz extra) | BSD-3-Clause |
| `pytest`, `pytest-cov`, `mypy`, `ruff`, `lxml-stubs` (dev extra) | MIT / Apache-2.0 |

---

## 5. Fonts (runtime, via Google Fonts — not redistributed)

`company-web` loads these at runtime from Google Fonts; they are not bundled in
this repository:

| Font | License |
|---|---|
| Geist | SIL Open Font License 1.1 (© Vercel) |
| Instrument Serif | SIL Open Font License 1.1 |
| JetBrains Mono | SIL Open Font License 1.1 (© JetBrains) |
| Roboto | Apache License 2.0 (© Google) |

The `bpmn-font` icon font shipped inside `bpmn-js` is covered by the bpmn.io
entry in §1.

---

## 6. Specifications & notation

- **BPMN 2.0 XSD schemas (OMG)** — see [`TFM-eval/schemas/NOTICE.md`](TFM-eval/schemas/NOTICE.md).
- **BPMN Sketch Miner notation** — see [`docs/ATTRIBUTION.md`](docs/ATTRIBUTION.md).
