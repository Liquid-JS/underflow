# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [4.0.0-7](https://github.com/Liquid-JS/underflow/compare/v4.0.0-6...v4.0.0-7) (2026-11-08)

### Bug Fixes

* readonly state, toolbar layout ([8d02b64](https://github.com/Liquid-JS/underflow/commit/8d02b6484b839a78eb58fa36d0da5115e080305b))
## [4.0.0-6](https://github.com/Liquid-JS/underflow/compare/v4.0.0-5...v4.0.0-6) (2026-11-07)
## [4.0.0-5](https://github.com/Liquid-JS/underflow/compare/v4.0.0-4...v4.0.0-5) (2026-11-07)

### Features

* improve a11y ([7bee9c9](https://github.com/Liquid-JS/underflow/commit/7bee9c9517bc63693aca2625682bf59ea6b976cb))
## [4.0.0-4](https://github.com/Liquid-JS/underflow/compare/v4.0.0-3...v4.0.0-4) (2026-11-06)
## [4.0.0-3](https://github.com/Liquid-JS/underflow/compare/v4.0.0-2...v4.0.0-3) (2026-11-06)

### Features

* icon, colours ([3020d94](https://github.com/Liquid-JS/underflow/commit/3020d943ddcf2af295f2969b88781f73725fcd04))
## [4.0.0-2](https://github.com/Liquid-JS/underflow/compare/v4.0.0-1...v4.0.0-2) (2026-11-06)
## [4.0.0-1](https://github.com/Liquid-JS/underflow/compare/v4.0.0-0...v4.0.0-1) (2026-11-06)

### Bug Fixes

* import naming ([7f91535](https://github.com/Liquid-JS/underflow/commit/7f91535115fefe79522965f6c349e349745f8ccf))
## [4.0.0-0](https://github.com/Liquid-JS/underflow/compare/v3.0.0...v4.0.0-0) (2026-11-06)

### ⚠ BREAKING CHANGES

* **ui:** draw the interface with inline SVG and follow the ARIA patterns
* **wysiwyg:** edit links, images and tables in place and keep more of the markdown
* **i18n:** export the locales as data and add Indonesian, Vietnamese, Nynorsk and Persian
* **code-syntax-highlight:** highlight code with highlight.js
* **markdown:** highlight the cursor line and align the shortcuts with WYSIWYG
* **convertors:** keep the markdown intact through WYSIWYG
* **editor:** modernise the editor core and its API
* publish one ESM package, @liquid-js/underflow
* **parser:** publish the parser as @liquid-js/underflow/parser and follow CommonMark 0.31.2
* remove the React and Vue wrappers and the chart, UML, color-syntax and merged-cell plugins
* **styles:** write the stylesheets in SCSS with uf- classes and CSS variable themes

### build

* publish one ESM package, @liquid-js/underflow ([6cc4251](https://github.com/Liquid-JS/underflow/commit/6cc4251f3bc1c4854696127de9825a0d6d5cdcbe))
* remove the React and Vue wrappers and the chart, UML, color-syntax and merged-cell plugins ([d356128](https://github.com/Liquid-JS/underflow/commit/d3561282befe083bde4db40a8e2b015a320a2b0b))

### Features

* add `customBlock` command ([#2273](https://github.com/Liquid-JS/underflow/issues/2273)) ([3d7f746](https://github.com/Liquid-JS/underflow/commit/3d7f746c34e70c3baca4fcda64fd2677bac8e547))
* add an 'autofocus' option that can disable initial focus (close [#1730](https://github.com/Liquid-JS/underflow/issues/1730)) ([#1772](https://github.com/Liquid-JS/underflow/issues/1772)) ([6bab7db](https://github.com/Liquid-JS/underflow/commit/6bab7dbbd9fca4e90b6e3226492de0e944222406))
* add api for converting position to match editor mode ([#2622](https://github.com/Liquid-JS/underflow/issues/2622)) ([723c100](https://github.com/Liquid-JS/underflow/commit/723c1001640fb568281ef79f44316d9b79ced5c2))
* add disabledEntityParse on toastMark through mdParser in Plugin ([#2506](https://github.com/Liquid-JS/underflow/issues/2506)) ([457da28](https://github.com/Liquid-JS/underflow/commit/457da286ee2cd21288183b95bcf71ec4da5fa90f))
* add plugin interface (editorCore instance, keymap) ([3e33fd7](https://github.com/Liquid-JS/underflow/commit/3e33fd743461ac1e21b4e8b359d8d3e5ce5ab045))
* add some aria attributes ([#1696](https://github.com/Liquid-JS/underflow/issues/1696)) ([41d65d7](https://github.com/Liquid-JS/underflow/commit/41d65d7c26172247a74c6e22bf6e0fe09f0f1e3c))
* **code-syntax-highlight:** highlight code with highlight.js ([30fd974](https://github.com/Liquid-JS/underflow/commit/30fd974fad2d0f1cf0be4389da81c452a75bd7b3))
* **editor:** modernise the editor core and its API ([890be1f](https://github.com/Liquid-JS/underflow/commit/890be1f53caabdf6d67bf316557cd07d733e1ce5))
* emit change event when toggle task in viewer ([#2442](https://github.com/Liquid-JS/underflow/issues/2442)) ([3db3595](https://github.com/Liquid-JS/underflow/commit/3db3595c105840173c2a0cb74f23319a40c788f4))
* expand plugin interface ([#2451](https://github.com/Liquid-JS/underflow/issues/2451)) ([a3326d5](https://github.com/Liquid-JS/underflow/commit/a3326d5957aaf590eb5f72afb7df1689d0bf0126))
* **i18n:** export the locales as data and add Indonesian, Vietnamese, Nynorsk and Persian ([20cab56](https://github.com/Liquid-JS/underflow/commit/20cab56db3601f929128d202bc6de361ee4c4c57))
* **markdown:** highlight the cursor line and align the shortcuts with WYSIWYG ([e57c91d](https://github.com/Liquid-JS/underflow/commit/e57c91d73f6d7fbd165dda9ed58abcfae54fed9a))
* only enable `indent`, `outdent` toolbar item in the list ([#2294](https://github.com/Liquid-JS/underflow/issues/2294)) ([30743f6](https://github.com/Liquid-JS/underflow/commit/30743f6b1b0881aa8f6c0381f00dc2df5c1689ae))
* **parser:** publish the parser as @liquid-js/underflow/parser and follow CommonMark 0.31.2 ([0ba07d2](https://github.com/Liquid-JS/underflow/commit/0ba07d27adb0c91c00cffb12dd1616dc5904c69c))
* replace default sanitizer with `DOMPurify` ([#1813](https://github.com/Liquid-JS/underflow/issues/1813)) ([6e57309](https://github.com/Liquid-JS/underflow/commit/6e5730914902071b54c529673e964a24b58e3eec))
* Reverse the keymap sequence for the plugin. ([2afdf9b](https://github.com/Liquid-JS/underflow/commit/2afdf9ba49b47da9d7ffa41297f1cc8515679956))
* **styles:** write the stylesheets in SCSS with uf- classes and CSS variable themes ([28a9045](https://github.com/Liquid-JS/underflow/commit/28a90451855c7f62f32c5468f3a2893053c7e30b))
* **ui:** draw the interface with inline SVG and follow the ARIA patterns ([8393a38](https://github.com/Liquid-JS/underflow/commit/8393a38bd0d0d515b22e1d0183ee8c87bf34b22a))
* **wysiwyg:** edit links, images and tables in place and keep more of the markdown ([85714df](https://github.com/Liquid-JS/underflow/commit/85714df9f15b6a5e1071fd0d7446a5a65e4e3055))

### Bug Fixes

* `<br>` operation when converting editor mode, pasting data or calling API ([#1807](https://github.com/Liquid-JS/underflow/issues/1807)) ([844efe9](https://github.com/Liquid-JS/underflow/commit/844efe99cabdefa70b2c870a8a6c4fb5c34dd4cc))
* `getHTML()` API result includes placeholder html ([#2301](https://github.com/Liquid-JS/underflow/issues/2301)) ([5dd9efb](https://github.com/Liquid-JS/underflow/commit/5dd9efb76d4e83aa18d1761dd4a63f414d6efb89))
* `getHTML` API trigger change event ([#1632](https://github.com/Liquid-JS/underflow/issues/1632)) ([2b2d26a](https://github.com/Liquid-JS/underflow/commit/2b2d26a796d6f52548c1cfd057c8886cff503cb8))
* add `z-index` css to wysiwyg editor contents for IE11 ([#1745](https://github.com/Liquid-JS/underflow/issues/1745)) ([89fd3c1](https://github.com/Liquid-JS/underflow/commit/89fd3c1f8017f4819d76774b6310b440f1cbb1c2))
* add missing shift-enter keymap ([#1856](https://github.com/Liquid-JS/underflow/issues/1856)) ([253a9a0](https://github.com/Liquid-JS/underflow/commit/253a9a086f5a8ff76a1f7a4be5e104c0b0e44b8c))
* add missing type definition ([#1853](https://github.com/Liquid-JS/underflow/issues/1853)) ([5d1da49](https://github.com/Liquid-JS/underflow/commit/5d1da49953ff1b87de5a0f300531f2c16ad9b16f))
* add missing type definition ([#2628](https://github.com/Liquid-JS/underflow/issues/2628)) ([427ac7e](https://github.com/Liquid-JS/underflow/commit/427ac7e036e5e67a32c7b0c1042295ef86481a22))
* adjust popup button width ([#1671](https://github.com/Liquid-JS/underflow/issues/1671)) ([b350dc4](https://github.com/Liquid-JS/underflow/commit/b350dc4564859fc95b8ac17db3b370d71ad934ee))
* broken converting to markdown when attributes has double quote string ([#2143](https://github.com/Liquid-JS/underflow/issues/2143)) ([0130ebb](https://github.com/Liquid-JS/underflow/commit/0130ebb9120c9daaaf173f296e701b8b75cbddd0))
* broken customHTMLRenderer option type in editorCore ([#1651](https://github.com/Liquid-JS/underflow/issues/1651)) ([c1b132e](https://github.com/Liquid-JS/underflow/commit/c1b132e811f4d95c61960e74de0299f84086f78b))
* broken parsing when removing the blank line in markdown  ([#1721](https://github.com/Liquid-JS/underflow/issues/1721)) ([9a94c61](https://github.com/Liquid-JS/underflow/commit/9a94c61a2f5aceb02ed730f9e75061eeacdc2c7f))
* cannot adjust wysiwyg editor height ([#1697](https://github.com/Liquid-JS/underflow/issues/1697)) ([338f298](https://github.com/Liquid-JS/underflow/commit/338f298c124de88661164b08b9f9781f1b8c3aa4))
* cannot emit load event in react wrapper ([#2107](https://github.com/Liquid-JS/underflow/issues/2107)) ([c63fe9a](https://github.com/Liquid-JS/underflow/commit/c63fe9a6866615f11ab78332cf7202a4ade94d2d))
* cannot execute markdown `list` command below the heading text ([#2102](https://github.com/Liquid-JS/underflow/issues/2102)) ([e70e08a](https://github.com/Liquid-JS/underflow/commit/e70e08a9aad99730de042ef02a61b20ee310b333))
* cannot exit table in wysiwyg ([#2250](https://github.com/Liquid-JS/underflow/issues/2250)) ([9ecc097](https://github.com/Liquid-JS/underflow/commit/9ecc0976f4e9bf645261b820c273cb161e0151d2))
* cannot import i18n bundle ([#1720](https://github.com/Liquid-JS/underflow/issues/1720)) ([b0139a0](https://github.com/Liquid-JS/underflow/commit/b0139a09361e9b59e3be03d743111ea78a33d46b))
* cannot parse the `br` tag when calling `setHTML` API ([#1644](https://github.com/Liquid-JS/underflow/issues/1644)) ([5effae2](https://github.com/Liquid-JS/underflow/commit/5effae25c5a10b714f01d7bd5773f64d06deed48))
* cannot select text when editing customBlock ([#2049](https://github.com/Liquid-JS/underflow/issues/2049)) ([e9c8cc0](https://github.com/Liquid-JS/underflow/commit/e9c8cc0fe8008fcf6b14af84b3055138278a2252)), references [#1678](https://github.com/Liquid-JS/underflow/issues/1678) [#2048](https://github.com/Liquid-JS/underflow/issues/2048)
* cannot toggle custom toolbar state(`active`, `disabled`) ([#1639](https://github.com/Liquid-JS/underflow/issues/1639)) ([9dbfc65](https://github.com/Liquid-JS/underflow/commit/9dbfc65835f1268a8199ecb8c11f216ac0fa89fd))
* clear timer in editor and chart plugin ([#2270](https://github.com/Liquid-JS/underflow/issues/2270)) ([9ce2353](https://github.com/Liquid-JS/underflow/commit/9ce2353c0394eac230b4518f5cb5556434a67a2f))
* convert by using HTML tag when it is not between spaces ([#2572](https://github.com/Liquid-JS/underflow/issues/2572)) ([66db3f8](https://github.com/Liquid-JS/underflow/commit/66db3f8d4099141332fab88e88a8afd191808648))
* **convertors:** keep the markdown intact through WYSIWYG ([4469e8f](https://github.com/Liquid-JS/underflow/commit/4469e8fe3cc22514d827b455d729033ffafae8ed))
* divide the block when pasting text to wysiwyg ([#1854](https://github.com/Liquid-JS/underflow/issues/1854)) ([ea9ddb7](https://github.com/Liquid-JS/underflow/commit/ea9ddb7b69c66adfe08e85c86dfbb3eec2e362a6))
* dom structure ([#1755](https://github.com/Liquid-JS/underflow/issues/1755)) ([e91b950](https://github.com/Liquid-JS/underflow/commit/e91b9500ed2631d0a8d371e95ebf10662b19aa83))
* editor cannot convert html comment node ([#2297](https://github.com/Liquid-JS/underflow/issues/2297)) ([7407cc6](https://github.com/Liquid-JS/underflow/commit/7407cc69cb6b063f210272a94867e6d711098382))
* editor fails to render content if table syntax is wrong ([#2104](https://github.com/Liquid-JS/underflow/issues/2104)) ([642d644](https://github.com/Liquid-JS/underflow/commit/642d6442df3aa63994314d934145f05fb3f93efb))
* empty tagBlacklist cause the editor to crash([#1678](https://github.com/Liquid-JS/underflow/issues/1678)) ([#1679](https://github.com/Liquid-JS/underflow/issues/1679)) ([9dc8a67](https://github.com/Liquid-JS/underflow/commit/9dc8a674b90bac9750d2f4e197865802a5d62d46))
* encode link url unnecessarily ([#1641](https://github.com/Liquid-JS/underflow/issues/1641)) ([03b7b19](https://github.com/Liquid-JS/underflow/commit/03b7b19eb12e13a5a1c26797fc7059cf9def0de8))
* escape backslash in the middle of sentence ([#2588](https://github.com/Liquid-JS/underflow/issues/2588)) ([3fc8ac5](https://github.com/Liquid-JS/underflow/commit/3fc8ac5d8dc4f454b8aa13e7c3c246b9be8875e0))
* fail to convert  list having blockQuote with spaces to wysiwyg ([#1792](https://github.com/Liquid-JS/underflow/issues/1792)) ([68a5f9f](https://github.com/Liquid-JS/underflow/commit/68a5f9f88c7f55d3297e192753d43c1fc273ed51))
* find element base on document => editor root element ([#2272](https://github.com/Liquid-JS/underflow/issues/2272)) ([ba67d04](https://github.com/Liquid-JS/underflow/commit/ba67d04d565eb8e4f5467f1ce41e0780a135f27c))
* fixed addImageBlobHook error in wwEditor (fixes: [#2053](https://github.com/Liquid-JS/underflow/issues/2053)) ([#2054](https://github.com/Liquid-JS/underflow/issues/2054)) ([95f5e74](https://github.com/Liquid-JS/underflow/commit/95f5e74331a115b7f1da24f321cb63b25ee1b4e0))
* Fixed autofocus={false} invalid (fix [#1945](https://github.com/Liquid-JS/underflow/issues/1945)) ([#2085](https://github.com/Liquid-JS/underflow/issues/2085)) ([977931a](https://github.com/Liquid-JS/underflow/commit/977931aa66fde49d1a21c0ac616dd54247230353))
* focus with colorsyntax on multi instances (fix [#2413](https://github.com/Liquid-JS/underflow/issues/2413)) ([#2441](https://github.com/Liquid-JS/underflow/issues/2441)) ([29f7080](https://github.com/Liquid-JS/underflow/commit/29f7080204b18625bce2c8e365182f16edef5ca6))
* heading state remains when changed to paragraph in WYSIWYG ([#2103](https://github.com/Liquid-JS/underflow/issues/2103)) ([0b62896](https://github.com/Liquid-JS/underflow/commit/0b6289650f63c8e4ec7fedf10301441721f75607))
* html attrs parse (fix [#1620](https://github.com/Liquid-JS/underflow/issues/1620)) ([#1630](https://github.com/Liquid-JS/underflow/issues/1630)) ([9e1af8d](https://github.com/Liquid-JS/underflow/commit/9e1af8d84aee9a798ca6c5cc73a5bae965d608a9))
* HTML escape is not correct (fix [#2381](https://github.com/Liquid-JS/underflow/issues/2381)) [#2382](https://github.com/Liquid-JS/underflow/issues/2382) ([db2795b](https://github.com/Liquid-JS/underflow/commit/db2795b274c058d859481b97cc8ae7da77692f74))
* i18n cannot be applied to color-syntax-plugin ([#1800](https://github.com/Liquid-JS/underflow/issues/1800)) ([85eebcc](https://github.com/Liquid-JS/underflow/commit/85eebcc45f643399107111b1ac47f3c09362d6f9))
* keep empty line between lists ([#2598](https://github.com/Liquid-JS/underflow/issues/2598)) ([78e2184](https://github.com/Liquid-JS/underflow/commit/78e2184e0ede87379223a8ed78f67fb7d743c437))
* link mark no longer building with misnamed getCustomAttrs ([#2729](https://github.com/Liquid-JS/underflow/issues/2729)) ([d543b59](https://github.com/Liquid-JS/underflow/commit/d543b59bedde38cd4e289ab5681d7f55ca5d1e28))
* overflow text and wrong event target in viewer ([#2133](https://github.com/Liquid-JS/underflow/issues/2133)) ([9778ee6](https://github.com/Liquid-JS/underflow/commit/9778ee64ffa8c3a9652cc3966cc1c15d9354a1bb))
* plugin bundle config and dependencies env ([#1649](https://github.com/Liquid-JS/underflow/issues/1649)) ([ef67571](https://github.com/Liquid-JS/underflow/commit/ef675710e83214277866730024405ae4c9935441))
* prevent errors when widget rules not match ([33e63f7](https://github.com/Liquid-JS/underflow/commit/33e63f74deb1ac3abe8659b00fd124c1fb293de0))
* register `undefined` event to editor, viewer in react wrapper ([#2292](https://github.com/Liquid-JS/underflow/issues/2292)) ([5e71650](https://github.com/Liquid-JS/underflow/commit/5e7165030427f2e1358144b99009dda5e651e023))
* remove document.querySelector() for multiple instance in wysiwyg code block view ([#2298](https://github.com/Liquid-JS/underflow/issues/2298)) ([f04c7dd](https://github.com/Liquid-JS/underflow/commit/f04c7ddc9fdfef91c82d8f268e40105ad027c4b6))
* replace childElement when component is updated (fix [#2028](https://github.com/Liquid-JS/underflow/issues/2028)) ([#2029](https://github.com/Liquid-JS/underflow/issues/2029)) ([1f2abfc](https://github.com/Liquid-JS/underflow/commit/1f2abfcd67813522c8347c94d94bdb8d94120e7e))
* revert [#2572](https://github.com/Liquid-JS/underflow/issues/2572) (fix [#1806](https://github.com/Liquid-JS/underflow/issues/1806) [#2708](https://github.com/Liquid-JS/underflow/issues/2708)) ([#2754](https://github.com/Liquid-JS/underflow/issues/2754)) ([2f0cbb5](https://github.com/Liquid-JS/underflow/commit/2f0cbb5e67fd65d4d0c6bb3a9b414c93bd463ed4))
* sanitizer ([#1670](https://github.com/Liquid-JS/underflow/issues/1670)) ([48a01f5](https://github.com/Liquid-JS/underflow/commit/48a01f5add76cb6eedb29cceb95f765164d69649))
* set file upload button's type to button ([#1585](https://github.com/Liquid-JS/underflow/issues/1585)) ([33ee07f](https://github.com/Liquid-JS/underflow/commit/33ee07ffaa4aacf29e17b74fc6e78506279cd769))
* smart task plugin emit script error ([#1700](https://github.com/Liquid-JS/underflow/issues/1700)) ([d0f4f28](https://github.com/Liquid-JS/underflow/commit/d0f4f286a3e3bc7105e31c37bab13e3c8a3b819c))
* table head is missing when pasting the table from ms word ([#1857](https://github.com/Liquid-JS/underflow/issues/1857)) ([8d434ce](https://github.com/Liquid-JS/underflow/commit/8d434ce7f596c3c901833e287f9cb845c0ead557))
* the default `addImageBlobHook` is called even though it should have been deleted by `hooks` option ([#1623](https://github.com/Liquid-JS/underflow/issues/1623)) ([a677b6d](https://github.com/Liquid-JS/underflow/commit/a677b6d698a7da722afe2475aa100e2f82dca904))
* the editor breaks converting when tables have invalid list HTML  ([#1780](https://github.com/Liquid-JS/underflow/issues/1780)) ([25d095c](https://github.com/Liquid-JS/underflow/commit/25d095c5f7562038013b2a2687609c2646ca286f))
* the editor cannot apply empty string attributes to wysiwyg node ([#1781](https://github.com/Liquid-JS/underflow/issues/1781)) ([8bcc287](https://github.com/Liquid-JS/underflow/commit/8bcc287a80063ce192dc08462ee3f531c6a489c9))
* the editor cannot set the selected text in link popup ([#2142](https://github.com/Liquid-JS/underflow/issues/2142)) ([f2dd13e](https://github.com/Liquid-JS/underflow/commit/f2dd13ee5f9c833af30046e2821c597d310249ea))
* the user cannot close popup using eventEmitter ([#1855](https://github.com/Liquid-JS/underflow/issues/1855)) ([5f6f550](https://github.com/Liquid-JS/underflow/commit/5f6f55087b65b0368bf4f1aa8997739f764373aa))
* toolbar popups rendered outside the visible area ([#1698](https://github.com/Liquid-JS/underflow/issues/1698)) ([d9e67c5](https://github.com/Liquid-JS/underflow/commit/d9e67c50b37d076d8fc980b41ad51344e60cc5a2))
* typo in german translation ([#2391](https://github.com/Liquid-JS/underflow/issues/2391)) ([5f3574f](https://github.com/Liquid-JS/underflow/commit/5f3574f03c0d319f98b02cc2c418be47539851b8))
* update integration test for layout ([5f06f40](https://github.com/Liquid-JS/underflow/commit/5f06f40f9f4be1c06da193674640d037e80e8112))
* user cannot insert the `$$` text due to custom inline syntax ([#1791](https://github.com/Liquid-JS/underflow/issues/1791)) ([6683ae1](https://github.com/Liquid-JS/underflow/commit/6683ae1b18d5b39819058bfded582c80885cda2a))
* users cannot customize undo, redo command using `useCommandShortcut` option ([#2274](https://github.com/Liquid-JS/underflow/issues/2274)) ([538fc0f](https://github.com/Liquid-JS/underflow/commit/538fc0f8fb0253b0a284419eba3b742a1659d32f))
* users cannot show the toolbar item when the editor is resized ([#1747](https://github.com/Liquid-JS/underflow/issues/1747)) ([87de165](https://github.com/Liquid-JS/underflow/commit/87de165b50a5e1eaf17aef57dbeb269cf431064b))
* wrong `customInline` converting  ([#2275](https://github.com/Liquid-JS/underflow/issues/2275)) ([e131a7c](https://github.com/Liquid-JS/underflow/commit/e131a7cdcba5ac034434e34c70a341a64b6f8044))
* wrong `htmlBlock` converting ([#2252](https://github.com/Liquid-JS/underflow/issues/2252)) ([3c0956f](https://github.com/Liquid-JS/underflow/commit/3c0956f47272eeef9515d526d877c8c6085f7870))
* wrong converting `br` tag  ([#1699](https://github.com/Liquid-JS/underflow/issues/1699)) ([b250a6a](https://github.com/Liquid-JS/underflow/commit/b250a6a0a5621fa4c2f1d94138cf49ff77d6a175))
* wrong custom renderer type definition ([#1640](https://github.com/Liquid-JS/underflow/issues/1640)) ([4c47c90](https://github.com/Liquid-JS/underflow/commit/4c47c905dc73d4e4c20f7cfda0202f38cfa517b8))
* wrong editor `minHeight` API ([#2296](https://github.com/Liquid-JS/underflow/issues/2296)) ([00f7c07](https://github.com/Liquid-JS/underflow/commit/00f7c07c8ead237d2885292eb18ab48fae704b8e))
* wrong escape with link, image url when converting ([#2105](https://github.com/Liquid-JS/underflow/issues/2105)) ([bc6f31b](https://github.com/Liquid-JS/underflow/commit/bc6f31b0ad81f377db69a5e9b66ce6c1af59b646))
* wrong escaping the markdown text when convertor wysiwyg to markdown ([#1719](https://github.com/Liquid-JS/underflow/issues/1719)) ([efa45d7](https://github.com/Liquid-JS/underflow/commit/efa45d772276c81ca546f14724bbb775607a6a02))
* wrong link, image escape when converting ([#2267](https://github.com/Liquid-JS/underflow/issues/2267)) ([7de36a4](https://github.com/Liquid-JS/underflow/commit/7de36a4867ea946bc340b9e0a4d54fe57fe702a2))
* wrong popup widget pos when scrolling ([#2271](https://github.com/Liquid-JS/underflow/issues/2271)) ([5df26bc](https://github.com/Liquid-JS/underflow/commit/5df26bcde50d452eb2791c343d34a13d55051fc6))
* wrong selection layer position in table popup body ([#1744](https://github.com/Liquid-JS/underflow/issues/1744)) ([7347499](https://github.com/Liquid-JS/underflow/commit/73474994a8cf4e183f415ae4edb511a898d13682))
* wrong wysiwyg table offset ([#2251](https://github.com/Liquid-JS/underflow/issues/2251)) ([d7be407](https://github.com/Liquid-JS/underflow/commit/d7be4079fd6487368cb217797ecc4242105d3417))
