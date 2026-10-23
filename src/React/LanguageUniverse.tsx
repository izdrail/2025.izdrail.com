import { useEffect, useRef, useState, useMemo } from "react";
import data from "../data/languages.json";
import LetterGlitch from "./LetterGlitch.tsx";

type Lang = { n: string; c: string | null; d: string; f: string; k?: string };
type Mode = "domain" | "family" | "brain";

const LANGS = data.languages as Lang[];
const DOMAIN_LABELS = data.domains as Record<string, string>;
const FAMILY_LABELS = data.families as Record<string, string>;
const KIND_LABELS = (data as { kinds?: Record<string, string> }).kinds ?? {};
const STACK = data.stack as Record<string, string>;
const LINKS = ((data as { links?: string[][] }).links ?? []).filter(
  (p): p is [string, string] => p.length === 2
);

// name -> related names (documented influence, either direction)
const RELATED = new Map<string, string[]>();
for (const [a, b] of LINKS) {
  RELATED.set(a, [...(RELATED.get(a) ?? []), b]);
  RELATED.set(b, [...(RELATED.get(b) ?? []), a]);
}

const ACCENT = "#a476ff";
const FIELD = "#7a6fa6"; // muted lavender for the universe field

// deterministic PRNG so layouts are stable between visits
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}
function mixHex(a: string, b: string, t: number): [number, number, number] {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return [
    ca[0] + (cb[0] - ca[0]) * t,
    ca[1] + (cb[1] - ca[1]) * t,
    ca[2] + (cb[2] - ca[2]) * t,
  ];
}

// fibonacci sphere cluster centers
function clusterCenters(keys: string[], radius: number) {
  const centers = new Map<string, [number, number, number]>();
  const n = keys.length;
  const golden = Math.PI * (3 - Math.sqrt(5));
  keys.forEach((k, i) => {
    const y = n === 1 ? 0 : 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const th = golden * i;
    centers.set(k, [Math.cos(th) * r * radius, y * radius, Math.sin(th) * r * radius]);
  });
  return centers;
}

function computePositions(mode: Mode | "az"): Float32Array {
  const pos = new Float32Array(LANGS.length * 3);
  if (mode === "az") {
    const n = LANGS.length; // LANGS is sorted A-Z already
    const turns = 5;
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : i / (n - 1);
      const rnd = mulberry32(hashStr(LANGS[i].n));
      const ang = t * Math.PI * 2 * turns;
      const rad = 5.0 + (rnd() - 0.5) * 0.8;
      pos[i * 3] = Math.cos(ang) * rad;
      pos[i * 3 + 1] = 5.9 - t * 11.8;
      pos[i * 3 + 2] = Math.sin(ang) * rad;
    }
    return pos;
  }
  if (mode === "brain") {
    // brain mode: the language nodes coat the same cerebrum / cerebellum /
    // brainstem shape as the anatomical scaffold mesh rendered behind them
    // (CC0, see public/brain-LICENSE.txt). The mesh provides the folds; the
    // nodes stay a semantic point cloud.
    const n = LANGS.length;
    const golden = Math.PI * (3 - Math.sqrt(5));
    const CEREB = Math.min(80, Math.floor(n * 0.14));
    const STEM = 14;
    const cort = n - CEREB;
    // fitted to the normalized scaffold bounds (~9.4 world units deep)
    const RX = 3.5, RY = 2.6, RZ = 4.3, CY = 1.35;
    for (let i = 0; i < n; i++) {
      const rnd = mulberry32(hashStr(LANGS[i].n + "brain"));
      if (i >= cort + STEM) {
        // cerebellum: small finely-banded ellipsoid under the back
        const k = i - cort - STEM;
        const m = CEREB;
        const y0 = m === 1 ? 0 : 1 - (k / (m - 1)) * 2;
        const r0 = Math.sqrt(Math.max(0, 1 - y0 * y0));
        const th = golden * k;
        const band = 1 + 0.06 * Math.sin(y0 * 20) + (rnd() - 0.5) * 0.05;
        pos[i * 3] = Math.cos(th) * r0 * 1.9 * band;
        pos[i * 3 + 1] = y0 * 0.95 * band - 1.55;
        pos[i * 3 + 2] = Math.sin(th) * r0 * 1.45 * band - 2.85;
        continue;
      }
      if (i >= cort) {
        // brainstem: short column dropping in front of the cerebellum
        const t = (i - cort) / STEM;
        const a = rnd() * Math.PI * 2;
        const rr = 0.4 + rnd() * 0.2;
        pos[i * 3] = Math.cos(a) * rr + t * 0.3;
        pos[i * 3 + 1] = -2.1 - t * 1.9;
        pos[i * 3 + 2] = -1.5 + Math.sin(a) * rr * 0.8;
        continue;
      }
      const y0 = cort === 1 ? 0 : 1 - (i / (cort - 1)) * 2;
      const r0 = Math.sqrt(Math.max(0, 1 - y0 * y0));
      const th = golden * i;
      const dx = Math.cos(th) * r0;
      const dy = y0;
      const dz = Math.sin(th) * r0;
      // gentle surface irregularity only - the scaffold carries the folds
      const fold = 1 + 0.05 * Math.sin(dy * 6.0 + dz * 4.0 + Math.sin(dx * 5.0) * 1.3);
      let x = dx * RX * fold;
      let y = dy * RY * fold + CY;
      const z = dz * RZ * fold;
      // frontal taper (+z front)
      if (z > 0) {
        const f = z / RZ;
        x *= 1 - 0.16 * f * f;
        y -= 0.1 * f * f * RY * 0.4;
      }
      // longitudinal fissure: keep the top midline clear of nodes so the
      // scaffold's fissure reads through the cloud
      const ax = Math.abs(dx);
      const topness = Math.min(1, Math.max(0, (dy + 0.3) / 0.8));
      const FW = 0.16;
      if (ax < FW && topness > 0) {
        const side = dx === 0 ? (i % 2 === 0 ? -1 : 1) : Math.sign(dx);
        const wall = 1 - ax / FW;
        x = side * (FW + wall * 0.06) * RX * fold;
        y -= wall * topness * 1.1;
      } else if (ax < 0.42 && topness > 0) {
        y -= (1 - (ax - FW) / (0.42 - FW)) * topness * 0.45;
      }
      pos[i * 3] = x + (rnd() - 0.5) * 0.14;
      pos[i * 3 + 1] = y + (rnd() - 0.5) * 0.14;
      pos[i * 3 + 2] = z + (rnd() - 0.5) * 0.14;
    }
    return pos;
  }
  const keyOf = (l: Lang) => (mode === "domain" ? l.d : l.f);
  const keys = Array.from(new Set(LANGS.map(keyOf)));
  const counts = new Map<string, number>();
  for (const l of LANGS) counts.set(keyOf(l), (counts.get(keyOf(l)) || 0) + 1);
  const centers = clusterCenters(keys, mode === "domain" ? 5.2 : 4.4);
  LANGS.forEach((l, i) => {
    const k = keyOf(l);
    const c = centers.get(k)!;
    const rnd = mulberry32(hashStr(l.n + k));
    // gaussian-ish jitter in a ball, cluster radius scales with its size
    const count = counts.get(k) || 1;
    const spread = Math.min(1.8, 0.75 + Math.sqrt(count) * 0.22);
    const u = rnd();
    const v = rnd();
    const rr = Math.cbrt(rnd()) * spread;
    const th = u * Math.PI * 2;
    const ph = Math.acos(2 * v - 1);
    pos[i * 3] = c[0] + rr * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = c[1] + rr * Math.cos(ph);
    pos[i * 3 + 2] = c[2] + rr * Math.sin(ph) * Math.sin(th);
  });
  return pos;
}

const VERT = `
attribute vec3 position;
attribute vec3 aColor;
attribute float aSize;
attribute float aPhase;
attribute float aBoost;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float uTime;
uniform float uPR;
varying vec3 vColor;
varying float vBoost;
void main() {
  vColor = aColor;
  vBoost = aBoost;
  float tw = 0.85 + 0.3 * sin(uTime * 1.6 + aPhase);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float s = aSize * (1.0 + aBoost * 1.1) * tw;
  gl_PointSize = s * uPR * (88.0 / max(0.1, -mv.z));
  gl_Position = projectionMatrix * mv;
}
`;
const FRAG = `
precision highp float;
varying vec3 vColor;
varying float vBoost;
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  float core = smoothstep(0.42, 0.28, d);
  float glow = smoothstep(0.5, 0.3, d) * 0.22;
  float a = core + glow * (0.3 + vBoost);
  if (a < 0.02) discard;
  vec3 col = mix(vColor, vec3(1.0), vBoost * core * 0.65);
  gl_FragColor = vec4(col, a);
}
`;

const LINE_VERT = `
attribute vec3 position;
attribute float aAlpha;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
varying float vA;
void main() {
  vA = aAlpha;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const LINE_FRAG = `
precision highp float;
uniform vec3 uBase;
uniform vec3 uHi;
varying float vA;
void main() {
  gl_FragColor = vec4(mix(uBase, uHi, vA), mix(0.14, 0.95, vA));
}
`;

const SURF_VERT = `
attribute vec3 position;
attribute vec3 normal;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;
varying vec3 vN;
varying vec3 vP;
void main() {
  vN = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vP = mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`;

const SURF_FRAG = `
precision highp float;
uniform vec3 uColor;
uniform float uAlpha;
varying vec3 vN;
varying vec3 vP;
void main() {
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  vec3 l1 = normalize(vec3(0.5, 0.8, 0.6));
  vec3 l2 = normalize(vec3(-0.6, -0.2, -0.5));
  float d = max(dot(n, l1), 0.0) * 0.85 + max(dot(n, l2), 0.0) * 0.3;
  float rim = pow(1.0 - abs(dot(n, normalize(-vP))), 2.0) * 0.65;
  vec3 col = uColor * (0.5 + d) + vec3(0.5, 0.43, 0.8) * rim;
  gl_FragColor = vec4(col, uAlpha);
}
`;

const MODES: { id: Mode | "az"; label: string }[] = [
  { id: "brain", label: "Brain" },
  { id: "domain", label: "By domain" },
  { id: "family", label: "By family" },
  { id: "az", label: "A-Z" },
];

export default function LanguageUniverse({
  decorative = false,
  initialRotY,
}: {
  /** page-background mode: no UI chrome, no interaction, letters handled by the page backdrop */
  decorative?: boolean;
  /** starting yaw so multiple decorative brains don't open on the same angle */
  initialRotY?: number;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<Mode | "az">("brain");
  const [selected, setSelected] = useState<Lang | null>(null);
  const [query, setQuery] = useState("");
  const [glFailed, setGlFailed] = useState(false);
  const apiRef = useRef<{
    setMode: (m: Mode | "az") => void;
    focus: (name: string) => void;
    pickAt: (px: number, py: number) => Lang | null;
  } | null>(null);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const starts = LANGS.filter((l) => l.n.toLowerCase().startsWith(q));
    const contains = LANGS.filter(
      (l) => !starts.includes(l) && l.n.toLowerCase().includes(q)
    );
    return [...starts, ...contains].slice(0, 6);
  }, [query]);

  useEffect(() => {
    apiRef.current?.setMode(mode);
  }, [mode]);

  useEffect(() => {
    let destroyed = false;
    let raf = 0;
    let cleanup: (() => void) | null = null;

    (async () => {
      const { Renderer, Camera, Transform, Program, Mesh, Geometry, GLTFLoader } = await import(
        "ogl"
      );
      if (destroyed || !canvasRef.current || !wrapRef.current) return;
      const wrap = wrapRef.current;
      const canvas = canvasRef.current;

      let renderer;
      try {
        renderer = new Renderer({
          canvas,
          dpr: Math.min(2, window.devicePixelRatio || 1),
          alpha: true,
          antialias: false,
        });
      } catch {
        setGlFailed(true);
        return;
      }
      const gl = renderer.gl;
      gl.clearColor(0, 0, 0, 0);

      const camera = new Camera(gl, { fov: 40 });
      camera.position.set(0, 0, 19);
      camera.lookAt([0, 0, 0]);
      const scene = new Transform();
      // match the picking math: v' = Rx * Ry * v (Euler order XYZ)
      scene.rotation.reorder("XYZ");

      const n = LANGS.length;
      const colors = new Float32Array(n * 3);
      const sizes = new Float32Array(n);
      const phases = new Float32Array(n);
      const boosts = new Float32Array(n);
      const accentRgb = hexToRgb(ACCENT);
      LANGS.forEach((l, i) => {
        const isStack = l.n in STACK;
        const rgb = isStack
          ? accentRgb
          : l.c
            ? mixHex(l.c, ACCENT, 0.62)
            : hexToRgb(FIELD);
        colors[i * 3] = rgb[0];
        colors[i * 3 + 1] = rgb[1];
        colors[i * 3 + 2] = rgb[2];
        const rnd = mulberry32(hashStr(l.n));
        sizes[i] = isStack ? 2.6 : 1.1 + rnd() * 0.7;
        phases[i] = rnd() * Math.PI * 2;
      });

      const startPos = computePositions("brain");
      const geometry = new Geometry(gl, {
        position: { size: 3, data: startPos },
        aColor: { size: 3, data: colors },
        aSize: { size: 1, data: sizes },
        aPhase: { size: 1, data: phases },
        aBoost: { size: 1, data: boosts },
      });
      const program = new Program(gl, {
        vertex: VERT,
        fragment: FRAG,
        transparent: true,
        depthTest: true,
        depthWrite: false,
        uniforms: { uTime: { value: 0 }, uPR: { value: renderer.dpr } },
      });
      const points = new Mesh(gl, { geometry, program, mode: gl.POINTS, frustumCulled: false });
      points.setParent(scene);

      // related-language graph edges (documented influence pairs)
      const idxOf = new Map<string, number>();
      LANGS.forEach((l, i) => {
        if (!idxOf.has(l.n)) idxOf.set(l.n, i);
      });
      const edges: [number, number][] = [];
      for (const [a, b] of LINKS) {
        const ia = idxOf.get(a);
        const ib = idxOf.get(b);
        if (ia != null && ib != null && ia !== ib) edges.push([ia, ib]);
      }
      const E = edges.length;
      const SEG = 5; // segments per edge - squiggly links
      const edgePhase = new Float32Array(E);
      for (let e = 0; e < E; e++) edgePhase[e] = mulberry32(0x9e37 + e)() * Math.PI * 2;
      const linePos = new Float32Array(E * SEG * 6);
      const lineAlpha = new Float32Array(E * SEG * 2);
      const lineGeometry = new Geometry(gl, {
        position: { size: 3, data: linePos },
        aAlpha: { size: 1, data: lineAlpha },
      });
      const lineProgram = new Program(gl, {
        vertex: LINE_VERT,
        fragment: LINE_FRAG,
        transparent: true,
        depthTest: true,
        depthWrite: false,
        uniforms: {
          uBase: { value: hexToRgb(FIELD) },
          uHi: { value: hexToRgb(ACCENT) },
        },
      });
      const lines = new Mesh(gl, {
        geometry: lineGeometry,
        program: lineProgram,
        mode: gl.LINES,
        frustumCulled: false,
      });
      lines.setParent(scene);

      // anatomical brain scaffold: openly licensed CC0 mesh (source and
      // provenance in public/brain-LICENSE.txt, decorative only - no medical
      // accuracy claimed). Rendered low-opacity behind the node cloud and
      // faded out outside brain mode. depthWrite stays off so it never
      // occludes nodes or influence lines.
      let scaffoldProg: any = null;
      let scaffoldDone = false; // GLB settled (loaded or failed) - gates the decorative still
      // fire-and-forget: the node cloud renders immediately, the scaffold
      // fades in whenever the ~4MB mesh finishes loading
      (async () => {
      try {
        const gltf = await GLTFLoader.load(gl, "/brain.glb");
        if (destroyed) return;
        const root = (gltf.scene && gltf.scene[0]) || null;
        let bm: any = null;
        root?.traverse((m: any) => {
          if ((m as unknown as { geometry?: unknown }).geometry && !bm) bm = m;
        });
        const meshNode: any = bm;
        if (meshNode && meshNode.geometry) {
          meshNode.geometry.computeBoundingBox();
          const bb = meshNode.geometry.bounds;
          const size = [bb.max[0] - bb.min[0], bb.max[1] - bb.min[1], bb.max[2] - bb.min[2]];
          const ctr = [
            (bb.max[0] + bb.min[0]) / 2,
            (bb.max[1] + bb.min[1]) / 2,
            (bb.max[2] + bb.min[2]) / 2,
          ];
          const sc = 9.0 / Math.max(...size);
          scaffoldProg = new Program(gl, {
            vertex: SURF_VERT,
            fragment: SURF_FRAG,
            transparent: true,
            depthTest: true,
            depthWrite: false,
            cullFace: false,
            uniforms: {
              uColor: { value: hexToRgb("#7d6fc8") },
              uAlpha: { value: 0.45 },
            },
          });
          meshNode.program = scaffoldProg;
          const holder = new Transform();
          holder.position.set(-ctr[0] * sc, -ctr[1] * sc + 0.35, -ctr[2] * sc);
          holder.scale.set(sc);
          meshNode.setParent(holder);
          holder.setParent(scene);
        }
      } catch {
        // scaffold unavailable - the node cloud still works on its own
      }
      scaffoldDone = true;
      })();
      points.renderOrder = 1; // keep points visually above the web

      // layout transitions (CPU lerp)
      let from: Float32Array = Float32Array.from(startPos);
      let target = Float32Array.from(startPos);
      let t0 = performance.now();
      const DUR = 900;
      const current = geometry.attributes.position.data as Float32Array;

      function syncLinePositions() {
        for (let e = 0; e < E; e++) {
          const [ia, ib] = edges[e];
          const ax = current[ia * 3], ay = current[ia * 3 + 1], az = current[ia * 3 + 2];
          const bx = current[ib * 3], by = current[ib * 3 + 1], bz = current[ib * 3 + 2];
          const dx = bx - ax, dy = by - ay, dz = bz - az;
          const len = Math.hypot(dx, dy, dz) || 1e-6;
          // perpendicular basis for the wiggle
          let px = -dz / len, py = 0, pz = dx / len;
          let pl = Math.hypot(px, pz);
          if (pl < 1e-4) { px = 1; pz = 0; pl = 1; }
          px /= pl; pz /= pl;
          const qx = (dy * pz - dz * py) / len, qy = (dz * px - dx * pz) / len, qz = (dx * py - dy * px) / len;
          const amp = Math.min(0.35, len * 0.1);
          const ph = edgePhase[e];
          const base = e * SEG * 6;
          for (let sg = 0; sg < SEG; sg++) {
            for (let k = 0; k < 2; k++) {
              const t = (sg + k) / SEG;
              const w1 = Math.sin(t * Math.PI * 3 + ph) * amp;
              const w2 = Math.cos(t * Math.PI * 3 + ph) * amp * 0.55;
              const o = base + (sg * 2 + k) * 3;
              linePos[o] = ax + dx * t + px * w1 + qx * w2;
              linePos[o + 1] = ay + dy * t + py * w1 + qy * w2;
              linePos[o + 2] = az + dz * t + pz * w1 + qz * w2;
            }
          }
        }
        lineGeometry.attributes.position.needsUpdate = true;
      }
      syncLinePositions();

      // rotation state
      const DEFAULT_ROT_X = -0.35;
      let rotX = DEFAULT_ROT_X;
      let rotXFrom = DEFAULT_ROT_X; // tilt eased back to neutral on layout change
      let rotY = initialRotY ?? 1.2; // open on the 3/4 view: fissure + cerebellum read immediately
      let velX = 0;
      let velY = 0.0016; // idle spin
      // wheel zoom: camera distance along z, eased toward camTarget
      let camDist = 19;
      let camTarget = 19;
      const CAM_MIN = 10;
      const CAM_MAX = 34;
      let scaffoldShow = 1;
      let scaffoldShowTarget = 1;
      let dragging = false;
      let lastX = 0;
      let lastY = 0;
      let moved = 0;
      let idleTimer: ReturnType<typeof setTimeout> | null = null;
      let hovering = -1;
      let selectedIdx = -1;

      function refreshLineAlpha() {
        const active = hovering >= 0 ? hovering : selectedIdx;
        for (let e = 0; e < E; e++) {
          const on = active >= 0 && (edges[e][0] === active || edges[e][1] === active);
          for (let k = 0; k < SEG * 2; k++) lineAlpha[e * SEG * 2 + k] = on ? 1 : 0;
        }
        lineGeometry.attributes.aAlpha.needsUpdate = true;
      }

      const boostTarget = new Float32Array(n);

      function setBoost(idx: number, v: number) {
        for (let i = 0; i < n; i++) boostTarget[i] = i === idx ? v : 0;
      }

      function scheduleTransition(m: Mode | "az") {
        from = Float32Array.from(current);
        target = computePositions(m);
        scaffoldShowTarget = m === "brain" ? 1 : 0;
        t0 = performance.now();
        rotXFrom = rotX; // recenter any focus tilt over the transition
      }

      function project(i: number, w: number, h: number) {
        const x = current[i * 3];
        const y = current[i * 3 + 1];
        const z = current[i * 3 + 2];
        const cy = Math.cos(rotY);
        const sy = Math.sin(rotY);
        const cx = Math.cos(rotX);
        const sx = Math.sin(rotX);
        const x1 = x * cy + z * sy;
        const z1 = -x * sy + z * cy;
        const y1 = y * cx - z1 * sx;
        const z2 = y * sx + z1 * cx;
        const zv = z2 - camDist; // camera at z=camDist (wheel zoom)
        if (zv > -2) return null;
        const f = 1 / Math.tan((40 * Math.PI) / 360);
        const aspect = w / h;
        const ndcX = (x1 * (f / aspect)) / -zv;
        const ndcY = (y1 * f) / -zv;
        return [(ndcX * 0.5 + 0.5) * w, (1 - (ndcY * 0.5 + 0.5)) * h];
      }

      function pick(px: number, py: number): number {
        const rect = canvas.getBoundingClientRect();
        let best = -1;
        let bestD = Infinity;
        for (let i = 0; i < n; i++) {
          const p = project(i, rect.width, rect.height);
          if (!p) continue;
          const d = Math.hypot(p[0] - px, p[1] - py);
          const thresh = LANGS[i].n in STACK ? 16 : 11;
          if (d < thresh && d < bestD) {
            bestD = d;
            best = i;
          }
        }
        return best;
      }

      function focusPoint(idx: number) {
        const x = target[idx * 3];
        const y = target[idx * 3 + 1];
        const z = target[idx * 3 + 2];
        rotY = -Math.atan2(x, z);
        const lenXZ = Math.hypot(x, z);
        rotX = Math.max(-1.1, Math.min(1.1, Math.atan2(y, lenXZ) * 0.9));
        velX = 0;
        velY = 0;
      }

      apiRef.current = {
        setMode: (m) => scheduleTransition(m),
        focus: (name) => {
          const idx = LANGS.findIndex((l) => l.n === name);
          if (idx >= 0) {
            selectedIdx = idx;
            setBoost(idx, 1);
            focusPoint(idx);
            setSelected(LANGS[idx]);
            refreshLineAlpha();
          }
        },
        pickAt: (px, py) => {
          const idx = pick(px, py);
          return idx >= 0 ? LANGS[idx] : null;
        },
      };

      function onDown(e: PointerEvent) {
        dragging = true;
        moved = 0;
        lastX = e.clientX;
        lastY = e.clientY;
        canvas.setPointerCapture(e.pointerId);
      }
      function onMove(e: PointerEvent) {
        const rect = canvas.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        if (dragging) {
          const dx = e.clientX - lastX;
          const dy = e.clientY - lastY;
          moved += Math.abs(dx) + Math.abs(dy);
          rotY += dx * 0.005;
          rotX += dy * 0.005;
          rotX = Math.max(-1.3, Math.min(1.3, rotX));
          velY = dx * 0.0006;
          velX = dy * 0.0006;
          lastX = e.clientX;
          lastY = e.clientY;
        } else {
          const idx = pick(px, py);
          if (idx !== hovering) {
            hovering = idx;
            setBoost(idx >= 0 ? idx : selectedIdx, 1);
            refreshLineAlpha();
            canvas.style.cursor = idx >= 0 ? "pointer" : "grab";
          }
        }
      }
      function onUp(e: PointerEvent) {
        if (dragging && moved < 6) {
          // treat as click
          const rect = canvas.getBoundingClientRect();
          const idx = pick(e.clientX - rect.left, e.clientY - rect.top);
          if (idx >= 0) {
            selectedIdx = idx;
            setBoost(idx, 1);
            setSelected(LANGS[idx]);
          } else {
            selectedIdx = -1;
            setBoost(-1, 0);
            setSelected(null);
          }
          refreshLineAlpha();
        }
        dragging = false;
      }
      function onWheel(e: WheelEvent) {
        e.preventDefault();
        // deltaMode 1 = lines (some browsers), normalize to pixels
        const dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
        camTarget = Math.max(
          CAM_MIN,
          Math.min(CAM_MAX, camTarget * Math.exp(dy * 0.0012))
        );
      }
      function wake() {
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          velY = Math.abs(velY) < 0.0004 ? 0.0016 : velY;
        }, 4000);
      }

      if (!decorative) {
        canvas.addEventListener("pointerdown", onDown);
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        canvas.addEventListener("pointerdown", wake);
        canvas.addEventListener("wheel", onWheel, { passive: false });
        canvas.style.cursor = "grab";
        // horizontal swipes rotate the cloud, vertical swipes still scroll the page
        canvas.style.touchAction = "pan-y";
      }

      // decorative (page-background) brains render until the scene settles,
      // then the loop stops: the accepted visual stays as a still, the
      // continuous GPU/CPU cost goes away. Declared before resize() runs.
      let decoSettled = false;
      function resize() {
        const w = wrap.clientWidth;
        const h = wrap.clientHeight;
        renderer.setSize(w, h);
        camera.perspective({ aspect: w / h });
        // the settled still has no loop to repaint after a resize
        if (decoSettled) renderer.render({ scene, camera });
      }
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(wrap);

      let visible = true;
      const io = new IntersectionObserver(
        (entries) => {
          visible = entries[0]?.isIntersecting ?? true;
        },
        { threshold: 0.05 }
      );
      io.observe(wrap);

      const start = performance.now();
      function frame(now: number) {
        if (!decoSettled) raf = requestAnimationFrame(frame);
        if (!visible) return;
        program.uniforms.uTime.value = (now - start) / 1000;

        // transition
        const k = Math.min(1, (now - t0) / DUR);
        const e = 1 - Math.pow(1 - k, 3);
        if (k < 1) {
          for (let i = 0; i < current.length; i++)
            current[i] = from[i] + (target[i] - from[i]) * e;
          geometry.attributes.position.needsUpdate = true;
          syncLinePositions();
        }
        scaffoldShow += (scaffoldShowTarget - scaffoldShow) * 0.12;
        if (scaffoldProg) scaffoldProg.uniforms.uAlpha.value = 0.45 * scaffoldShow;

        // rotation
        if (!dragging) {
          rotY += velY;
          rotX += velX;
          velX *= 0.96;
          // ease back toward idle spin
          if (Math.abs(velY) > 0.0016) velY *= 0.985;
          rotX = Math.max(-1.3, Math.min(1.3, rotX));
          // during a layout transition, ease tilt back to neutral so the
          // cloud re-centers after a search-focus changed the camera
          if (k < 1) rotX = rotXFrom + (DEFAULT_ROT_X - rotXFrom) * e;
        }
        scene.rotation.y = rotY;
        scene.rotation.x = rotX;

        // zoom easing
        if (Math.abs(camTarget - camDist) > 0.0005) {
          camDist += (camTarget - camDist) * 0.14;
          camera.position.z = camDist;
        }

        // boosts
        let dirty = false;
        for (let i = 0; i < n; i++) {
          const b = boosts[i];
          const bt = boostTarget[i];
          if (Math.abs(b - bt) > 0.01) {
            boosts[i] = b + (bt - b) * 0.18;
            dirty = true;
          }
        }
        if (dirty) geometry.attributes.aBoost.needsUpdate = true;

        renderer.render({ scene, camera });
        if (
          decorative &&
          !decoSettled &&
          scaffoldDone &&
          scaffoldShow > 0.98 &&
          now - start > 1500
        ) {
          decoSettled = true;
        }
      }
      raf = requestAnimationFrame(frame);

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        canvas.removeEventListener("pointerdown", onDown);
        canvas.removeEventListener("wheel", onWheel);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        if (idleTimer) clearTimeout(idleTimer);
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      };
    })();

    return () => {
      destroyed = true;
      cleanup?.();
    };
  }, []);

  const stackNames = Object.keys(STACK);
  const selectedRelated = selected ? (RELATED.get(selected.n) ?? []) : [];

  if (glFailed) {
    if (decorative) return null;
    return (
      <div className="h-full w-full flex flex-wrap items-center justify-center gap-2 p-6">
        {stackNames.map((s) => (
          <span
            key={s}
            className="px-3 py-1 rounded-full border border-[var(--white-icon-tr)] text-[var(--white)] text-sm"
          >
            {s}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden">
      {/* letter-glitch backdrop: the same field as the hero, personal easter
          eggs included, dimmed so nodes, links and the brain mesh stay readable.
          Skipped in decorative mode - the page backdrop provides the letters. */}
      {!decorative && (
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.32]"
          aria-hidden="true"
        >
          <LetterGlitch
            glitchColors={["#5e4491", "#A476FF", "#241a38"]}
            glitchSpeed={33}
            centerVignette={false}
            outerVignette={true}
            smooth={true}
          />
        </div>
      )}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* search */}
      {!decorative && (
      <div className="absolute left-3 top-3 z-10 w-56 max-w-[60vw]">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && suggestions[0]) {
              apiRef.current?.focus(suggestions[0].n);
              setQuery("");
            }
          }}
          placeholder="Find a language"
          aria-label="Find a language in the 3D space"
          className="w-full rounded-full bg-[#ffffff10] border border-[var(--white-icon-tr)] px-4 py-2 text-sm text-[var(--white)] placeholder-[var(--white-icon)] outline-none focus:border-[var(--sec)] backdrop-blur-sm"
        />
        {suggestions.length > 0 && (
          <ul className="mt-1 rounded-xl border border-[var(--white-icon-tr)] bg-[#0a1020f0] backdrop-blur-sm overflow-hidden">
            {suggestions.map((l) => (
              <li key={l.n}>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-[var(--white)] hover:bg-[#ffffff12] flex items-center gap-2"
                  onClick={() => {
                    apiRef.current?.focus(l.n);
                    setQuery("");
                  }}
                >
                  {l.n}
                  {l.n in STACK && (
                    <span
                      className="ml-auto h-2 w-2 rounded-full"
                      style={{ backgroundColor: ACCENT }}
                      aria-label="In Stefan's stack"
                    />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      )}

      {/* info card */}
      {!decorative && selected && (
        <div className="absolute bottom-16 left-1/2 z-10 -translate-x-1/2 w-[min(92%,380px)] rounded-2xl border border-[var(--white-icon-tr)] bg-[#0a1020f2] backdrop-blur-sm p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[var(--white)] font-semibold text-base">
                {selected.n}
                {selected.n in STACK && (
                  <span
                    className="ml-2 align-middle rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    style={{ backgroundColor: ACCENT, color: "#050816" }}
                  >
                    Stefan's stack
                  </span>
                )}
              </div>
              <div className="text-[var(--white-icon)] text-xs mt-1">
                {selected.k && KIND_LABELS[selected.k]
                  ? `${KIND_LABELS[selected.k]} · ${DOMAIN_LABELS[selected.d] ?? selected.d}`
                  : `${DOMAIN_LABELS[selected.d] ?? selected.d} · ${FAMILY_LABELS[selected.f] ?? selected.f}`}
              </div>
              {STACK[selected.n] && (
                <div className="text-[var(--white)] text-sm mt-2">
                  {STACK[selected.n]}
                </div>
              )}
              {selectedRelated.length > 0 && (
                <div className="mt-2 text-xs leading-6">
                  <span className="text-[var(--white-icon)]">
                    Related:{" "}
                  </span>
                  {selectedRelated.map((name) => (
                    <button
                      key={name}
                      onClick={() => apiRef.current?.focus(name)}
                      className="mr-1.5 rounded-full border border-[var(--white-icon-tr)] px-2 py-0.5 text-[var(--white)] hover:border-[var(--sec)] hover:text-[var(--sec)] transition-colors"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setSelected(null)}
              aria-label="Close details"
              className="text-[var(--white-icon)] hover:text-[var(--white)] text-lg leading-none px-1"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* mode tabs */}
      {!decorative && (
      <div className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 flex rounded-full border border-[var(--white-icon-tr)] bg-[#ffffff10] backdrop-blur-sm overflow-x-auto max-w-[92%]">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`px-4 py-2 text-xs whitespace-nowrap transition-colors ${
              mode === m.id
                ? "bg-[var(--sec)] text-[#050816] font-semibold"
                : "text-[var(--white)] hover:bg-[#ffffff14]"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      )}

      {/* grouping honesty note */}
      {!decorative && (
        <div className="absolute bottom-14 right-3 z-10 hidden md:block text-right text-[10px] text-[var(--white-icon)] opacity-80">
          domains &amp; families are editorial groupings · lines show documented
          influence
        </div>
      )}

      {/* legend */}
      {!decorative && (
        <div className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-full bg-[#ffffff10] border border-[var(--white-icon-tr)] px-3 py-1.5 backdrop-blur-sm">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: ACCENT }}
          />
          <span className="text-[11px] text-[var(--white-icon)]">My stack</span>
        </div>
      )}
    </div>
  );
}
