import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Socket.IO 4.x is an installed ESM runtime dependency',async()=>{
  const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
  assert.equal(pkg.dependencies['socket.io'].startsWith('^4.'), true);
  const api=await import('socket.io');
  assert.equal(typeof api.Server,'function');
  assert.equal(typeof api.Socket,'function');
});
