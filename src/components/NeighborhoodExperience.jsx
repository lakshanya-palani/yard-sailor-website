import { Component, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Billboard, Line, OrbitControls } from '@react-three/drei';
import { Spherical, Vector3 } from 'three';
import { Link } from 'react-router-dom';
import './NeighborhoodExperience.css';

const SALES = [
  { name: 'The reading nook', category: 'Books & records', copy: 'Browse a sample sale with well-loved books and records. Check the details before choosing your next stop.', x: -3.1, z: -2.5 },
  { name: 'A fresh corner', category: 'Home & garden', copy: 'Imagine finding a planter or a chair for your favorite corner. Explore what’s available before heading out.', x: 3.1, z: -2.5 },
  { name: 'Weekend discoveries', category: 'Hobbies & small finds', copy: 'A sample stop for a new hobby. Follow the highlighted route to see how a local visit could come together.', x: 3.1, z: 2.5 },
];
const HOME = [11, 11, 13];

class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <SceneFallback /> : this.props.children; }
}
function SceneFallback() {
  return <div className="neighborhood-fallback"><strong>Explore the neighborhood below.</strong><p>The 3D view isn’t available on this device. Select a demo sale to read its details, or explore the real yard-sale map.</p></div>;
}
function Block({ position, size, color }) {
  return <mesh position={position}><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={.9} /></mesh>;
}
function House({ x, z, index }) {
  return <group position={[x, .15, z]}>
    <Block position={[0, .65, 0]} size={[1.65, 1.3, 1.6]} color={index % 2 ? '#f4e4c8' : '#fff8e9'} />
    <mesh position={[0, 1.72, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[1.5, .95, 4]} /><meshStandardMaterial color={index === 2 ? '#9e4335' : '#263b4c'} /></mesh>
    <Block position={[.35, .35, .81]} size={[.36, .7, .035]} color="#b52c26" />
    <Block position={[-.42, .78, .82]} size={[.42, .4, .04]} color="#547687" />
    <Block position={[0, .015, 1.15]} size={[.65, .03, .75]} color="#d9d2bf" />
  </group>;
}
function Tree({ x, z }) {
  return <group position={[x, .15, z]}>
    <mesh position={[0, .4, 0]}><cylinderGeometry args={[.09, .12, .8, 6]} /><meshStandardMaterial color="#806443" /></mesh>
    <mesh position={[0, 1.05, 0]}><icosahedronGeometry args={[.64, 0]} /><meshStandardMaterial color="#7e9368" roughness={1} /></mesh>
  </group>;
}
function SalePin({ sale, selected, onSelect }) {
  return <Billboard position={[sale.x, 2.95, sale.z]}>
    <group onClick={event => { event.stopPropagation(); onSelect(); }} scale={selected ? 1.15 : 1}>
      <mesh><torusGeometry args={[.27, .11, 8, 20]} /><meshBasicMaterial color={selected ? '#ef403a' : '#b52c26'} /></mesh>
      <mesh position={[0, -.38, 0]} rotation={[0, 0, Math.PI]}><coneGeometry args={[.19, .42, 3]} /><meshBasicMaterial color={selected ? '#ef403a' : '#b52c26'} /></mesh>
      <mesh><sphereGeometry args={[.55, 8, 8]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
    </group>
  </Billboard>;
}
function Neighborhood({ selected, onSelect }) {
  const sale = SALES[selected];
  return <>
    <ambientLight intensity={1.6} />
    <directionalLight position={[6, 12, 5]} intensity={2.2} />
    <Block position={[0, -.15, 0]} size={[12, .5, 10]} color="#dfd5bd" />
    <Block position={[0, .12, 0]} size={[11.7, .06, 9.7]} color="#b4bea0" />
    <Block position={[0, .17, 0]} size={[2, .05, 9.7]} color="#eae1cf" />
    <Block position={[0, .18, 0]} size={[1.35, .05, 9.7]} color="#61707a" />
    <Block position={[0, .17, 0]} size={[11.7, .05, 1.8]} color="#eae1cf" />
    <Block position={[0, .2, 0]} size={[11.7, .04, 1.2]} color="#61707a" />
    {[-4, -2, 2, 4].map(z => <Block key={z} position={[0, .215, z]} size={[.045, .01, .5]} color="#fff3df" />)}
    {[[-3.1,-2.5],[3.1,-2.5],[3.1,2.5],[-3.1,2.5]].map(([x,z], index) => <House key={index} x={x} z={z} index={index} />)}
    {[[-5,-3.5],[-5,2],[-1.6,3.7],[5,3.6],[5,-3.5],[1.6,-3.8]].map(([x,z], index) => <Tree key={index} x={x} z={z} />)}
    <Line points={[[0,.26,4.5],[0,.26,0],[sale.x,.26,0],[sale.x,.26,sale.z + 1.2]]} color="#ef403a" lineWidth={4} />
    <mesh position={[0,.28,4.5]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.16,.28,24]} /><meshBasicMaterial color="#fff3df" /></mesh>
    {SALES.map((item,index) => <SalePin key={item.name} sale={item} selected={index === selected} onSelect={() => onSelect(index)} />)}
  </>;
}
function ViewControls({ active, visible, reduced, reset, interacted, command }) {
  const controls = useRef();
  const { camera, invalidate, size } = useThree();
  const intro = useRef(0);
  const started = useRef(false);
  const distance = size.width < 500 ? 1.25 : 1;
  useEffect(() => {
    camera.position.set(...HOME.map(v => v * distance));
    controls.current?.target.set(0, 0, 0);
    controls.current?.update();
    invalidate();
  }, [reset, camera, invalidate, distance]);
  useEffect(() => {
    if (!command) return;
    interacted.current = true;
    const target = controls.current?.target || new Vector3();
    const sphere = new Spherical().setFromVector3(camera.position.clone().sub(target));
    if (command.action === 'left') sphere.theta -= Math.PI / 8;
    if (command.action === 'right') sphere.theta += Math.PI / 8;
    if (command.action === 'in') sphere.radius = Math.max(9, sphere.radius * .85);
    if (command.action === 'out') sphere.radius = Math.min(29, sphere.radius / .85);
    camera.position.copy(new Vector3().setFromSpherical(sphere).add(target));
    camera.lookAt(target); controls.current?.update(); invalidate();
  }, [command, camera, invalidate, interacted]);
  useFrame((_, delta) => {
    if (!visible || reduced || interacted.current || intro.current >= 1) return;
    if (!started.current) { intro.current = 0; started.current = true; }
    intro.current = Math.min(1, intro.current + Math.min(delta, .05) / .65);
    const extra = 1 + .12 * (1 - intro.current) ** 3;
    camera.position.set(...HOME.map(v => v * distance * extra));
    controls.current?.update();
    invalidate();
  });
  useEffect(() => { if (visible) invalidate(); }, [visible, invalidate]);
  return <OrbitControls ref={controls} enabled={active && visible} enableDamping={!reduced} dampingFactor={.12}
    minDistance={9} maxDistance={29} minPolarAngle={.25} maxPolarAngle={Math.PI / 2.35} enablePan={false}
    onStart={() => { interacted.current = true; }} />;
}
function ContextGuard({ onLost }) {
  const { gl } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = event => { event.preventDefault(); onLost(); };
    canvas.addEventListener('webglcontextlost', lost);
    return () => canvas.removeEventListener('webglcontextlost', lost);
  }, [gl, onLost]);
  return null;
}
export default function NeighborhoodExperience() {
  const section = useRef();
  const interacted = useRef(false);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);
  const [selected, setSelected] = useState(0);
  const [command, setCommand] = useState(null);
  const [reset, setReset] = useState(0);
  const [lost, setLost] = useState(false);
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting);
      if (entry.isIntersecting) setMounted(true);
      else setActive(false);
    }, { threshold: .05 });
    observer.observe(section.current);
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(media.matches);
    media.addEventListener('change', change);
    return () => { observer.disconnect(); media.removeEventListener('change', change); };
  }, []);
  const sale = SALES[selected];
  return <section ref={section} className="neighborhood-section about-width" aria-labelledby="neighborhood-title">
    <div className="neighborhood-copy">
      <p className="about-label">DISCOVER → EXPLORE → VISIT</p>
      <h2 id="neighborhood-title">Yard Sales<br />Made Easy</h2>
      <p className="neighborhood-lead">Find your next local treasure without the guesswork.</p>
      <ol className="neighborhood-steps">
        <li><strong>Discover</strong><span>Find sales near you.</span></li>
        <li><strong>Explore</strong><span>Explore what’s available.</span></li>
        <li><strong>Visit</strong><span>Plan your next local find.</span></li>
      </ol>
      <Link className="about-text-link" to="/find-yard-sale">Find real yard sales ↗</Link>
    </div>
    <div className="neighborhood-demo">
      <div className="neighborhood-toolbar"><span>ILLUSTRATIVE NEIGHBORHOOD</span><span aria-label="North">N ↑</span></div>
      <div className={`neighborhood-stage ${active ? 'is-exploring' : ''}`} role="region" tabIndex={active ? 0 : -1} aria-label="Interactive demo neighborhood. Press Escape to finish exploring." onKeyDown={event => { if (event.key === 'Escape') setActive(false); }}>
        {lost ? <SceneFallback /> : <SceneBoundary>{mounted && <Canvas
          camera={{ position: HOME, fov: 43 }} dpr={[1, 1.5]} frameloop={visible ? 'demand' : 'never'}
          fallback={<SceneFallback />} style={{ pointerEvents: active ? 'auto' : 'none', touchAction: active ? 'none' : 'pan-y' }}>
          <Neighborhood selected={selected} onSelect={setSelected} />
          <ViewControls active={active} visible={visible} reduced={reduced} reset={reset} interacted={interacted} command={command} />
          <ContextGuard onLost={() => setLost(true)} />
        </Canvas>}</SceneBoundary>}
      </div>
      <div className="neighborhood-controls">
        <button type="button" aria-pressed={active} disabled={lost} onClick={() => { interacted.current = true; setActive(!active); }}>{active ? 'Done exploring' : 'Explore 3D map'}</button>
        <button type="button" disabled={lost} onClick={() => { interacted.current = true; setReset(value => value + 1); }}>Reset View</button>
        {[['left','Rotate left'],['right','Rotate right'],['in','Zoom in'],['out','Zoom out']].map(([action,label]) => <button key={action} type="button" disabled={lost} onClick={() => setCommand({action})}>{label}</button>)}
      </div>
      <p className="neighborhood-instructions">{active ? 'Drag to explore · Scroll or pinch to zoom · Select a pin' : 'Activate the map to rotate and zoom, or choose a sale below.'}</p>
      <div className="neighborhood-locations" aria-label="Select an illustrative yard sale">{SALES.map((item,index) => <button type="button" key={item.name} aria-pressed={selected === index} onClick={() => setSelected(index)}>{String(index + 1).padStart(2, '0')} · {item.name}</button>)}</div>
      <div className="neighborhood-info" aria-live="polite" aria-atomic="true"><span>DEMO SALE · {sale.category}</span><h3>{sale.name}</h3><p>{sale.copy}</p></div>
      <p className="neighborhood-disclaimer">Illustrative locations only. These are not live sales or real addresses.</p>
    </div>
  </section>;
}
