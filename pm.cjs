// oxlint-disable typescript/no-require-imports
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('./package.json'));
const version = require('child_process')
  .execSync('pnpm -v')
  .toString()
  .trim();
pkg.packageManager = 'pnpm@' + version;
fs.writeFileSync(
  './package.json',
  JSON.stringify(pkg, null, 2) + '\n',
);
