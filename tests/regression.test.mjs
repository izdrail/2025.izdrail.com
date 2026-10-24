import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("native page pinch-zoom: universe canvas keeps pan-y pinch-zoom", () => {
  const src = read("src/React/LanguageUniverse.tsx");
  assert.match(src, /canvas\.style\.touchAction\s*=\s*"pan-y pinch-zoom"/);
});

test("no global touch-action suppression anywhere in styles or components", () => {
  const out = execSync(
    'grep -rn "touch-action: none\\|touchAction = \\"none\\"" src/ || true',
    { encoding: "utf8" },
  );
  assert.equal(out.trim(), "");
});

test("letter/brain backdrop stays scoped to the language-universe section", () => {
  const out = execSync(
    'grep -rln "PageBackdrop" src/ | sort',
    { encoding: "utf8" },
  ).trim().split("\n").sort();
  assert.deepEqual(out, [
    "src/React/PageBackdrop.tsx",
    "src/components/languageUniverse.astro",
  ]);
});

test("letter-glitch canvas honors prefers-reduced-motion", () => {
  const src = read("src/React/LetterGlitch.tsx");
  assert.match(src, /prefers-reduced-motion:\s*reduce/);
});

test("social/meta assets exist and are wired", () => {
  assert.ok(existsSync(new URL("../public/og-image.png", import.meta.url)));
  assert.ok(existsSync(new URL("../public/apple-touch-icon.png", import.meta.url)));
  assert.match(read("public/robots.txt"), /Sitemap: https:\/\/izdrail\.com\/sitemap\.xml/);
  const layout = read("src/layouts/Layout.astro");
  assert.match(layout, /rel="alternate"[^>]*application\/rss\+xml/);
  assert.match(layout, /name="theme-color"/);
});

test("keyboard access: skip link, main landmark, nav aria-current, mode aria-pressed", () => {
  assert.match(read("src/layouts/Layout.astro"), /Skip to content/);
  assert.match(read("src/pages/index.astro"), /id="main-content"/);
  assert.match(read("src/components/nav.astro"), /aria-current=/);
  const uni = read("src/React/LanguageUniverse.tsx");
  assert.match(uni, /aria-pressed=\{mode === m\.id\}/);
});

test("3D scene respects prefers-reduced-motion", () => {
  const src = read("src/React/LanguageUniverse.tsx");
  assert.match(src, /prefers-reduced-motion:\s*reduce/);
  assert.match(src, /const k = reducedMotion \? 1 :/);
});

test("3D scene is keyboard operable without trapping page keys", () => {
  const src = read("src/React/LanguageUniverse.tsx");
  assert.match(src, /tabIndex=\{decorative \? undefined : 0\}/);
  assert.match(src, /onKeyDown=/);
  assert.match(src, /nudge:/);
});

test("skip link target can actually receive focus", () => {
  for (const page of [
    "src/pages/index.astro",
    "src/pages/chat.astro",
    "src/pages/404.astro",
    "src/pages/privacy.astro",
    "src/pages/terms.astro",
    "src/pages/blog/index.astro",
    "src/pages/blog/[...slug].astro",
  ]) {
    assert.match(read(page), /id="main-content" tabindex="-1"/, page);
  }
});

test("chat buttons get a visible keyboard focus ring", () => {
  assert.match(
    read("src/styles/chat.css"),
    /button:focus-visible[\s\S]*outline: 2px solid var\(--chat-sec\)/,
  );
});

test("smooth-scroll hijack does not swallow the skip link", () => {
  assert.match(
    read("src/components/nav.astro"),
    /a\[href\^="#":\]:not\(\[href="#main-content"\]\)/.source
      ? /:not\(\[href="#main-content"\]\)/ : /never/,
  );
});

test("blog sitemap excludes drafts by construction", () => {
  const sm = read("src/pages/sitemap.xml.ts");
  assert.match(sm, /!data\.draft/);
  const rss = read("src/pages/rss.xml.ts");
  assert.match(rss, /!data\.draft/);
});

test("every keyboard-focusable element gets a visible focus ring by default", () => {
  const layout = read("src/layouts/Layout.astro");
  assert.match(
    layout,
    /a:focus-visible,[\s\S]*button:focus-visible[\s\S]*outline:\s*2px solid var\(--sec\)/,
  );
});

test("Escape closes the language detail card", () => {
  const src = read("src/React/LanguageUniverse.tsx");
  assert.match(src, /e\.key === "Escape"\) setSelected\(null\)/);
});
