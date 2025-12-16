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

const ALL_PAGES = NAV.flatMap(s => s.items.map(it => ({...it, section: s.section})));

function nowStamp(){
  const d = new Date();
  const pad = n => String(n).padStart(2,"0");
  return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function getBasePrefix(){
  // For GitHub Pages project sites: /<repo>/
  const parts = window.location.pathname.split("/").filter(Boolean);
  // If hosted at root (custom domain), parts might be [].
  if (parts.length === 0) return "/";
  // If last part is index.html or 404.html — still base is /<first>/
  return `/${parts[0]}/`;
}

const BASE_PREFIX = getBasePrefix();

function isExternalUrl(u){
  return /^https?:\/\//i.test(u) || u.startsWith("mailto:") || u.startsWith("tel:") || u.startsWith("#");
}
function normalizeSiteUrl(u){
  if (!u) return u;
  if (isExternalUrl(u)) return u;
  if (u.startsWith("//")) return u;
  // IMPORTANT: paths starting with "/" must include repo base on project pages
  if (u.startsWith("/")) {
    // avoid double prefix if already has /<repo>/
    if (u.startsWith(BASE_PREFIX)) return u;
    return BASE_PREFIX + u.replace(/^\//,"");
  }
  return u;
}
function cacheBust(u){
  if (!u || isExternalUrl(u)) return u;
  const sep = u.includes("?") ? "&" : "?";
  return `${u}${sep}v=${Date.now()}`;
}

function setHash(id){
  window.location.hash = `#/${id}`;
}
function getRouteId(){
  const h = window.location.hash || "";
  const m = h.match(/^#\/([^?]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function renderNav(filterText=""){
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

      const a = document.createElement("div");
      a.className = "nav-item";
      a.dataset.id = item.id;

      a.innerHTML = `
        <div>${escapeHtml(item.title)}</div>
        <div class="nav-badge">${escapeHtml(sec.section)}</div>
      `;
      a.addEventListener("click", () => setHash(item.id));
      section.appendChild(a);
    });

    // If section has no visible items under filter — skip rendering it
    if (section.querySelectorAll(".nav-item").length > 0) {
      els.nav.appendChild(section);
    }
  });

  markActive();
}

function markActive(){
  const current = getRouteId() || ALL_PAGES[0]?.id;
  document.querySelectorAll(".nav-item").forEach(el => {
    el.classList.toggle("nav-item--active", el.dataset.id === current);
  });
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
}

function setupMarked(){
  // Custom renderer: make ```mermaid blocks render as <pre class="mermaid">...</pre>
  const renderer = new marked.Renderer();

  renderer.code = (code, infostring) => {
    const lang = (infostring || "").trim().toLowerCase();
    if (lang === "mermaid") {
      return `<pre class="mermaid">${escapeHtml(code)}</pre>`;
    }
    return `<pre><code>${escapeHtml(code)}</code></pre>`;
  };

  marked.setOptions({
    renderer,
    gfm: true,
    breaks: true,
  });
}

function renderMarkdown(md){
  const raw = marked.parse(md || "");
  const safe = DOMPurify.sanitize(raw, {USE_PROFILES: {html: true}});
  els.page.innerHTML = safe;

  // Fix paths like /assets/... which break on GitHub Pages project sites
  els.page.querySelectorAll("img").forEach(img => {
    const src = img.getAttribute("src");
    img.setAttribute("src", normalizeSiteUrl(src));
  });
  els.page.querySelectorAll("a").forEach(a => {
    const href = a.getAttribute("href");
    a.setAttribute("href", normalizeSiteUrl(href));
    // For binary files: use download attr to force “save as”
    const h = (href || "").toLowerCase();
    if (!isExternalUrl(href) && (h.endsWith(".pdf") || h.endsWith(".docx") || h.endsWith(".xlsx") || h.endsWith(".pptx") || h.endsWith(".zip"))) {
      a.setAttribute("download", "");
    }
  });
}

async function renderMermaid(){
  if (!window.mermaid) return;
  try{
    mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "dark" });
    const nodes = els.page.querySelectorAll(".mermaid");
    if (nodes.length === 0) return;
    // mermaid.run renders all nodes passed
    await mermaid.run({ nodes: Array.from(nodes) });
  }catch(err){
    console.warn("Mermaid render failed:", err);
    // Show error inline (but keep page readable)
    const warn = document.createElement("div");
    warn.className = "error";
    warn.innerHTML = `<div class="error__title">Mermaid: ошибка рендера</div>
      <div class="error__meta">${escapeHtml(err?.message || String(err))}</div>`;
    els.page.prepend(warn);
  }
}

function setFiles(page){
  els.filesList.innerHTML = "";
  els.mdPath.textContent = page?.md || "—";

  const files = (page && page.files) ? page.files : [];
  if (files.length === 0) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "Нет прикреплённых файлов.";
    els.filesList.appendChild(empty);
    return;
  }

  files.forEach(f => {
    const a = document.createElement("a");
    a.className = "file-link";
    a.href = cacheBust(normalizeSiteUrl(f.path));
    a.target = "_blank";
    a.rel = "noopener";
    a.download = ""; // force download if browser allows
    a.innerHTML = `<div class="file-link__name">${escapeHtml(f.name)}</div><div class="file-link__tag">скачать</div>`;
    els.filesList.appendChild(a);
  });
}

function setHead(page){
  const crumb = page ? `${page.section} • ${page.title}` : "—";
  els.breadcrumb.textContent = crumb;
  els.btnEdit.href = page ? `${REPO_EDIT_BASE}${page.md}` : REPO_EDIT_BASE;
  els.updatedAt.textContent = nowStamp();
}

async function loadPageById(id, {bust=false} = {}){
  const page = ALL_PAGES.find(p => p.id === id) || ALL_PAGES[0];
  if (!page) return;

  setHead(page);
  setFiles(page);
  markActive();

  els.page.innerHTML = `<div class="loading">Загрузка…</div>`;

  const url = normalizeSiteUrl(page.md);
  const finalUrl = bust ? cacheBust(url) : url;

  try{
    const res = await fetch(finalUrl, { cache: bust ? "reload" : "default" });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const text = await res.text();
    renderMarkdown(text);
    await renderMermaid();
  }catch(err){
    els.page.innerHTML = `
      <div class="error">
        <div class="error__title">Не удалось загрузить документ</div>
        <div class="error__meta">Файл: <code>${escapeHtml(page.md)}</code></div>
        <div class="error__meta">URL: <code>${escapeHtml(finalUrl)}</code></div>
        <div class="error__meta">Ошибка: ${escapeHtml(err?.message || String(err))}</div>
        <div style="margin-top:10px" class="muted">Чаще всего причина — неправильный путь или регистр букв (GitHub Pages чувствителен к регистру).</div>
      </div>
    `;
  }
}

function setupSearch(){
  const input = els.searchInput;
  input.addEventListener("input", () => renderNav(input.value));

  // Ctrl/Cmd + K => focus search
  window.addEventListener("keydown", (e) => {
    const isK = (e.key || "").toLowerCase() === "k";
    if ((e.ctrlKey || e.metaKey) && isK) {
      e.preventDefault();
      input.focus();
      input.select();
    }
  });
}

function setupButtons(){
  els.btnRefresh.addEventListener("click", () => {
    const id = getRouteId() || ALL_PAGES[0]?.id;
    loadPageById(id, {bust:true});
  });

  els.btnCopyLink.addEventListener("click", async () => {
    const url = window.location.href;
    try{
      await navigator.clipboard.writeText(url);
      els.btnCopyLink.textContent = "Скопировано ✓";
      setTimeout(() => els.btnCopyLink.textContent = "Скопировать ссылку", 1200);
    }catch{
      // Fallback
      prompt("Скопируй ссылку:", url);
    }
  });
}

function boot(){
  setupMarked();
  setupSearch();
  setupButtons();
  renderNav("");

  const initial = getRouteId() || ALL_PAGES[0]?.id;
  if (initial) loadPageById(initial);

  window.addEventListener("hashchange", () => {
    const id = getRouteId() || ALL_PAGES[0]?.id;
    loadPageById(id);
  });

  // If someone opens /Four/some-path (no hash), 404.html will redirect to #/...
  if (!window.location.hash) setHash(initial);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}