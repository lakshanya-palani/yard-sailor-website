
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import * as THREE from "three";
import "./SailingHero.css";

// Shared sun direction for the sky, water, and lighting.
const SUN_DIRECTION = new THREE.Vector3()
  .setFromSphericalCoords(
    1,
    THREE.MathUtils.degToRad(73),
    THREE.MathUtils.degToRad(80)
  )
  .normalize();

// ------------------------------------------------------------
// BOAT
// ------------------------------------------------------------

function Boat({ progress, reducedMotion }) {
  const { scene } = useGLTF("/models/sailor.glb");
  const group = useRef();

  useFrame(({ clock }) => {
    if (!group.current) return;

    const t = reducedMotion ? 0 : clock.getElapsedTime();

    group.current.position.set(
      0,
      Math.sin(t * 0.8) * 0.035,
      -progress * 12
    );

    group.current.rotation.z =
      Math.sin(t * 0.65) * 0.012;

    group.current.rotation.x =
      Math.sin(t * 0.5) * 0.006;
  });

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  );
}

// ------------------------------------------------------------
// OCEAN
// ------------------------------------------------------------

function Ocean({ reducedMotion }) {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSunDirection: { value: SUN_DIRECTION.clone() },

        uDeepColor: { value: new THREE.Color("#0b4d96") },
        uMidColor: { value: new THREE.Color("#2d7fc7") },
        uLightColor: { value: new THREE.Color("#68aee8") },
        uFoamColor: { value: new THREE.Color("#d9efff") },

        uHorizonColor: { value: new THREE.Color("#f0c2a5") },
        uSunColor: { value: new THREE.Color("#ffe0b0") },
      },

      vertexShader: `
        uniform float uTime;

        varying vec3 vWorldPosition;
        varying vec3 vWorldNormal;
        varying float vWaveHeight;

        float waveHeight(vec2 p, float t) {
          float h = 0.0;

          // Large rolling swells
          h += 0.22 * sin(dot(p, vec2(0.22, 0.08)) + t * 0.45);
          h += 0.16 * sin(dot(p, vec2(-0.14, 0.28)) + t * 0.60);

          // Medium crossing waves
          h += 0.09 * sin(dot(p, vec2(0.80, 0.22)) + t * 0.95);
          h += 0.06 * sin(dot(p, vec2(-0.55, 0.62)) + t * 1.15);

          // Smaller surface chop
          h += 0.035 * sin(dot(p, vec2(1.8, 1.0)) + t * 1.7);
          h += 0.02 * sin(dot(p, vec2(-2.2, 1.7)) + t * 2.1);

          return h;
        }

        void main() {
          vec3 pos = position;

          float h = waveHeight(pos.xy, uTime);
          pos.z = h;

          float e = 0.08;
          float hx = waveHeight(pos.xy + vec2(e, 0.0), uTime);
          float hy = waveHeight(pos.xy + vec2(0.0, e), uTime);

          vec3 localNormal = normalize(vec3(
            (h - hx) / e,
            (h - hy) / e,
            1.0
          ));

          vec4 worldPosition = modelMatrix * vec4(pos, 1.0);

          vWorldPosition = worldPosition.xyz;
          vWorldNormal = normalize(mat3(modelMatrix) * localNormal);
          vWaveHeight = h;

          gl_Position =
            projectionMatrix * viewMatrix * worldPosition;
        }
      `,

      fragmentShader: `
        uniform float uTime;
        uniform vec3 uSunDirection;
        uniform vec3 uDeepColor;
        uniform vec3 uMidColor;
        uniform vec3 uLightColor;
        uniform vec3 uFoamColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uSunColor;

        varying vec3 vWorldPosition;
        varying vec3 vWorldNormal;
        varying float vWaveHeight;

        void main() {
          vec3 N = normalize(vWorldNormal);
          vec3 V = normalize(cameraPosition - vWorldPosition);
          vec3 L = normalize(uSunDirection);

          // Fine animated ripples
          float ripple1 =
              sin(vWorldPosition.x * 3.5 + uTime * 1.2)
            * cos(vWorldPosition.z * 2.8 - uTime * 0.9);

          float ripple2 =
              sin(vWorldPosition.x * 7.0 - uTime * 1.8
            + vWorldPosition.z * 5.8);

          float ripple3 =
              cos(vWorldPosition.x * 10.5 + uTime * 2.3)
            * sin(vWorldPosition.z * 9.0 - uTime * 1.7);

          N = normalize(N + vec3(
            ripple1 * 0.020 + ripple3 * 0.008,
            0.0,
            ripple2 * 0.016
          ));

          // Base blue ocean color
          float heightMix =
            smoothstep(-0.28, 0.35, vWaveHeight);

          vec3 color =
            mix(uDeepColor, uMidColor, heightMix);

          // Lighter wave crests
          float crest =
            smoothstep(0.10, 0.36, vWaveHeight);

          color =
            mix(color, uLightColor, crest * 0.55);

          // Fresnel reflection
          float fresnel = pow(
            1.0 - clamp(dot(N, V), 0.0, 1.0),
            3.5
          );

          color =
            mix(color, uLightColor, fresnel * 0.22);

          // Sunset reflection
          vec3 R = reflect(-L, N);

          float sunHighlight = pow(
            max(dot(R, V), 0.0),
            180.0
          );

          color += uSunColor * sunHighlight * 0.75;

          // Distance haze
          float dist =
            length(cameraPosition - vWorldPosition);

          float haze =
            smoothstep(160.0, 820.0, dist);

          color =
            mix(color, uHorizonColor, haze * 0.30);

          gl_FragColor = vec4(color, 1.0);

          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,

      side: THREE.DoubleSide,
    });
  }, []);

  const mesh = useRef();
  useFrame((_, delta) => {
    if (!reducedMotion && mesh.current) mesh.current.material.uniforms.uTime.value += delta;
  });

  useEffect(() => {
    return () => material.dispose();
  }, [material]);

  return (
    <mesh
      ref={mesh}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -1.05, 0]}
      material={material}
      frustumCulled={false}
    >
      <planeGeometry args={[900, 900, 360, 360]} />
    </mesh>
  );
}

// ------------------------------------------------------------
// SUNSET SKY
// ------------------------------------------------------------

function SunsetSky() {
  const sky = useMemo(() => {
    const skyObject = new Sky();
    skyObject.scale.setScalar(450000);

    const uniforms = skyObject.material.uniforms;

    uniforms.turbidity.value = 8;
    uniforms.rayleigh.value = 2.2;
    uniforms.mieCoefficient.value = 0.005;
    uniforms.mieDirectionalG.value = 0.8;
    uniforms.sunPosition.value.copy(SUN_DIRECTION);

    return skyObject;
  }, []);

  return <primitive object={sky} />;
}

// ------------------------------------------------------------
// CAMERA
// ------------------------------------------------------------

function SailingCamera({ progress }) {
  useFrame(({ camera, size }) => {
    const mobile = size.width < 600;
    camera.fov = mobile ? 55 : 50;
    camera.position.set(0, 5, (mobile ? 30 : 26) - progress * 9);
    camera.lookAt(0, -1, -progress * 12);
    camera.updateProjectionMatrix();
  });
  return null;
}

// One draw call for a restrained, deterministic trail of sea spray / treasure glints.
function SailingGlints({ progress, reducedMotion }) {
  const ref = useRef();
  const { size } = useThree();
  const positions = useMemo(() => {
    const count = size.width < 600 ? 12 : 28;
    return new Float32Array(Array.from({ length: count }, (_, i) => [
      (i % 2 ? 1 : -1) * (5 + (i * 7 % 13)),
      1.5 + (i * 3 % 9),
      -22 + (i * 11 % 40),
    ]).flat());
  }, [size.width]);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.z = progress * 13;
    ref.current.rotation.z = reducedMotion ? 0 : Math.sin(clock.elapsedTime * .25) * .015;
  });
  return <points ref={ref}>
    <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
    <pointsMaterial color="#ffe4ae" size={.095} transparent opacity={.75} sizeAttenuation />
  </points>;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return reduced;
}

// ------------------------------------------------------------
// THREE.JS SCENE
// ------------------------------------------------------------

function SailingScene({ progress, reducedMotion, active }) {
  return (
    <Canvas
      camera={{ position: [0, 5, 26], fov: 50 }}
      frameloop={!active ? "never" : reducedMotion ? "demand" : "always"}
      dpr={[1, 1.5]}
      gl={{ antialias: true }}
    >
      <SunsetSky />

      <ambientLight intensity={0.95} />

      <directionalLight
        position={[0, 12, -30]}
        intensity={2.6}
        color="#ffd0a0"
      />

      <SailingCamera progress={progress} />
      <Ocean reducedMotion={reducedMotion} />
      <SailingGlints progress={progress} reducedMotion={reducedMotion} />

      <Suspense fallback={null}>
        <Boat progress={progress} reducedMotion={reducedMotion} />
      </Suspense>
    </Canvas>
  );
}

export default function SailingHero() {
  const sectionRef = useRef(null);
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(sectionRef.current);
    const visibility = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', visibility);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  const reducedMotion = useReducedMotion();

  return (
    <div ref={sectionRef} className="sailing-section" role="img" aria-label="A sailboat on the ocean, inspired by the Yard Sailor name.">
      <SailingScene progress={0} reducedMotion={reducedMotion} active={inView && pageVisible} />
    </div>
  );
}

useGLTF.preload("/models/sailor.glb");
