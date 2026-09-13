// Local-only harness. Stub all Auth/database calls before mounting; never mutates live data.
import React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {supabase} from '../src/lib/supabase';
import {SavedProvider,useSaved} from '../src/context/SavedContext';
import SaveButton from '../src/components/SaveButton';
const report=document.querySelector('#report');const lines=[];
const check=(value,name)=>{if(!value)throw new Error(name);lines.push(`PASS ${name}`);report.textContent=lines.join('\n');};
const wait=async predicate=>{for(let i=0;i<150;i++){if(predicate())return;await new Promise(r=>setTimeout(r,20));}throw new Error('State timed out');};
let subscriber, failRead=true,failWrite=false,reads=0,writes=0,current,release;
const stored=new Set();
supabase.auth.getSession=async()=>({data:{session:{user:{id:'fixture'}}}});
supabase.auth.onAuthStateChange=cb=>{subscriber=cb;return {data:{subscription:{unsubscribe(){}}}};};
supabase.from=()=>({select:()=>({eq:()=>({order:()=>({range:async()=>{reads++;return failRead?{error:{code:'503'}}:{data:[...stored].map(product_id=>({product_id}))};}})})}),insert:async row=>{writes++;await new Promise(r=>{release=r});if(failWrite)return {error:{code:'42501'}};stored.add(row.product_id);return {};},delete:()=>({eq:()=>({eq:async(_key,id)=>{writes++;stored.delete(id);return {};}})})});
function Probe(){current=useSaved();return <SaveButton productId="item" title="Fixture" detail/>;}
const root=createRoot(document.querySelector('#test-root'));
root.render(<MemoryRouter><SavedProvider><Probe/></SavedProvider></MemoryRouter>);
try{
 await wait(()=>current?.error);check(reads===1,'one failed load; no endless retry');
 failRead=false;document.querySelector('.save-error button').click();await wait(()=>!current.loading&&!current.error);check(reads===2,'separate Retry performs a new fetch and clears error');
 const first=current.toggle('item'),second=current.toggle('item'),third=current.toggle('item');await wait(()=>release);check(writes===1,'rapid intents coalesce into one serialized write');release();await Promise.all([first,second,third]);await wait(()=>current.ids.has('item'));check(stored.has('item'),'save persists in transport');
 await current.refresh();await wait(()=>!current.loading&&current.ids.has('item'));check(current.ids.has('item'),'reload restores saved ID');
 await current.toggle('item');await wait(()=>!current.ids.has('item'));check(!stored.has('item'),'unsave removes persisted item');
 failWrite=true;release=null;const failure=current.toggle('item').catch(()=>{});await wait(()=>release);release();await failure;await wait(()=>!current.ids.has('item')&&current.actionError);check(!current.ids.has('item'),'failed optimistic save rolls back with error');
 const before=reads;subscriber('SIGNED_OUT',null);await wait(()=>!current.userId&&!current.loading);check(!current.error&&current.ids.size===0&&reads===before,'signed-out state is empty without database read');
 check(document.querySelector('.save-heart').getAttribute('aria-pressed')==='false','signed-out heart is neutral');
 document.title='Favorites checks passed';report.textContent+='\n9 state checks passed; no live Auth or database mutations.';
}catch(e){report.textContent+='\nFAIL '+e.message;document.title='Favorites checks FAILED';}
