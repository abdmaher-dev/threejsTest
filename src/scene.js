// The 3D hero: a matte-black cup on a saucer, coffee beans on a dark table, rising steam.
// Targets three.js r186 with WebGLRenderer (Timer, setAnimationLoop, PCFShadowMap, physical light units).

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { getSurface } from "./surfaces.js";

const CUP_SIZES = { small: 0.72, medium: 0.86, large: 1 };
const BG = 0x0d0907;
const INNER_BOTTOM = 0.1;
const INNER_TOP = 0.95;
const HANDLE_REST_ANGLE = -0.7; // handle points right-front

export function createCoffeeScene(container) {
  // ---------- renderer ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 6, 13);

  // soft studio reflections for the glossy ceramic and coffee
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new RoomEnvironment();
  scene.environment = pmrem.fromScene(envScene, 0.04).texture;
  scene.environmentIntensity = 0.3;
  envScene.dispose();
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0.4, 2.9, 4.3); // high enough to see the latte art

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.45, 0);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 2.8;
  controls.maxDistance = 7.5;
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = 1.38;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.6;

  let resumeTimeout;
  controls.addEventListener("start", () => {
    controls.autoRotate = false;
    clearTimeout(resumeTimeout);
  });
  controls.addEventListener("end", () => {
    resumeTimeout = setTimeout(() => (controls.autoRotate = true), 4000);
  });

  // ---------- lights ----------
  const key = new THREE.SpotLight(0xffc796, 140, 0, 0.42, 0.75, 2); // candela
  key.position.set(2.2, 5.5, 2.4);
  key.target.position.set(0, 0.3, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  scene.add(key, key.target);

  const rim = new THREE.DirectionalLight(0x9fb2ff, 0.9);
  rim.position.set(-3, 2.5, -4);
  scene.add(rim);

  scene.add(new THREE.AmbientLight(0xffe2c4, 0.06));

  // ---------- table ----------
  const table = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshStandardMaterial({ color: 0x17100c, roughness: 0.82 }),
  );
  table.rotation.x = -Math.PI / 2;
  table.receiveShadow = true;
  scene.add(table);

  // ---------- cup ----------
  const ceramic = new THREE.MeshPhysicalMaterial({
    color: 0x1a1513,
    roughness: 0.4,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    side: THREE.DoubleSide,
  });

  const v = (x, y) => new THREE.Vector2(x, y);
  const innerWall = new THREE.SplineCurve([v(0.47, 0.14), v(0.5, 0.3), v(0.545, 0.6), v(0.585, 0.96)]).getPoints(32);
  const outerWall = new THREE.SplineCurve([v(0.632, 0.97), v(0.6, 0.62), v(0.56, 0.32), v(0.525, 0.12)]).getPoints(32);
  const cupProfile = [
    v(0, INNER_BOTTOM),
    v(0.43, INNER_BOTTOM),
    ...innerWall,
    v(0.6, 0.995),
    v(0.615, 1.004),
    v(0.632, 0.995),
    ...outerWall,
    v(0.505, 0.04),
    v(0.47, 0.005),
    v(0.44, 0),
    v(0, 0),
  ];

  const innerRadiusAt = (y) => {
    if (y <= innerWall[0].y) return innerWall[0].x;
    for (let i = 1; i < innerWall.length; i++) {
      const a = innerWall[i - 1];
      const b = innerWall[i];
      if (y <= b.y) return THREE.MathUtils.lerp(a.x, b.x, (y - a.y) / (b.y - a.y));
    }
    return innerWall.at(-1).x;
  };

  const cup = new THREE.Group();
  cup.rotation.y = HANDLE_REST_ANGLE;
  scene.add(cup);

  const body = new THREE.Mesh(new THREE.LatheGeometry(cupProfile, 96), ceramic);
  body.castShadow = true;
  body.receiveShadow = true;
  cup.add(body);

  const handleArc = Math.PI * 1.15;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 20, 48, handleArc), ceramic);
  handle.position.set(0.64, 0.55, 0);
  handle.rotation.z = -handleArc / 2;
  handle.scale.z = 0.75;
  handle.castShadow = true;
  cup.add(handle);

  // drink surface: a base disc and an overlay disc used to crossfade between drinks
  const discGeometry = new THREE.CircleGeometry(1, 96);
  discGeometry.rotateX(-Math.PI / 2);
  const makeSurfaceMaterial = () =>
    new THREE.MeshPhysicalMaterial({ roughness: 0.3, clearcoat: 0.5, clearcoatRoughness: 0.1 });

  const surfaceBase = new THREE.Mesh(discGeometry, makeSurfaceMaterial());
  const surfaceFade = new THREE.Mesh(discGeometry, makeSurfaceMaterial());
  surfaceFade.material.transparent = true;
  surfaceFade.material.depthWrite = false;
  surfaceFade.renderOrder = 1;
  surfaceFade.visible = false;
  surfaceBase.receiveShadow = surfaceFade.receiveShadow = true;
  cup.add(surfaceBase, surfaceFade);

  // ---------- saucer ----------
  const saucerProfile = [
    v(0, 0.03),
    v(0.52, 0.03),
    v(0.64, 0.05),
    v(0.94, 0.115),
    v(0.985, 0.13),
    v(1.0, 0.12),
    v(0.95, 0.085),
    v(0.6, 0.01),
    v(0.42, 0),
    v(0, 0),
  ];
  const saucer = new THREE.Mesh(new THREE.LatheGeometry(saucerProfile, 96), ceramic);
  saucer.castShadow = true;
  saucer.receiveShadow = true;
  scene.add(saucer);

  // ---------- coffee beans ----------
  const beanGeometry = new THREE.SphereGeometry(1, 32, 20);
  {
    const pos = beanGeometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i) * 0.68;
      const y = pos.getY(i);
      let z = pos.getZ(i) * 0.5;
      if (z > 0) {
        const creaseX = x - 0.06 * Math.sin(y * 2.5); // slight S-shaped crease
        z -= 0.28 * Math.exp(-(creaseX * creaseX) / 0.006) * (z / 0.5);
      }
      pos.setXYZ(i, x, y, z);
    }
    beanGeometry.computeVertexNormals();
  }
  const beanCount = 80;
  const beans = new THREE.InstancedMesh(
    beanGeometry,
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.3 }),
    beanCount,
  );
  {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    const c = new THREE.Color();
    for (let i = 0; i < beanCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 1.3 + Math.pow(Math.random(), 1.6) * 2.4;
      const size = 0.075 + Math.random() * 0.02;
      p.set(Math.cos(angle) * dist, size * 0.5, Math.sin(angle) * dist);
      e.set((Math.random() < 0.75 ? -1 : 1) * Math.PI / 2, 0, Math.random() * Math.PI * 2); // lie flat
      q.setFromEuler(e);
      s.setScalar(size);
      beans.setMatrixAt(i, m.compose(p, q, s));
      beans.setColorAt(i, c.setHSL(0.06, 0.55, 0.06 + Math.random() * 0.05, THREE.SRGBColorSpace));
    }
    beans.computeBoundingSphere();
  }
  beans.castShadow = true;
  beans.receiveShadow = true;
  scene.add(beans);

  // ---------- steam ----------
  const steamTexture = (() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext("2d");
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.4, "rgba(255,255,255,0.45)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();

  const puffs = Array.from({ length: 28 }, () => {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: steamTexture, color: 0xffeedd, transparent: true, depthWrite: false, opacity: 0 }),
    );
    scene.add(sprite);
    return { sprite, t: Math.random(), speed: 0.16 + Math.random() * 0.12, seed: Math.random() * 100, ox: 0, oz: 0 };
  });
  const resetPuff = (puff, radius) => {
    const a = Math.random() * Math.PI * 2;
    const d = Math.sqrt(Math.random()) * radius * 0.6;
    puff.ox = Math.cos(a) * d;
    puff.oz = Math.sin(a) * d;
    puff.seed = Math.random() * 100;
  };

  // ---------- state & animation ----------
  const state = {
    size: { current: 1, target: 1 },
    fill: { current: 0.85, target: 0.85 },
    steam: { current: 0, target: 1 },
    spin: { current: HANDLE_REST_ANGLE, target: HANDLE_REST_ANGLE },
    fade: 1,
    wobble: 0,
  };

  function applySurface(mesh, look) {
    mesh.userData.look = look;
    mesh.material.map = look.texture;
    mesh.material.roughness = look.roughness;
    mesh.material.clearcoat = look.clearcoat;
    mesh.material.needsUpdate = true; // first map assignment changes the shader program
  }

  function setDrink(visual) {
    const look = getSurface(visual.surface);
    look.texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    if (!surfaceBase.material.map) {
      applySurface(surfaceBase, look);
    } else {
      if (surfaceFade.visible && state.fade > 0.5) applySurface(surfaceBase, surfaceFade.userData.look);
      applySurface(surfaceFade, look);
      surfaceFade.visible = true;
      state.fade = 0;
      state.spin.target += Math.PI * 2;
      state.wobble = 1;
    }
    state.size.target = CUP_SIZES[visual.cup] ?? 1;
    state.fill.target = visual.fill;
    state.steam.target = visual.steam;
  }

  // click the cup to give it a spin
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downAt = null;
  const hitsCup = (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObject(cup, true).length > 0;
  };
  const onPointerMove = (event) => {
    if (event.pointerType === "mouse") renderer.domElement.style.cursor = hitsCup(event) ? "pointer" : "grab";
  };
  const onPointerDown = (event) => (downAt = { x: event.clientX, y: event.clientY });
  const onPointerUp = (event) => {
    if (!downAt) return;
    const moved = Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y);
    downAt = null;
    if (moved < 5 && hitsCup(event)) {
      state.spin.target += Math.PI * 2;
      state.wobble = 1;
    }
  };
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointerup", onPointerUp);

  const timer = new THREE.Timer();
  timer.connect(document);
  const damp = THREE.MathUtils.damp;

  function animate() {
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.1);
    const time = timer.getElapsed();

    state.size.current = damp(state.size.current, state.size.target, 5, dt);
    state.fill.current = damp(state.fill.current, state.fill.target, 4, dt);
    state.steam.current = damp(state.steam.current, state.steam.target, 2, dt);
    state.spin.current = damp(state.spin.current, state.spin.target, 3.2, dt);
    state.wobble = damp(state.wobble, 0, 2.5, dt);

    // cup + saucer
    const size = state.size.current;
    const saucerScale = 0.8 + size * 0.35;
    saucer.scale.setScalar(saucerScale);
    cup.scale.setScalar(size);
    cup.position.y = 0.03 * saucerScale;
    cup.rotation.y = state.spin.current;

    // drink surface
    const liquidY = THREE.MathUtils.lerp(INNER_BOTTOM + 0.02, INNER_TOP - 0.02, state.fill.current);
    const ripple = Math.sin(time * 16) * 0.012 * state.wobble;
    const radius = innerRadiusAt(liquidY) - 0.004;
    surfaceBase.position.y = liquidY + ripple;
    surfaceBase.scale.set(radius, 1, radius);
    surfaceFade.position.y = liquidY + ripple + 0.002;
    surfaceFade.scale.copy(surfaceBase.scale);
    surfaceBase.rotation.y = surfaceFade.rotation.y = Math.sin(time * 9) * 0.05 * state.wobble;

    if (surfaceFade.visible) {
      state.fade = Math.min(1, state.fade + dt * 1.6);
      surfaceFade.material.opacity = state.fade;
      if (state.fade >= 1) {
        applySurface(surfaceBase, surfaceFade.userData.look);
        surfaceFade.visible = false;
      }
    }

    // steam rises from the drink's surface in world space (it does not spin with the cup)
    const steamBase = cup.position.y + (liquidY + 0.05) * size;
    for (const puff of puffs) {
      puff.t += dt * puff.speed;
      if (puff.t > 1) {
        puff.t -= 1;
        resetPuff(puff, radius * size);
      }
      const t = puff.t;
      const sway = 0.14 * t;
      puff.sprite.position.set(
        puff.ox + Math.sin(t * 3.2 + puff.seed) * sway,
        steamBase + t * 1.35,
        puff.oz + Math.cos(t * 2.4 + puff.seed) * sway,
      );
      puff.sprite.scale.setScalar((0.22 + t * 0.75) * (0.7 + size * 0.3));
      puff.sprite.material.opacity = state.steam.current * 0.15 * Math.pow(Math.sin(Math.PI * t), 1.4);
      puff.sprite.material.rotation = t * 1.5 + puff.seed;
    }

    controls.update(dt);
    renderer.render(scene, camera);
  }

  // ---------- sizing ----------
  function resize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = camera.aspect < 0.9 ? 42 : 32; // widen the view on tall, narrow layouts
    // on small screens the drink card covers the bottom of the stage, so lift the cup in frame
    if (width < 860) camera.setViewOffset(width, height, 0, height * 0.14, width, height);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  renderer.setAnimationLoop(animate);

  function dispose() {
    renderer.setAnimationLoop(null);
    resizeObserver.disconnect();
    clearTimeout(resumeTimeout);
    controls.dispose();
    timer.dispose();
    renderer.domElement.removeEventListener("pointermove", onPointerMove);
    renderer.domElement.removeEventListener("pointerdown", onPointerDown);
    renderer.domElement.removeEventListener("pointerup", onPointerUp);
    scene.traverse((obj) => {
      obj.geometry?.dispose();
      for (const material of [obj.material ?? []].flat()) {
        for (const value of Object.values(material)) if (value?.isTexture) value.dispose();
        material.dispose();
      }
    });
    scene.environment?.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  }

  return { setDrink, dispose };
}
