
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

const clamp = (value, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

// Shared sun direction for the sky, water, and lighting.
const SUN_DIRECTION = new THREE.Vector3()
  .setFromSphericalCoords(
    1,
    THREE.MathUtils.degToRad(73),
    THREE.MathUtils.degToRad(80)
  )
  .normalize();

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



function Ocean() {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSunDirection: { value: SUN_DIRECTION.clone() },

        // Lighter blue palette
        uDeepColor: { value: new THREE.Color("#0b4d96") },
        uMidColor: { value: new THREE.Color("#2d7fc7") },
        uLightColor: { value: new THREE.Color("#68aee8") },
        uFoamColor: { value: new THREE.Color("#d9efff") },

        // Horizon + sunset reflection
        uHorizonColor: { value: new THREE.Color("#f0c2a5") },
        uSunColor: { value: new THREE.Color("#ffe0b0") },
      },

      vertexShader: `
        uniform float uTime;

        varying vec3 vWorldPosition;
        varying vec3 vWorldNormal;
        varying float vWaveHeight;

        // Main wave function
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

          gl_Position = projectionMatrix * viewMatrix * worldPosition;
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

          // Fine ripples added to normal
          float ripple1 = sin(vWorldPosition.x * 3.5 + uTime * 1.2)
                        * cos(vWorldPosition.z * 2.8 - uTime * 0.9);

          float ripple2 = sin(vWorldPosition.x * 7.0 - uTime * 1.8
                        + vWorldPosition.z * 5.8);

          float ripple3 = cos(vWorldPosition.x * 10.5 + uTime * 2.3)
                        * sin(vWorldPosition.z * 9.0 - uTime * 1.7);

          N = normalize(N + vec3(
            ripple1 * 0.020 + ripple3 * 0.008,
            0.0,
            ripple2 * 0.016
          ));

          // Base color from deep to lighter blue
          float heightMix = smoothstep(-0.28, 0.35, vWaveHeight);
          vec3 color = mix(uDeepColor, uMidColor, heightMix);

          // Lighter tops on higher wave crests
          float crest = smoothstep(0.10, 0.36, vWaveHeight);
          color = mix(color, uLightColor, crest * 0.55);

          // Slight foam highlight on peak crests
          float foam = smoothstep(0.28, 0.42, vWaveHeight);
          color = mix(color, uFoamColor, foam * 0.0);

          // Fresnel reflection
          float fresnel = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.5);
          color = mix(color, uLightColor, fresnel * 0.22);

          // Sun reflection path
          vec3 R = reflect(-L, N);
          float sunHighlight = pow(max(dot(R, V), 0.0), 180.0);
          color += uSunColor * sunHighlight * 0.75;

          // Distance haze toward horizon
          float dist = length(cameraPosition - vWorldPosition);
          float haze = smoothstep(160.0, 820.0, dist);
          color = mix(color, uHorizonColor, haze * 0.30);

          gl_FragColor = vec4(color, 1.0);

          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,

      side: THREE.DoubleSide,
    });
  }, []);

  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta;
  });

  useEffect(() => {
    return () => material.dispose();
  }, [material]);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -1.05, 0]}
      material={material}
      frustumCulled={false}
    >
      <planeGeometry args={[900, 900, 360, 360]} />
    </mesh>
  );
}

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
    <SunsetSky />

    <ambientLight intensity={0.95} />

    <directionalLight
      position={[0, 12, -30]}
      intensity={2.6}
      color="#ffd0a0"
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

      const rect =
        sectionRef.current.getBoundingClientRect();

      const distance =
        sectionRef.current.offsetHeight -
        window.innerHeight;

      setProgress(
        clamp(-rect.top / Math.max(distance, 1))
      );
    };

    window.addEventListener("scroll", update, {
      passive: true,
    });

    update();

    return () =>
      window.removeEventListener("scroll", update);
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
          <span className="sailing-eyebrow">
            YARD SAILOR
          </span>

          <h1>
            Find what's
            <br />
            <em>around the corner.</em>
          </h1>

          <p>
            Discover local yard sales and secondhand
            treasures waiting just beyond the horizon.
          </p>

          <span className="sailing-scroll-hint">
            Scroll to discover ↓
          </span>
        </div>

        <div
          className="sailing-loading"
          style={{
            opacity: loading,
            pointerEvents:
              loading > 0.1 ? "auto" : "none",
          }}
        >
          <span>YARD SAILOR</span>

          <h2>
            Discovering what’s beyond the horizon
          </h2>

          <div className="sailing-progress-track">
            <div
              className="sailing-progress-fill"
              style={{
                width: `${loading * 100}%`,
              }}
            />
          </div>

          <p>{Math.round(loading * 100)}%</p>
        </div>
      </div>
    </section>
  );
}

useGLTF.preload("/models/sailor.glb");