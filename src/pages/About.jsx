import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import NeighborhoodExperience from '../components/NeighborhoodExperience';
import './About.css';

function FindIllustration({ kind = 'lamp' }) {
  return <svg viewBox="0 0 160 150" fill="none" aria-hidden="true">
    {kind === 'lamp' ? <><path d="M80 62v66M57 130h46" stroke="#1c2a39" strokeWidth="6"/><path d="M54 25h52l17 53H37z" fill="#bd6543"/><path d="M43 78h74" stroke="#1c2a39" strokeWidth="3"/></> : kind === 'chair' ? <><path d="M43 36q37-15 74 0v53H43z" fill="#8a9b78"/><path d="M35 87h90v18H35z" fill="#687b57"/><path d="M44 104l-7 30m79-30 7 30" stroke="#1c2a39" strokeWidth="6"/></> : <><path d="M36 105h88v22H36z" fill="#b52c26"/><path d="M42 82h77v21H42z" fill="#879978"/><path d="M34 59h90v22H34z" fill="#c99959"/><path d="M42 68h73M50 91h59M44 115h69" stroke="#fff3df" strokeWidth="3"/></>}
  </svg>;
}
function Pin({ x, y, delay }) {
  return <g className="showcase-pin" style={{ '--delay': `${delay}ms`, transformOrigin: `${x}px ${y}px` }}><path d={`M${x} ${y}c-28-32-19-49 0-49s28 17 0 49Z`} fill="#b52c26"/><circle cx={x} cy={y-30} r="7" fill="#fff3df"/></g>;
}
function MapPreview() {
  return <div className="showcase-map">
    <svg viewBox="0 0 600 440" aria-hidden="true">
      <rect width="600" height="440" fill="#e2e7d5"/>
      <path d="M-20 150h650M-20 330h650M180-20v480M440-20v480" stroke="#fffaf0" strokeWidth="35"/>
      <path d="M-20 150h650M-20 330h650M180-20v480M440-20v480" stroke="#c9c5b6" strokeWidth="2" strokeDasharray="7 9"/>
      {[[50,45],[265,55],[495,50],[45,215],[260,220],[495,220],[65,375],[280,375]].map(([x,y])=><g key={`${x}-${y}`}><rect x={x} y={y} width="54" height="34" rx="3" fill="#d5b996"/><path d={`M${x-5} ${y}l32-20 32 20`} fill="#637578"/></g>)}
      <path className="showcase-route" d="M180 395V150h160v-45" stroke="#b52c26" strokeWidth="5" strokeDasharray="8 7" fill="none"/>
      <circle cx="180" cy="395" r="9" fill="#1c2a39" stroke="white" strokeWidth="4"/>
      <Pin x={340} y={108} delay={100}/><Pin x={110} y={267} delay={250}/><Pin x={512} y={310} delay={400}/>
    </svg>
    <span className="showcase-north">N ↑</span>
    <div className="showcase-sale showcase-arrival"><span className="showcase-dot"/><div><small>SELECTED DEMO SALE</small><strong>A little of everything</strong><span>Books, homewares & weekend finds</span></div><span>↗</span></div>
  </div>;
}
function ShopPreview() {
  return <div className="showcase-shop">
    <div className="showcase-mini-heading">Small finds. Plenty of possibility.</div>
    <div className="showcase-products">{[['chair','Reading chair','$40'],['lamp','Table lamp','$18'],['books','A stack of stories','$12']].map(([kind,title,price],i)=><div className="showcase-product showcase-arrival" style={{'--delay':`${i*120}ms`}} key={kind}><div><FindIllustration kind={kind}/></div><strong>{title}</strong><span>{price}</span></div>)}</div>
    <div className="showcase-detail showcase-arrival" style={{'--delay':'400ms'}}><span className="showcase-detail-icon">↗</span><div><small>A CLOSER LOOK</small><strong>Table lamp</strong><p>A warm corner starts here. Explore photos and the seller’s description.</p></div><b>$18</b></div>
  </div>;
}
function PostPreview() {
  return <div className="showcase-post"><div className="showcase-mini-heading">Give it another chapter.</div><div className="showcase-post-layout"><div className="showcase-form"><span className="showcase-upload showcase-arrival"><FindIllustration/><small>Photo added ✓</small></span><span className="showcase-field">ITEM TITLE<strong>Table lamp</strong></span><span className="showcase-field">PRICE<strong>$18</strong></span></div><div className="showcase-published showcase-arrival" style={{'--delay':'350ms'}}><span className="showcase-ready">✓ Preview ready</span><FindIllustration/><strong>Table lamp</strong><span>$18 · Home & living</span><small>Listing demonstration only</small></div></div></div>;
}
function MessagePreview() {
  return <div className="showcase-messages"><div className="showcase-thread-product"><FindIllustration/><div><small>ABOUT THIS FIND</small><strong>Table lamp · $18</strong></div></div><div className="showcase-thread"><p className="showcase-bubble showcase-arrival"><small>DEMO BUYER</small>Hi! Does the lamp still work?</p><p className="showcase-bubble showcase-reply showcase-arrival" style={{'--delay':'220ms'}}><small>DEMO SELLER</small>Yes, it does. Happy to answer any questions!</p><p className="showcase-bubble showcase-arrival" style={{'--delay':'440ms'}}><small>DEMO BUYER</small>Thanks! What size is it?</p></div><div className="showcase-message-note">A conversation starts with a find.</div></div>;
}
const FEATURES = [
  {id:'discover', label:'DISCOVER NEARBY', title:'Find yard sales near you.', copy:'Start with the map. Explore local yard-sale events, check the details, and choose where to head next.', details:['See sales on the map','Explore the details before you go'], link:'/find-yard-sale', action:'Explore the yard-sale map', visual:MapPreview, caption:'Illustrative map · No real addresses or live sales'},
  {id:'shop', label:'SHOP SECONDHAND', title:'Discover something worth keeping.', copy:'Browse individual finds, open a listing, and take a closer look at the photos, price, and seller’s description.', details:['Browse individual secondhand products','Get a closer look at each listing'], link:'/shop', action:'Browse the shop', visual:ShopPreview, caption:'Illustrative products and prices · Not live listings'},
  {id:'post', label:'MAKE ROOM', title:'Turn your extras into someone’s next find.', copy:'List one item with photos and a price, or create a yard-sale event with the details visitors need. Choose what works for your sale.', details:['Post an individual product','Create a yard-sale event'], link:'/post-sale', action:'Post an individual find', secondLink:'/post-yard-sale', secondAction:'Create a yard sale', visual:PostPreview, caption:'Posting demonstration · Nothing is uploaded or submitted'},
  {id:'connect', label:'CONNECT LOCALLY', title:'Connect with the people behind the finds.', copy:'Ask the seller a question from the listing. Keep the conversation and its product together in your direct messages.', details:['Ask about a specific item','Return to the listing from your conversation'], link:'/messages', action:'Open your messages', visual:MessagePreview, caption:'Fictional conversation · No private messages or user information'},
];
export default function About() {
  const page = useRef(null);
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      entry.target.classList.toggle('is-visible', entry.isIntersecting);
    }), { threshold: .12 });
    page.current.querySelectorAll('.about-showcase').forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, []);
  return <main className="about-page" ref={page}>
    <header className="about-hero about-width"><p className="about-label">ABOUT YARD SAILOR</p><h1>A little closer.<br/><span>A whole lot to discover.</span></h1><div className="about-hero-bottom"><p>Local yard sales, secondhand finds, and the people behind them. Get to know your next way to shop the neighborhood.</p><a className="about-text-link" href="#about-discover">Take a look around ↓</a></div></header>
    {FEATURES.map(({id,label,title,copy,details,link,action,secondLink,secondAction,visual:Visual,caption},index)=><section id={`about-${id}`} key={id} className={`about-showcase about-width about-showcase-${id}`} aria-labelledby={`about-${id}-title`}>
      <figure className="about-showcase-window"><div className="showcase-window-bar"><span>YARD SAILOR / {label}</span><span aria-hidden="true">0{index+1}</span></div><div className="showcase-demo" aria-hidden="true"><Visual/></div><figcaption>{caption}</figcaption></figure>
      <div className="about-showcase-copy"><p className="about-label">0{index+1} / {label}</p><h2 id={`about-${id}-title`}>{title}</h2><p className="about-feature-description">{copy}</p><ul>{details.map((detail,i)=><li key={detail}><span aria-hidden="true">0{i+1}</span>{detail}</li>)}</ul><div className="about-feature-links"><Link className="about-text-link" to={link}>{action} ↗</Link>{secondLink && <Link className="about-text-link" to={secondLink}>{secondAction} ↗</Link>}</div></div>
    </section>)}
    <NeighborhoodExperience/>
  </main>;
}
