"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const BONE_WALL = 0xf2eee8;
const SLAB = 0xd9d2c7;
const INK = 0x2e2b28;
const ACCENT = 0xddf02e;
const BASE = 0xeae4da;

function box(
  w: number, h: number, d: number, color: number,
  x = 0, y = 0, z = 0, opts: { emissive?: number; ei?: number; rough?: number } = {},
) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({
      color, roughness: opts.rough ?? 0.92, metalness: 0,
      ...(opts.emissive !== undefined
        ? { emissive: new THREE.Color(opts.emissive), emissiveIntensity: opts.ei ?? 0.5 }
        : {}),
    }),
  );
  m.position.set(x, y, z);
  return m;
}

/** Dark inset window pane on a face. */
function window_(
  face: "front" | "left" | "right", // +z, -x, +x
  cx: number, cy: number, cz: number, w = 0.34, h = 0.5,
) {
  const depth = 0.05;
  const dims: [number, number, number] =
    face === "front" ? [w, h, depth] : [depth, h, w];
  const win = box(...dims, INK, cx, cy, cz, { rough: 0.6 });
  return win;
}

/** Thin horizontal slab band wrapping a wing — the floor lines. */
function slabLine(w: number, d: number, x: number, y: number, z: number) {
  return box(w + 0.1, 0.055, d + 0.1, SLAB, x, y, z);
}

/** Thin parapet frame around a roof edge. */
function parapet(w: number, d: number, x: number, yTop: number, z: number) {
  const g = new THREE.Group();
  const t = 0.06, h = 0.26;
  g.add(box(w, h, t, BONE_WALL, 0, h / 2, d / 2));
  g.add(box(w, h, t, BONE_WALL, 0, h / 2, -d / 2));
  g.add(box(t, h, d, BONE_WALL, w / 2, h / 2, 0));
  g.add(box(t, h, d, BONE_WALL, -w / 2, h / 2, 0));
  g.position.set(x, yTop, z);
  return g;
}

/** The glowing unit — a floor section in accent + balcony slab + railing,
 *  on a given face (+z front or +x right side). */
function glowingUnit(
  face: "front" | "right", faceCoord: number, center: number, y: number,
) {
  const g = new THREE.Group();
  const f = face === "front";
  // glow slab protruding from the face
  g.add(f
    ? box(1.72, 0.82, 0.14, 0xffffff, center, y, faceCoord + 0.08, { emissive: ACCENT, ei: 0.55 })
    : box(0.14, 0.82, 1.72, 0xffffff, faceCoord + 0.08, y, center, { emissive: ACCENT, ei: 0.55 }));
  // balcony slab + railing
  const offs = [-0.85, -0.42, 0, 0.42, 0.85];
  if (f) {
    g.add(box(1.9, 0.05, 0.52, SLAB, center, y - 0.46, faceCoord + 0.26));
    for (const o of offs) g.add(box(0.03, 0.34, 0.03, INK, center + o, y - 0.16, faceCoord + 0.5));
    g.add(box(1.9, 0.035, 0.035, INK, center, y + 0.02, faceCoord + 0.5));
  } else {
    g.add(box(0.52, 0.05, 1.9, SLAB, faceCoord + 0.26, y - 0.46, center));
    for (const o of offs) g.add(box(0.03, 0.34, 0.03, INK, faceCoord + 0.5, y - 0.16, center + o));
    g.add(box(0.035, 0.035, 1.9, INK, faceCoord + 0.5, y + 0.02, center));
  }
  return g;
}

/** Floating padlock beside the glowing unit — torus shackle + body. */
function padlock() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: ACCENT, roughness: 0.5, emissive: new THREE.Color(ACCENT), emissiveIntensity: 0.35 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.34, 0.1), mat);
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.035, 10, 20, Math.PI), mat);
  shackle.position.y = 0.17;
  const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.11, 10), new THREE.MeshStandardMaterial({ color: INK }));
  dot.rotation.x = Math.PI / 2;
  dot.position.set(0, -0.02, 0);
  g.add(body, shackle, dot);
  return g;
}

/** Soft blob shadow under the building — canvas radial gradient, no shadowmaps. */
function blobShadow() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(128, 128, 20, 128, 128, 128);
  grad.addColorStop(0, "rgba(30,25,18,0.34)");
  grad.addColorStop(1, "rgba(30,25,18,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 7),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(0.7, 0.01, 0.7);
  return m;
}

/** Isometric clay-render apartment tower — the reference image rebuilt in
 *  WebGL: L-shaped wings, slab lines, window grid, parapets, one glowing
 *  unit with balcony, floating padlock, blob shadow. */
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
    const frustum = 4.7;
    const camera = new THREE.OrthographicCamera(-frustum, frustum, frustum, -frustum, 0.1, 100);
    camera.position.set(11, 9.6, 11);
    camera.lookAt(0.9, 2.5, 0);

    scene.add(new THREE.HemisphereLight(0xfffdf8, 0xcfc4b4, 0.85));
    const key = new THREE.DirectionalLight(0xfff4e0, 1.8);
    key.position.set(6, 10, 8);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(-6, 4, -2);
    scene.add(fill);

    const building = new THREE.Group();

    // Base plate
    building.add(box(6.4, 0.14, 5.0, BASE, 0, 0.07, 0.3));

    // Wing A — main/front-right mass: 4 floors
    const aW = 3.2, aD = 2.6, aH = 4.6, aX = 0.9, aZ = 0.4;
    const wingA = box(aW, aH, aD, BONE_WALL, aX, aH / 2 + 0.14, aZ);
    // Wing B — taller rear-left mass: 5 floors
    const bW = 2.5, bD = 2.2, bH = 5.6, bX = -1.7, bZ = -0.4;
    const wingB = box(bW, bH, bD, BONE_WALL, bX, bH / 2 + 0.14, bZ);
    building.add(wingA, wingB);
    // Ink edge outlines — bone walls on bone canvas need the silhouette drawn
    const edgeStyle = new THREE.LineBasicMaterial({ color: 0x55504a, transparent: true, opacity: 0.55 });
    for (const wing of [wingA, wingB]) {
      wing.add(new THREE.LineSegments(
        new THREE.EdgesGeometry(wing.geometry as THREE.BoxGeometry), edgeStyle,
      ));
    }

    // Slab lines between floors
    for (let f = 1; f <= 4; f++) building.add(slabLine(aW, aD, aX, 0.14 + f * 1.05, aZ));
    for (let f = 1; f <= 5; f++) building.add(slabLine(bW, bD, bX, 0.14 + f * 1.05, bZ));

    // Parapets on both roofs
    building.add(parapet(aW - 0.15, aD - 0.15, aX, 0.14 + aH, aZ));
    building.add(parapet(bW - 0.15, bD - 0.15, bX, 0.14 + bH, bZ));

    // Windows — front face (+z) of wing A: 2 cols × 4 floors
    const floorY = (f: number) => 0.14 + f * 1.05 - 0.55;
    for (let f = 0; f < 4; f++) {
      for (const cx of [-0.75, 0.75]) {
        building.add(window_("front", aX + cx, floorY(f), aZ + aD / 2 + 0.02));
      }
    }
    // right face (+x) of wing A — glowing unit takes floor 2
    for (let f = 0; f < 4; f++) {
      if (f === 2) continue;
      building.add(window_("right", aX + aW / 2 + 0.02, floorY(f), aZ - 0.55));
      building.add(window_("right", aX + aW / 2 + 0.02, floorY(f), aZ + 0.55));
    }
    // front face (+z) of wing B: 2 cols × 5 floors
    for (let f = 0; f < 5; f++) {
      building.add(window_("front", bX - 0.45, floorY(f), bZ + bD / 2 + 0.02));
      building.add(window_("front", bX + 0.45, floorY(f), bZ + bD / 2 + 0.02));
    }

    // The glowing unit — floor 2, +x face of wing A (the unobstructed face)
    building.add(glowingUnit("right", aX + aW / 2, aZ, floorY(2)));

    // Padlock floating beside the glow
    const lock = padlock();
    lock.position.set(aX + aW / 2 + 0.95, floorY(2) + 0.4, aZ + 0.5);
    building.add(lock);

    // Shift right-of-center: the dossier card overlaps the lower-left corner.
    building.position.x = 1.15;
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

    // Gentle sway + padlock bob + pointer parallax tilt
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
      building.rotation.y = Math.sin(t * 0.22) * 0.06 + px * 0.09;
      building.rotation.x = py * 0.03;
      lock.position.y = floorY(2) + 0.35 + Math.sin(t * 1.1) * 0.12;
      lock.rotation.y = t * 0.5;
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
      });
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} aria-hidden className={`pointer-events-none absolute inset-0 ${className}`} />;
}
