// =====================
// Fox Ops Portal config
// =====================

// если меняешь файлы и браузер показывает старые — просто увеличь версию:
const BUILD_VERSION = "1";

// Кнопка "Редактировать на GitHub"
const REPO_EDIT_BASE = "https://github.com/Alisia777/Four/edit/main/docs/";

// Навигация
// ВАЖНО: если хочешь кнопку "Скачать оригинал" для страницы — добавляй поле download: "files/xxx.pdf"
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
  return (str || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

async function renderMarkdown(md){
  if (window.marked && typeof window.marked.parse === "function"){
    return window.marked.parse(md, { mangle:false, headerIds:true });
  }
  // fallback (редко понадобится)
  return `<pre><code>${escapeHtml(md)}</code></pre>`;
}

function buildSidebar(filter=""){
  els.sidebar.innerHTML = "";
  const q = filter.trim().toLowerCase();

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
    const found = g.items.find(x=>x.id===id);
    if (found) return { group: g.section, ...found };
  }
  return null;
}

function setActive(id){
  document.querySelectorAll(".nav button").forEach(b=>{
    b.classList.toggle("active", b.dataset.id === id);
  });
}

function currentId(){
  return (window.location.hash || "").replace("#","") || "org-structure";
}

function navigate(id){
  const url = new URL(window.location.href);
  url.hash = id;
  window.history.pushState({}, "", url);
  loadPage(id);
}

function wireLinks(){
  els.content.querySelectorAll("a").forEach(a=>{
    const href = a.getAttribute("href") || "";
    if (href.startsWith("#")){
      a.addEventListener("click", (e)=>{
        e.preventDefault();
        navigate(href.slice(1));
      });
      return;
    }

    // если ссылка на файл — добавим download и анти-кэш
    const isFile = /\.(pdf|docx|xlsx|pptx|zip)$/i.test(href) || href.includes("/files/");
    if (isFile){
      a.setAttribute("download", "");
      a.addEventListener("click", (e)=>{
        // чтобы всегда скачивало свежую версию
        a.href = bust(a.href);
      });
    }

    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener");
  });
}

async function renderMermaid(){
  if (!window.mermaid) return;

  els.content.querySelectorAll("code.language-mermaid").forEach(code=>{
    const pre = code.parentElement;
    const div = document.createElement("div");
    div.className = "mermaid";
    div
