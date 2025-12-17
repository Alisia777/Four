/* Hogita Ops Portal — app.js (fixed marked token/code + mermaid autodetect + iframe allowlist + clean routes) */

const els = {
  nav: document.getElementById("nav"),
  page: document.getElementById("page"),
  filesList: document.getElementById("filesList"),
  mdPath: document.getElementById("mdPath"),
  breadcrumb: document.getElementById("pageBreadcrumb"),
  search: document.getElementById("searchInput"),
  updatedAt: document.getElementById("updatedAt"),
  btnRefresh: document.getElementById("btnRefresh"),
  btnCopyLink: document.getElementById("btnCopyLink"),
  btnEdit: document.getElementById("btnEdit"),
};

// --- GitHub Pages base (/<repo>/...) ---
function computeBasePrefix() {
  const parts = location.pathname.split("/").filter(Boolean);
  if (parts.length >= 1) return "/" + parts[0] + "/";
  return "/";
}
const BASE_PREFIX = computeBasePrefix();
const REPO_NAME = (location.pathname.split("/").filter(Boolean)[0] || "Four"); // repo может остаться Four
// content root inside docs published on Pages
const CONTENT_ROOT = "content/";
const EDIT_BASE = `https://github.com/alisia777/${REPO_NAME}/edit/main/docs/`;

// NAV map
const NAV = [
  {
    section: "Оргструктура",
    items: [
      { id: "org-structure", title: "Дерево / структура", md: "org-structure.md" },
      { id: "base-rules", title: "Базовые правила", md: "base-rules.md" },
    ],
  },
  {
    section: "RACI",
    items: [{ id: "raci", title: "RACI", md: "raci.md" }],
  },
  {
    section: "Должностные инструкции",
    items: [
      { id: "operdir", title: "Опердир (COO)", md: "operdir.md", files: ["assets/files/operdir.docx"] },
      { id: "rop", title: "РОП", md: "rop.md", files: ["assets/files/rop.docx"] },
      { id: "product", title: "Продуктолог", md: "product.md", files: ["assets/files/product.docx"] },
      { id: "procurement", title: "Закупщик", md: "procurement.md", files: ["assets/files/procurement.docx"] },
      { id: "ms", title: "ОМ МойСклад", md: "ms.md", files: ["assets/files/ms.docx"] },
      { id: "finance", title: "Финансист", md: "finance.md", files: ["assets/files/finance.docx"] },
      { id: "assistant", title: "Ассистент", md: "assistant.md", files: ["assets/files/assistant.docx"] },
    ],
  },
  {
    section: "Отчёты",
    items: [
      // ✅ sales.md — iframe внутрь портала (разрешаем iframe только тут)
      { id: "sales", title: "Отдел продаж", md: "sales.md", allowIframe: true },

      { id: "daily-wb", title: "Daily WB", md: "daily-wb.md" },
      { id: "weekly-wb", title: "Weekly WB", md: "weekly-wb.md" },
      { id: "weekly-proc", title: "Weekly закуп", md: "weekly-proc.md" },
      { id: "weekly-ms", title: "Weekly МойСклад", md: "weekly-ms.md" },
      { id: "weekly-fin", title: "Weekly финансы", md: "weekly-fin.md" },
      { id: "monthly-fin", title: "Monthly финансы", md: "monthly-fin.md" },
    ],
  },
];

const ALL_PAGES = NAV.flatMap((s) => s.items);

// ---------- utils ----------
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// normalize relative links for Pages
function normalizeSiteUrl(url) {
  if (!url) return url;
  if (/^(https?:)?\/\//i.test(url) || url.startsWith("mailto:") || url.startsWith("tel:")) return url;

  // root-relative -> repo-relative
  if (url.startsWith("/")) return BASE_PREFIX.replace(/\/+$/, "/") + url.replace(/^\/+/, "");
  return url;
}

// ---------- routing ----------
function getRouteFromPathname() {
  const rel = location.pathname.replace(BASE_PREFIX, "");
  const parts = rel.split("/").filter(Boolean);
  return parts[0] || ALL_PAGES[0].id;
}

function canonicalizeUrl() {
  const rel = location.pathname.replace(BASE_PREFIX, "");
  const parts = rel.split("/").filter(Boolean);
  if (parts.length > 1) {
    const canonical = BASE_PREFIX + parts[0];
    history.replaceState(null, "", canonical);
  }
}

function setRoute(route) {
  const id = String(route || "").trim() || ALL_PAGES[0].id;
  const next = BASE_PREFIX + id;
  history.pushState(null, "", next);
}

function findPageById(id) {
  return ALL_PAGES.find((p) => p.id === id) || null;
}

// ---------- markdown + mermaid detection ----------
function setupMarked() {
  if (!window.marked) return;

  marked.setOptions({ breaks: true, gfm: true });

  const renderer = new marked.Renderer();
  const origCode = renderer.code ? renderer.code.bind(renderer) : null;

  const toText = (codeArg) => {
    // marked может прислать строку ИЛИ token-object
    if (typeof codeArg === "string") return codeArg;
    if (codeArg && typeof codeArg === "object") {
      if (typeof codeArg.text === "string") return codeArg.text;
      if (typeof codeArg.raw === "string") return codeArg.raw;
    }
    return String(codeArg ?? "");
  };

  const looksLikeMermaid = (text = "") => {
    const c = String(text || "").trim();
    return (
      c.startsWith("flowchart") ||
      c.startsWith("graph ") ||
      c.startsWith("sequenceDiagram") ||
      c.startsWith("erDiagram") ||
      c.startsWith("stateDiagram") ||
      c.startsWith("classDiagram") ||
      c.startsWith("gantt") ||
      c.startsWith("journey") ||
      c.startsWith("mindmap")
    );
  };

  renderer.code = (codeArg, infostring, escaped) => {
    const codeText = toText(codeArg);

    // язык берём и из token, и из infostring
    const tokenLang =
      (codeArg && typeof codeArg === "object" && typeof codeArg.lang === "string") ? codeArg.lang : "";

    const lang = String(tokenLang || infostring || "").trim().toLowerCase();

    // поддерживаем ```mermaid + авто-детект
    if (lang === "mermaid" || lang === "flowchart" || looksLikeMermaid(codeText)) {
      return `<pre class="mermaid">${escapeHtml(codeText)}</pre>`;
    }

    // отдать штатному renderer
    if (origCode) return origCode(codeArg, infostring, escaped);

    // fallback
    return `<pre><code>${escapeHtml(codeText)}</code></pre>`;
  };

  marked.use({ renderer });
}

// DOMPurify: iframe только на разрешённых страницах
function sanitizeHtml(rawHtml, page) {
  if (!window.DOMPurify) return rawHtml;

  if (page && page.allowIframe) {
    return DOMPurify.sanitize(rawHtml, {
      ADD_TAGS: ["iframe"],
      ADD_ATTR: [
        "src",
        "style",
        "loading",
        "referrerpolicy",
        "allow",
        "allowfullscreen",
        "frameborder",
        "scrolling",
        "title",
      ],
    });
  }

  return DOMPurify.sanitize(rawHtml);
}

function renderMarkdown(mdText, page) {
  const rawHtml = window.marked ? marked.parse(mdText || "") : `<pre>${escapeHtml(mdText || "")}</pre>`;
  const safeHtml = sanitizeHtml(rawHtml, page);
  els.page.innerHTML = safeHtml;

  // normalize <a> and <img>
  els.page.querySelectorAll("a").forEach((a) => {
    const href = a.getAttribute("href");
    if (!href) return;
    a.setAttribute("href", normalizeSiteUrl(href));
    if (/^(https?:)?\/\//i.test(href)) {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    }
  });

  els.page.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src");
    if (!src) return;
    img.setAttribute("src", normalizeSiteUrl(src));
    img.setAttribute("loading", "lazy");
  });

  // iframe — оставляем как есть (внешние не трогаем), просто lazy
  els.page.querySelectorAll("iframe").forEach((ifr) => {
    ifr.setAttribute("loading", "lazy");
  });
}

// ---------- Mermaid ----------
let mermaidInited = false;

async function initMermaid() {
  if (mermaidInited) return;
  if (!window.mermaid) return;
  try {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "dark",
    });
    mermaidInited = true;
  } catch (e) {
    console.warn("Mermaid init error:", e);
  }
}

async function renderMermaid() {
  if (!window.mermaid || !mermaid.render) return;

  const blocks = Array.from(els.page.querySelectorAll("pre.mermaid"));
  if (!blocks.length) return;

  for (const block of blocks) {
    const code = block.textContent || "";
    const holder = document.createElement("div");
    holder.className = "mermaid-render";
    block.parentNode.replaceChild(holder, block);

    try {
      const id = "mmd-" + Math.random().toString(16).slice(2);
      const out = await mermaid.render(id, code);
      const svg = typeof out === "string" ? out : (out && out.svg ? out.svg : "");
      if (!svg) throw new Error("Mermaid вернул пустой SVG");
      holder.innerHTML = svg;
    } catch (e) {
      holder.innerHTML =
        `<div class="note warn"><b>Не удалось отрисовать схему</b><br/>${escapeHtml(e?.message || String(e))}</div>` +
        `<pre><code>${escapeHtml(code)}</code></pre>`;
    }
  }
}

// ---------- files panel ----------
function renderFiles(page) {
  const files = (page && page.files) ? page.files : [];
  els.filesList.innerHTML = "";

  if (!files.length) {
    els.filesList.innerHTML = `<div class="files-empty">Нет прикреплённых файлов.</div>`;
    return;
  }

  const ul = document.createElement("ul");
  ul.className = "files-ul";

  files.forEach((f) => {
    const li = document.createElement("li");
    li.className = "files-li";

    const a = document.createElement("a");
    a.className = "files-a";
    a.href = normalizeSiteUrl(f);
    a.textContent = f.split("/").pop();
    a.target = "_blank";
    a.rel = "noopener noreferrer";

    li.appendChild(a);
    ul.appendChild(li);
  });

  els.filesList.appendChild(ul);
}

// ---------- nav ----------
function renderNav(filter = "") {
  const q = (filter || "").trim().toLowerCase();
  els.nav.innerHTML = "";

  NAV.forEach((sec) => {
    const secEl = document.createElement("div");
    secEl.className = "nav-section";

    const h = document.createElement("div");
    h.className = "nav-title";
    h.textContent = sec.section;
    secEl.appendChild(h);

    const list = document.createElement("div");
    list.className = "nav-items";

    sec.items.forEach((it) => {
      const hit = !q || it.title.toLowerCase().includes(q) || it.id.toLowerCase().includes(q);
      if (!hit) return;

      const a = document.createElement("a");
      a.className = "nav-item";
      a.href = BASE_PREFIX + it.id;

      a.textContent = it.title;
      a.dataset.label = it.title;
      a.setAttribute("data-label", it.title);
      a.setAttribute("data-title", it.title);
      a.setAttribute("aria-label", it.title);

      a.addEventListener("click", (e) => {
        e.preventDefault();
        setRoute(it.id);
        loadPage(it.id);
        highlightActive(it.id);
      });

      list.appendChild(a);
    });

    secEl.appendChild(list);
    els.nav.appendChild(secEl);
  });

  highlightActive(getRouteFromPathname());
}

function highlightActive(pageId) {
  els.nav.querySelectorAll(".nav-item").forEach((b) => {
    b.classList.toggle("active", b.getAttribute("href") === (BASE_PREFIX + pageId));
  });
}

// ---------- page loader ----------
async function loadPage(pageId) {
  const page = findPageById(pageId) || ALL_PAGES[0];

  els.breadcrumb.textContent = page.title || "";
  els.mdPath.textContent = `Markdown: /${CONTENT_ROOT}${page.md}`;

  const editUrl = EDIT_BASE + CONTENT_ROOT + page.md;
  els.btnEdit.onclick = () => window.open(editUrl, "_blank", "noopener,noreferrer");

  renderFiles(page);

  try {
    const mdUrl = normalizeSiteUrl(CONTENT_ROOT + page.md);
    const res = await fetch(mdUrl + "?v=" + Date.now(), { cache: "no-store" });
    if (!res.ok) throw new Error(`Не могу загрузить ${page.md} (${res.status})`);
    const text = await res.text();

    renderMarkdown(text, page);
    await initMermaid();
    await renderMermaid();
  } catch (e) {
    els.page.innerHTML = `<div class="note warn"><b>Ошибка загрузки</b><br/>${escapeHtml(e?.message || String(e))}</div>`;
  }
}

// ---------- top actions ----------
function updateUpdatedAt() {
  if (!els.updatedAt) return;
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  els.updatedAt.textContent = `Обновление: ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function copyLink() {
  const route = getRouteFromPathname();
  const url = location.origin + BASE_PREFIX + route;
  navigator.clipboard.writeText(url).then(() => {
    els.btnCopyLink.textContent = "Скопировано ✅";
    setTimeout(() => (els.btnCopyLink.textContent = "Скопировать ссылку"), 1200);
  });
}

// ---------- init ----------
setupMarked();
canonicalizeUrl();
renderNav();

if (els.search) {
  els.search.addEventListener("input", debounce((e) => {
    renderNav(e.target.value || "");
  }, 120));
}

if (els.btnRefresh) els.btnRefresh.addEventListener("click", () => loadPage(getRouteFromPathname()));
if (els.btnCopyLink) els.btnCopyLink.addEventListener("click", copyLink);

window.addEventListener("popstate", () => {
  canonicalizeUrl();
  const r = getRouteFromPathname();
  highlightActive(r);
  loadPage(r);
});

updateUpdatedAt();
setInterval(updateUpdatedAt, 60_000);

// старт
const startRoute = getRouteFromPathname();
highlightActive(startRoute);
loadPage(startRoute);
