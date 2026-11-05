import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { savePublicProfile } from '../src/lib/profileEditor.js';

const user = {
  id: '00000000-0000-4000-8000-000000000003',
  email: 'sailor@example.invalid',
  app_metadata: { provider: 'google' },
};
const writes = [];
let reads = 0;
const client = createClient('https://profile-fixture.supabase.co', 'public-placeholder', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: {
    fetch: async (input, options) => {
      const url = new URL(input);
      assert.equal(url.pathname, '/rest/v1/profiles');
      if (options.method === 'GET') {
        reads++;
        return Response.json(null);
      }
      assert.equal(options.method, 'POST');
      const profile = JSON.parse(options.body);
      writes.push(profile);
      assert.equal(url.searchParams.get('select'), 'username,avatar_url');
      return Response.json({ username: profile.username, avatar_url: profile.avatar_url });
    },
  },
});
client.auth.getUser = async () => ({ data: { user }, error: null });

const result = await savePublicProfile(client, user.id, {
  username: ' sailor_123 ', avatar_url: '', email: 'untrusted@example.invalid',
});
assert.deepEqual(writes[0], { id: user.id, username: 'sailor_123', avatar_url: '' });
assert.deepEqual(result, { username: 'sailor_123', avatar_url: '' });
console.log('PASS new Google profile sends and returns only public fields');

await savePublicProfile(client, user.id, { username: 'updated_sailor', avatar_url: '' });
assert.equal(Object.hasOwn(writes[1], 'email'), false);
console.log('PASS existing profile saves omit private email');

await assert.rejects(savePublicProfile(client, user.id, { username: 'bad name', avatar_url: '' }), /3–20/);
client.auth.getUser = async () => ({ data: { user: { ...user, id: 'different-user' } }, error: null });
await assert.rejects(savePublicProfile(client, user.id, { username: 'sailor_123' }), /session changed/);
client.auth.getUser = async () => ({ data: { user: { ...user, email: undefined } }, error: null });
await assert.rejects(savePublicProfile(client, user.id, { username: 'sailor_123' }), /needs an email/);
assert.equal(writes.length, 2);
assert.equal(reads, 2);
console.log('PASS invalid usernames, changed accounts and missing emails cannot write profiles');
