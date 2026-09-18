import { useAuth } from './useAuth';
import {createContext,useContext,useEffect,useRef,useState,useCallback} from 'react';
import {supabase} from '../lib/supabase';
import {readSavedIds,writeSaved} from '../lib/favorites';
const SavedContext=createContext(null);
// eslint-disable-next-line react-refresh/only-export-components
export const useSaved=()=>useContext(SavedContext);
export function SavedProvider({children}) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [ids,setIds]=useState(new Set()),[loading,setLoading]=useState(true),[error,setError]=useState(''),[pending,setPending]=useState(new Set());
  const [actionError,setActionError]=useState('');
  const owner=useRef(null),version=useRef(0),locks=useRef(new Map()),snapshot=useRef(new Set());
  const loaded=useRef(false), refreshedAt=useRef(0), fetching=useRef(null);
  const replace=value=>{snapshot.current=value;setIds(value);};
  const refresh=useCallback(async()=>{
    if(locks.current.size)return;
    if(fetching.current)return fetching.current;
    const id=owner.current,run=++version.current;setError('');if(!loaded.current)setLoading(true);
    const request=(async()=>{
      try{const values=await (id?readSavedIds(supabase,id):Promise.resolve([]));if(run===version.current){snapshot.current=new Set(values);setIds(snapshot.current);loaded.current=true;refreshedAt.current=Date.now();}}
      catch(e){if(run===version.current)setError(e.message);}
      finally{if(run===version.current)setLoading(false);if(fetching.current===request)fetching.current=null;}
    })();
    fetching.current=request;return request;
  },[]);
  useEffect(()=>{
    let active=true,initialized=false;const timers=new Set();
    const update=session=>{
      if(!active)return;const next=session?.user?.id||null;
      if(initialized&&next===owner.current)return;initialized=true;
      version.current++;loaded.current=false;fetching.current=null;refreshedAt.current=0;setActionError('');owner.current=next;replace(new Set());locks.current=new Map();setPending(new Set());setLoading(true);
      const timer=setTimeout(()=>{timers.delete(timer);if(active)refresh();},0);timers.add(timer);
    };
    update(userId ? {user: {id: userId}} : null);
    const focus=()=>{if(document.visibilityState==='visible'&&Date.now()-refreshedAt.current>30000)refresh();};
    window.addEventListener('focus',focus);
    return()=>{active=false;version.current++;timers.forEach(clearTimeout);window.removeEventListener('focus',focus);};
  },[refresh,userId]);
  function toggle(productId){
    if(!owner.current||loading||error)return Promise.resolve();
    setActionError('');version.current++;
    const desired=!snapshot.current.has(productId),next=new Set(snapshot.current);
    desired?next.add(productId):next.delete(productId);replace(next);
    const existing=locks.current.get(productId);
    if(existing){existing.desired=desired;return existing.promise;}
    const job={desired,confirmed:!desired,userId:owner.current,promise:null};
    locks.current.set(productId,job);setPending(new Set(locks.current.keys()));
    job.promise=(async()=>{
      try{
        while(job.desired!==job.confirmed){
          const target=job.desired;
          await writeSaved(supabase,job.userId,productId,target);
          if(locks.current.get(productId)!==job)return;
          job.confirmed=target;
        }
        refreshedAt.current=Date.now();
      }catch(e){
        if(locks.current.get(productId)===job){setActionError(e.message);const rollback=new Set(snapshot.current);job.confirmed?rollback.add(productId):rollback.delete(productId);replace(rollback);}
        throw e;
      }finally{
        if(locks.current.get(productId)===job){locks.current.delete(productId);setPending(new Set(locks.current.keys()));}
      }
    })();
    return job.promise;
  }
  return <SavedContext.Provider value={{userId,ids,loading,error,pending,toggle,refresh,actionError}}>{children}</SavedContext.Provider>;
}
