// Fox Ops Portal — app.js (SPA + markdown + files list)
// Работает в GitHub Pages (repo pages) с /docs как source.

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

const BASE_PREFIX = location.pathname.split("/").filter(Boolean)[0]
  ? "/" + location.pathname.split("/").filter(Boolean)[0] + "/"
  : "/";

// Если GitHub Pages source = /docs, то на сайте путь /content/... и /assets/... уже от корня pages
const CONTENT_ROOT = "content/";
const EDIT_BASE = "https://github.com/alisia777/Four/edit/main/docs/";

// Навигация и привязка файлов
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

function normalizeSiteUrl(url) {
  if (!url) return url;
  // если абсолютная ссылка — не трогаем
  if (/^(https?:)?\/\//i.test(url) || url.startsWith("mailto:") || url.startsWith("tel:")) return url;
  // если начинается с / — добавим BASE_PREFIX
  if (url.startsWith("/")) return BASE_PREFIX.replace(/\/+$/,"/") + url.replace(/^\/+/, "");
  return url;
}

function getRoute() {
  // приоритет: hash /#/page-id
  const h = location.hash || "";
  const m = h.match(/^#\/(.+)$/);
  if (m && m[1]) return decodeURIComponent(m[1]);
  // fallback: pathname /<repo>/<page-id>
  const parts = location.pathname.replace(BASE_PREFIX, "").split("/").filter(Boolean);
  return parts[0] || ALL_PAGES[0].id;
}

function setRoute(route) {
  // поддержка и pushState и hash (для 404.html редиректа)
  const clean = String(route || "").trim();
  const nextPath = BASE_PREFIX + clean;
  history.pushState(null, "", nextPath);
  location.hash = "#/" + encodeURIComponent(clean);
}

function findPageById(id) {
  return ALL_PAGES.find((p) => p.id === id) || null;
}

// ---------- markdown ----------
function setupMarked() {
  if (!window.marked) return;
  marked.setOptions({
    breaks: true,
    gfm: true,
  });

  const renderer = new marked.Renderer();
  const origCode = renderer.code.bind(renderer);

  // Mermaid: код-блок ```mermaid -> <pre class="mermaid">...</pre>
  renderer.code = (code, infostring, escaped) => {
    const lang = (infostring || "").trim().toLowerCase();
    if (lang === "mermaid") {
      return `<pre class="mermaid">${escapeHtml(code)}</pre>`;
    }
    return origCode(code, infostring, escaped);
  };

  marked.use({ renderer });
}

function renderMarkdown(mdText) {
  const rawHtml = window.marked ? marked.parse(mdText || "") : `<pre>${escapeHtml(mdText || "")}</pre>`;
  const safeHtml = window.DOMPurify ? DOMPurify.sanitize(rawHtml) : rawHtml;
  els.page.innerHTML = safeHtml;

  // Нормализуем ссылки/картинки под GitHub Pages
  els.page.querySelectorAll("a").forEach((a) => {
    const href = a.getAttribute("href");
    if (!href) return;
    a.setAttribute("href", normalizeSiteUrl(href));
    // внешние — в новой вкладке
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
      // Mermaid v10+: mermaid.render возвращает объект {svg, bindFunctions}
      const id = "mmd-" + Math.random().toString(16).slice(2);
      if (mermaid.parse) {
        try { await mermaid.parse(code); } catch (e) {}
      }
      const out = await mermaid.render(id, code);
      const svg = typeof out === "string" ? out : (out && typeof out.svg === "string" ? out.svg : null);
      if (!svg) throw new Error("Mermaid render вернул пустой SVG");
      holder.innerHTML = svg;

      if (!holder.querySelector("svg")) {
        throw new Error("SVG не вставился в DOM (проверь CSP/кэш)");
      }
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

      const btn = document.createElement("button");
      btn.className = "nav-item";
      btn.type = "button";
      btn.dataset.id = it.id;
      btn.textContent = it.title;

      btn.addEventListener("click", () => {
        setRoute(it.id);
        loadPage(it.id);
        highlightActive(it.id);
      });

      list.appendChild(btn);
    });

    secEl.appendChild(list);
    els.nav.appendChild(secEl);
  });

  highlightActive(getRoute());
}

function highlightActive(pageId) {
  els.nav.querySelectorAll(".nav-item").forEach((b) => {
    b.classList.toggle("active", b.dataset.id === pageId);
  });
}

// ---------- page loader ----------
async function loadPage(pageId) {
  const page = findPageById(pageId) || ALL_PAGES[0];

  // breadcrumb + edit link + md path
  els.breadcrumb.textContent = `Оргструктура · ${page.title}`.replace("Оргструктура · RACI", "RACI").replace("Оргструктура · ", "");
  els.mdPath.textContent = `Markdown: /content/${page.md}`;

  const editUrl = EDIT_BASE + CONTENT_ROOT + page.md;
  els.btnEdit.onclick = () => window.open(editUrl, "_blank", "noopener,noreferrer");

  renderFiles(page);

  try {
    const mdUrl = normalizeSiteUrl(CONTENT_ROOT + page.md);
    const res = await fetch(mdUrl + "?v=" + Date.now(), { cache: "no-store" });
    if (!res.ok) throw new Error(`Не могу загрузить ${page.md} (${res.status})`);
    const text = await res.text();

    renderMarkdown(text);
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
  const route = getRoute();
  const url = location.origin + BASE_PREFIX + route;
  navigator.clipboard.writeText(url).then(() => {
    els.btnCopyLink.textContent = "Скопировано ✅";
    setTimeout(() => (els.btnCopyLink.textContent = "Скопировать ссылку"), 1200);
  });
}

// ---------- init ----------
setupMarked();
renderNav();

els.search.addEventListener("input", debounce((e) => {
  renderNav(e.target.value || "");
}, 120));

els.btnRefresh.addEventListener("click", () => loadPage(getRoute()));
els.btnCopyLink.addEventListener("click", copyLink);

window.addEventListener("popstate", () => {
  const r = getRoute();
  highlightActive(r);
  loadPage(r);
});

updateUpdatedAt();
setInterval(updateUpdatedAt, 60_000);

// старт
const startRoute = getRoute();
highlightActive(startRoute);
loadPage(startRoute);

