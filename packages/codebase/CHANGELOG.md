## CHANGELOG

<br>

<details>
<summary>

## **[2.3.1] - 01/07/2026** => _16:38_

</summary>

- Fix recursive reference checks in `removeUnusedDeclarations` to ignore
  self-references in recursive functions and types, enabling them to be
  correctly pruned if unused
- Add unit tests for recursive types and functions pruning behavior
- <u>Test coverage **_100%_**</u>

</details>

<br>

<details>
<summary>

## **[2.3.0] - 01/07/2026** => _15:08_

</summary>

- Update `lift` function signature to return detailed information of
  pruned elements (type `LiftOutput`) instead of a simple boolean
- Add LiftOutput type export
- Refactor lift function to save project changes before deleting empty
  directories
- <u>Test coverage **_100%_**</u>

</details>

<br/>

<details>
<summary>

## **[2.2.0] - 01/07/2026** => _12:31_

</summary>

- Enhance `lift` function to automatically detect exports from files
  outside the target folder and preserve them as exceptions during
  pruning
- Add optional `Project` parameter to the `lift` function to allow
  reusing an existing ts-morph project instance
- Enhance `hasNoDeclarations` helper to consider live re-exports (files
  re-exporting from non-forgotten source files are no longer treated as
  empty)
- Refactor empty file deletion in `lift` to batch JSON configuration
  updates instead of saving after each individual file removal
- Enhance `lift` to skip `node_modules` and declaration files when
  resolving outside-folder exports for improved performance
- <u>Test coverage **_100%_**</u>

</details>

<br/>

<details>
<summary>

## **[2.1.0] - 28/06/2026** => _22:14_

</summary>

- Update `softInit` function to save the generated type files list into
  the codebase JSON config file
- <u>Test coverage **_100%_**</u>

</details>

<br/>

<details>
<summary>

## **[2.0.0] - 28/06/2026** => _21:52_

</summary>

- Add `hasNoDeclarations` helper function to determine if a TypeScript
  file has no declarations, and export it in the public API
- Update empty file pruning in `lift` function to check for the absence
  of declarations using `hasNoDeclarations` rather than checking for
  whitespace-only text
- Enhance `softInit` function to recursively create the target directory
  if it does not exist
- Enhance codebase lifting to resolve exporting file paths using the
  correct target folder path
- Fix reference-searching logic in unused imports and declarations
  pruning to prevent self-reference checks and ensure correct node
  comparison
- <u>Test coverage **_100%_**</u>

</details>

<br/>
<details>
<summary>

## **[1.9.0] - 28/06/2026** => _14:47_

</summary>

- Enhance `lift` function to remove export declarations targeting files
  inside deleted empty directories during the recursive directory
  cleaning phase
- Remove deleted empty files from the codebase JSON configuration files
  array during the codebase lifting process
- Add JSDoc comments and update function signatures in `lift.ts` to
  accept `jsonConfigPath`
- Add implementation test cases to verify the deletion of exports
  targeting files in deleted empty directories
- Add implementation test cases to verify that the codebase
  configuration files list is correctly updated when empty files are
  deleted
- <u>Test coverage **_100%_**</u>

</details>

<br/>

<details>
<summary>

## **[1.8.0] - 28/06/2026** => _14:03_

</summary>

- Change signature of `lift` function to accept `CODEBASE_ANALYSIS` and
  exceptions (Breaking Change)
- Add support for named alias exports and namespace alias exports in
  codebase export analysis
- Enhance `lift` function to recursively clean up export declarations
  targeting deleted empty files
- Refactor helper imports and extract `resolveModuleSpecifier` to unify
  import and export resolution
- Add JSDoc comments to public API functions (`add`, `generate`, `init`,
  `lift`, `remove`, `softInit`)
- <u>Test coverage **_100%_**</u>

</details>

<br/>

<details>
<summary>

## **[1.7.0] - 28/06/2026** => _00:09_

</summary>

- Add export for `softInit` in the programmatic API to expose the soft
  initialization functionality
- Refactor `InitOptions` in `softInit.ts` to import from `./init` to
  prevent duplication
- <u>Test coverage **_100%_**</u>

</details>

<br/>

<details>
<summary>

## **[1.6.0] - 27/06/2026** => _22:39_

</summary>

- Fix `add` function to resolve codebase entries for directory index
  paths using slash-separated `/index` instead of `.index`
- Fix `remove` function to map imported module specifiers using `/index`
  variants instead of `.index`
- <u>Test coverage **_100%_**</u>

</details>

<br/>

<details>
<summary>

## **[1.5.0] - 27/06/2026** => _20:40_

</summary>

- Refactor `lift` function to load the codebase configuration path,
  extract the root directory, and prune unused declarations relative to
  it
- Refactor import statements in `add.ts` to use type-only import for
  `JsonEditor`
- <u>Test coverage **_100%_**</u>

</details>

<br/>

<details>
<summary>

## **[1.4.0] - 27/06/2026** => _20:25_

</summary>

- Add `lift` function to prune unused declarations (references, types,
  variables, classes, functions, enums) and standardize imports within a
  target folder, deleting resulting empty source files and folders
- Add `softInit` function to rebuild types and imports structure from a
  codebase analysis when configuration and paths are already defined
- Refactor `init` function to return early if the configuration file
  already exists
- Refactor type structure creation helper logic into a separate
  `createTypesStructure` utility in `helpers.ts`
- <u>Test coverage **_100%_**</u>

</details>

<br/>

<details>
<summary>

## **[1.3.0] - 25/06/2026** => _23:10_

</summary>

- Fix `resolveModuleSpecifier` to strip `.ts` and `.tsx` file extensions
  from resolved module specifiers
- Refactor helper imports in `remove.ts` to use `#helpers` path alias
- Add unit tests for `resolveModuleSpecifier` path mapping and extension
  resolution
- Configure `#helpers` path alias pointing to `./src/helpers.ts` in
  `tsconfig.json`
- <u>Test coverage **_100%_**</u>

</details>

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
