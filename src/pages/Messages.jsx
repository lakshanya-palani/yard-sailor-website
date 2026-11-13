import { AccountLayout } from '../components/layout/AccountLayout';
import { Button } from '../components/ui/Button';
import { StatusMessage } from '../components/ui/StatusMessage';
import { FormAlert } from '../components/ui/FormAlert';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCart } from '../context/CartContext';
import { commerceError, rpc } from '../lib/commerce';
import './Commerce.css';

import { formatMessageTime as time } from '../lib/format';
import { Avatar } from '../components/ui/Avatar';
import { Field } from '../components/ui/Field';
import { TextArea } from '../components/ui/TextArea';
export default function Messages() {
  const { userId } = useCart();
  const [params] = useSearchParams();
  return <MessagesForUser key={`${userId ?? 'signed-out'}:${params.get('conversation') ?? ''}`} userId={userId} />;
}
function MessagesForUser({ userId }) {
  const [params, setParams] = useSearchParams();
  const activeId = params.get('conversation');
  const [conversations, setConversations] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(Boolean(activeId));
  const [error, setError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [sendError, setSendError] = useState('');
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [hasOlder, setHasOlder] = useState(false);
  const [limit, setLimit] = useState(100);
  const [realtime, setRealtime] = useState(false);
  const mounted = useRef(false);
  const listRequest = useRef(0);
  const historyRequest = useRef(0);
  const currentConversation = useRef(activeId);
  const pendingSend = useRef(null);
  const sendingRef = useRef(false);
  const end = useRef(null);
  const markThrough = useRef(null);
  const selected = conversations.find(c => c.id === activeId);
  useEffect(() => {
    const lifecycle = mounted;
    const list = listRequest;
    const history = historyRequest;
    const conversation = currentConversation;
    lifecycle.current = true;
    conversation.current = activeId;
    return () => { lifecycle.current = false; conversation.current = null; list.current++; history.current++; };
  }, [activeId]);
  const loadList = useCallback(async () => {
    if (!mounted.current || !userId) return;
    const request = ++listRequest.current;
    try {
      const data = await rpc('list_product_conversations');
      if (mounted.current && request === listRequest.current) { setConversations(data || []); setError(''); }
    } catch(e) { if (mounted.current && request === listRequest.current) setError(commerceError(e)); }
    finally { if (mounted.current && request === listRequest.current) setLoading(false); }
  }, [userId]);
  const loadHistory = useCallback(async () => {
    if (!mounted.current || !activeId || !userId) return;
    const request = ++historyRequest.current;
    try {
      const { data, error: loadError } = await supabase.from('messages').select('id,conversation_id,sender_id,body,created_at')
        .eq('conversation_id',activeId).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(limit + 1);
      if (loadError) throw loadError;
      if (!mounted.current || request !== historyRequest.current) return;
      const rows = (data || []).slice(0,limit).reverse();
      setHasOlder((data || []).length > limit);
      setHistory(rows); setHistoryError('');
      const last = rows.at(-1);
      if (last && document.visibilityState === 'visible' && document.hasFocus() && markThrough.current !== last.id) {
        await rpc('mark_product_conversation_read',{p_conversation_id:activeId,p_message_id:last.id});
        if (mounted.current && request === historyRequest.current) { markThrough.current = last.id; loadList(); }
      }
    } catch(e) { if (mounted.current && request === historyRequest.current) setHistoryError(commerceError(e)); }
    finally { if (mounted.current && request === historyRequest.current) setHistoryLoading(false); }
  }, [activeId,userId,limit,loadList]);
  useEffect(() => {
    const generation = listRequest;
    const initial = setTimeout(loadList, 0);
    return () => { generation.current++; clearTimeout(initial); };
  }, [loadList]);
  useEffect(() => {
    const generation = historyRequest;
    const initial = setTimeout(loadHistory, 0);
    return () => { generation.current++; clearTimeout(initial); };
  }, [loadHistory]);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    const refresh = () => { if (active && document.visibilityState === 'visible') { loadList(); loadHistory(); } };
    const channel = supabase.channel(`messages-${userId}-${activeId || 'list'}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'conversations'},loadList);
    if (activeId) channel.on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`conversation_id=eq.${activeId}`},loadHistory);
    channel.subscribe(status => { if (!active) return; setRealtime(status === 'SUBSCRIBED'); if (status === 'SUBSCRIBED') refresh(); });
    const poll = setInterval(refresh,15000);
    window.addEventListener('focus',refresh);
    document.addEventListener('visibilitychange',refresh);
    return () => { active = false; supabase.removeChannel(channel); clearInterval(poll); window.removeEventListener('focus',refresh); document.removeEventListener('visibilitychange',refresh); };
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
      if (mounted.current && currentConversation.current === conversation) { setDraft(''); pendingSend.current = null; await loadHistory(); }
      if (mounted.current) await loadList();
    } catch(e) { if (mounted.current && currentConversation.current === conversation) setSendError(commerceError(e)); }
    finally { if (mounted.current) { sendingRef.current = false; setSending(false); } }
  }
  return <AccountLayout title="Direct Messages" className="commerce-account">
    {error && <FormAlert onRetry={loadList}>{error}</FormAlert>}
    <div className={`dm-layout ${activeId ? 'has-conversation' : ''}`}>
      <aside className="dm-list commerce-panel" aria-label="Conversations"><h2>Conversations</h2>
        {loading ? <StatusMessage compact kind="loading" title="Loading conversations…" /> : error && conversations.length === 0 ? <p>Conversations could not be loaded.</p> : conversations.length === 0 ? <p>No conversations yet. Open a product and choose Message Seller.</p> : conversations.map(c => <button type="button" className={`dm-conversation ${activeId === c.id ? 'selected' : ''}`} key={c.id} onClick={() => setParams({conversation:c.id})} aria-current={activeId === c.id ? 'true' : undefined}>
          <Avatar size={38} alt="" src={c.other_avatar} name={c.other_name} /><span className="dm-conversation-copy"><strong>{c.other_name}</strong><span>{c.last_body || `About ${c.product_title || 'a removed listing'}`}</span><time dateTime={c.last_at}>{time(c.last_at)}</time></span>
          {c.product_image && <img className="dm-product-thumb" src={c.product_image} alt="" />}{Number(c.unread_count)>0 && <span className="dm-unread" aria-label={`${c.unread_count} unread messages`}>{c.unread_count}</span>}
        </button>)}
      </aside>
      <section className="dm-active commerce-panel" aria-label="Active conversation">
        <Button variant="secondary" className="dm-back" onClick={() => setParams({})}>← Conversations</Button>
        {!activeId ? <div className="dm-empty"><h2>A conversation starts with a find.</h2><p>Select a conversation or message a seller from their listing.</p><Link to="/shop">Explore the shop ↗</Link></div> : loading ? <StatusMessage compact kind="loading" title="Loading conversation…" /> : !selected ? <div className="dm-empty"><h2>Conversation unavailable</h2><p>It may have been removed, or you may not have access.</p><Button variant="secondary" onClick={loadList}>Try again</Button></div> : <>
          <header className="dm-header"><Avatar size={38} alt="" src={selected.other_avatar} name={selected.other_name} /><div><h2>{selected.other_name}</h2><p className="commerce-muted">{realtime ? 'Updates live' : 'Checking for updates periodically'}</p></div></header>
          {selected.product_id ? <Link className="dm-product" to={`/products/${selected.product_id}`}>{selected.product_image && <img src={selected.product_image} alt="" />}<span>{selected.product_title || 'View listing'} ↗</span></Link> : <p className="commerce-muted">This listing has been removed. Your conversation is still available.</p>}
          <div className="dm-history" role="log" aria-live="polite" aria-relevant="additions" aria-label="Message history" aria-busy={historyLoading}>
            {hasOlder && <Button variant="secondary" onClick={() => setLimit(value => value + 100)}>Load earlier messages</Button>}
            {historyLoading ? <StatusMessage compact kind="loading" title="Loading messages…" /> : history.length === 0 ? <p>Say hello or ask a question about this item.</p> : history.map(m => <article className={`dm-message ${m.sender_id === userId ? 'mine' : ''}`} key={m.id}><span className="dm-sender">{m.sender_id === userId ? 'You' : selected.other_name}</span><p>{m.body}</p><time dateTime={m.created_at}>{time(m.created_at)}</time></article>)}<div ref={end} />
          </div>
          {historyError && <FormAlert onRetry={loadHistory} retryLabel="Reload history">{historyError}</FormAlert>}
          {sendError && <FormAlert>{sendError} Your draft is still here. Use Send to retry.</FormAlert>}
          <form className="dm-compose" onSubmit={send}><Field label={`Message ${selected.other_name}`} id="message-body" count={draft.length} max={4000}><TextArea id="message-body" value={draft} onChange={event => setDraft(event.target.value)} maxLength={4000} rows={3} disabled={sending} placeholder="Ask about this item…" /></Field><Button variant="primary" type="submit" disabled={sending || !draft.trim()}>{sending ? 'Sending…' : 'Send'}</Button></form>
        </>}
      </section>
    </div>
  </AccountLayout>;
}
