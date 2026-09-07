
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
    THREE.MathUtils.degToRad(87),
    THREE.MathUtils.degToRad(180)
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
          uDeepColor: { value: new THREE.Color("#061e46") },
          uMidColor: { value: new THREE.Color("#145b98") },
          uSkyBlue: { value: new THREE.Color("#6f91b4") },
          uHorizonColor: { value: new THREE.Color("#c5a5a0") },
          uSunColor: { value: new THREE.Color("#ffd5a3") },
        },
  
        vertexShader: `
          uniform float uTime;
  
          varying vec3 vWorldPosition;
          varying vec3 vWorldNormal;
          varying float vWaveHeight;
  
          float waveHeight(vec2 p, float t) {
            float h = 0.0;
  
            // Broad ocean swells.
            h += 0.28 * sin(dot(p, vec2(0.38, 0.16)) + t * 0.55);
            h += 0.16 * sin(dot(p, vec2(-0.21, 0.42)) + t * 0.75);
  
            // Medium-sized waves.
            h += 0.07 * sin(dot(p, vec2(0.85, 0.34)) + t * 1.1);
            h += 0.035 * sin(dot(p, vec2(-1.2, 0.95)) + t * 1.45);
  
            return h;
          }
  
          void main() {
            vec3 pos = position;
  
            pos.z = waveHeight(pos.xy, uTime);
  
            float e = 0.05;
            float h = pos.z;
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
          uniform vec3 uSkyBlue;
          uniform vec3 uHorizonColor;
          uniform vec3 uSunColor;
  
          varying vec3 vWorldPosition;
          varying vec3 vWorldNormal;
          varying float vWaveHeight;
  
          void main() {
            vec3 N = normalize(vWorldNormal);
            vec3 V = normalize(cameraPosition - vWorldPosition);
            vec3 L = normalize(uSunDirection);
  
            // Fine animated ripples.
            float r1 = sin(vWorldPosition.x * 4.5 + uTime * 1.7)
                     * cos(vWorldPosition.z * 3.8 - uTime * 1.2);
  
            float r2 = sin(vWorldPosition.x * 8.0 - uTime * 2.1
                     + vWorldPosition.z * 6.5);
  
            N = normalize(N + vec3(
              r1 * 0.018,
              0.0,
              r2 * 0.014
            ));
  
            // Blue ocean base.
            float crest = smoothstep(-0.35, 0.4, vWaveHeight);
            vec3 color = mix(uDeepColor, uMidColor, crest * 0.48);
  
            // Fresnel reflection: blue sky at grazing angles.
            float fresnel = pow(
              1.0 - clamp(dot(N, V), 0.0, 1.0),
              4.0
            );
  
            color = mix(color, uSkyBlue, fresnel * 0.35);
  
            // Narrow, controlled sunset reflection.
            vec3 R = reflect(-L, N);
            float sunHighlight = pow(
              max(dot(R, V), 0.0),
              260.0
            );
  
            color += uSunColor * sunHighlight * 0.65;
  
            // Gentle horizon blending, without turning the whole sea pink.
            float dist = length(cameraPosition - vWorldPosition);
            float haze = smoothstep(180.0, 900.0, dist);
  
            color = mix(color, uHorizonColor, haze * 0.38);
  
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
        <planeGeometry args={[600, 600, 300, 300]} />
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
  
    <ambientLight intensity={0.8} />
  
    <directionalLight
      position={[0, 8, -30]}
      intensity={2.2}
      color="#ffbf85"
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