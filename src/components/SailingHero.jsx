
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import "./SailingHero.css";

const clamp = (value, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

function Boat({ progress }) {
  const { scene } = useGLTF("/models/sailor.glb");
  const group = useRef();

  useFrame(({ clock }) => {
    if (!group.current) return;

    const t = clock.getElapsedTime();

    group.current.position.set(
      0,
      Math.sin(t * 0.8) * 0.035,
      -progress * 12
    );

    group.current.rotation.z = Math.sin(t * 0.65) * 0.012;
    group.current.rotation.x = Math.sin(t * 0.5) * 0.006;

    group.current.scale.setScalar(1);
  });

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  );
}

function Ocean() {
  const mesh = useRef();

  useFrame(({ clock }) => {
    if (mesh.current) {
      mesh.current.material.uniforms.uTime.value =
        clock.getElapsedTime();
    }
  });

  const material = useRef(
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color("#123d49") },
      },
      vertexShader: `
        uniform float uTime;
        varying vec2 vUv;

        void main() {
          vUv = uv;
          vec3 pos = position;
          pos.z += sin(pos.x * 0.035 + uTime * 0.6) * 0.35;
          pos.z += sin(pos.y * 0.055 + uTime * 0.4) * 0.2;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying vec2 vUv;

        void main() {
          float shimmer = sin(vUv.y * 190.0) * 0.018;
          gl_FragColor = vec4(uColor + shimmer, 1.0);
        }
      `,
      side: THREE.DoubleSide,
    })
  );

  return (
    <mesh
      ref={mesh}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -1.05, 0]}
    >
      <planeGeometry args={[3000, 3000, 128, 128]} />
      <primitive object={material.current} attach="material" />
    </mesh>
  );
}

function SailingCamera({ progress }) {
  const { camera } = useThree();

  useFrame(() => {
    camera.position.lerp(
      new THREE.Vector3(0, 3.2, 13),
      0.05
    );
    camera.lookAt(0, 1.2, -progress * 3);
  });

  return null;
}

function SailingScene({ progress }) {
  return (
    <Canvas
      camera={{ position: [0, 3.2, 13], fov: 50 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true }}
    >
      <color attach="background" args={["#d7a38e"]} />
      <fog attach="fog" args={["#d7a38e", 100, 500]} />

      <ambientLight intensity={1.3} />
      <directionalLight
        position={[12, 8, -25]}
        intensity={2.8}
        color="#ffbb7b"
      />

      <SailingCamera progress={progress} />
      <Ocean />

      <Suspense fallback={null}>
        <Boat progress={progress} />
      </Suspense>
    </Canvas>
  );
}

export default function SailingHero() {
  const sectionRef = useRef(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      if (!sectionRef.current) return;

      const rect = sectionRef.current.getBoundingClientRect();
      const distance =
        sectionRef.current.offsetHeight - window.innerHeight;

      setProgress(clamp(-rect.top / Math.max(distance, 1)));
    };

    window.addEventListener("scroll", update, { passive: true });
    update();

    return () => window.removeEventListener("scroll", update);
  }, []);

  const loading = clamp((progress - 0.55) / 0.35);
  const introOpacity = clamp(1 - progress * 3);

  return (
    <section ref={sectionRef} className="sailing-section">
      <div className="sailing-sticky">
        <SailingScene progress={progress} />

        <div
          className="sailing-content"
          style={{ opacity: introOpacity }}
        >
          <span className="sailing-eyebrow">YARD SAILOR</span>
          <h1>
            Find what's<br />
            <em>around the corner.</em>
          </h1>
          <p>
            Discover local yard sales and secondhand treasures
            waiting just beyond the horizon.
          </p>
          <span className="sailing-scroll-hint">
            Scroll to discover ↓
          </span>
        </div>

        <div
          className="sailing-loading"
          style={{
            opacity: loading,
            pointerEvents: loading > 0.1 ? "auto" : "none",
          }}
        >
          <span>YARD SAILOR</span>
          <h2>Discovering what’s beyond the horizon</h2>
          <div className="sailing-progress-track">
            <div
              className="sailing-progress-fill"
              style={{ width: `${loading * 100}%` }}
            />
          </div>
          <p>{Math.round(loading * 100)}%</p>
        </div>
      </div>
    </section>
  );
}

useGLTF.preload("/models/sailor.glb");