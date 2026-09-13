import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { rpc, commerceError, money } from '../lib/commerce';
import { manageCheckout, checkoutDestination, PaymentError } from '../lib/payments';
import { useCart } from '../context/CartContext';
import './Commerce.css';
const labels={creating:'Preparing test checkout',open:'Awaiting test payment',paid:'Test payment confirmed',expired:'Checkout expired or cancelled'};
export default function Orders() {
  const [orders,setOrders]=useState([]);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [busy,setBusy]=useState(null);
  const [params]=useSearchParams();const navigate=useNavigate();const {refresh,userId}=useCart();const checked=useRef(null);
  const load=useCallback(async()=>{try {setOrders(await rpc('list_my_checkout_orders'));setError('');}catch(e){setError(commerceError(e));}finally{setLoading(false);}},[userId]);
  useEffect(()=>{load();const poll=setInterval(()=>{if(document.visibilityState==='visible')load();},5000);return()=>clearInterval(poll);},[load]);
  const act=useCallback(async(id,action)=>{
    setBusy(id);setError('');
    try {const result=await manageCheckout(id,action);if(action==='resume' && result.url)checkoutDestination(result,navigate);await load();await refresh();}
    catch(e){setError(e instanceof PaymentError?e.message:commerceError(e));}finally{setBusy(null);}
  },[load,navigate,refresh]);
  const orderId=params.get('order');
  useEffect(()=>{if(params.get('checkout')==='success' && orderId && checked.current!==orderId){checked.current=orderId;act(orderId,'refresh');}},[params,orderId,act]);
  return <main className="commerce-page"><div className="commerce-width">
    <Link to="/cart">← Your cart</Link><h1>Your orders</h1>
    <p><strong>Test mode.</strong> These records represent test payments only. Sellers do not receive payouts and no real delivery is arranged.</p>
    {params.get('checkout')==='success' && <p role="status">Checking the payment with the server. Returning from Stripe alone does not confirm payment.</p>}
    {params.get('checkout')==='cancelled' && <p role="status">You left Stripe Checkout. Choose Cancel checkout below to release the items, or Resume checkout to continue.</p>}
    {error && <p role="alert" className="commerce-error">{error} <button onClick={load}>Reload orders</button></p>}
    {loading ? <p role="status">Loading orders…</p> : !error && !orders.length ? <div className="commerce-panel"><h2>No orders yet</h2><Link to="/shop">Explore the shop →</Link></div> : <div className="order-list">{orders.map(order=><article className="commerce-panel" key={order.id}>
      <h2>{labels[order.state] || 'Checking order'}</h2><p className="commerce-muted">{order.is_buyer?'Your purchase':'Your items sold'} · {new Date(order.created_at).toLocaleString()} · Order {order.id}</p>
      <div className="order-items">{order.items.map(item=><div className="cart-item" key={item.product_id}>
        <Link className="cart-cover" to={`/products/${item.product_id}`}>{item.image_url?<img src={item.image_url} alt={item.title}/>:<span>No image</span>}</Link>
        <div><h3><Link to={`/products/${item.product_id}`}>{item.title}</Link></h3><p>{money(item.unit_amount/100)} · Quantity 1</p></div>
      </div>)}</div><p><strong>{order.is_buyer?'Total':'Your items total'}: {money(order.amount_total/100)}</strong></p>
      {order.is_buyer && ['creating','open'].includes(order.state) && <><p className="commerce-muted">Reservations release after Stripe confirms cancellation or expiration. If payment or cancellation is delayed, use Check payment status.</p><div className="order-actions">
        <button disabled={!!busy} className="commerce-primary" onClick={()=>act(order.id,'resume')}>Resume checkout</button>
        <button disabled={!!busy} onClick={()=>act(order.id,'cancel')}>Cancel checkout</button>
        <button disabled={!!busy} onClick={()=>act(order.id,'refresh')}>Check payment status</button>
      </div></>}
      {busy===order.id && <p role="status">Checking with Stripe…</p>}
    </article>)}</div>}
  </div></main>;
}
