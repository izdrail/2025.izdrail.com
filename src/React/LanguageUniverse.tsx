import { useEffect, useRef, useState, useMemo } from "react";
import data from "../data/languages.json";

type Lang = { n: string; c: string | null; d: string; f: string };
type Mode = "domain" | "family";

const LANGS = data.languages as Lang[];
const DOMAIN_LABELS = data.domains as Record<string, string>;
const FAMILY_LABELS = data.families as Record<string, string>;
const STACK = data.stack as Record<string, string>;

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
      const rad = 5.6 + (rnd() - 0.5) * 0.9;
      pos[i * 3] = Math.cos(ang) * rad;
      pos[i * 3 + 1] = 6.5 - t * 13;
      pos[i * 3 + 2] = Math.sin(ang) * rad;
    }
    return pos;
  }
  const keyOf = (l: Lang) => (mode === "domain" ? l.d : l.f);
  const keys = Array.from(new Set(LANGS.map(keyOf)));
  const counts = new Map<string, number>();
  for (const l of LANGS) counts.set(keyOf(l), (counts.get(keyOf(l)) || 0) + 1);
  const centers = clusterCenters(keys, mode === "domain" ? 6.4 : 5.0);
  LANGS.forEach((l, i) => {
    const k = keyOf(l);
    const c = centers.get(k)!;
    const rnd = mulberry32(hashStr(l.n + k));
    // gaussian-ish jitter in a ball, cluster radius scales with its size
    const count = counts.get(k) || 1;
    const spread = Math.min(2.6, 0.9 + Math.sqrt(count) * 0.28);
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
  gl_PointSize = s * uPR * (170.0 / max(0.1, -mv.z));
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
  float core = smoothstep(0.5, 0.08, d);
  float glow = smoothstep(0.5, 0.18, d) * 0.35;
  float a = core + glow * (0.35 + vBoost);
  if (a < 0.02) discard;
  vec3 col = mix(vColor, vec3(1.0), vBoost * core * 0.65);
  gl_FragColor = vec4(col, a);
}
`;

const MODES: { id: Mode | "az"; label: string }[] = [
  { id: "domain", label: "By domain" },
  { id: "family", label: "By paradigm" },
  { id: "az", label: "A-Z" },
];

export default function LanguageUniverse() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<Mode | "az">("domain");
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
      const { Renderer, Camera, Transform, Program, Mesh, Geometry } = await import(
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
      camera.position.set(0, 0, 17);
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
        sizes[i] = isStack ? 3.4 : 1.5 + rnd() * 0.9;
        phases[i] = rnd() * Math.PI * 2;
      });

      const startPos = computePositions("domain");
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

      // layout transitions (CPU lerp)
      let from = Float32Array.from(startPos);
      let target = Float32Array.from(startPos);
      let t0 = performance.now();
      const DUR = 900;
      const current = geometry.attributes.position.data as Float32Array;

      // rotation state
      let rotX = -0.15;
      let rotY = 0.6;
      let velX = 0;
      let velY = 0.0016; // idle spin
      let dragging = false;
      let lastX = 0;
      let lastY = 0;
      let moved = 0;
      let idleTimer: ReturnType<typeof setTimeout> | null = null;
      let hovering = -1;
      let selectedIdx = -1;

      const boostTarget = new Float32Array(n);

      function setBoost(idx: number, v: number) {
        for (let i = 0; i < n; i++) boostTarget[i] = i === idx ? v : 0;
      }

      function scheduleTransition(m: Mode | "az") {
        from = Float32Array.from(current);
        target = computePositions(m);
        t0 = performance.now();
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
        const zv = z2 - 17; // camera at z=17
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
        }
        dragging = false;
      }
      function wake() {
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          velY = Math.abs(velY) < 0.0004 ? 0.0016 : velY;
        }, 4000);
      }

      canvas.addEventListener("pointerdown", onDown);
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      canvas.addEventListener("pointerdown", wake);
      canvas.style.cursor = "grab";
      // horizontal swipes rotate the cloud, vertical swipes still scroll the page
      canvas.style.touchAction = "pan-y";

      function resize() {
        const w = wrap.clientWidth;
        const h = wrap.clientHeight;
        renderer.setSize(w, h);
        camera.perspective({ aspect: w / h });
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
        raf = requestAnimationFrame(frame);
        if (!visible) return;
        program.uniforms.uTime.value = (now - start) / 1000;

        // transition
        const k = Math.min(1, (now - t0) / DUR);
        const e = 1 - Math.pow(1 - k, 3);
        if (k < 1) {
          for (let i = 0; i < current.length; i++)
            current[i] = from[i] + (target[i] - from[i]) * e;
          geometry.attributes.position.needsUpdate = true;
        }

        // rotation
        if (!dragging) {
          rotY += velY;
          rotX += velX;
          velX *= 0.96;
          // ease back toward idle spin
          if (Math.abs(velY) > 0.0016) velY *= 0.985;
          rotX = Math.max(-1.3, Math.min(1.3, rotX));
        }
        scene.rotation.y = rotY;
        scene.rotation.x = rotX;

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
      }
      raf = requestAnimationFrame(frame);

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        canvas.removeEventListener("pointerdown", onDown);
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

  if (glFailed) {
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
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* search */}
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

      {/* info card */}
      {selected && (
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
                {DOMAIN_LABELS[selected.d] ?? selected.d} ·{" "}
                {FAMILY_LABELS[selected.f] ?? selected.f}
              </div>
              {STACK[selected.n] && (
                <div className="text-[var(--white)] text-sm mt-2">
                  {STACK[selected.n]}
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

      {/* legend */}
      <div className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-full bg-[#ffffff10] border border-[var(--white-icon-tr)] px-3 py-1.5 backdrop-blur-sm">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: ACCENT }}
        />
        <span className="text-[11px] text-[var(--white-icon)]">his stack</span>
      </div>
    </div>
  );
}
