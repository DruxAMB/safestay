"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const WALL = 0xf5f0e6; // warm paper-cream facade
const SLAB = 0x9a9184; // protruding floor ledges — distinctly darker than walls
const INK = 0x37342f; // window frames, railings
const MULLION = 0x6f675c; // window center bars
const ACCENT = 0xdce92a;
const BASE = 0xdad3c5;

function mat(color: number, opts: { emissive?: number; ei?: number; rough?: number } = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.rough ?? 0.95,
    metalness: 0,
    ...(opts.emissive !== undefined
      ? { emissive: new THREE.Color(opts.emissive), emissiveIntensity: opts.ei ?? 0.5 }
      : {}),
  });
}

function box(
  w: number, h: number, d: number, color: number,
  x = 0, y = 0, z = 0,
  opts: { emissive?: number; ei?: number; rough?: number } = {},
) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts));
  m.position.set(x, y, z);
  return m;
}

const FLOOR = 1.0; // floor-to-floor height
const SLAB_T = 0.14; // ledge thickness
const SLAB_P = 0.13; // ledge protrusion

/** Tall narrow window: dark inset panel + center mullion → two panes. */
function windowUnit(w = 0.26, h = 0.62) {
  const g = new THREE.Group();
  g.add(box(w, h, 0.06, INK, 0, 0, 0, { rough: 0.55 }));
  g.add(box(0.035, h, 0.075, MULLION, 0, 0, 0));
  return g;
}

/** Paired window — the double-pane columns on the main faces. */
function windowPair() {
  const g = new THREE.Group();
  const a = windowUnit(), b = windowUnit();
  a.position.x = -0.19;
  b.position.x = 0.19;
  g.add(a, b);
  return g;
}

/**
 * Place a window group on a wing face.
 * face "front" = +z, "right" = +x, "end" = -x.
 */
function put(g: THREE.Group, face: "front" | "right" | "end", x: number, y: number, z: number) {
  if (face === "right") g.rotation.y = Math.PI / 2;
  if (face === "end") g.rotation.y = -Math.PI / 2;
  g.position.set(x, y, z);
  return g;
}

/** Balcony: protruding slab + slim balusters + top rail. */
function balcony(width = 1.6, depth = 0.5) {
  const g = new THREE.Group();
  g.add(box(width, 0.07, depth, SLAB, 0, -0.05, depth / 2));
  const n = Math.max(3, Math.round(width / 0.3));
  for (let i = 0; i < n; i++) {
    const x = -width / 2 + 0.08 + (i * (width - 0.16)) / (n - 1);
    g.add(box(0.03, 0.4, 0.03, INK, x, 0.18, depth - 0.04));
  }
  g.add(box(width, 0.04, 0.04, INK, 0, 0.4, depth - 0.04));
  // side returns
  g.add(box(0.04, 0.04, depth, INK, -width / 2 + 0.02, 0.4, depth / 2));
  g.add(box(0.04, 0.04, depth, INK, width / 2 - 0.02, 0.4, depth / 2));
  return g;
}

/** Roof: parapet tray + raised bulkhead box (the rooftop detail in the ref). */
function roof(w: number, d: number, yTop: number) {
  const g = new THREE.Group();
  const t = 0.07, h = 0.3;
  g.add(box(w, h, t, WALL, 0, h / 2, d / 2 - t / 2));
  g.add(box(w, h, t, WALL, 0, h / 2, -d / 2 + t / 2));
  g.add(box(t, h, d - 2 * t, WALL, w / 2 - t / 2, h / 2, 0));
  g.add(box(t, h, d - 2 * t, WALL, -w / 2 + t / 2, h / 2, 0));
  // dark cap line on the parapet rim — the ref's crisp outline
  g.add(box(w + 0.02, 0.035, t + 0.02, SLAB, 0, h + 0.02, d / 2 - t / 2));
  g.add(box(w + 0.02, 0.035, t + 0.02, SLAB, 0, h + 0.02, -d / 2 + t / 2));
  g.add(box(t + 0.02, 0.035, d - 2 * t, SLAB, w / 2 - t / 2, h + 0.02, 0));
  g.add(box(t + 0.02, 0.035, d - 2 * t, SLAB, -w / 2 + t / 2, h + 0.02, 0));
  // raised bulkhead, offset toward the back like the reference
  g.add(box(w * 0.45, 0.32, d * 0.4, WALL, -w * 0.12, 0.16, -d * 0.18));
  g.add(box(w * 0.45 + 0.03, 0.04, d * 0.4 + 0.03, SLAB, -w * 0.12, 0.34, -d * 0.18));
  g.position.y = yTop;
  return g;
}

/** Slab ledge ring at one floor boundary of a wing. */
function ledge(w: number, d: number, y: number) {
  return box(w + SLAB_P * 2, SLAB_T, d + SLAB_P * 2, SLAB, 0, y, 0);
}

/**
 * One wing: body + ledges + roof + per-face windows.
 * cols: window column x-offsets (front face local space), per floor.
 */
function wing(opts: {
  w: number; d: number; floors: number;
  frontCols?: number[]; rightCols?: number[]; endCols?: number[];
  skip?: (face: string, col: number, floor: number) => boolean;
  balconies?: { face: "right" | "front"; col: number; floor: number }[];
}) {
  const { w, d, floors } = opts;
  const h = floors * FLOOR;
  const g = new THREE.Group();
  g.add(box(w, h, d, WALL, 0, h / 2, 0));
  for (let f = 1; f < floors; f++) g.add(ledge(w, d, f * FLOOR));
  g.add(ledge(w, d, h)); // crowning ledge under parapet
  g.add(roof(w, d, h));

  const winY = (f: number) => f * FLOOR + FLOOR / 2 - 0.06;
  for (const cx of opts.frontCols ?? []) {
    for (let f = 0; f < floors; f++) {
      if (opts.skip?.("front", cx, f)) continue;
      g.add(put(windowPair(), "front", cx, winY(f), d / 2 + 0.02));
    }
  }
  for (const cz of opts.rightCols ?? []) {
    for (let f = 0; f < floors; f++) {
      if (opts.skip?.("right", cz, f)) continue;
      g.add(put(windowUnit(), "right", w / 2 + 0.02, winY(f), cz));
    }
  }
  for (const cz of opts.endCols ?? []) {
    for (let f = 0; f < floors; f++) {
      if (opts.skip?.("end", cz, f)) continue;
      g.add(put(windowUnit(0.2, 0.58), "end", -w / 2 - 0.02, winY(f), cz));
    }
  }
  for (const b of opts.balconies ?? []) {
    const bal = balcony(1.1, 0.42);
    if (b.face === "right") {
      bal.rotation.y = Math.PI / 2;
      bal.position.set(w / 2 + 0.02, b.floor * FLOOR + FLOOR / 2 - 0.44, b.col);
    } else {
      bal.position.set(b.col, b.floor * FLOOR + FLOOR / 2 - 0.44, d / 2 + 0.02);
    }
    g.add(bal);
  }
  return g;
}

/** Floating padlock: lime body + shackle + dark keyhole. */
function padlock() {
  const g = new THREE.Group();
  const m = mat(ACCENT, { emissive: ACCENT, ei: 0.45, rough: 0.45 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.34, 0.12), m);
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.035, 10, 20, Math.PI), m);
  shackle.position.y = 0.17;
  const keyhole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.13, 10),
    mat(INK),
  );
  keyhole.rotation.x = Math.PI / 2;
  keyhole.position.z = 0.01;
  g.add(body, shackle, keyhole);
  return g;
}

/** Soft blob shadow — canvas radial gradient, offset right-back like the ref. */
function blobShadow() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createRadialGradient(112, 128, 16, 128, 128, 126);
  grad.addColorStop(0, "rgba(38,32,22,0.36)");
  grad.addColorStop(0.7, "rgba(38,32,22,0.12)");
  grad.addColorStop(1, "rgba(38,32,22,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(10.5, 8.5),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(0.9, 0.02, -0.5);
  return m;
}

/**
 * The reference render rebuilt in WebGL: an L-plan clay apartment tower —
 * left wing forward, right wing recessed; protruding slab ledges, tall
 * mullioned windows, parapet+bulkhead roofs, one glowing floor unit with a
 * railed balcony, and a floating padlock tethered to it.
 */
export function BuildingScene({ className = "" }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    if (!window.matchMedia("(min-width: 1024px)").matches) return undefined; // img fallback on mobile
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      console.warn("BuildingScene: WebGL unavailable — static image stays");
      return undefined;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const frustum = 4.4;
    const camera = new THREE.OrthographicCamera(-frustum, frustum, frustum, -frustum, 0.1, 100);
    camera.position.set(11.5, 8.6, 9.2); // corner-on, favoring the right side like the ref
    camera.lookAt(0.4, 2.6, -0.3);

    scene.add(new THREE.HemisphereLight(0xfffdf6, 0xcfc4b2, 0.9));
    const key = new THREE.DirectionalLight(0xfff2dd, 1.7);
    key.position.set(-5, 11, 9); // warm key from upper-left
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.3);
    fill.position.set(7, 4, -3);
    scene.add(fill);

    const building = new THREE.Group();
    const FLOORS = 5;

    // Wing A — left, sits FORWARD (front face closer to camera)
    const aW = 3.1, aD = 2.0, aX = -1.7, aZ = 0.55;
    const wingA = wing({
      w: aW, d: aD, floors: FLOORS,
      frontCols: [-0.95, 0, 0.95],
      rightCols: [0.35, -0.45], // its +x end face — the sliver between the fronts
      balconies: [{ face: "right", col: -0.45, floor: 3 }],
    });
    wingA.position.set(aX, 0, aZ);

    // Wing B — right, RECESSED 0.9 behind wing A's front plane; one floor taller
    const bW = 3.3, bD = 2.4, bX = 1.55, bZ = -0.85;
    const GLOW_FLOOR = 3; // above the dossier card's overlap
    const glowCols = [-0.9, 0.15, 1.05]; // the whole recessed front glows this floor
    const wingB = wing({
      w: bW, d: bD, floors: FLOORS,
      frontCols: [-0.9, 0.15, 1.05],
      rightCols: [0.6, -0.4],
      skip: (face, col, f) => face === "front" && f === GLOW_FLOOR && glowCols.includes(col),
      balconies: [
        { face: "right", col: 0.6, floor: 4 },
        { face: "right", col: -0.4, floor: 3 },
      ],
    });
    wingB.position.set(bX, 0, bZ);
    building.add(wingA, wingB);

    // ---- Glowing unit on wing B's recessed front face ---------------------
    const glow = new THREE.Group();
    const glowW = 3.0, glowH = 0.92;
    const glowX = bX + 0.08; // centered on the recessed face
    const glowY = GLOW_FLOOR * FLOOR + FLOOR / 2 - 0.06;
    const frontB = bZ + bD / 2; // recessed front plane of wing B
    // emissive facade panel
    glow.add(box(glowW, glowH, 0.1, 0xf8ffcf, 0, 0, 0.03, { emissive: ACCENT, ei: 1.15, rough: 0.4 }));
    // lit window slots inside the glow (three pane pairs, lime)
    for (const ox of [-0.65, 0, 0.65]) {
      glow.add(box(0.4, 0.62, 0.12, 0xecff5e, ox, 0, 0.045, { emissive: ACCENT, ei: 0.9, rough: 0.3 }));
      glow.add(box(0.035, 0.62, 0.13, MULLION, ox, 0, 0.05));
    }
    // light spill onto the recessed face + inner corner
    const spill = new THREE.PointLight(ACCENT, 14, 5.5, 2);
    spill.position.set(0, 0.1, 0.7);
    glow.add(spill);
    const bal = balcony(glowW + 0.35, 0.55);
    bal.position.set(0, -0.46, 0.05);
    glow.add(bal);
    glow.position.set(glowX, glowY, frontB + 0.02);
    building.add(glow);

    // ---- Padlock + hairline connector -------------------------------------
    const lock = padlock();
    lock.scale.setScalar(1.3);
    const lockAnchor = new THREE.Vector3(bX + 1.5, glowY + 0.3, frontB + 0.15);
    lock.position.copy(lockAnchor);
    building.add(lock);

    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(glowX + glowW / 2 + 0.05, glowY + 0.15, frontB + 0.06),
      lockAnchor.clone(),
    ]);
    const tether = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.45 }));
    building.add(tether);

    // ---- Base plate --------------------------------------------------------
    building.add(box(7.6, 0.12, 5.4, BASE, 0, 0.06, -0.2));

    // Anchor lower-right of the full-bleed canvas: the dossier overlaps its
    // lower-left corner; headline column stays clear.
    building.scale.setScalar(0.65);
    building.position.x = 3.6;
    building.position.y = 0.2;
    scene.add(building);
    scene.add(blobShadow());

    const size = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      renderer.setSize(w, h, true);
      const aspect = w / Math.max(h, 1);
      camera.left = -frustum * aspect;
      camera.right = frustum * aspect;
      camera.updateProjectionMatrix();
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(mount);

    let px = 0, py = 0;
    const onMove = (e: PointerEvent) => {
      const r = mount.getBoundingClientRect();
      px = ((e.clientX - r.left) / r.width - 0.5) * 2;
      py = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    if (!reduce) window.addEventListener("pointermove", onMove);

    let raf = 0;
    const clock = new THREE.Clock();
    const frame = () => {
      const t = clock.getElapsedTime();
      building.rotation.y = Math.sin(t * 0.18) * 0.045 + px * 0.08;
      building.rotation.x = py * 0.025;
      lock.position.y = lockAnchor.y + Math.sin(t * 1.05) * 0.11;
      lock.rotation.y = Math.sin(t * 0.7) * 0.4;
      // tether tracks the bobbing lock
      const p = lineGeo.attributes.position as THREE.BufferAttribute;
      p.setXYZ(1, lock.position.x, lock.position.y, lock.position.z);
      p.needsUpdate = true;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };
    if (reduce) {
      renderer.render(scene, camera);
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      ro.disconnect();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of mats) {
            if (m instanceof THREE.MeshBasicMaterial && m.map) m.map.dispose();
            m.dispose();
          }
        }
        if (o instanceof THREE.Line) o.geometry.dispose();
      });
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} aria-hidden className={`pointer-events-none absolute inset-0 ${className}`} />;
}
