"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export type FieldBlock = { key: string; label: string; featured: boolean };

const INK = 0x0c0a08;
const GRID = 0xd8d5d1;
const ACCENT = 0xe4f222;

/** Face texture: bone card, mono entity key + label — the block IS a record. */
function blockTexture(b: FieldBlock): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 320;
  const g = c.getContext("2d")!;
  g.fillStyle = b.featured ? "#e4f222" : "#f4f2f0";
  g.fillRect(0, 0, 512, 320);
  g.strokeStyle = "#0c0a08"; g.lineWidth = 3;
  g.strokeRect(14, 14, 484, 292);
  g.fillStyle = "#0c0a08";
  g.font = "500 22px ui-monospace, monospace";
  g.fillText(b.featured ? "SPECIMEN" : "DEPOSIT_TERMS", 34, 56);
  g.font = "400 20px ui-monospace, monospace";
  const k = b.key;
  g.fillText(`${k.slice(0, 20)}`, 34, 120);
  g.fillText(`…${k.slice(-18)}`, 34, 150);
  g.font = "400 18px ui-monospace, monospace";
  g.fillStyle = "#55524f";
  g.fillText(b.label.toUpperCase().slice(0, 26), 34, 210);
  g.fillText("SIGNED · QUERYABLE", 34, 240);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Arkiv-landing-style scene: a gridded room of floating entity blocks —
 *  but every block is a REAL on-chain `deposit_terms` record, keyed. */
export function EntityField({ blocks, className = "" }: { blocks: FieldBlock[]; className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || blocks.length === 0) return undefined;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      console.warn("EntityField: WebGL context unavailable — skipping 3D field");
      return undefined; // dossier still renders
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 2.4, 11);
    camera.lookAt(0, 1.2, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const dir = new THREE.DirectionalLight(0xffffff, 1.4);
    dir.position.set(4, 8, 6);
    scene.add(dir);

    // The room: floor + back wall grids — the "database" space.
    const floor = new THREE.GridHelper(30, 30, GRID, GRID);
    floor.position.y = -1.6;
    const wall = new THREE.GridHelper(30, 30, GRID, GRID);
    wall.rotation.x = Math.PI / 2;
    wall.position.set(0, 8.4, -8);
    scene.add(floor, wall);

    // Blocks: seeded scatter, real keys on the faces.
    const group = new THREE.Group();
    const rand = (seed: number) => {
      let s = seed;
      return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    };
    const r = rand(blocks.length * 7919);
    const disposables: { dispose(): void }[] = [];
    const geo = new THREE.BoxGeometry(2.6, 1.65, 1.65);
    const edgeGeo = new THREE.EdgesGeometry(geo);
    disposables.push(geo, edgeGeo);
    const meshes = blocks.map((b, i) => {
      const tex = blockTexture(b);
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        color: b.featured ? 0xffffff : 0xf7f5f3,
        roughness: 0.4,
        transparent: true,
        opacity: b.featured ? 0.85 : 0.62,
        depthWrite: false,
        emissive: b.featured ? new THREE.Color(ACCENT) : new THREE.Color(INK),
        emissiveIntensity: b.featured ? 0.3 : 0.03,
      });
      const edgeMat = new THREE.LineBasicMaterial({
        color: b.featured ? 0x7a8a00 : 0x9a9694,
        transparent: true,
        opacity: b.featured ? 0.9 : 0.4,
      });
      disposables.push(tex, mat, edgeMat);
      const m = new THREE.Mesh(geo, mat);
      m.add(new THREE.LineSegments(edgeGeo, edgeMat));
      // Full-bleed scatter across the whole hero — pale blocks float behind
      // the copy like Arkiv's landing; legibility preserved by low contrast.
      m.position.set((r() - 0.5) * 22, 0.1 + r() * 5.2, -7 + (r() - 0.5) * 7);
      m.rotation.set((r() - 0.5) * 0.5, (r() - 0.5) * 0.9, (r() - 0.5) * 0.3);
      m.userData = { baseY: m.position.y, phase: r() * Math.PI * 2, i };
      group.add(m);
      return m;
    });
    scene.add(group);

    const size = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      renderer.setSize(w, h, true);
      const aspect = w / Math.max(h, 1);
      camera.aspect = aspect;
      // Narrow viewports: pull back + shrink so blocks stay ambient texture,
      // not giant faces behind the headline.
      camera.position.z = aspect < 0.8 ? 17 : aspect < 1.2 ? 13.5 : 11;
      group.scale.setScalar(aspect < 0.8 ? 0.62 : 1);
      camera.updateProjectionMatrix();
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(mount);

    let raf = 0;
    const clock = new THREE.Clock();
    const frame = () => {
      const t = clock.getElapsedTime();
      group.rotation.y = Math.sin(t * 0.08) * 0.16;
      for (const m of meshes) {
        m.position.y = m.userData.baseY + Math.sin(t * 0.5 + m.userData.phase) * 0.28;
        m.rotation.y += 0.0012;
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };
    if (reduce) {
      renderer.render(scene, camera); // one static frame — no loop
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      for (const d of disposables) d.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [blocks]);

  return <div ref={mountRef} aria-hidden className={`pointer-events-none absolute inset-0 ${className}`} />;
}
