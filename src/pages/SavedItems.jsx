import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {supabase} from '../lib/supabase';
import {useSaved} from '../context/SavedContext';
import ShopProductCard from '../components/ShopProductCard';
import SaveButton from '../components/SaveButton';
import './Shop.css';
export default function SavedItems() {
 const {userId,ids,loading:idsLoading,error:idsError,refresh,actionError}=useSaved();
 const [rows,setRows]=useState([]),[sellers,setSellers]=useState({}),[availability,setAvailability]=useState(new Set()),[loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  let active=true;
  async function load(){
   setLoading(true);setError('');setRows([]);setSellers({});
   if(!userId){setLoading(false);return;}
   try{
    const items=[];
    for(let offset=0;;offset+=1000){
     const {data,error}=await supabase.from('saved_products').select('product_id, products(id,title,price,image_urls,user_id)').eq('user_id',userId).order('created_at',{ascending:false}).order('product_id').range(offset,offset+999);
     if(error)throw error;items.push(...data);if(data.length<1000)break;
    }
    const sellerIds=[...new Set(items.map(row=>row.products?.user_id).filter(Boolean))];
    const profiles=[];
    for(let start=0;start<sellerIds.length;start+=100){const {data,error}=await supabase.from('profiles').select('id,username,avatar_url').in('id',sellerIds.slice(start,start+100));if(error)throw error;profiles.push(...data);}
    const {data:states,error:stateError}=await supabase.rpc('saved_product_availability');if(stateError)throw stateError;
    if(active){setRows(items);setSellers(Object.fromEntries(profiles.map(profile=>[profile.id,profile])));setAvailability(new Set(states.filter(row=>row.unavailable).map(row=>row.product_id)));}
   }catch{if(active)setError('Unable to load saved items. Please retry. If this persists, the saved-items migration may need to be applied.');}finally{if(active)setLoading(false);}
  }
  load();const focus=()=>{if(document.visibilityState==='visible')setRetry(value=>value+1);};window.addEventListener('focus',focus);
  return()=>{active=false;window.removeEventListener('focus',focus);};
 },[userId,retry]);
 const visible=rows.filter(row=>ids.has(row.product_id));
 return <main className="shop-page"><div className="shop-container"><div className="shop-heading"><h1>Saved Items</h1><p>Your finds, kept in one place. Saving an item does not reserve it.</p></div>
  {actionError && <p role="alert" className="shop-error">{actionError}</p>}
  {loading||idsLoading?<p className="shop-message" role="status">Loading saved items…</p>:error||idsError?<div className="shop-error"><p role="alert">{error||idsError}</p><button className="save-heart" onClick={()=>{refresh();setRetry(value=>value+1);}}>Retry</button></div>:!visible.length?<div className="shop-empty"><h2>Nothing saved yet.</h2><p>Explore the Shop and save items you love.</p><Link className="view-all-button" to="/shop">Explore the Shop</Link></div>:<div className="shop-grid" style={{marginTop:28}}>{visible.map(row=>row.products?<ShopProductCard key={row.product_id} product={row.products} seller={sellers[row.products.user_id]} unavailable={availability.has(row.product_id)}/>:<article className="shop-card" key={row.product_id}><div className="shop-card-info"><h2>Item unavailable</h2><p>This listing is no longer accessible.</p><SaveButton productId={row.product_id} title="Unavailable item" detail/></div></article>)}</div>}
 </div></main>;
}
