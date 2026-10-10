const { execFileSync } = require('node:child_process');
const { writeFileSync } = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../packages/game');
execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', path.join(root, 'tsconfig.build.json')], { stdio: 'inherit' });
writeFileSync(path.join(root, 'dist/package.json'), JSON.stringify({ type: 'commonjs' }));
