import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useSaved} from '../context/SavedContext';
import './SaveButton.css';
export default function SaveButton({productId,title,detail=false}) {
 const {userId,ids,loading,error,toggle,refresh}=useSaved();const [feedback,setFeedback]=useState('');const navigate=useNavigate();const saved=ids.has(productId);
 async function click(event){
  event.preventDefault();event.stopPropagation();setFeedback('');
  if(!userId){navigate(`/login?redirect=${encodeURIComponent(`/products/${productId}?save=1`)}`);return;}
  if(error)return;
  try{await toggle(productId);}catch(e){setFeedback(e.message);}
 }
 return <div className={detail?'save-control save-detail':'save-control save-overlay'} onClick={e=>e.stopPropagation()} onKeyDown={e=>e.stopPropagation()}>
  <button type="button" className="save-heart" aria-label={`${saved?'Remove saved item':'Save item'}: ${title}`} aria-pressed={saved} disabled={loading||!!error} onClick={click}>
   <svg viewBox="0 0 24 24" aria-hidden="true" width="23" height="23"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" fill={saved?'currentColor':'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>{detail&&<span>{saved?'Saved Item':'Save Item'}</span>}
  </button>{(feedback||error)&&<div className="save-error"><p role="alert">{feedback||error}</p>{error&&<button type="button" disabled={loading} onClick={async e=>{e.preventDefault();e.stopPropagation();setFeedback('');await refresh();}}>Retry saved items</button>}</div>}
 </div>;
}
