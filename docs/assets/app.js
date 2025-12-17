/* Fox Ops Portal — single-file SPA for GitHub Pages (project site friendly)
   FIXES:
   - No more [object Object] in code blocks (Marked token/signature changes)
   - Mermaid rendered via DOM post-processing (version-safe)
   - Fallback page if .md is missing (no 404 screen)
   - Base rules decision thresholds patched on the fly (as requested)
*/

const REPO_EDIT_BASE = "https://github.com/Alisia777/Four/edit/main/docs/";

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
      { id: "productolog", title: "Продуктолог", md: "content/roles/productolog.md", files: [{ name: "product.docx", path: "assets/files/product.docx" }] },
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
  page: document.getElementById("page"),
  breadcrumb: document.getElementById("pageBreadcrumb"),
  updatedAt: document.getElementById("updatedAt"),
  mdPath: document.getElementById("mdPath"),
  filesList: document.getElementById("filesList"),
  btnRefresh: document.getElementById("btnRefresh"),
  btnCopyLink: document.getElementById("btnCopyLink"),
  btnEdit: document.getElementById("btnEdit"),
  searchInput: document.getElementById("searchInput"),
};

const ALL_PAGES = NAV.flatMap(s => s.items.map(it => ({ ...it, section: s.section })));

// ---------- utils ----------
function nowStamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function getBasePrefix() {
  // For GitHub Pages project sites: /<repo>/
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts.length === 0) return "/";
  return `/${parts[0]}/`;
}

const BASE_PREFIX = getBasePrefix();

function isExternalUrl(u) {
  return /^https?:\/\//i.test(u) || u.startsWith("mailto:") || u.startsWith("tel:") || u.startsWith("#");
}

function normalizeSiteUrl(u) {
  if (!u) return u;
  if (isExternalUrl(u)) return u;
  if (u.startsWith("//")) return u;
  if (u.startsWith("/")) {
    if (u.startsWith(BASE_PREFIX)) return u;
    return BASE_PREFIX + u.replace(/^\//, "");
  }
  return u;
}

function cacheBust(u) {
  if (!u || isExternalUrl(u)) return u;
  const sep = u.includes("?") ? "&" : "?";
  return `${u}${sep}v=${Date.now()}`;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setHash(id) {
  window.location.hash = `#/${encodeURIComponent(id)}`;
}

function getRouteId() {
  const h = window.location.hash || "";
  const m = h.match(/^#\/([^?]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

async function fetchText(relPath, { bust = false } = {}) {
  const url = normalizeSiteUrl("docs/" + relPath.replace(/^\/+/, ""));
  const finalUrl = bust ? cacheBust(url) : url;
  const res = await fetch(finalUrl, { cache: "no-store" });
  if (!res.ok) {
    const err = new Error(`Не могу загрузить ${relPath} (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return await res.text();
}

// ---------- patches (your requested “пороги решений”) ----------
function applyPatches(mdPath, mdText) {
  if (!mdText) return mdText;

  if (mdPath === "content/base-rules.md") {
    const needle = /- Любые изменения цен\s*\/\s*рекламы\s*\/\s*закупок\s*—\s*через согласование с Опердиром \(COO\)\.\s*/i;

    const replacement =
      [
        "- **Цена:**",
        "  - Если меняем цену **ниже плановой** и это уводит **маржу ниже плановой** — **согласовываем с Опердиром (COO) ДО изменения**.",
        "  - Если цена **выше плановой** — **не согласовываем** (на усмотрение менеджера), при условии что не ломаем оффер/позиционирование и не нарушаем правила площадки.",
        "- **Реклама:**",
        "  - Любое изменение, которое ведёт к **ухудшению маржи/DRR ниже плановых порогов** — согласуем с Опердиром (COO).",
        "  - Оптимизация в рамках плана (снижение ставок/перераспределение бюджета без ухудшения маржи) — на усмотрение менеджера.",
        "- **Закуп / поставки:**",
        "  - Любое увеличение объёма/оплаты **сверх утверждённого плана** — согласуем с Опердиром (COO).",
        "  - Перераспределение внутри уже утверждённого плана — на усмотрение ответственного (с фиксацией в отчёте).",
      ].join("\n");

    if (needle.test(mdText)) {
      mdText = mdText.replace(needle, replacement + "\n");
    } else {
      // если строку не нашли — просто допишем блок в конец секции 2.4 (мягко, без поломок)
      mdText = mdText.replace(
        /(##\s*2\.4\.\s*Как мы принимаем решения[\s\S]*?)(\n##\s|$)/,
        (m, p1, p2) => `${p1}\n\n${replacement}\n${p2 || ""}`
      );
    }
  }

  return mdText;
}

// ---------- markdown rendering ----------
function safeMarkedParse(md) {
  const m = window.marked;
  if (!m) return `<pre><code>${escapeHtml(md)}</code></pre>`;

  // Set options once (safe for different versions)
  try {
    if (typeof m.setOptions === "function") {
      m.setOptions({ mangle: false, headerIds: false, breaks: true });
    }
  } catch (_) {}

  // Try parse APIs
  try {
    if (typeof m.parse === "function") return m.parse(md);
  } catch (e1) {
    // fallback to old callable form
    try {
      if (typeof m === "function") return m(md);
    } catch (_) {}
    throw e1;
  }

  // ultimate fallback
  return `<pre><code>${escapeHtml(md)}</code></pre>`;
}

function sanitizeHtml(html) {
  if (window.DOMPurify && typeof window.DOMPurify.sanitize === "function") {
    // allow basic tags (default), keep it strict
    return window.DOMPurify.sanitize(html);
  }
  return html;
}

function postprocessLinks(container) {
  // fix <a href> and <img src> for project pages base prefix
  container.querySelectorAll("a[href]").forEach(a => {
    const href = a.getAttribute("href");
    const fixed = normalizeSiteUrl(href);
    if (fixed !== href) a.setAttribute("href", fixed);

    if (/^https?:\/\//i.test(fixed)) {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    }
  });

  container.querySelectorAll("img[src]").forEach(img => {
    const src = img.getAttribute("src");
    const fixed = normalizeSiteUrl(src);
    if (fixed !== src) img.setAttribute("src", fixed);
  });
}

function convertMermaidBlocks(container) {
  // Marked usually outputs: <pre><code class="language-mermaid">...</code></pre>
  const codeNodes = Array.from(container.querySelectorAll("pre > code"));
  codeNodes.forEach(code => {
    const cls = (code.className || "").toLowerCase();
    const isMermaid =
      cls.includes("language-mermaid") ||
      cls.includes("lang-mermaid") ||
      cls.includes("mermaid");

    if (!isMermaid) return;

    const text = (code.textContent || "").trim();
    if (!text) return;

    const pre = code.parentElement;
    if (!pre) return;

    // Mermaid prefers <div class="mermaid">...</div>
    const div = document.createElement("div");
    div.className = "mermaid";
    div.textContent = text;

    pre.replaceWith(div);
  });
}

async function renderMermaid(container) {
  if (!window.mermaid) return;

  // Init once
  if (!window.__mermaidInited) {
    try {
      window.mermaid.initialize({
        startOnLoad: false,
        theme: "dark",
        securityLevel: "strict",
      });
      window.__mermaidInited = true;
    } catch (_) {}
  }

  const nodes = Array.from(container.querySelectorAll(".mermaid"));
  if (!nodes.length) return;

  try {
    // Mermaid v10+
    if (typeof window.mermaid.run === "function") {
      await window.mermaid.run({ nodes });
      return;
    }
  } catch (_) {}

  // Mermaid v8/v9 fallback
  try {
    if (typeof window.mermaid.init === "function") {
      window.mermaid.init(undefined, nodes);
    }
  } catch (_) {}
}

async function renderMarkdown(mdText) {
  const rawHtml = safeMarkedParse(mdText || "");
  const cleanHtml = sanitizeHtml(rawHtml);

  els.page.innerHTML = cleanHtml;

  postprocessLinks(els.page);
  convertMermaidBlocks(els.page);
  await renderMermaid(els.page);
}

// ---------- UI ----------
function renderFiles(page) {
  const files = (page.files || []).map(f => ({
    name: f.name,
    url: normalizeSiteUrl("docs/" + f.path.replace(/^\/+/, "")),
  }));

  els.filesList.innerHTML = "";
  if (!files.length) {
    els.filesList.innerHTML = `<div class="files__empty">Нет прикрепленных файлов.</div>`;
    return;
  }

  const ul = document.createElement("ul");
  ul.className = "files__list";

  files.forEach(f => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = f.url;
    a.textContent = f.name;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    li.appendChild(a);
    ul.appendChild(li);
  });

  els.filesList.appendChild(ul);
}

function renderBreadcrumb(page) {
  els.breadcrumb.textContent = `${page.section} → ${page.title}`;
}

function setEditLink(page) {
  const url = REPO_EDIT_BASE + page.md;
  els.btnEdit.onclick = () => window.open(url, "_blank", "noopener,noreferrer");
}

function setCopyLink(page) {
  els.btnCopyLink.onclick = async () => {
    const link = `${window.location.origin}${window.location.pathname}#/${encodeURIComponent(page.id)}`;
    try {
      await navigator.clipboard.writeText(link);
      els.btnCopyLink.textContent = "Ссылка скопирована";
      setTimeout(() => (els.btnCopyLink.textContent = "Скопировать ссылку"), 1200);
    } catch (_) {
      // fallback prompt
      window.prompt("Скопируй ссылку:", link);
    }
  };
}

function setRefresh(page) {
  els.btnRefresh.onclick = () => loadPageById(page.id, { bust: true });
}

function setActiveNav(id) {
  els.nav.querySelectorAll(".nav-link").forEach(a => {
    a.classList.toggle("active", a.dataset.id === id);
  });
}

function renderNav(filterText = "") {
  const q = (filterText || "").trim().toLowerCase();
  els.nav.innerHTML = "";

  NAV.forEach(sec => {
    const section = document.createElement("div");
    section.className = "nav-section";

    const title = document.createElement("div");
    title.className = "nav-title";
    title.textContent = sec.section;
    section.appendChild(title);

    sec.items.forEach(item => {
      const hay = `${item.title} ${sec.section}`.toLowerCase();
      if (q && !hay.includes(q)) return;

      const a = document.createElement("a");
      a.className = "nav-link";
      a.href = `#/${encodeURIComponent(item.id)}`;
      a.dataset.id = item.id;
      a.textContent = item.title;

      a.addEventListener("click", e => {
        e.preventDefault();
        setHash(item.id);
        loadPageById(item.id);
      });

      section.appendChild(a);
    });

    els.nav.appendChild(section);
  });
}

function fallbackMdForMissing(page) {
  const files = (page.files || []);
  const links = files.length
    ? files.map(f => `- [${f.name}](${normalizeSiteUrl("docs/" + f.path.replace(/^\/+/, ""))})`).join("\n")
    : "_Файлов нет._";

  return [
    `# ${page.title}`,
    "",
    "> Markdown-страница не найдена (это нормально, если вы храните регламент только в файле).",
    "",
    "## Файлы",
    links,
  ].join("\n");
}

// ---------- main loader ----------
async function loadPageById(id, { bust = false } = {}) {
  const page = ALL_PAGES.find(p => p.id === id) || ALL_PAGES[0];
  if (!page) return;

  setActiveNav(page.id);
  renderBreadcrumb(page);
  renderFiles(page);

  els.updatedAt.textContent = nowStamp();
  els.mdPath.textContent = page.md;

  setEditLink(page);
  setCopyLink(page);
  setRefresh(page);

  try {
    let md = "";
    try {
      md = await fetchText(page.md, { bust });
    } catch (e) {
      // If 404 on MD — show fallback page (NO hard error screen)
      if (e && (e.status === 404 || /404/.test(String(e.message)))) {
        md = fallbackMdForMissing(page);
      } else {
        throw e;
      }
    }

    md = applyPatches(page.md, md);
    await renderMarkdown(md);
  } catch (err) {
    els.page.innerHTML =
      `<div class="md-error">
        <h3>Ошибка загрузки</h3>
        <div>${escapeHtml(err?.message || String(err))}</div>
      </div>`;
  }
}

// ---------- init ----------
function init() {
  renderNav("");

  const initial = getRouteId() || ALL_PAGES[0]?.id;
  loadPageById(initial);

  window.addEventListener("hashchange", () => {
    const id = getRouteId() || ALL_PAGES[0]?.id;
    loadPageById(id);
  });

  if (els.searchInput) {
    els.searchInput.addEventListener("input", e => {
      renderNav(e.target.value);
      // keep active state after rerender
      const id = getRouteId() || ALL_PAGES[0]?.id;
      setActiveNav(id);
    });
  }
}

document.addEventListener("DOMContentLoaded", init);
