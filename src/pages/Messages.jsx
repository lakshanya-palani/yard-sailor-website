import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCart } from '../context/CartContext';
import { commerceError, rpc } from '../lib/commerce';
import './Commerce.css';

const time = value => value ? new Date(value).toLocaleString([], { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }) : '';
function Avatar({ src, name }) { return <span className="dm-avatar">{src ? <img src={src} alt="" /> : name?.charAt(0).toUpperCase() || 'Y'}</span>; }
export default function Messages() {
  const { userId } = useCart();
  const [params, setParams] = useSearchParams();
  const activeId = params.get('conversation');
  const [conversations, setConversations] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [sendError, setSendError] = useState('');
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [hasOlder, setHasOlder] = useState(false);
  const [limit, setLimit] = useState(100);
  const [realtime, setRealtime] = useState(false);
  const listRequest = useRef(0);
  const historyRequest = useRef(0);
  const currentConversation = useRef(activeId);
  const pendingSend = useRef(null);
  const sendingRef = useRef(false);
  const end = useRef(null);
  const markThrough = useRef(null);
  const selected = conversations.find(c => c.id === activeId);
  useEffect(() => {
    setConversations([]); setHistory([]); setLoading(true); setError('');
    return () => { listRequest.current++; historyRequest.current++; };
  }, [userId]);
  const loadList = useCallback(async () => {
    if (!userId) return;
    const request = ++listRequest.current;
    try {
      const data = await rpc('list_product_conversations');
      if (request === listRequest.current) { setConversations(data || []); setError(''); }
    } catch(e) { if (request === listRequest.current) setError(commerceError(e)); }
    finally { if (request === listRequest.current) setLoading(false); }
  }, [userId]);
  const loadHistory = useCallback(async () => {
    if (!activeId || !userId) return;
    const request = ++historyRequest.current;
    try {
      const { data, error: loadError } = await supabase.from('messages').select('id,conversation_id,sender_id,body,created_at')
        .eq('conversation_id',activeId).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(limit + 1);
      if (loadError) throw loadError;
      if (request !== historyRequest.current) return;
      const rows = (data || []).slice(0,limit).reverse();
      setHasOlder((data || []).length > limit);
      setHistory(rows); setHistoryError('');
      const last = rows.at(-1);
      if (last && document.visibilityState === 'visible' && document.hasFocus() && markThrough.current !== last.id) {
        await rpc('mark_product_conversation_read',{p_conversation_id:activeId,p_message_id:last.id});
        if (request === historyRequest.current) { markThrough.current = last.id; loadList(); }
      }
    } catch(e) { if (request === historyRequest.current) setHistoryError(commerceError(e)); }
    finally { if (request === historyRequest.current) setHistoryLoading(false); }
  }, [activeId,userId,limit,loadList]);
  useEffect(() => {
    currentConversation.current = activeId;
    markThrough.current = null;
    pendingSend.current = null;
    setDraft(''); setHistory([]); setHistoryError(''); setSendError(''); setLimit(100);
    setHistoryLoading(Boolean(activeId));
    return () => { historyRequest.current++; };
  }, [activeId,userId]);
  useEffect(() => {
    loadList();
    return () => { listRequest.current++; };
  }, [loadList]);
  useEffect(() => {
    loadHistory();
    return () => { historyRequest.current++; };
  }, [loadHistory]);
  useEffect(() => {
    if (!userId) return;
    const refresh = () => { if (document.visibilityState === 'visible') { loadList(); loadHistory(); } };
    const channel = supabase.channel(`messages-${userId}-${activeId || 'list'}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'conversations'},loadList);
    if (activeId) channel.on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`conversation_id=eq.${activeId}`},loadHistory);
    channel.subscribe(status => { setRealtime(status === 'SUBSCRIBED'); if (status === 'SUBSCRIBED') refresh(); });
    const poll = setInterval(refresh,15000);
    window.addEventListener('focus',refresh);
    document.addEventListener('visibilitychange',refresh);
    return () => { supabase.removeChannel(channel); clearInterval(poll); window.removeEventListener('focus',refresh); document.removeEventListener('visibilitychange',refresh); };
  }, [userId,activeId,loadList,loadHistory]);
  const newestId = history.at(-1)?.id;
  useEffect(() => { end.current?.scrollIntoView({ block:'nearest' }); }, [newestId]);
  async function send(event) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || body.length > 4000 || !selected || sendingRef.current) return;
    sendingRef.current = true; setSending(true); setSendError('');
    const conversation = activeId;
    if (!pendingSend.current || pendingSend.current.body !== body || pendingSend.current.conversation_id !== conversation) {
      pendingSend.current = {id:crypto.randomUUID(),conversation_id:conversation,body};
    }
    const message = pendingSend.current;
    try {
      const { error: insertError } = await supabase.from('messages').insert(message);
      if (insertError && insertError.code !== '23505') throw insertError;
      // UUID retries are idempotent, including an ambiguous network response.
      if (currentConversation.current === conversation) { setDraft(''); pendingSend.current = null; await loadHistory(); }
      await loadList();
    } catch(e) { if (currentConversation.current === conversation) setSendError(commerceError(e)); }
    finally { sendingRef.current = false; setSending(false); }
  }
  return <main className="commerce-page"><div className="commerce-width"><h1>Direct Messages</h1>
    {error && <p role="alert" className="commerce-error">{error} <button onClick={loadList}>Try again</button></p>}
    <div className={`dm-layout ${activeId ? 'has-conversation' : ''}`}>
      <aside className="dm-list commerce-panel" aria-label="Conversations"><h2>Conversations</h2>
        {loading ? <p role="status">Loading conversations…</p> : error && conversations.length === 0 ? <p>Conversations could not be loaded.</p> : conversations.length === 0 ? <p>No conversations yet. Open a product and choose Message Seller.</p> : conversations.map(c => <button className={`dm-conversation ${activeId === c.id ? 'selected' : ''}`} key={c.id} onClick={() => setParams({conversation:c.id})} aria-current={activeId === c.id ? 'true' : undefined}>
          <Avatar src={c.other_avatar} name={c.other_name} /><span className="dm-conversation-copy"><strong>{c.other_name}</strong><span>{c.last_body || `About ${c.product_title || 'a removed listing'}`}</span><time dateTime={c.last_at}>{time(c.last_at)}</time></span>
          {c.product_image && <img className="dm-product-thumb" src={c.product_image} alt="" />}{Number(c.unread_count)>0 && <span className="dm-unread" aria-label={`${c.unread_count} unread messages`}>{c.unread_count}</span>}
        </button>)}
      </aside>
      <section className="dm-active commerce-panel" aria-label="Active conversation">
        <button className="dm-back" onClick={() => setParams({})}>← Conversations</button>
        {!activeId ? <div className="dm-empty"><h2>A conversation starts with a find.</h2><p>Select a conversation or message a seller from their listing.</p><Link to="/shop">Explore the shop ↗</Link></div> : loading ? <p role="status">Loading conversation…</p> : !selected ? <div className="dm-empty"><h2>Conversation unavailable</h2><p>It may have been removed, or you may not have access.</p><button onClick={loadList}>Try again</button></div> : <>
          <header className="dm-header"><Avatar src={selected.other_avatar} name={selected.other_name} /><div><h2>{selected.other_name}</h2><p className="commerce-muted">{realtime ? 'Updates live' : 'Checking for updates periodically'}</p></div></header>
          {selected.product_id ? <Link className="dm-product" to={`/products/${selected.product_id}`}>{selected.product_image && <img src={selected.product_image} alt="" />}<span>{selected.product_title || 'View listing'} ↗</span></Link> : <p className="commerce-muted">This listing has been removed. Your conversation is still available.</p>}
          <div className="dm-history" role="log" aria-live="polite" aria-relevant="additions" aria-label="Message history" aria-busy={historyLoading}>
            {hasOlder && <button onClick={() => setLimit(value => value + 100)}>Load earlier messages</button>}
            {historyLoading ? <p role="status">Loading messages…</p> : history.length === 0 ? <p>Say hello or ask a question about this item.</p> : history.map(m => <article className={`dm-message ${m.sender_id === userId ? 'mine' : ''}`} key={m.id}><span className="dm-sender">{m.sender_id === userId ? 'You' : selected.other_name}</span><p>{m.body}</p><time dateTime={m.created_at}>{time(m.created_at)}</time></article>)}<div ref={end} />
          </div>
          {historyError && <p className="commerce-error" role="alert">{historyError} <button onClick={loadHistory}>Reload history</button></p>}
          {sendError && <p className="commerce-error" role="alert">{sendError} Your draft is still here. Use Send to retry.</p>}
          <form className="dm-compose" onSubmit={send}><label htmlFor="message-body">Message {selected.other_name}</label><textarea id="message-body" value={draft} onChange={event => setDraft(event.target.value)} maxLength={4000} rows={3} disabled={sending} placeholder="Ask about this item…" /><button className="commerce-primary" disabled={sending || !draft.trim()}>{sending ? 'Sending…' : 'Send'}</button></form>
        </>}
      </section>
    </div>
  </div></main>;
}
