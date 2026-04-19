/**
 * Built-in reference documents auto-installed into docs folders.
 * Files prefixed with "_" are managed by rabit and updated on each run.
 * Based on best practices from Tailwind CSS, Open Props, Material Design,
 * and modern CSS patterns from the community.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ARCHITECT_DOCS_DIR, CODER_DOCS_DIR, ensureDocsDirs } from './docs';

interface BuiltinDoc {
  filename: string;
  content: string;
}

const ARCHITECT_DOCS: BuiltinDoc[] = [
  {
    filename: '_01-layout-guide.md',
    content: `# Layout Guide — MANDATORY RULES

## FORBIDDEN
- position:absolute for positioning normal layout elements
- Tables for layout
- Float for layout
- Fixed width in px for main containers

## MANDATORY — use flexbox or grid

### Navbar
\`\`\`css
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  height: 56px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 50;
}
.nav-links { display: flex; gap: 8px; list-style: none; }
\`\`\`

### Main layout with sidebar
\`\`\`css
.app { display: flex; min-height: 100vh; }
.sidebar { width: 240px; flex-shrink: 0; overflow-y: auto; }
.main-content { flex: 1; min-width: 0; overflow-y: auto; }
@media (max-width: 768px) { .sidebar { display: none; } }
\`\`\`

### Responsive card grid
\`\`\`css
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  padding: 16px;
}
\`\`\`

### Centralized feed (Facebook/Twitter style)
\`\`\`css
.feed-layout {
  display: grid;
  grid-template-columns: 1fr minmax(auto, 680px) 1fr;
  min-height: 100vh;
}
.feed { grid-column: 2; padding: 16px 0; }
\`\`\`

### Center on screen
\`\`\`css
.screen-center { display: flex; justify-content: center; align-items: center; min-height: 100vh; }
\`\`\`

### Side-by-side split
\`\`\`css
.split { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
@media (max-width: 640px) { .split { grid-template-columns: 1fr; } }
\`\`\`
`
  },
  {
    filename: '_02-design-tokens.md',
    content: `# Design Tokens — USE CSS VARIABLES

## How to use: declare in :root and use with var()

### Blue Theme (Facebook/LinkedIn style)
\`\`\`css
:root {
  --primary: #1877f2;
  --primary-hover: #166fe5;
  --primary-light: #e7f3ff;
  --success: #42b72a;
  --danger: #e41e3f;
  --warning: #f7b928;

  --bg: #f0f2f5;
  --surface: #ffffff;
  --surface-2: #f7f8fa;
  --border: #dddfe2;
  --border-light: #e4e6eb;

  --text: #1c1e21;
  --text-secondary: #606770;
  --text-muted: #8a8d91;
  --text-inverse: #ffffff;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;

  --shadow-sm: 0 1px 2px rgba(0,0,0,.08);
  --shadow-md: 0 2px 8px rgba(0,0,0,.12);
  --shadow-lg: 0 4px 20px rgba(0,0,0,.16);

  --space-1: 4px;  --space-2: 8px;  --space-3: 12px;
  --space-4: 16px; --space-5: 20px; --space-6: 24px;
  --space-8: 32px; --space-10: 40px; --space-12: 48px;

  --text-xs: 11px; --text-sm: 13px; --text-base: 15px;
  --text-md: 17px; --text-lg: 20px; --text-xl: 24px;
  --text-2xl: 32px; --text-3xl: 48px;

  --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'Fira Code', 'Cascadia Code', monospace;
}
\`\`\`

### Dark Theme
\`\`\`css
[data-theme="dark"] {
  --bg: #18191a;
  --surface: #242526;
  --surface-2: #3a3b3c;
  --border: #3e4042;
  --text: #e4e6eb;
  --text-secondary: #b0b3b8;
  --text-muted: #6a6d73;
}
\`\`\`

### Green Theme (SaaS/Fintech)
\`\`\`css
:root {
  --primary: #16a34a;
  --primary-hover: #15803d;
  --primary-light: #dcfce7;
  --bg: #f8fafc;
  --surface: #ffffff;
  --border: #e2e8f0;
  --text: #0f172a;
  --text-secondary: #475569;
}
\`\`\`

### Purple Theme (AI/Creative)
\`\`\`css
:root {
  --primary: #7c3aed;
  --primary-hover: #6d28d9;
  --primary-light: #ede9fe;
  --bg: #0f0a1e;
  --surface: #1a1035;
  --border: #2d1f5e;
  --text: #f5f3ff;
  --text-secondary: #a78bfa;
}
\`\`\`
`
  },
  {
    filename: '_03-component-library.md',
    content: `# HTML+CSS Component Library

## MANDATORY RESET (always at the top of the main CSS)
\`\`\`css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-size: 16px; scroll-behavior: smooth; }
body { font-family: var(--font, sans-serif); background: var(--bg); color: var(--text); line-height: 1.5; }
img, video { max-width: 100%; height: auto; display: block; }
button { cursor: pointer; border: none; background: none; font: inherit; }
a { color: inherit; text-decoration: none; }
input, textarea, select { font: inherit; outline: none; }
\`\`\`

## Buttons
\`\`\`css
.btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 16px; border-radius: var(--radius-md, 8px);
  font-size: var(--text-base, 15px); font-weight: 600;
  cursor: pointer; border: none; transition: all .15s;
  white-space: nowrap; user-select: none;
}
.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:hover { background: var(--primary-hover); transform: translateY(-1px); }
.btn-secondary { background: var(--surface-2); color: var(--text); }
.btn-secondary:hover { background: var(--border); }
.btn-outline { background: transparent; border: 1.5px solid var(--border); color: var(--text); }
.btn-outline:hover { border-color: var(--primary); color: var(--primary); }
.btn-danger { background: var(--danger); color: #fff; }
.btn-sm { padding: 5px 12px; font-size: var(--text-sm); }
.btn-lg { padding: 12px 24px; font-size: var(--text-md); }
.btn-full { width: 100%; justify-content: center; }
.btn:disabled { opacity: .5; cursor: not-allowed; transform: none; }
\`\`\`

## Inputs and Forms
\`\`\`css
.form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
label { font-size: var(--text-sm); font-weight: 500; color: var(--text-secondary); }
.input {
  width: 100%; padding: 10px 14px;
  border: 1.5px solid var(--border); border-radius: var(--radius-md);
  background: var(--surface); color: var(--text);
  font-size: var(--text-base); transition: border .15s, box-shadow .15s;
}
.input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-light); }
.input.error { border-color: var(--danger); }
.input-hint { font-size: var(--text-xs); color: var(--text-muted); }
.input-error { font-size: var(--text-xs); color: var(--danger); }
\`\`\`

## Cards
\`\`\`css
.card {
  background: var(--surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  overflow: hidden;
  transition: box-shadow .2s, transform .2s;
}
.card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
.card-body { padding: 20px; }
.card-header { padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
.card-footer { padding: 12px 20px; border-top: 1px solid var(--border); background: var(--surface-2); }
\`\`\`

## Avatar
\`\`\`css
.avatar { border-radius: 50%; object-fit: cover; background: var(--primary); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; }
.avatar-sm { width: 32px; height: 32px; font-size: 13px; }
.avatar-md { width: 40px; height: 40px; font-size: 16px; }
.avatar-lg { width: 56px; height: 56px; font-size: 20px; }
.avatar-xl { width: 80px; height: 80px; font-size: 28px; }
\`\`\`

## Badge / Tag
\`\`\`css
.badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: var(--radius-full); font-size: var(--text-xs); font-weight: 600; }
.badge-primary { background: var(--primary-light); color: var(--primary); }
.badge-success { background: #dcfce7; color: #16a34a; }
.badge-danger { background: #fee2e2; color: #dc2626; }
.badge-warning { background: #fef3c7; color: #d97706; }
\`\`\`

## Navbar
\`\`\`html
<nav class="navbar">
  <div class="nav-brand">
    <div class="brand-icon">A</div>
    <span class="brand-name">AppName</span>
  </div>
  <ul class="nav-links">
    <li><a href="/" class="nav-link active">Home</a></li>
    <li><a href="/about" class="nav-link">About</a></li>
  </ul>
  <div class="nav-actions">
    <button class="btn btn-primary btn-sm">Get Started</button>
  </div>
</nav>
\`\`\`
\`\`\`css
.navbar { display:flex; align-items:center; justify-content:space-between; padding:0 24px; height:56px; background:var(--surface); border-bottom:1px solid var(--border); position:sticky; top:0; z-index:50; }
.nav-brand { display:flex; align-items:center; gap:10px; }
.brand-icon { width:32px; height:32px; border-radius:8px; background:var(--primary); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; }
.nav-links { display:flex; gap:4px; list-style:none; }
.nav-link { padding:6px 12px; border-radius:6px; color:var(--text-secondary); font-weight:500; transition:all .15s; }
.nav-link:hover, .nav-link.active { background:var(--surface-2); color:var(--primary); }
\`\`\`

## Post Card (social network)
\`\`\`html
<article class="post-card">
  <div class="post-header">
    <img src="avatar.jpg" class="avatar avatar-md" alt="">
    <div class="post-meta">
      <strong class="post-author">Username</strong>
      <span class="post-time">2h ago</span>
    </div>
    <button class="post-menu-btn">•••</button>
  </div>
  <div class="post-body">
    <p class="post-text">Post content here.</p>
    <img src="media.jpg" class="post-media" alt="">
  </div>
  <div class="post-stats">
    <span>128 likes</span>
    <span>12 comments</span>
  </div>
  <div class="post-actions">
    <button class="action-btn" id="like-btn">👍 Like</button>
    <button class="action-btn">💬 Comment</button>
    <button class="action-btn">↗ Share</button>
  </div>
</article>
\`\`\`
\`\`\`css
.post-card { background:var(--surface); border-radius:var(--radius-lg); border:1px solid var(--border); margin-bottom:12px; overflow:hidden; }
.post-header { display:flex; align-items:center; gap:10px; padding:12px 16px; }
.post-meta { flex:1; }
.post-author { display:block; font-weight:600; font-size:var(--text-base); }
.post-time { font-size:var(--text-xs); color:var(--text-muted); }
.post-menu-btn { padding:4px 8px; border-radius:50%; color:var(--text-muted); }
.post-menu-btn:hover { background:var(--surface-2); }
.post-body { padding:0 16px 12px; }
.post-text { line-height:1.6; margin-bottom:12px; }
.post-media { width:100%; max-height:500px; object-fit:cover; border-radius:var(--radius-md); }
.post-stats { padding:8px 16px; border-top:1px solid var(--border); border-bottom:1px solid var(--border); display:flex; gap:16px; font-size:var(--text-sm); color:var(--text-muted); }
.post-actions { display:flex; padding:4px 8px; }
.action-btn { flex:1; padding:8px; border-radius:var(--radius-md); font-weight:600; font-size:var(--text-sm); color:var(--text-secondary); transition:background .15s; display:flex; align-items:center; justify-content:center; gap:6px; }
.action-btn:hover { background:var(--surface-2); color:var(--text); }
.action-btn.liked { color:var(--primary); }
\`\`\`

## Modal
\`\`\`html
<div class="modal-overlay" id="modal" style="display:none">
  <div class="modal">
    <div class="modal-header">
      <h2 class="modal-title">Title</h2>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body"><!-- content --></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary">Confirm</button>
    </div>
  </div>
</div>
\`\`\`
\`\`\`css
.modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.5); display:flex; justify-content:center; align-items:center; z-index:100; backdrop-filter:blur(2px); }
.modal { background:var(--surface); border-radius:var(--radius-lg); width:min(500px,90vw); box-shadow:var(--shadow-lg); animation:modal-in .2s ease; }
@keyframes modal-in { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:scale(1)} }
.modal-header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid var(--border); }
.modal-title { font-size:var(--text-lg); font-weight:700; }
.modal-close { padding:4px 8px; border-radius:50%; font-size:18px; color:var(--text-muted); }
.modal-close:hover { background:var(--surface-2); }
.modal-body { padding:20px; }
.modal-footer { padding:12px 20px; border-top:1px solid var(--border); display:flex; gap:8px; justify-content:flex-end; }
\`\`\`

## Toast / Notification
\`\`\`css
.toast-container { position:fixed; bottom:24px; right:24px; display:flex; flex-direction:column; gap:8px; z-index:200; }
.toast { display:flex; align-items:center; gap:12px; padding:12px 16px; border-radius:var(--radius-md); background:var(--surface); border:1px solid var(--border); box-shadow:var(--shadow-lg); min-width:280px; animation:toast-in .25s ease; }
@keyframes toast-in { from{opacity:0;transform:translateX(100%)} to{opacity:1;transform:translateX(0)} }
.toast-success { border-left:4px solid var(--success); }
.toast-error { border-left:4px solid var(--danger); }
\`\`\`

## Skeleton Loading
\`\`\`css
.skeleton { background:linear-gradient(90deg,var(--border) 25%,var(--surface-2) 50%,var(--border) 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; border-radius:var(--radius-sm); }
@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
.skeleton-text { height:14px; margin-bottom:8px; border-radius:4px; }
.skeleton-avatar { width:40px; height:40px; border-radius:50%; flex-shrink:0; }
\`\`\`
`
  },
  {
    filename: '_04-aal-reference.md',
    content: `# AAL — AI Architecture Language

When the user provides a .aal file, READ and follow the architecture described in it.
AAL is a text DSL that defines components, connections, and system structure.

## .aal File Structure

\`\`\`
project ProjectName     # optional: diagram name
meta
  target: Python          # target language (hint for code generation)
components                # MANDATORY
  ...
connections               # optional
  ...
\`\`\`

## Block Types (components)

### simple — general processing component
\`\`\`
simple BlockName
  description: What this block does
  input:
    name: type
  output:
    name: type
  state:
    variable: type
\`\`\`

### uml — OOP class
\`\`\`
uml ClassName
  class: Entity  # or Service, Repository
  attributes
    + id: UUID
    - email: string
  methods
    + login(password: string): bool
\`\`\`

### compact — grouped sub-architecture (contains its own components/connections)
\`\`\`
compact ModuleName
  input:
    data: type
  output:
    result: type
  components
    simple SubComponent
      ...
  connections
    [SubComponent] -> [Other]
\`\`\`

### external — imports from external library
\`\`\`
external BlockName from "lib-name"
\`\`\`

## Connections

\`\`\`
connections
  [BlockA] -> [BlockB]                         # basic
  [Source].out:Port -> [Dest].in:Port           # with ports
  [A] -> [B] -> [C]                             # chained
  [A] -> [B]
    type: aggregation   # association|inheritance|composition|aggregation|dependency|realization
    label: uses
\`\`\`

## How to interpret a .aal to generate code

1. Each \`simple\` block = a module/class/function in code
2. \`input/output\` = function parameters and returns
3. \`state\` = instance variables or persistent state
4. \`connections\` = which module calls which, which depends on which
5. \`compact\` = a larger module grouping sub-modules
6. \`uml\` = a class with its attributes and methods
7. Respect structure: if A -> B -> C, implement in the same dependency order
`
  }
];

const CODER_DOCS: BuiltinDoc[] = [
  {
    filename: '_expert-css-patterns.md',
    content: `# Expert CSS Patterns — based on expert-css (github.com/Allyhere/expert-css)

## CUBE CSS — Mandatory Methodology

### C — Composition (high-level layouts)
\`\`\`css
/* Reusable layouts that don't know about internal content */
.cluster { display: flex; flex-wrap: wrap; gap: var(--space-3, 12px); }
.stack { display: flex; flex-direction: column; gap: var(--space-4, 16px); }
.repel { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-3); }
.sidebar-layout { display: flex; flex-wrap: wrap; gap: var(--space-6); }
.sidebar-layout > :first-child { flex-basis: 240px; flex-grow: 1; }
.sidebar-layout > :last-child { flex-basis: 0; flex-grow: 999; min-width: min(50%, 400px); }
.cover { display: flex; flex-direction: column; min-height: 100vh; padding: var(--space-6); }
.cover > * { margin-block: var(--space-4); }
.cover > .cover-center { margin-block: auto; }
.grid-auto { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr)); gap: var(--space-4); }
\`\`\`

### U — Utility (atomic classes)
\`\`\`css
.flex { display: flex; }
.grid { display: grid; }
.block { display: block; }
.hidden { display: none; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
.text-center { text-align: center; }
.text-end { text-align: end; }
.font-bold { font-weight: 700; }
.font-medium { font-weight: 500; }
.truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.break-words { overflow-wrap: break-word; word-break: break-word; }
.w-full { width: 100%; }
.mx-auto { margin-inline: auto; }
.gap-1 { gap: 4px; } .gap-2 { gap: 8px; } .gap-3 { gap: 12px; }
.gap-4 { gap: 16px; } .gap-6 { gap: 24px; } .gap-8 { gap: 32px; }
\`\`\`

### B — Block (scoped components)
\`\`\`css
/* Each component has its own namespace */
.card { }
.card__header { }
.card__body { }
.card__footer { }
/* Avoid deep selectors — max 2 levels */
\`\`\`

### E — Exception (variations with data-attributes)
\`\`\`css
/* Variations via data-attributes, not modifier classes */
.btn[data-variant="primary"] { background: var(--color-brand); color: white; }
.btn[data-variant="outline"] { background: transparent; border: 2px solid currentColor; }
.btn[data-size="sm"] { padding: 4px 10px; font-size: .875rem; }
.btn[data-size="lg"] { padding: 12px 24px; font-size: 1.125rem; }
\`\`\`

## Defensive CSS — always apply

\`\`\`css
/* Images don't overflow the container */
img, video, svg { max-width: 100%; height: auto; display: block; }

/* Long text doesn't break layout */
p, h1, h2, h3, h4, li, td { overflow-wrap: break-word; }

/* Flex children don't overflow */
.flex > * { min-width: 0; }

/* Grid children don't overflow */
.grid > * { min-width: 0; }

/* Never fixed height on text containers */
/* WRONG: .card { height: 200px } */
/* RIGHT: .card { min-height: 200px } */

/* Links and buttons always have visible focus states */
:focus-visible { outline: 2px solid var(--color-brand); outline-offset: 2px; }

/* Remove outline only on mouse, not keyboard */
:focus:not(:focus-visible) { outline: none; }
\`\`\`

## CSS Cascade Layers — organize CSS

\`\`\`css
@layer reset, tokens, base, components, utilities;

@layer reset {
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { font-size: 16px; scroll-behavior: smooth; }
  body { line-height: 1.5; -webkit-font-smoothing: antialiased; }
  img, picture, video, canvas, svg { display: block; max-width: 100%; }
  input, button, textarea, select { font: inherit; }
  p, h1, h2, h3, h4, h5, h6 { overflow-wrap: break-word; }
}

@layer tokens {
  :root {
    --color-brand: #1877f2;
    --color-brand-hover: #166fe5;
    --color-brand-subtle: #e7f3ff;
    --color-bg: #f0f2f5;
    --color-surface: #ffffff;
    --color-surface-2: #f7f8fa;
    --color-border: #dddfe2;
    --color-text: #1c1e21;
    --color-text-2: #606770;
    --color-text-muted: #8a8d91;
    --space-1: .25rem; --space-2: .5rem; --space-3: .75rem;
    --space-4: 1rem; --space-5: 1.25rem; --space-6: 1.5rem;
    --space-8: 2rem; --space-10: 2.5rem; --space-12: 3rem;
    --text-xs: .6875rem; --text-sm: .8125rem; --text-base: .9375rem;
    --text-md: 1.0625rem; --text-lg: 1.25rem; --text-xl: 1.5rem;
    --text-2xl: 2rem; --text-3xl: 3rem;
    --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    --radius-sm: 4px; --radius-md: 8px; --radius-lg: 12px; --radius-full: 9999px;
    --shadow-sm: 0 1px 2px rgba(0,0,0,.06), 0 1px 3px rgba(0,0,0,.1);
    --shadow-md: 0 4px 6px rgba(0,0,0,.07), 0 2px 4px rgba(0,0,0,.06);
    --shadow-lg: 0 10px 15px rgba(0,0,0,.1), 0 4px 6px rgba(0,0,0,.05);
    --transition-fast: 150ms ease;
    --transition-base: 250ms ease;
  }
}
\`\`\`

## Fluid Typography with clamp()

\`\`\`css
/* Fluid scale — grows smoothly between breakpoints */
h1 { font-size: clamp(1.75rem, 5vw, 3rem); }
h2 { font-size: clamp(1.375rem, 3vw, 2rem); }
h3 { font-size: clamp(1.125rem, 2vw, 1.5rem); }
p  { font-size: clamp(.9375rem, 1.5vw, 1.0625rem); }
\`\`\`

## Container Queries — truly responsive components

\`\`\`css
.card-wrapper { container-type: inline-size; container-name: card; }

@container card (min-width: 400px) {
  .card { display: grid; grid-template-columns: 120px 1fr; }
}

@container card (min-width: 600px) {
  .card { grid-template-columns: 200px 1fr; }
}
\`\`\`

## :has() — styling parent based on child

\`\`\`css
/* Card with image has different padding */
.card:has(img) { padding: 0; }
.card:has(img) .card__body { padding: 16px; }

/* Form group with error */
.form-group:has(.error-msg) label { color: var(--color-danger); }
.form-group:has(.error-msg) .input { border-color: var(--color-danger); }

/* Nav with active item */
.nav:has(.nav-link.active) .nav-indicator { opacity: 1; }
\`\`\`

## Animations and prefers-reduced-motion

\`\`\`css
/* Always declare animations with motion reduction */
@media (prefers-reduced-motion: no-preference) {
  .btn { transition: transform var(--transition-fast), box-shadow var(--transition-fast), background var(--transition-fast); }
  .btn:hover { transform: translateY(-1px); }
  .card { transition: box-shadow var(--transition-base), transform var(--transition-base); }
  .card:hover { box-shadow: var(--shadow-lg); transform: translateY(-2px); }
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-in { animation: fade-in var(--transition-base) ease both; }
\`\`\`

## Custom Scrollbar (webkit)

\`\`\`css
* { scrollbar-width: thin; scrollbar-color: var(--color-border) transparent; }
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: var(--radius-full); }
::-webkit-scrollbar-thumb:hover { background: var(--color-text-muted); }
\`\`\`
`
  },
  {
    filename: '_ux-pro-max.md',
    content: `# UI/UX Pro Max — Professional Guidelines

## PRE-DELIVERY CHECKLIST (MANDATORY)
- No emojis as icons — use SVG (Heroicons or Lucide)
- cursor:pointer on ALL clickable elements
- Hover states with smooth transitions (150-300ms)
- Minimum contrast 4.5:1 for main text, 3:1 for secondary
- Visible focus states for keyboard navigation (:focus-visible)
- prefers-reduced-motion respected
- Responsive: 375px, 768px, 1024px, 1440px
- Touch targets minimum 44x44px with 8px of space between them
- No horizontal scroll
- Alt text on all images
- Aria-labels on icons without visible text

## ACCESSIBILITY (CRITICAL)
- Correct headings hierarchy (h1 > h2 > h3, never skip)
- Tabindex only when necessary
- Correct semantic roles (button, nav, main, article)
- Visible labels on all inputs
- Inline error messages near the field with error
- Color indicators must not be the ONLY state indicator

## TYPOGRAPHY
- line-height: 1.5 to 1.75 for text body
- Consistent typographic scale (clamp for fluid)
- Maximum 65-75 characters per line (max-width: 65ch)
- Hierarchy by weight: bold for headings, regular for body
- Never text over image without contrast overlay

## SPACING — 4pt/8pt System
- Base unit: 4px
- Scale: 4, 8, 12, 16, 24, 32, 48, 64, 96px
- Use gap instead of margin between flex/grid items
- Consistent internal padding per component
- Never mix arbitrary spacings (e.g. 7px, 13px)

## ANIMATION AND INTERACTION
- Micro-interactions: 150-300ms
- Page/transition animations: 300-500ms
- Use transform and opacity (not width/height — they cause reflow)
- Immediate visual feedback on every user action (hover, click, focus)
- Loading states on every async operation
- Empty states always handled

## STYLE BY PRODUCT CATEGORY
### SaaS / Tools
- Clean, minimalist, focus on data
- Inter or Geist for typography
- Blue/slate as primary color
- Dashboard with lateral sidebar

### E-commerce
- Large images, prominent CTAs
- Vibrant colors for purchase buttons
- Clear progress in checkout
- Visible reviews/social proof

### Portfolio / Creative
- Expressive typography
- Generous white space
- Creative hover states
- Projects in grid with overlay

### Health / Wellness
- Calm colors (sage, lavender, warm white)
- Humanist typography
- No aggressive elements
- Trust and clarity above all

### Fintech / Banking
- Dark blue, gray, green for success
- No AI purple/pink gradients
- Clear and readable data
- Visually communicated security

## FORMS
- Label always above input (never placeholder as substitute)
- Inline validation (not just on submit)
- Success message after successful submit
- Submit button disabled while processing
- Field with error: red border + descriptive message below

## DARK MODE
- Use CSS variables to toggle (not two separate classes)
- Never use pure black (#000) — use #0f0f0f, #111, #1a1a1a
- Reduced saturation on colors in dark mode
- More subtle shadows in dark (light shadow doesn't work in dark)
- Test contrast in both modes

## VISUAL PERFORMANCE
- Images: width and height defined (prevents layout shift)
- Fonts: font-display: swap
- Skeleton loaders for async content
- CLS (Cumulative Layout Shift) < 0.1
- Lazy loading for images outside viewport

## NAVIGATION
- Mobile bottom nav: maximum 5 items
- Active state clearly indicated
- Breadcrumb in deep hierarchies
- Accessible search (keyboard shortcut /)
- Back always predictable and functional
`
  },
  {
    filename: '_css-rules.md',
    content: `# CSS Rules that Coder MUST ALWAYS follow

## FORBIDDEN
- position:absolute for layout (only for overlays, dropdowns, tooltips)
- inline styles (style="...")
- !important
- Fixed sizes in px for container widths (use %, max-width, flex:1)
- Forgetting CSS reset

## MANDATORY
1. CSS Reset at the beginning of every main .css file
2. CSS Variables in :root (--primary, --bg, --surface, --text, --border)
3. box-sizing: border-box on everything (already included in reset)
4. display:flex or display:grid for ALL layouts
5. Transitions on interactive elements: transition: all .15s
6. cursor:pointer on clickable buttons
7. :hover states on all buttons and links
8. :focus-visible on inputs

## JavaScript — best practices
- Use addEventListener (not inline onclick=)
- Use const/let (never var)
- Async/await for asynchronous operations
- Template literals for strings with variables
- Optional chaining: obj?.prop
- Nullish coalescing: value ?? 'default'

## Semantic HTML Structure
1. Use <header>, <nav>, <main>, <footer>, <section>, <article>, <aside>
2. Correct heading hierarchy (h1-h6)
3. label for all form inputs
4. alt attribute on all images
`
  }
];

export function installBuiltinDocs(): void {
  ensureDocsDirs();
  for (const doc of ARCHITECT_DOCS) {
    const full = path.join(ARCHITECT_DOCS_DIR, doc.filename);
    fs.writeFileSync(full, doc.content, 'utf-8');
  }
  for (const doc of CODER_DOCS) {
    const full = path.join(CODER_DOCS_DIR, doc.filename);
    fs.writeFileSync(full, doc.content, 'utf-8');
  }
}

export function openArchitectureFile(agent: 'architect' | 'coder'): void {
  const dir = agent === 'architect' ? ARCHITECT_DOCS_DIR : CODER_DOCS_DIR;
  const archFile = path.join(dir, 'architecture.md');
  if (!fs.existsSync(archFile)) {
    fs.writeFileSync(archFile, '# Project Architecture\n\nDescribe your project architecture here.\n', 'utf-8');
  }
  const { spawn } = require('child_process');
  const command = process.platform === 'win32' ? 'notepad' : 'xdg-open';
  spawn(command, [archFile], { detached: true, stdio: 'ignore' }).unref();
}
