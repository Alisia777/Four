// Если снова “вечная загрузка” — открой DevTools → Console.
// Но этим хотфиксом мы ещё и показываем ошибку прямо на странице.

const BUILD_VERSION = "3";
const REPO_EDIT_BASE = "https://github.com/Alisia777/Four/edit/main/docs/";

// 👇 сюда добавляешь "download", чтобы кнопка "Скачать оригинал" работала
// Файлы кладём в docs/files/ (латиница, без пробелов)
const NAV = [
  {
    section: "Оргструктура",
    items: [
      { id: "org-structure", title: "Дерево / структура", path: "content/org/structure.md" },
      { id: "org-base", title: "Базовые правила", path: "content/org/base_rules.md" },
      { id: "org-raci", title: "RACI", path: "content/org/raci.md" }
    ]
  },
  {
    section: "Должностные инструкции",
    items: [
      { id: "role-coo", title: "Опердир (COO)", path: "content/roles/coo.md", download: "files/oper_dir.pdf" },
      { id: "role-sales-head", title: "РОП", path: "content/roles/sales_head.md", download: "files/sales_head.pdf" },
      { id: "role-productologist", title: "Продуктолог", path: "content/roles/productologist.md", download: "files/productologist.pdf" },
      { id: "role-buyer", title: "Закупщик", path: "content/roles/buyer.md", download: "files/buyer.pdf" },
      { id: "role-ms", title: "ОМ МойСклад", path: "content/roles/ms_operator.md", download: "files/ms_operator.pdf" },
      { id: "role-fin", title: "Финансист", path: "content/roles/finance.md", download: "files/finance.pdf" },
      { id: "role-assistant", title: "Ассистент", path: "content/roles/assistant.md", download: "files/assistant.pdf" }
    ]
  },
  {
    section: "Отчёты",
    items: [
      { id: "rep-daily-wb", title: "Daily WB", path: "content/reports/daily_wb.md" },
      { id: "rep-weekly-wb", title: "Weekly WB", path: "content/reports/weekly_wb.md" },
      { id: "rep-weekly-buy", title: "Weekly закуп", path: "content/reports/weekly_buying.md" },
      { id: "rep-weekly-ms", title: "Weekly МойСклад", path: "content/reports/weekly_ms.md" },
      { id: "rep-weekly-fin", title: "Weekly финансы", path: "content/reports/weekly_finance.md" },
      { id: "rep-monthly-fin", title: "Monthly финансы", path: "content/reports/monthly_finance.md" }
    ]
  }
];

const els = {
  sidebar: document.getElementById("sidebar"),
  content: document.getElementById("content"),
  crumb: document.getElementById("crumb"),
  title: document.getElementById("pagetitle"),
  search: document.getElementById("search"),
  btnReload: document.getElementById("btnReload"),
  btnCopyLink: document.getElementById("btnCopyLink"),
  btnEdit: document.getElementById("btnEdit"),
  btnDownload: document.getElementById("btnDownload"),
  last: document.getElementById("lastUpdated"),
};

function bust(url){
  const u = new URL(url, window.location.href);
  u.searchParams.set("v", BUILD_VERSION);
  return u.toString();
}

function escapeHtml(str){
  return (str||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function mdFallback(md){
  // очень простой рендер, чтобы не зависеть от CDN
  md = md.replace(/```([\s\S]*?)```/g, (m, code)=> `<pre><code>${escapeHtml(code.trim())}</code></pre>`);
  md = md.replace(/^### (.*)$/gm, "<h3>$1</h3>");
  md = md.replace(/^## (.*)$/gm, "<h2>$1</h2>");
  md = md.replace(/^# (.*)$/gm, "<h1>$1</h1>");
  md = md.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  md = md.replace(/\[([^\]]+)\]\(([^)]+)\)/g, `<a href="$2">$1</a>`);
  md = md.replace(/^\- (.*)$/gm, "<li>$1</li>");
  md = md.replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>");
  md = md.split(/\n{2,}/).map(chunk=>{
    const c = chunk.trim();
    if (!c) return "";
    if (/^\s*<(h1|h2|h3|ul|pre)/.test(c)) return c;
    return `<p>${c.replace(/\n/g,"<br/>")}</p>`;
  }).join("\n");
  return md;
}

async function renderMarkdown(md){
  if (window.marked && typeof window.marked.parse === "function"){
    return window.marked.parse(md, { mangle:false, headerIds:true });
  }
  return mdFallback(md);
}

function buildSidebar(filter=""){
  if (!els.sidebar) return;
  els.sidebar.innerHTML = "";
  const q = (filter||"").trim().toLowerCase();

  NAV.forEach(group=>{
    const section = document.createElement("div");
    section.className = "section";
    section.innerHTML = `<h3>${group.section}</h3>`;

    const nav = document.createElement("div");
    nav.className = "nav";

    group.items.forEach(item=>{
      if (q && !(`${group.section} ${item.title}`.toLowerCase().includes(q))) return;
      const btn = document.createElement("button");
      btn.textContent = item.title;
      btn.dataset.id = item.id;
      btn.addEventListener("click", ()=> navigate(item.id));
      nav.appendChild(btn);
    });

    section.appendChild(nav);
    els.sidebar.appendChild(section);
  });
}

function getItemById(id){
  for (const g of NAV){
    const f = g.items.find(x=>x.id===id);
    if (f) return { group: g.section, ...f };
  }
  return null;
}

function setActive(id){
  document.querySelectorAll(".nav button").forEach(b=>{
    b.classList.toggle("active", b.dataset.id === id);
  });
}

function currentId(){
  return (window.location.hash||"").replace("#","") || "org-structure";
}

function navigate(id){
  const url = new URL(window.location.href);
  url.hash = id;
  window.history.pushState({}, "", url);
  loadPage(id);
}

function downloadFile(url){
  const a = document.createElement("a");
  a.href = bust(url);
  a.download = ""; // заставляет скачать, а не просто открыть
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function loadPage(id){
  const item = getItemById(id) || getItemById("org-structure");
  if (!item) return;

  setActive(item.id);
  if (els.crumb) els.crumb.textContent = item.group;
  if (els.title) els.title.textContent = item.title;

  // edit
  if (els.btnEdit){
    els.btnEdit.onclick = ()=> window.open(REPO_EDIT_BASE + item.path, "_blank", "noopener");
  }

  // download
  if (els.btnDownload){
    if (item.download){
      els.btnDownload.style.display = "inline-flex";
      els.btnDownload.onclick = ()=> downloadFile(item.download);
    } else {
      els.btnDownload.style.display = "none";
    }
  }

  try{
    const res = await fetch(bust(item.path), { cache:"no-store" });
    if (!res.ok) throw new Error(`Не могу загрузить ${item.path} (${res.status})`);
    const md = await res.text();
    if (els.content) els.content.innerHTML = await renderMarkdown(md);
    if (els.last) els.last.textContent = new Date().toLocaleString();
  }catch(err){
    if (els.content){
      els.content.innerHTML = `
        <h1>Ошибка загрузки</h1>
        <p>${escapeHtml(String(err.message||err))}</p>
        <p class="badge">Проверь: существует ли файл и совпадает ли регистр пути.</p>
      `;
    }
  }
}

async function copyLink(){
  await navigator.clipboard.writeText(window.location.href);
  const old = els.btnCopyLink.textContent;
  els.btnCopyLink.textContent = "Скопировано";
  setTimeout(()=> els.btnCopyLink.textContent = old, 800);
}

function boot(){
  // если JS вообще не стартует — ты увидишь вечную загрузку.
  buildSidebar("");

  if (els.search){
    els.search.addEventListener("input", (e)=>{
      buildSidebar(e.target.value||"");
      setActive(currentId());
    });
  }

  if (els.btnReload) els.btnReload.addEventListener("click", ()=> loadPage(currentId()));
  if (els.btnCopyLink) els.btnCopyLink.addEventListener("click", ()=> copyLink());

  window.addEventListener("hashchange", ()=> loadPage(currentId()));
  window.addEventListener("keydown", (e)=>{
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==="k"){
      e.preventDefault();
      els.search?.focus();
    }
  });

  loadPage(currentId());
}

boot();
