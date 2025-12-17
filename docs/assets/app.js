/* Fox Ops Portal — single-file SPA for GitHub Pages (project site friendly) */

const REPO_EDIT_BASE = "https://github.com/Alisia777/Four/edit/main/docs/"; // <- сюда “втыкаем” базу редактирования

// Навигация. md — путь относительно /docs/ (т.е. относительно корня GitHub Pages).
const NAV = [
  {
    section: "Оргструктура",
    items: [
      { id: "org-structure", title: "Дерево / структура", md: "content/org-structure.md" },
      { id: "base-rules", title: "Базовые правила", md: "content/base-rules.md" },
      { id: "raci", title: "RACI", md: "content/raci.md" },
    ],
  },
  {
    section: "Должностные инструкции",
    items: [
      { id: "operdir", title: "Опердир (COO)", md: "content/roles/operdir.md", files: [{ name: "operdir.docx", path: "assets/files/operdir.docx" }] },
      { id: "rop", title: "РОП", md: "content/roles/rop.md", files: [{ name: "rop.docx", path: "assets/files/rop.docx" }] },
      { id: "productolog", title: "Продуктолог", md: "content/roles/productolog.md", files: [{ name: "productolog.docx", path: "assets/files/productolog.docx" }] },
      { id: "zakup", title: "Закупщик", md: "content/roles/zakup.md", files: [{ name: "zakup.docx", path: "assets/files/zakup.docx" }] },
      { id: "moisklad", title: "ОМ МойСклад", md: "content/roles/moisklad.md", files: [{ name: "moisklad.docx", path: "assets/files/moisklad.docx" }] },
      { id: "finance", title: "Финансист", md: "content/roles/finance.md", files: [{ name: "finance.docx", path: "assets/files/finance.docx" }] },
      { id: "assistant", title: "Ассистент", md: "content/roles/assistant.md", files: [{ name: "assistant.docx", path: "assets/files/assistant.docx" }] },
    ],
  },
  {
    section: "Отчёты",
    items: [
      { id: "rep-daily-wb", title: "Daily WB", md: "content/reports/daily-wb.md", files: [{ name: "report_templates.docx", path: "assets/files/report_templates.docx" }] },
      { id: "rep-weekly-wb", title: "Weekly WB", md: "content/reports/weekly-wb.md", files: [{ name: "report_templates.docx", path: "assets/files/report_templates.docx" }] },
      { id: "rep-weekly-zakup", title: "Weekly закуп", md: "content/reports/weekly-zakup.md", files: [{ name: "report_templates.docx", path: "assets/files/report_templates.docx" }] },
      { id: "rep-weekly-ms", title: "Weekly МойСклад", md: "content/reports/weekly-ms.md", files: [{ name: "report_templates.docx", path: "assets/files/report_templates.docx" }] },
      { id: "rep-weekly-fin", title: "Weekly финансы", md: "content/reports/weekly-fin.md", files: [{ name: "report_templates.docx", path: "assets/files/report_templates.docx" }] },
      { id: "rep-monthly-fin", title: "Monthly финансы", md: "content/reports/monthly-fin.md", files: [{ name: "report_templates.docx", path: "assets/files/report_templates.docx" }] },
    ],
  },
];

const els = {
  nav: document.getElementById("nav"),
  content: document.getElementById("content"),
  title: document.getElementById("pageTitle"),
  crumbs: document.getElementById("breadcrumbs"),
  search: document.getElementById("search"),
  btnRefresh: document.getElementById("btnRefresh"),
  btnCopy: document.getElementById("btnCopy"),
  btnEdit: document.getElementById("btnEdit"),
  rightFiles: document.getElementById("rightFiles"),
  updatedAt: document.getElementById("updatedAt"),
};

const BASE_URL = (() => {
  // GitHub Pages: /repo/...
  const parts = location.pathname.split("/").filter(Boolean);
  if (parts.length === 0) return "/";
  return "/" + parts[0] + "/";
})();

function normalizeSiteUrl(url) {
  // make absolute URL respecting GitHub Pages base path
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return BASE_URL.replace(/\/$/, "") + url;
  return BASE_URL + url;
}

function buildRoute(path) {
  return BASE_URL.replace(/\/$/, "") + (path.startsWith("/") ? path : "/" + path);
}

function setHash(id) {
  history.pushState({}, "", buildRoute(id));
}

function getCurrentId() {
  const p = location.pathname.replace(BASE_URL, "");
  const id = p.replace(/^\/+|\/+$/g, "");
  return id || "org-structure";
}

function findPage(id) {
  for (const section of NAV) {
    for (const item of section.items) {
      if (item.id === id) return { ...item, section: section.section };
    }
  }
  return null;
}

function flattenNav() {
  const out = [];
  for (const section of NAV) for (const item of section.items) out.push({ ...item, section: section.section });
  return out;
}

function escapeHtml(s) {
  return (String(s))
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Content hotfixes (no need to edit markdown files for small policy tweaks)
function applyContentPatches(pageId, md) {
  if (!md) return md;

  // Update decision thresholds (Damir's rule)
  if (pageId === "base-rules") {
    const replacement =
      [
        "- **Цена:** если изменение делает цену **ниже плановой** и/или **ухудшает маржу относительно плана** — **согласовываем с Опердиром (COO)**.",
        "- **Цена:** если цена становится **выше плановой** — **не согласовываем**, решение на усмотрение менеджера (в рамках стратегии/ограничений площадки).",
        "- **Реклама / закупки:** любые изменения, которые **выходят за бюджет/план** или **ухудшают плановую маржу** — через согласование с Опердиром (COO). В рамках плана — решение менеджера.",
      ].join("\n");

    // Preferred: replace existing bullet
    const re = /- Любые изменения цен\s*\/\s*рекламы\s*\/\s*закупок\s*—\s*через согласование с Опердиром\s*\(COO\)\./i;
    if (re.test(md)) {
      md = md.replace(re, replacement);
    } else {
      // Fallback: inject under the section
      const head = /##\s+Как мы принимаем решения\s*\n/i;
      if (head.test(md) && !md.includes("**Цена:** если изменение делает цену")) {
        md = md.replace(head, (m) => m + "\n" + replacement + "\n\n");
      }
    }
  }

  return md;
}

let mermaidInitialized = false;
function ensureMermaid() {
  if (mermaidInitialized) return;
  if (!window.mermaid) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: "dark",
    securityLevel: "strict",
  });
  mermaidInitialized = true;
}

async function renderMermaid() {
  if (!window.mermaid) return;
  ensureMermaid();
  const blocks = Array.from(document.querySelectorAll(".mermaid"));
  if (!blocks.length) return;

  for (const block of blocks) {
    const src = block.textContent.trim();
    if (!src) continue;

    try {
      const id = "m" + Math.random().toString(36).slice(2);
      const out = mermaid.render(id, src);

      if (out && typeof out.then === "function") {
        const { svg, bindFunctions } = await out;
        block.innerHTML = svg;
        if (typeof bindFunctions === "function") bindFunctions(block);
      } else if (typeof out === "string") {
        block.innerHTML = out;
      } else if (out && typeof out === "object" && out.svg) {
        block.innerHTML = out.svg;
        if (typeof out.bindFunctions === "function") out.bindFunctions(block);
      } else {
        // last resort: keep source text visible
        block.textContent = src;
      }
    } catch (e) {
      console.warn("Mermaid render error:", e);
      block.textContent = src;
    }
  }
}

function setupMarked() {
  if (!window.marked) return;

  const renderer = new marked.Renderer();

  renderer.code = (code, infostring) => {
    // marked v12 passes a token object, older versions pass a string
    let codeStr = code;
    let langStr = infostring;

    if (code && typeof code === "object") {
      codeStr = code.text ?? "";
      langStr = code.lang ?? langStr ?? "";
    }

    const lang = (langStr || "").toLowerCase().trim();
    if (lang === "mermaid") {
      return `<pre class="mermaid">${escapeHtml(codeStr || "")}</pre>`;
    }

    const klass = lang ? `language-${escapeHtml(lang)}` : "";
    return `<pre class="code-block"><code class="${klass}">${escapeHtml(codeStr || "")}</code></pre>`;
  };

  marked.setOptions({
    gfm: true,
    breaks: true,
    renderer,
  });
}

function setRightFiles(page) {
  const lines = [];
  lines.push(`<div class="rf-title">Файлы</div>`);
  lines.push(`<div class="rf-muted">Markdown: <code>${escapeHtml(page.md)}</code></div>`);
  if (page.files?.length) {
    lines.push(`<div class="rf-list">`);
    for (const f of page.files) {
      const url = normalizeSiteUrl(f.path);
      const cacheBustUrl = url + (url.includes("?") ? "&" : "?") + "v=" + Date.now();
      lines.push(
        `<a class="rf-item" href="${cacheBustUrl}" target="_blank" rel="noopener" download>
          <span class="rf-dot"></span>
          <span class="rf-name">${escapeHtml(f.name)}</span>
        </a>`
      );
    }
    lines.push(`</div>`);
  } else {
    lines.push(`<div class="rf-muted">Нет прикреплённых файлов.</div>`);
    lines.push(`<div class="rf-muted" style="margin-top:8px;">Добавь в <code>app.js</code> → <code>files:</code> или положи файл в <code>docs/assets/files/</code></div>`);
  }

  els.rightFiles.innerHTML = lines.join("\n");
}

function renderNav(filterText) {
  const q = (filterText || "").trim().toLowerCase();
  const current = getCurrentId();

  const html = [];
  for (const section of NAV) {
    const items = section.items.filter((it) => !q || it.title.toLowerCase().includes(q) || it.section?.toLowerCase?.().includes(q));
    if (!items.length) continue;

    html.push(`<div class="nav-section">${escapeHtml(section.section)}</div>`);
    for (const it of items) {
      const active = it.id === current ? "active" : "";
      html.push(
        `<a class="nav-item ${active}" href="${buildRoute(it.id)}" data-id="${escapeHtml(it.id)}">
          ${escapeHtml(it.title)}
        </a>`
      );
    }
  }
  els.nav.innerHTML = html.join("\n");
}

function renderBreadcrumbs(page) {
  const parts = [];
  parts.push(`<span class="crumb">${escapeHtml(page.section || "")}</span>`);
  parts.push(`<span class="crumb-sep">/</span>`);
  parts.push(`<span class="crumb strong">${escapeHtml(page.title)}</span>`);
  els.crumbs.innerHTML = parts.join("");
}

function renderMarkdown(mdText) {
  setupMarked();
  const dirty = marked.parse(mdText || "");
  const clean = window.DOMPurify ? DOMPurify.sanitize(dirty) : dirty;
  els.content.innerHTML = clean;
}

function setUpdatedAt() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  els.updatedAt.textContent = `Обновлено: ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function setEditLink(page) {
  // Link to Markdown file editor in GitHub
  const url = REPO_EDIT_BASE + page.md;
  els.btnEdit.href = url;
}

async function loadPageById(id) {
  const page = findPage(id) || findPage("org-structure");
  if (!page) return;

  // header + side
  els.title.textContent = page.title;
  renderBreadcrumbs(page);
  setRightFiles(page);
  setEditLink(page);

  try {
    const res = await fetch(normalizeSiteUrl(page.md) + (page.md.includes("?") ? "&" : "?") + "v=" + Date.now(), { cache: "no-store" });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const raw = await res.text();
    const patched = applyContentPatches(page.id, raw);
    renderMarkdown(patched);
    await renderMermaid();
  } catch (e) {
    console.error(e);
    els.content.innerHTML = `<div class="error-box">
      <div class="error-title">Не удалось загрузить страницу</div>
      <div class="error-muted">${escapeHtml(String(e))}</div>
      <div class="error-muted" style="margin-top:10px;">Проверь, что файл существует: <code>${escapeHtml(page.md)}</code></div>
    </div>`;
  }

  // refresh active state in nav
  renderNav(els.search.value || "");
  setUpdatedAt();
}

function onRouteChange() {
  const id = getCurrentId();
  loadPageById(id);
}

function setupSearch() {
  els.search.addEventListener("input", (e) => {
    renderNav(e.target.value || "");
  });
}

function setupNavClicks() {
  els.nav.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-id]");
    if (!a) return;
    e.preventDefault();
    const id = a.getAttribute("data-id");
    if (!id) return;
    setHash(id);
    loadPageById(id);
  });
}

function setupButtons() {
  els.btnRefresh.addEventListener("click", () => {
    loadPageById(getCurrentId());
  });

  els.btnCopy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      els.btnCopy.textContent = "Ссылка скопирована";
      setTimeout(() => (els.btnCopy.textContent = "Скопировать ссылку"), 900);
    } catch (e) {
      alert("Не удалось скопировать ссылку :(");
    }
  });
}

// Fix missing logo file (fox-avatar.png might not exist in repo)
function fixLogos() {
  const fallback = normalizeSiteUrl("assets/img/fox.png");

  const logos = Array.from(document.querySelectorAll("img.app-logo"));
  for (const img of logos) {
    img.addEventListener("error", () => {
      img.src = fallback;
    });
    // If template uses missing file name, swap immediately
    if (img.getAttribute("src")?.includes("fox-avatar.png")) {
      img.src = fallback;
    }
  }
}

// Boot
function boot() {
  renderNav("");
  fixLogos();
  setupSearch();
  setupNavClicks();
  setupButtons();
  window.addEventListener("popstate", onRouteChange);

  // initial load
  onRouteChange();
  setUpdatedAt();
}

boot();
