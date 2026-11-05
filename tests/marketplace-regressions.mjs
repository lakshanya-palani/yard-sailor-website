import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { saleOverlapsLocalWindow } from '../src/utils/saleTime.js';
import { calculateDistanceMiles, hasValidCoordinates, requestUserLocation } from '../src/utils/location.js';

process.env.TZ = 'America/Los_Angeles';
const sunday = new Date('2026-11-08T10:00:00-08:00').getTime();
assert.equal(saleOverlapsLocalWindow({start_time:'2026-11-07T10:00:00-08:00', end_time:'2026-11-08T14:00:00-08:00'}, 'today', sunday), true);
assert.equal(saleOverlapsLocalWindow({start_time:'2026-11-08T13:00:00-08:00', end_time:'2026-11-08T15:00:00-08:00'}, 'weekend', sunday), true);
assert.equal(saleOverlapsLocalWindow({start_time:'2026-11-14T13:00:00-08:00', end_time:'2026-11-14T15:00:00-08:00'}, 'weekend', sunday), false);
assert.equal(saleOverlapsLocalWindow({start_time:'2026-11-07T10:00:00-08:00'}, 'today', sunday), true);
assert.equal(saleOverlapsLocalWindow({start_time:'invalid'}, 'today', sunday), false);
assert.equal(hasValidCoordinates(null, 0), false);
assert.equal(hasValidCoordinates('', 0), false);
assert.equal(calculateDistanceMiles(null, 0, 0, 0), null);

const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
let calls = 0;
let finish;
Object.defineProperty(globalThis, 'navigator', {configurable:true, value:{geolocation:{getCurrentPosition(success, failure) {
  calls++;
  finish = calls === 1 ? () => failure({code:3}) : () => success({coords:{latitude:37, longitude:-122}});
}}}});
try {
  const first = requestUserLocation();
  assert.equal(requestUserLocation(), first);
  finish();
  assert.equal(await first, null);
  const retry = requestUserLocation();
  finish();
  assert.deepEqual(await retry, {latitude:37, longitude:-122});
  assert.deepEqual(await requestUserLocation(), {latitude:37, longitude:-122});
  assert.equal(calls, 2);
  const refresh = requestUserLocation({refresh:true});
  finish();
  await refresh;
  assert.equal(calls, 3);
} finally {
  if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
  else delete globalThis.navigator;
}

const edit = await readFile(new URL('../src/pages/EditYardSale.jsx', import.meta.url), 'utf8');
const source = edit.slice(edit.indexOf('  async function handleSubmit'), edit.indexOf('\n  if (!form ||'));
let payload, lookupError = false, updated = 0, navigated = 0, errorMessage;
const query = {eq:()=>query, select:()=>query, maybeSingle:async()=>({data:{id:'sale'},error:null})};
const context = {
  form:{id:'sale',title:'Fixture',description:'Details',images:[],address:'New address',start_time:'2026-11-08T10:00',end_time:'2026-11-08T12:00'},
  originalAddress:'Old address', id:'sale', hostId:'host', routeIdRef:{current:'sale'}, newImages:[], savingRef:{current:false}, setSaving:()=>{}, setDirty:()=>{}, validateSale:()=>'', Date,
  geocodeAddress:async()=>{if (lookupError) throw new Error('Lookup failed'); return {latitude:37,longitude:-122};},
  supabase:{auth:{getUser:async()=>({data:{user:{id:'host'}}})},from:()=>({update:value=>{updated++;payload=value;return query;}})},
  navigate:()=>{navigated++;}, setMessage:message=>{errorMessage=message;}, console:{error:()=>{}},
};
const submit = vm.runInNewContext(`${source}; handleSubmit`, context);
lookupError = true;
await submit({preventDefault(){}});
assert.equal(updated, 0);
assert.equal(errorMessage, 'Lookup failed');
lookupError = false;
await submit({preventDefault(){}});
assert.equal(updated, 1);
assert.equal(payload.address, 'New address');
assert.equal(payload.lat, 37);
assert.equal(payload.lng, -122);
assert.equal(payload.location, 'POINT(-122 37)');
assert.equal(navigated, 1);
console.log('Marketplace regressions passed.');
