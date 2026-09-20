import React from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter} from 'react-router-dom';import {supabase} from '../src/lib/supabase';import {SavedProvider,useSaved} from '../src/context/SavedContext';import SaveButton from '../src/components/SaveButton';
let state,writes=0,stored=false,completed=0;
supabase.auth.getSession=async()=>({data:{session:{user:{id:'fixture'}}}});supabase.auth.onAuthStateChange=()=>({data:{subscription:{unsubscribe(){}}}});
async function write(value){writes++;await new Promise(r=>setTimeout(r,150));stored=value;completed=performance.now();return {};}
supabase.from=()=>({select:()=>({eq:()=>({order:()=>({range:async()=>({data:stored?[{product_id:'item'}]:[]})})})}),insert:()=>write(true),delete:()=>({eq:()=>({eq:()=>write(false)})})});
function Probe(){state=useSaved();return <SaveButton productId="item" title="Fixture" detail/>;}
createRoot(document.querySelector('#test-root')).render(<MemoryRouter><SavedProvider><Probe/></SavedProvider></MemoryRouter>);
const delay=ms=>new Promise(r=>setTimeout(r,ms));while(!state||state.loading)await delay(10);
const start=performance.now();document.querySelector('button').click();while(document.querySelector('button').getAttribute('aria-pressed')!=='true')await delay(1);const visual=performance.now()-start;
await delay(20);document.querySelector('button').click();await delay(450);
document.querySelector('#report').textContent=JSON.stringify({controlledRequestDelayMs:150,firstVisualMs:+visual.toFixed(1),backgroundCompletionMs:+(completed-start).toFixed(1),requests:writes,latestIntentSaved:false,actualStored:stored,visualSaved:document.querySelector('button').getAttribute('aria-pressed')},null,2);
