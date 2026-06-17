## CHANGELOG

<br/>

<details>
<summary>

## **[1.2.2] - 17/06/2026** => _01:53_

</summary>

- Remove global `config` object and its export from the package
  (Breaking Change)
- Refactor `add` and `remove` functions to accept an explicit
  `jsonConfigPath` string parameter as their second argument instead of
  relying on global configuration (Breaking Change)
- Refactor `init` function signature to destructure `InitOptions`
  directly and remove global config assignment
- <u>Test coverage **_100%_**</u>

</details>

<br/>

<details>
<summary>

## **[1.2.1] - 17/06/2026** => _01:16_

</summary>

- Refactor codebase key generation to use slash-separated paths instead
  of dot notation (Breaking Change)
- Fix console log spelling ("Deleting of files" -> "Deletion of files")
  in `remove` function
- Add `pathToJsonKey` helper to support slash-separated keys for
  generated files
- Clean up unused commented-out code regarding `baseUrl` removal in
  `init` function
- <u>Test coverage **_100%_**</u>

</details>

<br/>

<details>
<summary>

## **[1.2.0] - 16/06/2026** => _23:42_

</summary>

- Add `codebase` property to global `config` object to customize default
  codebase analysis output file path
- Fix file removal path resolution in `remove` function to retrieve
  actual file path from metadata instead of assuming `.ts` extension
  (supports `.tsx` and other extensions)
- Fix performance in `add` function by saving the JSON file once after
  processing all files instead of inside the loop
- Refactor imports by removing Node prefix `node:` from `fs` and `path`
  module imports
- Export `consoleStars` and `getFolderPath` helper utilities from
  package entrypoint
- <u>Test coverage **_100%_**</u>

</details>

<br/>

<details>
<summary>

## **[1.1.0] - 16/06/2026** => _20:48_

</summary>

- Update `AnalyzeOptions` signature to make `src` parameter mandatory
- Add support for `.tsx` files in codebase analysis (including
  `.test.tsx` and `.spec.tsx` exclusions)
- Update package build process to ensure executable permissions are set
  on the CLI binary
- Refactor project structure to a monorepo setup with workspace-based
  packages
- Refactor CLI command configuration to use explicit binary name
- Update vitest alias initialization in vitest configuration
- <u>Test coverage **_100%_**</u>

</details>

<br/>

<details>
<summary>

## **[1.0.0] - 16/06/2026** => _17:30_

</summary>

- Add `config` export for dynamic customization of CLI configurations
- Update internal agent skill structures from `.claude` to `.agents`
- Refactor CLI log statements, warnings, and code comments to English
- Refactor codebase formatting and imports to use single quotes
- Refactor `init` command implementation by extracting `initConfig`
  helper
- <u>Test coverage **_100%_**</u>

</details>

<br/>

<details>

<summary>

## **[0.3.0] - 06/04/2026** => _17:27_

</summary>

- Fix: préfixe `./` ajouté aux chemins de paths dans `tsconfig.json`
  lors de l'initialisation
- Refactor: style de code modernisé (guillemets simples, formatage
  uniforme)
- Update: workflows CI/CD mis à jour (publish, upgrade)
- Remove: skills obsolètes supprimés de `.github/skills/`
- Update: documentation `.github/` réorganisée
- <u>Test coverage **_100%_**</u>

</details>

<br/>

<details>

<summary>

## **[0.2.0] - 10/02/2026** => _11:25_

</summary>

- Refactor code structure for improved readability and maintainability
- Update dependencies (glob, typescript, rollup, vitest, and others)
- Enhance CI/CD workflows with improved version management
- <u>Test coverage **_100%_**</u>

</details>

<br/>

<br/>

<details>

<summary>

### Version [0.1.3] --> _2025/12/27 16:37_

</summary>

- Filter out undefined module specifiers from exports in transformJSON
- Update CI workflows for improved version and dependency management
- Adding type imports support
- Update dependencies (glob 11.0.3 → 11.1.0)
- <u>Test coverage **_100%_**</u>

</details>

<br/>

<details>

<summary>

### Version [0.1.2] --> _2025/09/05 19:42_

</summary>

- Fix absolute path handling in remove function
- Add filter to exports to exclude undefined moduleSpecifier

</details>

<br/>

<details>

<summary>

### Version [0.1.1] --> _2025/09/04 19:40_

</summary>

- Fix remove function with the correct absolute path

</details>

<br/>

<details>

<summary>

### Version [0.1.0] --> _2025/09/04 19:00_

</summary>

- Fix duplicate inside config json

</details>

<br/>

<details>

<summary>

### Version [0.0.8] --> _2025/09/04 17:00_

</summary>

- Fix writing paths inside tsconfig.json

</details>

<br/>

<details>

<summary>

### Version [0.0.7] --> _2025/09/04 16:45_

</summary>

- Fix writing paths inside tsconfig.json

</details>

<br/>

<details>

<summary>

### Version [0.0.5] --> _2025/09/04 13:10_

</summary>

- Fix folder path in add function
- Fix folder path in init function
- Fix folder path in remove function

</details>

<br/>

### Version [0.0.4] --> _2025/09/04 23:10_

</summary>

- Upgrade files structure

</details>

<br/>

<details>

<summary>

### Version [0.0.3] --> _2025/09/04 11:30_

</summary>

- 📦 Add documentation

</details>

<br/>

<details>

<summary>

### Version [0.0.1] --> _2025/09/04 11:30_

</summary>

- ✨ First version
- 📦 Initial release

</details>

<br/>

## Auteur

chlbri (bri_lvi@icloud.com)

[My github](https://github.com/chlbri?tab=repositories)

[<svg width="98" height="96" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z" fill="#24292f"/></svg>](https://github.com/chlbri?tab=repositories)

<br/>

## Liens

- [Documentation](https://github.com/chlbri/new-package)
