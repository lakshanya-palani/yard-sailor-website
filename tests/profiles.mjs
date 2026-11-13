import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = (await readFile(new URL('../src/lib/profiles.js', import.meta.url), 'utf8'))
  .replace(/^import .*;\n/gm, '').replaceAll('export async function ', 'async function ');
const { fetchProfilesByIds } = vm.runInNewContext(`${source}\n({ fetchProfilesByIds })`, { console, Promise });

function fakeClient({ error = null } = {}) {
  const calls = [];
  return {
    calls,
    from(table) {
      assert.equal(table, 'profiles');
      const builder = {
        select(columns) { calls.push(['select', columns]); return builder; },
        in(column, values) {
          calls.push(['in', column, values]);
          return Promise.resolve(error
            ? { data: null, error }
            : { data: values.map(id => ({ id, username: `user-${id}`, avatar_url: null })), error: null });
        },
      };
      return builder;
    },
  };
}

// Splits seller ids into 100-id batches, dropping blanks and duplicates.
const ids = [...Array.from({ length: 205 }, (_, i) => `id-${i}`), 'id-0', null, ''];
const client = fakeClient();
const profiles = await fetchProfilesByIds(ids, { client });
const inCalls = client.calls.filter(([name]) => name === 'in');
assert.deepEqual(inCalls.map(([, , values]) => values.length), [100, 100, 5]);
assert.equal(new Set(inCalls.flatMap(([, , values]) => values)).size, 205);
assert.deepEqual(profiles['id-204'], { id: 'id-204', username: 'user-id-204', avatar_url: null });

// No sellers means no query.
const emptyClient = fakeClient();
assert.equal(Object.keys(await fetchProfilesByIds([null, ''], { client: emptyClient })).length, 0);
assert.equal(emptyClient.calls.length, 0);

// SavedItems needs failures to propagate; Shop keeps its best-effort behaviour.
const failure = new Error('profiles unavailable');
await assert.rejects(() => fetchProfilesByIds(['a'], { client: fakeClient({ error: failure }), strict: true }), failure);
const errors = [];
const oldError = console.error;
console.error = (...args) => errors.push(args);
try {
  assert.equal(Object.keys(await fetchProfilesByIds(['a'], { client: fakeClient({ error: failure }) })).length, 0);
} finally {
  console.error = oldError;
}
assert.equal(errors.length, 1);

console.log('Profiles tests passed.');
