// 1) Навигация (вкладки слева). Добавляешь сюда новые страницы.
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
      { id: "role-coo", title: "Опердир (COO)", path: "content/roles/coo.md" },
      { id: "role-sales-head", title: "РОП", path: "content/roles/sales_head.md" },
      { id: "role-productologist", title: "Продуктолог", path: "content/roles/productologist.md" },
      { id: "role-buyer", title: "Закупщик", path: "content/roles/buyer.md" },
      { id: "role-ms", title: "ОМ МойСклад", path: "content/roles/ms_operator.md" },
      { id: "role-fin", title: "Финансист", path: "content/roles/finance.md" },
      { id: "role-assistant", title: "Ассистент", path: "content/roles/assistant.md" }
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

// 2) Если хочешь кнопку “Редактировать на GitHub” — вставь ссылку:
// "https://github.com/<user>/<repo>/edit/main/docs/"
const REPO_EDIT_BASE = "";

const els = {
  sidebar: document.getElementById("sidebar"),
  content: document.getElementById("content"),
  crumb: document.getElementById("crumb"),
  title: document.getElementById("pagetitle"),
  search: document.getElementById("search"),
  btnReload: document.getElementById("btnReload"),
  btnCopyLink: document.getElementById("btnCopyLink"),
  btnEdit: document.getElementById("btnEdit"),
  last: document.getElementById("lastUpdated"),
};

function escapeHtml(str){
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function mdFallback(md){
  md = md.replace(/```([\s\S]*?)```/g, (m, code)=> `<pre><code>${escapeHtml(code.trim())}</code></pre>`);
  md = md.replace(/^### (.*)$/gm, "<h3>$1</h3>");
  md = md.replace(/^## (.*)$/gm, "<h2>$1</h2>");
  md = md.replace(/^# (.*)$/gm, "<h1>$1</h1>");
  md = md.replace(/^\> (.*)$/gm, "<blockquote>$1</blockquote>");
  md = md.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  md = md.replace(/\*(.+?)\*/g, "<em>$1</em>");
  md = md.replace(/\[([^\]]+)\]\(([^)]+)\)/g, `<a href="$2">$1</a>`);
  md = md.replace(/^\- (.*)$/gm, "<li>$1</li>");
  md = md.replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>");
  md = md.split(/\n{2,}/).map(chunk=>{
    if (/^\s*<(h1|h2|h3|ul|pre|blockquote)/.test(chunk.trim())) return chunk;
    const c = chunk.trim();
    if (!c) return "";
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

function wireInternalLinks(){
  els.content.querySelectorAll("a").forEach(a=>{
    const href = a.getAttribute("href") || "";
    if (href.startsWith("#")){
      a.addEventListener("click", (e)=>{
        e.preventDefault();
        navigate(href.slice(1));
      });
    } else {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener");
    }
  });
}

async function renderMermaid(){
  if (!window.mermaid) return;

  els.content.querySelectorAll("code.language-mermaid").forEach(code=>{
    const pre = code.parentElement;
    const div = document.createElement("div");
    div.className = "mermaid";
    div.textContent = code.textContent;
    pre.replaceWith(div);
  });

  try{
    window.mermaid.initialize({ startOnLoad:false, theme:"dark" });
    await window.mermaid.run({ querySelector: ".mermaid" });
  }catch(_e){}
}

async function loadPage(id){
  const item = getItemById(id) || getItemById("org-structure");
  if (!item) return;

  setActive(item.id);
  els.crumb.textContent = item.group;
  els.title.textContent = item.title;

  if (REPO_EDIT_BASE){
    els.btnEdit.style.display = "inline-flex";
    els.btnEdit.onclick = ()=> window.open(REPO_EDIT_BASE + item.path, "_blank", "noopener");
  } else {
    els.btnEdit.style.display = "none";
  }

  try{
    const res = await fetch(item.path, { cache: "no-store" });
    if (!res.ok) throw new Error(`Не могу загрузить ${item.path} (${res.status})`);
    const md = await res.text();

    els.content.innerHTML = await renderMarkdown(md);
    wireInternalLinks();
    await renderMermaid();

    els.last.textContent = new Date().toLocaleString();
  }catch(err){
    els.content.innerHTML = `
      <h1>Ошибка загрузки</h1>
      <p>${escapeHtml(String(err.message || err))}</p>
      <p class="badge">Локально открывай через сервер (VSCode Live Server / python -m http.server). На GitHub Pages всё ок.</p>
    `;
  }
}

async function copyLink(){
  await navigator.clipboard.writeText(window.location.href);
  const old = els.btnCopyLink.textContent;
  els.btnCopyLink.textContent = "Ссылка скопирована";
  setTimeout(()=> els.btnCopyLink.textContent = old, 900);
}

function setupShortcuts(){
  window.addEventListener("keydown", (e)=>{
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==="k"){
      e.preventDefault();
      els.search.focus();
    }
  });
}

function boot(){
  buildSidebar("");
  setupShortcuts();

  els.search.addEventListener("input", (e)=>{
    buildSidebar(e.target.value || "");
    setActive(currentId());
  });

  els.btnReload.addEventListener("click", ()=> loadPage(currentId()));
  els.btnCopyLink.addEventListener("click", ()=> copyLink());
  window.addEventListener("hashchange", ()=> loadPage(currentId()));

  loadPage(currentId());
}

boot();
