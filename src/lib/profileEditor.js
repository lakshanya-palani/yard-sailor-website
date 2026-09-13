export function usernameError(value) {
  return /^[A-Za-z0-9_]{3,20}$/.test(value.trim()) ? '' : 'Use 3–20 letters, numbers, or underscores.';
}
// Resolve ownership again at save time, including when the account changed in another tab.
export async function savePublicProfile(client, expectedUserId, draft) {
  const validation = usernameError(draft.username);
  if (validation) throw new Error(validation);
  const {data: auth, error: authError} = await client.auth.getUser();
  if (authError || !auth?.user || auth.user.id !== expectedUserId) throw new Error('Your account session changed. Reload this page before saving.');
  const username = draft.username.trim();
  const {data: existing, error: checkError} = await client.from('profiles').select('id')
    .ilike('username', username.replace(/[\\%_]/g, '\\$&')).neq('id', auth.user.id).limit(1).maybeSingle();
  if (checkError) throw new Error('Unable to check username availability. Please try again.');
  if (existing) throw new Error('This username is already taken.');
  const saved = {username, avatar_url: draft.avatar_url};
  const {data, error} = await client.from('profiles').upsert({id: auth.user.id, ...saved})
    .select('username, avatar_url').single();
  if (error) throw new Error(error.code === '23505' ? 'This username is already taken.' : 'Unable to save your profile. Please try again.');
  if (!data) throw new Error('Your profile could not be confirmed. Please reload and check it.');
  return data;
}
