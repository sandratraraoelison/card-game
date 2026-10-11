const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readdirSync, readFileSync } = require('node:fs');
const path = require('node:path');

test('inner layers depend on ports and shared rules, never NestJS, SQLite or HTTP', () => {
  for (const layer of ['domain', 'application']) {
    const directory = path.resolve(__dirname, '../src/modules/multiplayer', layer);
    for (const file of readdirSync(directory, { recursive: true }).filter(name => name.endsWith('.ts'))) {
      const source = readFileSync(path.join(directory, file), 'utf8');
      for (const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
        assert.doesNotMatch(match[1], /@nestjs|node:|infrastructure|transport/, `${layer}/${file}: ${match[1]}`);
        if (layer === 'domain') {
          assert.doesNotMatch(match[1], /application/, `${layer}/${file}: ${match[1]}`);
        }
        if (layer === 'application' && ['games.ts', 'rooms.ts', 'sessions.ts'].includes(path.basename(file))) {
          assert.doesNotMatch(match[1], /^\.\/(games|rooms|sessions)$/, `${layer}/${file}: use cases must not depend on one another`);
        }
      }
    }
  }
});
