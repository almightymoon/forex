'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import ThreeGlobe from 'three-globe';

const GLOBE_RADIUS = 100;

interface Hub {
  city: string;
  lat: number;
  lng: number;
  color: string;
  volume: string;
  market: string;
}

const HUBS: Hub[] = [
  { city: 'New York', lat: 40.71, lng: -74.01, color: '#6ec8d8', volume: '$6.6T / day', market: 'NYSE · NASDAQ' },
  { city: 'London', lat: 51.51, lng: -0.12, color: '#e4c46a', volume: '$3.6T / day', market: 'LSE · ICE' },
  { city: 'Tokyo', lat: 35.69, lng: 139.69, color: '#7ad4c4', volume: '$1.0T / day', market: 'TSE · JPX' },
  { city: 'Shanghai', lat: 31.23, lng: 121.47, color: '#8fd4a8', volume: '$0.8T / day', market: 'SSE · SZSE' },
  { city: 'Dubai', lat: 25.2, lng: 55.27, color: '#d4a86a', volume: '$0.3T / day', market: 'DFM · ADX' },
  { city: 'Singapore', lat: 1.35, lng: 103.82, color: '#6ab8c8', volume: '$0.6T / day', market: 'SGX' },
];

const GOLD_HUBS = new Set(['London', 'Dubai']);

interface Arc {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string[];
  dashAnimateTime: number;
}

/** Same-origin so WebGL can upload textures (cross-origin CDN URLs often fail without CORS). */
const TEX = {
  dark: '/globe-textures/earth-dark.jpg',
  night: '/globe-textures/earth-night.jpg',
  bump: '/globe-textures/earth-topology.png',
} as const;

const ARCS: Arc[] = HUBS.flatMap((src, i) =>
  HUBS.slice(i + 1).map((dst, j) => {
    const isGold = GOLD_HUBS.has(src.city) || GOLD_HUBS.has(dst.city);
    return {
      startLat: src.lat,
      startLng: src.lng,
      endLat: dst.lat,
      endLng: dst.lng,
      color: isGold ? ['#e8c878', '#b89258'] : ['#6ab8c8', '#4a7a94'],
      dashAnimateTime: 1600 + ((i * 3 + j) % 5) * 300,
    };
  }),
);

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function polar2Vec3(lat: number, lng: number, alt = 0): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (90 - lng) * (Math.PI / 180);
  const r = GLOBE_RADIUS * (1 + alt);
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

interface TooltipState {
  hub: Hub;
  x: number;
  y: number;
}

export type GlobeVariant = 'hero' | 'auth';

type GlobeProps = {
  /** `auth` — brighter globe for login/register split panel on near-black UI */
  variant?: GlobeVariant;
};

export default function Globe({ variant = 'hero' }: GlobeProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<(HTMLDivElement | null)[]>(new Array(HUBS.length).fill(null));
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isAuth = variant === 'auth';

    const w = container.clientWidth;
    const h = container.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = isAuth ? 1.14 : 0.75;
    const clearBg = isAuth ? 0x060b14 : 0x000000;
    renderer.setClearColor(clearBg, 1);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(clearBg);

    const startLng = 139.69;
    const startTheta = (90 - startLng) * (Math.PI / 180);
    const camDist = 318;
    const camY = 30;
    const camera = new THREE.PerspectiveCamera(45, w / h, 1, 10000);
    camera.position.set(camDist * Math.cos(startTheta), camY, camDist * Math.sin(startTheta));

    scene.add(new THREE.AmbientLight(isAuth ? 0x2a3848 : 0x1c2838, isAuth ? 0.58 : 0.34));

    const sun = new THREE.DirectionalLight(0xfff4ea, isAuth ? 2.15 : 1.65);
    sun.position.set(300, 200, 150);
    scene.add(sun);

    const rim = new THREE.DirectionalLight(isAuth ? 0x4a6a9e : 0x2a4a6e, isAuth ? 0.62 : 0.38);
    rim.position.set(-250, -120, -200);
    scene.add(rim);

    const starGeo = new THREE.BufferGeometry();
    const starCount = 3200;
    const starPos = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);
    for (let i = 0; i < starCount; i++) {
      const r = 2500 + Math.random() * 2000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i * 3 + 2] = r * Math.cos(phi);
      starSizes[i] = 0.5 + Math.random() * 1.5;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));
    const starMat = new THREE.PointsMaterial({
      color: 0xb8c8d8,
      size: isAuth ? 1.05 : 0.95,
      transparent: true,
      opacity: isAuth ? 0.68 : 0.52,
      sizeAttenuation: true,
    });
    scene.add(new THREE.Points(starGeo, starMat));

    const globe = new ThreeGlobe({ waitForGlobeReady: false, animateIn: false });

    const texLoader = new THREE.TextureLoader();
    texLoader.setCrossOrigin('anonymous');
    const cityLightsTex = texLoader.load(TEX.night);
    cityLightsTex.colorSpace = THREE.SRGBColorSpace;

    const globeMat = new THREE.MeshPhongMaterial({
      emissive: new THREE.Color(0xffead4),
      emissiveMap: cityLightsTex,
      emissiveIntensity: isAuth ? 3.05 : 2.15,
      specular: new THREE.Color(isAuth ? 0x6a8aaa : 0x2a4058),
      shininess: isAuth ? 12 : 5,
    });
    globe.globeMaterial(globeMat);

    globe
      .globeImageUrl(TEX.dark)
      .bumpImageUrl(TEX.bump)
      .showAtmosphere(true)
      .atmosphereColor(isAuth ? '#3d6a9a' : '#1a3d5a')
      .atmosphereAltitude(isAuth ? 0.14 : 0.085)
      .pointsData(HUBS)
      .pointLat((d: object) => (d as Hub).lat)
      .pointLng((d: object) => (d as Hub).lng)
      .pointColor((d: object) => (d as Hub).color)
      .pointAltitude(0.012)
      .pointRadius(0.58)
      .pointResolution(20)
      .ringsData(HUBS)
      .ringLat((d: object) => (d as Hub).lat)
      .ringLng((d: object) => (d as Hub).lng)
      .ringColor((d: object) => {
        const rgb = hexToRgb((d as Hub).color);
        return (t: number) => `rgba(${rgb},${Math.max(0, 1 - t * 1.55).toFixed(2)})`;
      })
      .ringMaxRadius(4.2)
      .ringPropagationSpeed(3.2)
      .ringRepeatPeriod(800)
      .arcsData(ARCS)
      .arcStartLat((d: object) => (d as Arc).startLat)
      .arcStartLng((d: object) => (d as Arc).startLng)
      .arcEndLat((d: object) => (d as Arc).endLat)
      .arcEndLng((d: object) => (d as Arc).endLng)
      .arcColor((d: object) => (d as Arc).color)
      .arcAltitudeAutoScale(0.45)
      .arcStroke(0.44)
      .arcDashLength(0.55)
      .arcDashGap(0.04)
      .arcDashAnimateTime((d: object) => (d as Arc).dashAnimateTime);

    scene.add(globe);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(w, h),
      isAuth ? 0.55 : 0.38,
      isAuth ? 0.5 : 0.42,
      isAuth ? 0.15 : 0.2,
    );
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.035;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.45;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.minDistance = 172;
    controls.maxDistance = 780;

    let userInteracting = false;
    let resumeTimer: ReturnType<typeof setTimeout>;
    const onDragStart = () => {
      userInteracting = true;
      controls.autoRotate = false;
      clearTimeout(resumeTimer);
    };
    const onDragEnd = () => {
      userInteracting = false;
      resumeTimer = setTimeout(() => {
        controls.autoRotate = true;
      }, 2500);
    };
    controls.addEventListener('start', onDragStart);
    controls.addEventListener('end', onDragEnd);

    /*
      OrbitControls uses pointer capture on the canvas; a captured touch will not scroll
      the document. CSS pointer-events:none helps, but we also sync inline so it always wins.
      Hero only: keep drag-to-orbit on desktop mouse; pass touches through on narrow / touch-primary viewports.
    */
    let releaseGlobeTouchScroll: (() => void) | undefined;
    if (!isAuth) {
      const syncGlobeTouchScroll = () => {
        const narrow =
          typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 1023px)').matches;
        const coarse =
          typeof window.matchMedia === 'function' &&
          window.matchMedia('(hover: none) and (pointer: coarse)').matches;
        const passThrough = narrow || coarse;
        renderer.domElement.style.pointerEvents = passThrough ? 'none' : '';
        container.style.pointerEvents = passThrough ? 'none' : '';
        controls.enableRotate = !passThrough;
      };
      syncGlobeTouchScroll();
      const mqNarrow = window.matchMedia('(max-width: 1023px)');
      const mqCoarse = window.matchMedia('(hover: none) and (pointer: coarse)');
      const onGlobeTouchMql = () => syncGlobeTouchScroll();
      mqNarrow.addEventListener('change', onGlobeTouchMql);
      mqCoarse.addEventListener('change', onGlobeTouchMql);
      window.addEventListener('resize', onGlobeTouchMql);
      releaseGlobeTouchScroll = () => {
        mqNarrow.removeEventListener('change', onGlobeTouchMql);
        mqCoarse.removeEventListener('change', onGlobeTouchMql);
        window.removeEventListener('resize', onGlobeTouchMql);
        renderer.domElement.style.pointerEvents = '';
        container.style.pointerEvents = '';
        controls.enableRotate = true;
      };
    }

    const hubWorldPositions = HUBS.map((hub) => polar2Vec3(hub.lat, hub.lng, 0));
    const hitMeshes = HUBS.map((hub, i) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(7, 8, 8),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }),
      );
      mesh.position.copy(hubWorldPositions[i]);
      scene.add(mesh);
      return { mesh, hub };
    });

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseMove = (e: MouseEvent) => {
      if (userInteracting) {
        setTooltip(null);
        return;
      }
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(hitMeshes.map((h) => h.mesh));
      if (hits.length > 0) {
        const hit = hitMeshes.find((h) => h.mesh === hits[0].object);
        if (hit) setTooltip({ hub: hit.hub, x: e.clientX - rect.left, y: e.clientY - rect.top });
      } else {
        setTooltip(null);
      }
    };
    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseleave', () => setTooltip(null));

    const onResize = () => {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      camera.aspect = cw / ch;
      camera.updateProjectionMatrix();
      renderer.setSize(cw, ch);
      composer.setSize(cw, ch);
      bloomPass.setSize(cw, ch);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    const labelPositions = HUBS.map((hub) => polar2Vec3(hub.lat, hub.lng, 0.16));
    const projVec = new THREE.Vector3();

    let rafId: number;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      controls.update();
      composer.render();

      const cw = container.clientWidth;
      const ch = container.clientHeight;
      HUBS.forEach((_, i) => {
        const el = labelRefs.current[i];
        if (!el) return;
        const toCamera = camera.position.clone().sub(hubWorldPositions[i]);
        if (toCamera.dot(hubWorldPositions[i]) <= 0) {
          el.style.opacity = '0';
          return;
        }
        projVec.copy(labelPositions[i]);
        projVec.project(camera);
        const x = (projVec.x * 0.5 + 0.5) * cw;
        const y = (-projVec.y * 0.5 + 0.5) * ch;
        el.style.transform = `translate(${x + 13}px, ${y - 9}px)`;
        el.style.opacity = '1';
      });
    };
    animate();

    return () => {
      releaseGlobeTouchScroll?.();
      cancelAnimationFrame(rafId);
      clearTimeout(resumeTimer);
      controls.removeEventListener('start', onDragStart);
      controls.removeEventListener('end', onDragEnd);
      container.removeEventListener('mousemove', onMouseMove);
      ro.disconnect();
      hitMeshes.forEach(({ mesh }) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        scene.remove(mesh);
      });
      starGeo.dispose();
      starMat.dispose();
      cityLightsTex.dispose();
      (globeMat as THREE.Material).dispose();
      composer.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [variant]);

  return (
    <div ref={mountRef} className="globe-mount">
      {HUBS.map((hub, i) => (
        <div
          key={hub.city}
          ref={(el) => {
            labelRefs.current[i] = el;
          }}
          className="hub-label"
          style={{ borderColor: hub.color, color: hub.color }}
        >
          {hub.city}
        </div>
      ))}

      {tooltip && (
        <div className="hub-tooltip" style={{ left: tooltip.x + 18, top: tooltip.y - 20 }}>
          <div className="tooltip-city" style={{ color: tooltip.hub.color }}>
            {tooltip.hub.city}
          </div>
          <div className="tooltip-volume">{tooltip.hub.volume}</div>
          <div className="tooltip-market">{tooltip.hub.market}</div>
        </div>
      )}
    </div>
  );
}
