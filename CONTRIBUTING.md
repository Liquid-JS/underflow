# Contributing to UnderFlow

Thanks for helping to improve UnderFlow.

## Issues

Report bugs and request features on [GitHub issues](https://github.com/Liquid-JS/underflow/issues). Search the
existing issues first, including closed ones. For a bug, describe the exact steps that reproduce it, what you
expected and what happened instead; markdown samples, screenshots and the editor options you use help a lot.

Before you propose a new markdown syntax, check that other renderers understand it: UnderFlow writes markdown that
CommonMark, GFM or an existing remark extension renders the same way. Syntax specific to your project belongs in a
plugin (see [docs/plugin.md](docs/plugin.md)).

## Development

The repository is a single package managed with Yarn 4. Run `yarn install`, then:

-   `yarn start` - demo page with the editor and the viewer, served from source by Vite
-   `yarn build` - build the library into `lib/` with Rollup, including the type declarations, which are emitted from
    the sources next to the JavaScript
-   `yarn test` - run the tests with Vitest; `yarn test:watch` keeps them running
-   `yarn test:types` - type check
-   `yarn lint` - ESLint, including the formatting rules; `yarn lint:fix` applies fixes
-   `yarn lint:sass` - stylelint for the SCSS; `yarn lint:sass:fix` applies fixes
-   `yarn lint:html` - formats the HTML pages with js-beautify
-   `yarn smoke` - pack the library and install it into `smoke/`, an application that type checks, bundles and runs
    it in Chromium, Firefox and WebKit with Playwright (run `npx playwright install chromium firefox webkit` in
    `smoke/` once)

Layout:

-   `src/index.ts`, `src/viewer.ts`, `src/parser.ts`, `src/plugins/<name>.ts` - the package's entry points
-   `src/editor` - the editor, viewer and UI; `src/editor/i18n` holds one file per locale,
    `src/editor/styles` the stylesheets (also published as SCSS under `lib/scss`) and `src/editor/types` the type definitions (options, plugin API, events)
-   `src/parser` - the incremental markdown parser (derived from commonmark.js), published as `@liquid-js/underflow/parser`;
    `src/parser/types` holds its node, renderer and option types
-   `src/plugins/<name>` - plugins, each published as `@liquid-js/underflow/plugins/<name>` from `src/plugins/<name>.ts`
-   `demo/` - the development page used by `yarn start`
-   `smoke/` - a consumer application used by `yarn smoke` to check the packed library
-   tests sit next to the code they test, in a `<file>.spec.ts` named after it (`editor.ts` -> `editor.spec.ts`);
    further suites for the same file add a qualifier (`md-editor.keymaps.spec.ts`), and shared test helpers live in `test/`

Each entry point in `src/` (`index.ts`, `viewer.ts`, `parser.ts`, `plugins/<name>.ts`) exports the public API, types included; the published declarations are generated
from the sources, so there are no hand-written `.d.ts` files to keep in step. Import with relative paths; code in
`src/editor` and `src/plugins` imports the parser and the editor through the package's own entry points
(`@liquid-js/underflow/parser`, `@liquid-js/underflow`), which stay external in the build. Class members that
aren't part of the public API are `private`, or `/** @internal */` (left out of the declarations) when other
modules need them.

The stylesheets use no images: icons are SVG files in `src/editor/ui/icons`, imported as text
(`with { type: 'text' }`) and rendered inline, and other shapes, like the task checkbox, are drawn in CSS.

File and folder names are kebab-case (`md-editor.ts`, `node-views/`); dots only separate qualifiers and extensions
(`.spec.ts`, `.d.ts`). Sass partials start with `_`.

## Pull requests

-   Branch from `master`, and include tests for every fix or feature.
-   Export new public types from their entry point (`src/index.ts`, `src/viewer.ts`, `src/parser.ts` or
    `src/plugins/<name>.ts`), and document new options or APIs in `docs/`.
-   `yarn lint`, `yarn test:types` and `yarn test` must pass.
-   Send the pull request to `Liquid-JS/underflow:master`.

## Commit messages

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org) and are checked by commitlint
when you commit. The changelog is generated from them.

    <type>(<scope>): <subject>

    <body>

    <footer>

-   **type**: `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`, `ci`, `style` or `chore`
-   **scope** (optional): the area changed, such as `editor`, `parser`, `i18n` or a plugin name
-   **subject**: imperative, present tense, lower case, no full stop ("fix list indentation", not "Fixed...")
-   **body** (optional): what was wrong and why the change fixes it
-   **footer** (optional): `BREAKING CHANGE: <description>` for incompatible changes, and `Closes #123` for issues

A commit that brings in a change from another project keeps the original author and names its source in the footer,
for example `Ported-from: owner/repo#123`.
