/* Fox Ops Portal — single-file SPA for GitHub Pages (project Four) */

(function () {
  "use strict";

  // ----------------------------
  // Config
  // ----------------------------
  const REPO_EDIT_BASE = "https://github.com/alisia777/Four/edit/main/docs/";

  const NAV = [
    { id: "org-structure", title: "Дерево / структура", md: "content/org-structure.md", group: "ОРГСТРУКТУРА" },
    { id: "base-rules", title: "Базовые правила", md: "content/base-rules.md", group: "ОРГСТРУКТУРА" },
    { id: "raci", title: "RACI", md: "content/raci.md", group: "RACI" },

    { type: "divider", title: "Должностные инструкции" },

    { id: "coo", title: "Опердир (COO)", md: "content/role-coo.md", group: "ДОЛЖНОСТНЫЕ ИНСТРУКЦИИ" },
    { id: "sales", title: "РОП", md: "content/role-sales.md", group: "ДОЛЖНОСТНЫЕ ИНСТРУКЦИИ" },
    { id: "product", title: "Продуктолог", md: "content/role-product.md", group: "ДОЛЖНОСТНЫЕ ИНСТРУКЦИИ" },
    { id: "proc", title: "Закупщик", md: "content/role-proc.md", group: "ДОЛЖНОСТНЫЕ ИНСТРУКЦИИ" },
    { id: "ms", title: "ОМ МойСклад", md: "content/role-ms.md", group: "ДОЛЖНОСТНЫЕ ИНСТРУКЦИИ" },
    { id: "fin", title: "Финансист", md: "content/role-fin.md", group: "ДОЛЖНОСТНЫЕ ИНСТРУКЦИИ" },
    { id: "assistant", title: "Ассистент", md: "content/role-assistant.md", group: "ДОЛЖНОСТНЫЕ ИНСТРУКЦИИ" },

    { type: "divider", title: "Отчёты" },
    { id: "daily-wb", title: "Daily WB", md: "content/rep-daily-wb.md", group: "ОТЧЁТЫ" },
    { id: "weekly-wb", title: "Weekly WB", md: "content/rep-weekly-wb.md", group: "ОТЧЁТЫ" },
    { id: "weekly-buy", title: "Weekly закуп", md: "content/rep-weekly-buy.md", group: "ОТЧЁТЫ" },
    { id: "weekly-ms", title: "Weekly МойСклад", md: "content/rep-weekly-ms.md", group: "ОТЧЁТЫ" },
    { id: "weekly-fin", title: "Weekly финансы", md: "content/rep-weekly-fin.md", group: "ОТЧЁТЫ" },
    { id: "monthly-fin", title: "Monthly финансы", md: "content/rep-monthly-fin.md", group: "ОТЧЁТЫ" },
  ];

  // ----------------------------
  // Utilities
  // ----------------------------
  function qs(sel, el) {
    return (el || document).querySelector(sel);
  }
  function qsa(sel, el) {
    return Array.from((el || document).querySelectorAll(sel));
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  }
  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
  function normalizeSiteUrl(path) {
    // Always keep relative for GitHub Pages subpath compatibility
    return path.replace(/^\/+/, "");
  }
  function nowStamp() {
    const d = new Date();
    return d.toLocaleString("ru-RU", { hour12: false });
  }
  function copyToClipboard(text) {
    return navigator.clipboard?.writeText(text).catch(() => {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    });
  }

  // ----------------------------
  // Markdown + Mermaid loaders
  // ----------------------------
  let _markedReady = false;
  let _mermaidReady = false;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load " + src));
      document.head.appendChild(s);
    });
  }

  async function ensureMarkedAndMermaid() {
    if (!_markedReady) {
      // marked
      await loadScript("https://cdn.jsdelivr.net/npm/marked/marked.min.js");
      setupMarked();
      _markedReady = true;
    }
    if (!_mermaidReady) {
      await loadScript("https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js");
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "strict",
        });
      } catch (e) {}
      _mermaidReady = true;
    }
  }

  function escapeHtml(str) {
    return esc(str);
  }

function applyContentPatches(mdPath, mdText){
  // 1) Правки по порогам решений (Дамир): цены ниже плановой (в минус маржу) — согласуем, выше плановой — решение менеджера.
  if (/(^|\/|\\)base-rules\.md$/i.test(mdPath)) {
    mdText = mdText.replace(
      /-\s*Любые изменения\s*\*\*цен\s*\/\s*рекламы\s*\/\s*закупок\*\*\s*—\s*через согласование с Опердиром \(COO\)\.?/i,
      [
        "- **Цены:** если ставим **ниже плановой** (в минус маржу) — **согласовываем с Опердиром (COO)**. Если ставим **выше плановой** — на усмотрение менеджера, **без согласования**.",
        "- **Реклама / закупки:** любые изменения — через согласование с Опердиром (COO)."
      ].join("\n")
    );
  }

  // 2) Защита от случайного [object Object] в контенте (если где-то подставили объект вместо строки)
  mdText = mdText.replace(/\[object Object\]/g, "");

  return mdText;
}

function setupMarked(){
  // Custom renderer: make ```mermaid blocks render as <pre class="mermaid">...</pre>
  const renderer = new marked.Renderer();

  // Marked v4/v5+ compatibility: renderer.code may receive (code, infostring)
  // or a single token object { text, lang, ... }.
  renderer.code = (...args) => {
    let codeText = "";
    let langRaw = "";

    if (args.length === 1 && args[0] && typeof args[0] === "object") {
      // Newer marked: token object
      codeText = String(args[0].text ?? "");
      langRaw = String(args[0].lang ?? "");
    } else {
      // Older marked: (code, infostring)
      codeText = String(args[0] ?? "");
      langRaw = String(args[1] ?? "");
    }

    const lang = (langRaw || "").trim().toLowerCase();

    if (lang === "mermaid") {
      // Keep text as textContent (escape HTML so it stays inert)
      return `<pre class="mermaid">${escapeHtml(codeText)}</pre>`;
    }

    const cls = lang ? ` class="language-${lang}"` : "";
    return `<pre><code${cls}>${escapeHtml(codeText)}</code></pre>`;
  };

  marked.setOptions({
    renderer,
    gfm: true,
    breaks: true,
  });
}

  // ----------------------------
  // Mermaid rendering
  // ----------------------------
  async function renderMermaidIn(container) {
    if (!_mermaidReady) return;

    const blocks = qsa("pre.mermaid", container);

    for (const pre of blocks) {
      const def = pre.textContent.trim();
      if (!def) continue;

      const id = "mmd-" + Math.random().toString(36).slice(2);
      const wrap = document.createElement("div");
      wrap.className = "mermaid-wrap";
      wrap.dataset.mermaid = "1";
      pre.replaceWith(wrap);

      try {
        // Mermaid v10: mermaid.render(id, def) -> { svg, bindFunctions }
        const out = await mermaid.render(id, def);
        const svg = typeof out === "string" ? out : (out && typeof out.svg === "string" ? out.svg : "");
        wrap.innerHTML = svg || `<pre class="error">Mermaid render failed</pre>`;
      } catch (e) {
        wrap.innerHTML = `<pre class="error">${esc(e && e.message ? e.message : e)}</pre>`;
      }
    }
  }

  // ----------------------------
  // UI render
  // ----------------------------
  function buildLayout() {
    document.body.innerHTML = `
      <div class="app">
        <aside class="sidebar">
          <div class="brand">
            <div class="brand-left">
              <div class="fox"></div>
              <div class="brand-txt">
                <div class="title">Fox Ops Portal</div>
                <div class="sub">ДИ • регламенты • отчёты • BI</div>
              </div>
            </div>
          </div>

          <div class="search">
            <input id="search" placeholder="Поиск по разделам и документам..." />
          </div>

          <nav id="nav" class="nav"></nav>
        </aside>

        <main class="main">
          <div class="topbar">
            <div class="crumbs" id="crumbs"></div>
            <div class="top-actions">
              <button class="btn" id="btn-refresh" title="Обновить контент">Обновить</button>
              <button class="btn" id="btn-copylink" title="Скопировать ссылку">Скопировать ссылку</button>
              <a class="btn" id="btn-edit" href="#" target="_blank" rel="noopener">Редактировать на GitHub</a>
            </div>
            <div class="meta">
              <span class="kbd">Ctrl</span> + <span class="kbd">K</span>
              <span class="sep">|</span>
              <span id="updated">Обновлено: —</span>
            </div>
          </div>

          <div class="content-wrap">
            <article class="content" id="content"></article>

            <aside class="files" id="files">
              <div class="files-head">Файлы</div>
              <div class="files-body" id="files-body">
                <div class="files-empty">Нет прикреплённых файлов.</div>
              </div>
              <div class="files-foot">
                <div class="fox-watermark"></div>
              </div>
            </aside>
          </div>

          <footer class="footer">
            <div>© Sunfox • “Лиса-логотип по умолчанию”</div>
          </footer>
        </main>
      </div>
    `;

    injectStyles();
    renderNav();
    wireUI();
  }

  function injectStyles() {
    const css = `
      :root{
        --bg:#0b0c0f;
        --panel:#0f1117;
        --panel2:#10131b;
        --text:#e9ecf3;
        --muted:#a3a9b8;
        --line:rgba(255,255,255,.08);
        --gold:#d1a84b;
        --gold2:#b88a2f;
        --shadow: 0 12px 40px rgba(0,0,0,.55);
        --r:14px;
      }
      *{box-sizing:border-box}
      html,body{height:100%}
      body{
        margin:0;
        font: 14px/1.45 ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
        color:var(--text);
        background:
          radial-gradient(1200px 800px at 15% 10%, rgba(209,168,75,.08), transparent 55%),
          radial-gradient(900px 700px at 85% 0%, rgba(118,171,255,.07), transparent 55%),
          radial-gradient(900px 700px at 55% 100%, rgba(255,120,170,.05), transparent 55%),
          var(--bg);
      }
      a{color:inherit}
      .app{display:flex; height:100vh; width:100vw; overflow:hidden}
      .sidebar{
        width:280px;
        padding:16px;
        border-right:1px solid var(--line);
        background: linear-gradient(180deg, rgba(15,17,23,.96), rgba(9,10,13,.92));
      }
      .brand{
        display:flex;
        align-items:center;
        justify-content:space-between;
        margin-bottom:12px;
      }
      .brand-left{display:flex; align-items:center; gap:10px}
      .fox{
        width:32px;height:32px;border-radius:10px;
        background:
          linear-gradient(135deg, rgba(209,168,75,.9), rgba(209,168,75,.15)),
          url("./img/fox.png") center/cover no-repeat;
        box-shadow: 0 10px 22px rgba(0,0,0,.45);
      }
      .brand-txt .title{font-weight:700; letter-spacing:.2px}
      .brand-txt .sub{color:var(--muted); font-size:12px; margin-top:1px}
      .search input{
        width:100%;
        padding:10px 12px;
        border:1px solid var(--line);
        background:rgba(255,255,255,.03);
        color:var(--text);
        border-radius:12px;
        outline:none;
      }
      .search input:focus{border-color:rgba(209,168,75,.45); box-shadow:0 0 0 4px rgba(209,168,75,.08)}
      .nav{margin-top:14px; overflow:auto; height:calc(100vh - 110px); padding-right:6px}
      .nav::-webkit-scrollbar{width:10px}
      .nav::-webkit-scrollbar-thumb{background:rgba(255,255,255,.06); border-radius:99px}
      .nav-group{margin:14px 0 6px; color:rgba(209,168,75,.85); font-size:11px; letter-spacing:.12em}
      .nav-item{
        display:flex; align-items:center; gap:10px;
        padding:8px 10px;
        border:1px solid transparent;
        border-radius:12px;
        cursor:pointer;
        color:rgba(233,236,243,.92);
        user-select:none;
      }
      .nav-item:hover{background:rgba(255,255,255,.03); border-color:rgba(255,255,255,.06)}
      .nav-item.active{background:rgba(209,168,75,.08); border-color:rgba(209,168,75,.35)}
      .nav-item small{color:var(--muted)}
      .nav-divider{
        margin:12px 0;
        height:1px;
        background:var(--line);
      }
      .main{flex:1; overflow:hidden}
      .topbar{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        padding:14px 18px;
        border-bottom:1px solid var(--line);
        background:rgba(10,11,14,.55);
        backdrop-filter: blur(10px);
      }
      .crumbs{color:var(--muted); font-size:12px}
      .top-actions{display:flex; align-items:center; gap:10px}
      .btn{
        padding:7px 10px;
        border:1px solid rgba(255,255,255,.12);
        background:rgba(255,255,255,.03);
        color:var(--text);
        border-radius:999px;
        cursor:pointer;
        text-decoration:none;
        font-size:12px;
      }
      .btn:hover{border-color:rgba(209,168,75,.35); background:rgba(209,168,75,.06)}
      .meta{color:var(--muted); font-size:12px; white-space:nowrap}
      .kbd{
        display:inline-block;
        padding:2px 6px;
        border:1px solid rgba(255,255,255,.14);
        border-bottom-color:rgba(255,255,255,.08);
        border-radius:7px;
        background:rgba(255,255,255,.03);
        font-size:11px;
      }
      .sep{opacity:.5; margin:0 8px}
      .content-wrap{
        height:calc(100vh - 58px);
        display:flex;
        gap:14px;
        padding:14px 14px 18px;
        overflow:hidden;
      }
      .content{
        flex:1;
        overflow:auto;
        padding:18px 18px 28px;
        border:1px solid var(--line);
        border-radius:18px;
        background:rgba(15,17,23,.64);
        box-shadow: var(--shadow);
        position:relative;
      }
      .content::-webkit-scrollbar{width:10px}
      .content::-webkit-scrollbar-thumb{background:rgba(255,255,255,.06); border-radius:99px}

      .files{
        width:320px;
        border:1px solid var(--line);
        border-radius:18px;
        background:rgba(15,17,23,.64);
        box-shadow: var(--shadow);
        overflow:hidden;
        display:flex;
        flex-direction:column;
      }
      .files-head{
        padding:14px 14px 10px;
        border-bottom:1px solid var(--line);
        font-weight:700;
      }
      .files-body{padding:10px 14px; overflow:auto; flex:1}
      .files-body::-webkit-scrollbar{width:10px}
      .files-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.06); border-radius:99px}
      .files-empty{color:var(--muted); font-size:12px}
      .file-item{
        display:flex; flex-direction:column; gap:2px;
        padding:10px 10px;
        border:1px solid rgba(255,255,255,.08);
        border-radius:14px;
        margin-bottom:10px;
        background:rgba(255,255,255,.02);
      }
      .file-item a{font-weight:650; text-decoration:none}
      .file-item a:hover{color:rgba(209,168,75,.95)}
      .file-item small{color:var(--muted)}
      .files-foot{
        padding:10px 14px 14px;
        border-top:1px solid var(--line);
        position:relative;
      }
      .fox-watermark{
        width:88px;
        height:88px;
        position:absolute;
        right:10px;
        bottom:6px;
        opacity:.22;
        background:url("./img/fox_crown.png") center/contain no-repeat;
        filter: drop-shadow(0 14px 24px rgba(0,0,0,.6));
      }
      .footer{
        position:fixed;
        right:20px;
        bottom:10px;
        color:rgba(255,255,255,.38);
        font-size:11px;
        pointer-events:none;
      }

      /* Markdown styling */
      .content h1{font-size:26px; margin:0 0 10px}
      .content h2{font-size:18px; margin:18px 0 8px}
      .content h3{font-size:15px; margin:14px 0 6px; color:rgba(233,236,243,.95)}
      .content p{margin:8px 0; color:rgba(233,236,243,.92)}
      .content ul{margin:8px 0 8px 18px}
      .content li{margin:4px 0}
      .content code{
        padding:2px 6px;
        background:rgba(255,255,255,.04);
        border:1px solid rgba(255,255,255,.08);
        border-radius:8px;
      }
      .content pre{
        margin:10px 0;
        padding:12px 12px;
        background:rgba(0,0,0,.35);
        border:1px solid rgba(255,255,255,.08);
        border-radius:14px;
        overflow:auto;
      }
      .content pre code{background:transparent; border:none; padding:0}
      .note{
        display:inline-flex;
        align-items:center;
        gap:8px;
        color:rgba(209,168,75,.95);
        background:rgba(209,168,75,.08);
        border:1px solid rgba(209,168,75,.35);
        padding:6px 10px;
        border-radius:999px;
        font-size:12px;
        margin-top:8px;
      }
      .hr{height:1px; background:var(--line); margin:14px 0}
      .error{color:#ff9fb8}
      .mermaid-wrap{margin:12px 0; padding:10px; border:1px solid rgba(255,255,255,.08); border-radius:14px; background:rgba(0,0,0,.18); overflow:auto}
      .mermaid-wrap svg{max-width:100%; height:auto}
    `;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  }

  function renderNav() {
    const nav = qs("#nav");
    nav.innerHTML = "";

    let currentGroup = null;

    for (const item of NAV) {
      if (item.type === "divider") {
        const div = document.createElement("div");
        div.className = "nav-divider";
        nav.appendChild(div);
        const g = document.createElement("div");
        g.className = "nav-group";
        g.textContent = item.title.toUpperCase();
        nav.appendChild(g);
        currentGroup = item.title;
        continue;
      }

      if (item.group && item.group !== currentGroup) {
        // group heading
        const g = document.createElement("div");
        g.className = "nav-group";
        g.textContent = item.group.toUpperCase();
        nav.appendChild(g);
        currentGroup = item.group;
      }

      const a = document.createElement("div");
      a.className = "nav-item";
      a.dataset.id = item.id;
      a.innerHTML = `<span>${esc(item.title)}</span>`;
      a.addEventListener("click", () => {
        location.hash = "#/" + item.id;
      });
      nav.appendChild(a);
    }

    highlightActiveNav();
  }

  function highlightActiveNav() {
    const id = getRouteId();
    qsa(".nav-item").forEach((el) => el.classList.toggle("active", el.dataset.id === id));
  }

  function wireUI() {
    const search = qs("#search");
    search.addEventListener("input", () => {
      const q = search.value.trim().toLowerCase();
      qsa(".nav-item").forEach((el) => {
        const txt = el.textContent.trim().toLowerCase();
        el.style.display = !q || txt.includes(q) ? "" : "none";
      });
      qsa(".nav-group, .nav-divider").forEach((el) => (el.style.display = q ? "none" : ""));
    });

    qs("#btn-refresh").addEventListener("click", () => {
      // Force reload current route
      loadRoute(true);
    });

    qs("#btn-copylink").addEventListener("click", async () => {
      await copyToClipboard(location.href);
      toast("Ссылка скопирована");
    });

    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        qs("#search").focus();
      }
    });

    window.addEventListener("hashchange", () => {
      highlightActiveNav();
      loadRoute();
    });
  }

  function toast(msg) {
    const t = document.createElement("div");
    t.style.position = "fixed";
    t.style.right = "18px";
    t.style.top = "16px";
    t.style.padding = "10px 12px";
    t.style.borderRadius = "12px";
    t.style.background = "rgba(15,17,23,.92)";
    t.style.border = "1px solid rgba(209,168,75,.35)";
    t.style.boxShadow = "0 16px 40px rgba(0,0,0,.55)";
    t.style.color = "rgba(233,236,243,.95)";
    t.style.zIndex = "9999";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1600);
  }

  // ----------------------------
  // Routing + content
  // ----------------------------
  function getRouteId() {
    const h = (location.hash || "").replace(/^#\/?/, "");
    const id = h || NAV.find((x) => x.id)?.id || "org-structure";
    return id;
  }

  function getNavItem(id) {
    return NAV.find((x) => x.id === id);
  }

  function setCrumbs(item) {
    const crumbs = qs("#crumbs");
    const group = item.group ? esc(item.group) : "";
    crumbs.textContent = group ? `${group} / ${item.title}` : item.title;
  }

  function setEditLink(item) {
    const a = qs("#btn-edit");
    a.href = REPO_EDIT_BASE + normalizeSiteUrl(item.md);
  }

  function setUpdated() {
    qs("#updated").textContent = "Обновлено: " + nowStamp();
  }

  function renderFilesPanel(item) {
    const body = qs("#files-body");
    body.innerHTML = "";

    // Convention: if content markdown has an HTML comment block:
    // <!-- FILES: path1|Title 1 ; path2|Title 2 -->
    // We'll read it after markdown is fetched; for now, empty.
    body.innerHTML = `<div class="files-empty">Нет прикреплённых файлов.</div>`;
  }

  function readFilesDirective(mdText) {
    const m = mdText.match(/<!--\s*FILES:\s*([\s\S]*?)-->/i);
    if (!m) return [];
    const raw = m[1].trim();
    if (!raw) return [];
    // split by ; or newline
    const parts = raw.split(/;|\n/).map((s) => s.trim()).filter(Boolean);
    const out = [];
    for (const p of parts) {
      const [path, title] = p.split("|").map((s) => (s || "").trim());
      if (!path) continue;
      out.push({
        path,
        title: title || path.split("/").pop(),
      });
    }
    return out;
  }

  function renderFiles(files) {
    const body = qs("#files-body");
    body.innerHTML = "";
    if (!files.length) {
      body.innerHTML = `<div class="files-empty">Нет прикреплённых файлов.</div>`;
      return;
    }
    for (const f of files) {
      const path = normalizeSiteUrl(f.path);
      const el = document.createElement("div");
      el.className = "file-item";
      el.innerHTML = `
        <a href="${esc(path)}" target="_blank" rel="noopener">${esc(f.title)}</a>
        <small>${esc(f.path)}</small>
      `;
      body.appendChild(el);
    }
  }

  async function loadRoute(force) {
    const id = getRouteId();
    const item = getNavItem(id) || NAV.find((x) => x.id) || NAV[0];

    setCrumbs(item);
    setEditLink(item);
    setUpdated();
    renderFilesPanel(item);

    const mdPath = normalizeSiteUrl("docs/" + item.md).replace(/^docs\//, "docs/").replace(/^\/+/, "");
    const url = normalizeSiteUrl(item.md);

    const content = qs("#content");
    content.innerHTML = `<div class="note">Правило: задачи — только в трекере, отчёты — по дедлайнам.</div><div class="hr"></div><p style="color:rgba(233,236,243,.6)">Загрузка…</p>`;

    try {
      await ensureMarkedAndMermaid();

      // Fetch markdown
      const res = await fetch(url + (force ? ("?v=" + Date.now()) : ""), { cache: force ? "reload" : "default" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      let text = await res.text();
      text = applyContentPatches(mdPath, text);
      renderMarkdown(text);

      // files directive
      const files = readFilesDirective(text);
      renderFiles(files);

      // Render mermaid
      await renderMermaidIn(content);
    } catch (e) {
      content.innerHTML = `<h2>Ошибка загрузки</h2><pre class="error">${esc(e && e.message ? e.message : e)}</pre>`;
    }
  }

  function renderMarkdown(mdText) {
    const content = qs("#content");

    const html = marked.parse(mdText);
    content.innerHTML = html;

    // minor: external links new tab
    qsa("a", content).forEach((a) => {
      const href = a.getAttribute("href") || "";
      if (/^https?:\/\//i.test(href)) {
        a.target = "_blank";
        a.rel = "noopener";
      }
    });

    // Fix relative image paths (content uses assets/img/..)
    qsa("img", content).forEach((img) => {
      const src = img.getAttribute("src") || "";
      if (src && !/^https?:\/\//i.test(src) && !src.startsWith("data:")) {
        img.src = normalizeSiteUrl(src);
      }
    });
  }

  // ----------------------------
  // Boot
  // ----------------------------
  async function boot() {
    buildLayout();

    if (!location.hash || location.hash === "#") {
      // default route
      location.hash = "#/" + (NAV.find((x) => x.id)?.id || "org-structure");
    }

    highlightActiveNav();
    await loadRoute(false);
  }

  // GitHub Pages: if served from /Four/... and using clean URLs,
  // 404.html will redirect to #/...
  if (!window.location.hash && window.location.pathname.endsWith(".html") === false) {
    // no-op
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
