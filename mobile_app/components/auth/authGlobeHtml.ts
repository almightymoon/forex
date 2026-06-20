import type { GlobeTextureUris } from './globeTextures';
import { GLOBE_CDN } from './globeTextures';

export type AuthGlobeViewport = {
  width: number;
  height: number;
  reduceMotion?: boolean;
};

function esc(url: string) {
  return url.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/** Bottom earth arc — ~32% of screen (Figma) */
export function getAuthGlobeLayout(screenH: number) {
  const arcVisible = Math.round(screenH * 0.32);
  const webviewHeight = Math.round(screenH * 0.88);
  const webviewOffset = webviewHeight - arcVisible;
  return { arcVisible, webviewHeight, webviewOffset };
}

/** Website three-globe — bottom horizon semicircle with maps, lights, hubs, arcs */
export function buildAuthGlobeHtml(
  textures: GlobeTextureUris,
  viewport: AuthGlobeViewport,
): string {
  const dark = esc(textures.dark || GLOBE_CDN.dark);
  const night = esc(textures.night || GLOBE_CDN.night);
  const bump = esc(textures.bump || GLOBE_CDN.bump);
  const vw = Math.round(viewport.width);
  const vh = Math.round(viewport.height);
  const reduceMotion = viewport.reduceMotion ?? false;
  const autoRotateSpeed = reduceMotion ? 0 : 0.42;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #000; overflow: hidden; }
    #mount { width: 100%; height: 100%; touch-action: none; }
    canvas { display: block; width: 100% !important; height: 100% !important; }
  </style>
</head>
<body>
  <div id="mount"></div>
  <script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/",
      "three-globe": "https://cdn.jsdelivr.net/npm/three-globe@2.31.1/+esm"
    }
  }
  </script>
  <script type="module">
    import * as THREE from 'three';
    import ThreeGlobe from 'three-globe';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
    import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
    import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
    import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

    const TEX = { dark: '${dark}', night: '${night}', bump: '${bump}' };

    const HUBS = [
      { city: 'New York', lat: 40.71, lng: -74.01, color: '#6ec8d8' },
      { city: 'London', lat: 51.51, lng: -0.12, color: '#e4c46a' },
      { city: 'Tokyo', lat: 35.69, lng: 139.69, color: '#7ad4c4' },
      { city: 'Shanghai', lat: 31.23, lng: 121.47, color: '#8fd4a8' },
      { city: 'Dubai', lat: 25.2, lng: 55.27, color: '#d4a86a' },
      { city: 'Singapore', lat: 1.35, lng: 103.82, color: '#6ab8c8' },
    ];

    const GOLD = new Set(['London', 'Dubai']);

    function hexToRgb(hex) {
      return [
        parseInt(hex.slice(1, 3), 16),
        parseInt(hex.slice(3, 5), 16),
        parseInt(hex.slice(5, 7), 16),
      ].join(',');
    }

    const ARCS = HUBS.flatMap((src, i) =>
      HUBS.slice(i + 1).map((dst, j) => {
        const isGold = GOLD.has(src.city) || GOLD.has(dst.city);
        return {
          startLat: src.lat, startLng: src.lng,
          endLat: dst.lat, endLng: dst.lng,
          color: isGold ? ['#e8c878', '#b89258'] : ['#6ab8c8', '#4a7a94'],
          dashAnimateTime: 1600 + ((i * 3 + j) % 5) * 300,
        };
      }),
    );

    const container = document.getElementById('mount');
    const w = ${vw} > 0 ? ${vw} : container.clientWidth;
    const h = ${vh} > 0 ? ${vh} : container.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1.14;
    renderer.setClearColor(0x000000, 1);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    /**
     * Figma: earth horizon at the bottom — globe center below viewport,
     * camera low & forward looking slightly down at the limb.
     */
    const GLOBE_Y = -100;
    const startLng = 14;
    const startTheta = (90 - startLng) * (Math.PI / 180);
    const camDist = 318;
    const camY = 30;
    const camera = new THREE.PerspectiveCamera(45, w / h, 1, 10000);
    camera.position.set(camDist * Math.cos(startTheta), camY, camDist * Math.sin(startTheta));
    /** Shift render so the earth limb sits in the lower third (Figma horizon) */
    camera.setViewOffset(w, h, 0, Math.round(h * 0.3), w, h);

    scene.add(new THREE.AmbientLight(0x2a3848, 0.58));
    const sun = new THREE.DirectionalLight(0xfff4ea, 2.15);
    sun.position.set(300, 200, 150);
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0x4a6a9e, 0.62);
    rim.position.set(-250, -120, -200);
    scene.add(rim);

    const texLoader = new THREE.TextureLoader();
    texLoader.setCrossOrigin('anonymous');

    const cityLightsTex = texLoader.load(TEX.night);
    cityLightsTex.colorSpace = THREE.SRGBColorSpace;

    const globeMat = new THREE.MeshPhongMaterial({
      emissive: new THREE.Color(0xffead4),
      emissiveMap: cityLightsTex,
      emissiveIntensity: 3.05,
      specular: new THREE.Color(0x6a8aaa),
      shininess: 12,
    });

    const globe = new ThreeGlobe({ waitForGlobeReady: true, animateIn: false });
    globe.globeMaterial(globeMat);
    globe
      .globeImageUrl(TEX.dark)
      .bumpImageUrl(TEX.bump)
      .showAtmosphere(true)
      .atmosphereColor('#3d6a9a')
      .atmosphereAltitude(0.14)
      .pointsData(HUBS)
      .pointLat(d => d.lat)
      .pointLng(d => d.lng)
      .pointColor(d => d.color)
      .pointAltitude(0.012)
      .pointRadius(0.58)
      .pointResolution(20)
      .ringsData(HUBS)
      .ringLat(d => d.lat)
      .ringLng(d => d.lng)
      .ringColor(d => {
        const rgb = hexToRgb(d.color);
        return t => 'rgba(' + rgb + ',' + Math.max(0, 1 - t * 1.55).toFixed(2) + ')';
      })
      .ringMaxRadius(4.2)
      .ringPropagationSpeed(3.2)
      .ringRepeatPeriod(800)
      .arcsData(ARCS)
      .arcStartLat(d => d.startLat)
      .arcStartLng(d => d.startLng)
      .arcEndLat(d => d.endLat)
      .arcEndLng(d => d.endLng)
      .arcColor(d => d.color)
      .arcAltitudeAutoScale(0.45)
      .arcStroke(0.44)
      .arcDashLength(0.55)
      .arcDashGap(0.04)
      .arcDashAnimateTime(d => d.dashAnimateTime);

    globe.position.set(0, GLOBE_Y, 0);
    scene.add(globe);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(w, h), 0.55, 0.5, 0.15));
    composer.addPass(new OutputPass());

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, GLOBE_Y, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.035;
    controls.autoRotate = ${reduceMotion ? 'false' : 'true'};
    controls.autoRotateSpeed = ${autoRotateSpeed};
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.enableRotate = false;
    controls.minPolarAngle = Math.PI * 0.36;
    controls.maxPolarAngle = Math.PI * 0.36;

    function onResize() {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      camera.aspect = cw / ch;
      camera.setViewOffset(cw, ch, 0, Math.round(ch * 0.3), cw, ch);
      camera.updateProjectionMatrix();
      renderer.setSize(cw, ch);
      composer.setSize(cw, ch);
    }
    window.addEventListener('resize', onResize);

    (function pump() {
      requestAnimationFrame(pump);
      controls.update();
      composer.render();
    })();
  </script>
</body>
</html>`;
}
