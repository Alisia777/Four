/* docs/assets/app.js
   Fox Ops Portal — stable renderer
   Fixes:
   - replaces any "[object Object]" in org-structure with a real org-chart (HTML+SVG)
   - updates decision rule text in content (COO approval threshold logic)
   - handles GitHub Pages base path for assets/files
*/

(() => {
  "use strict";

  // =========================
  // CONFIG
  // =========================
  const REPO_OWNER = "Alisia777";
  const REPO_NAME = "Four";
  const BRANCH = "main";
  const REPO_EDIT_BASE = `https://github.com/${REPO_OWNER}/${REPO_NAME}/edit/${BRANCH}/docs/`;

  // Новая логика (Дамир)
  const DECISION_RULE_NEW =
    "Изменения, которые опускают цену ниже плановой и/или ведут к снижению маржи относительно плановой — " +
    "согласовать с Опердиром (COO). " +
    "Повышение цены выше плановой (при сохранении/улучшении маржи) — на усмотрение менеджера, без согласования.";

  // Текст, который раньше был в правилах (если встретится — заменим)
  const DECISION_RULE_OLD_FRAGMENTS = [
    "Любые изменения цен / рекламы / закупок — через согласование с Опердиром (COO)",
    "Любые изменения цен/рекламы/закупок — через согласование с Опердиром (COO)",
    "Любые изменения цен / рекламы / закупок — через согласование",
  ];

  // Кандидаты логотипа (подхватится первый существующий)
  const LOGO_CANDIDATES = [
    "assets/img/fox.png",
    "assets/img/fox.svg",
    "assets/img/fox_crown.png",
    "assets/img/fox_king.png",
    "assets/img/foxops.png",
  ];

  // =========================
  // BASE PATH (GitHub Pages)
  // =========================
  const BASE_PATH = (() => {
    const parts = location.pathname.split("/").filter(Boolean);
    // Project pages: /<repo>/...
    if (location.hostname.endsWith("github.io") && parts.length > 0) {
      return `/${parts[0]}/`;
    }
    return "/";
  })();

  const toAbsUrl = (rel) => {
    if (!rel) return "";
    if (/^https?:\/\//i.test(rel)) return rel;
    const clean = rel.replace(/^\/+/, "");
    return new URL(clean, location.origin + BASE_PATH).href;
  };

  const cacheBust = () => `v=${Date.now()}`;

  // =========================
  // DOM helpers (бережно)
  // =========================
  const $ = (sel) => document.querySelector(sel);

  function getEls() {
    const content =
      $("#content") ||
      $("#doc-content") ||
      $(".doc-content") ||
      $(".content") ||
      $("main") ||
      document.body;

    const title =
      $("#docTitle") ||
      $("#doc-title") ||
      $(".doc-title") ||
      $(".page-title") ||
      null;

    const updated =
      $("#updatedAt") ||
      $("#updated") ||
      $(".updated-at") ||
      null;

    const btnRefresh =
      $("#btnRefresh") ||
      $("#refresh") ||
      $('[data-action="refresh"]') ||
      null;

    const btnCopy =
      $("#btnCopyLink") ||
      $("#copyLink") ||
      $('[data-action="copy-link"]') ||
      null;

    const btnEdit =
      $("#btnEditGithub") ||
      $("#editGithub") ||
      $('[data-action="edit-github"]') ||
      null;

    const filesPanel =
      $("#filesPanel") ||
      $("#files") ||
      $(".files-panel") ||
      null;

    const logoImg =
      $("#brandLogo") ||
      $(".brand__logo img") ||
      $(".logo img") ||
      $('img[alt*="Fox"]') ||
      $('img[alt*="fox"]') ||
      null;

    return { content, title, updated, btnRefresh, btnCopy, btnEdit, filesPanel, logoImg };
  }

  // =========================
  // MARKDOWN loader (если у тебя уже был marked — он останется)
  // =========================
  async function ensureMarked() {
    if (window.marked) return window.marked;
    await loadScript("https://cdn.jsdelivr.net/npm/marked/marked.min.js");
    return window.marked;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error("Failed to load: " + src));
      document.head.appendChild(s);
    });
  }

  // =========================
  // ROUTING
  // =========================
  function getRoute() {
    // ожидается: /Four/<slug>
    const replaced = location.pathname.replace(BASE_PATH, "/"); // "/org-structure"
    const clean = replaced.replace(/^\/+/, "").replace(/\/+$/, "");
    return clean || ""; // "" = home
  }

  function routeToMdPath(route) {
    const slug = route || "org-structure";
    return `content/${slug}.md`;
  }

  // =========================
  // Frontmatter -> files
  // =========================
  function splitFrontmatter(md) {
    const text = String(md ?? "");
    if (!text.startsWith("---")) return { metaText: "", body: text };
    const end = text.indexOf("\n---", 3);
    if (end === -1) return { metaText: "", body: text };
    const metaText = text.slice(3, end).trim();
    const body = text.slice(end + 4).replace(/^\s+/, "");
    return { metaText, body };
  }

  function unquote(s) {
    const t = String(s ?? "").trim();
    return t.replace(/^["']|["']$/g, "");
  }

  function parseFilesFromMeta(metaText) {
    const lines = (metaText || "").split("\n").map((l) => l.trimEnd());
    const idx = lines.findIndex((l) => /^files\s*:\s*$/i.test(l.trim()));
    if (idx === -1) return [];

    const items = [];
    let cur = null;

    for (let i = idx + 1; i < lines.length; i++) {
      const l = lines[i].trim();
      if (!l) continue;
      if (/^[a-z0-9_]+\s*:/i.test(l) && !l.startsWith("-")) break;

      if (l.startsWith("-")) {
        if (cur) items.push(cur);
        cur = { label: "", path: "" };
        const rest = l.replace(/^-+\s*/, "");
        if (rest) {
          const m = rest.match(/^label\s*:\s*(.+)$/i);
          if (m) cur.label = unquote(m[1]);
        }
        continue;
      }

      if (!cur) continue;
      const m1 = l.match(/^label\s*:\s*(.+)$/i);
      const m2 = l.match(/^path\s*:\s*(.+)$/i);
      if (m1) cur.label = unquote(m1[1]);
      if (m2) cur.path = unquote(m2[1]);
    }
    if (cur) items.push(cur);

    return items.filter((x) => x.path);
  }

  // =========================
  // FILES panel
  // =========================
  function renderFilesPanel(panel, files) {
    if (!panel) return;
    if (!files || files.length === 0) {
      panel.innerHTML = `<div style="opacity:.8">Нет прикреплённых файлов.</div>`;
      return;
    }
    panel.innerHTML = files
      .map((f) => {
        const label = f.label || f.path.split("/").pop();
        const href = toAbsUrl(f.path);
        return `
          <div style="margin:10px 0;">
            <a href="${href}" download style="text-decoration:none;">
              📎 ${escapeHtml(label)}
            </a>
          </div>`;
      })
      .join("");
  }

  // =========================
  // Fix asset links in rendered content
  // =========================
  function fixAssetLinks(container) {
    const imgs = container.querySelectorAll("img");
    imgs.forEach((img) => {
      const src = img.getAttribute("src") || "";
      if (src.startsWith("/assets/")) img.setAttribute("src", toAbsUrl(src.slice(1)));
      if (src.startsWith("assets/")) img.setAttribute("src", toAbsUrl(src));
    });

    const links = container.querySelectorAll("a");
    links.forEach((a) => {
      const href = a.getAttribute("href") || "";
      if (href.startsWith("/assets/")) a.setAttribute("href", toAbsUrl(href.slice(1)));
      if (href.startsWith("assets/")) a.setAttribute("href", toAbsUrl(href));
    });
  }

  // =========================
  // Replace decision rule text inside content
  // =========================
  function patchDecisionRule(container) {
    // заменяем в тексте (в любых местах) старую формулировку на новую
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach((n) => {
      const t = n.nodeValue || "";
      for (const oldFrag of DECISION_RULE_OLD_FRAGMENTS) {
        if (t.includes(oldFrag)) {
          n.nodeValue = t.replace(oldFrag, DECISION_RULE_NEW);
          break;
        }
      }
    });
  }

  // =========================
  // ORG CHART (HTML + SVG lines)
  // =========================
  function orgChartHtml() {
    return `
      <div class="fox-org-wrap" data-fox-org>
        <style>
          .fox-org-wrap{position:relative;margin:10px 0 0;padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:14px;background:rgba(0,0,0,.25);}
          .fox-org-title{font-weight:700;margin:0 0 10px 0;}
          .fox-org-sub{opacity:.75;margin:0 0 12px 0;font-size:13px;}
          .fox-org{position:relative;display:flex;flex-direction:column;align-items:center;gap:14px;padding:8px 6px 18px;}
          .fox-org-row{display:flex;gap:14px;flex-wrap:wrap;justify-content:center}
          .fox-node{position:relative;min-width:220px;max-width:280px;padding:10px 12px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.35);box-shadow:0 10px 30px rgba(0,0,0,.25);text-align:center}
          .fox-node .r{font-weight:700}
          .fox-node .d{opacity:.75;font-size:12px;margin-top:4px;line-height:1.35}
          .fox-lines{position:absolute;inset:0;pointer-events:none}
          .fox-note{margin-top:12px;opacity:.8;font-size:13px}
        </style>

        <div class="fox-org-title">Оргструктура (схема)</div>
        <div class="fox-org-sub">Оптимизация без расширения штата — связи и владельцы контуров.</div>

        <div class="fox-org" id="foxOrg">
          <svg class="fox-lines" id="foxOrgLines"></svg>

          <div class="fox-org-row">
            <div class="fox-node" data-id="owners">
              <div class="r">Собственники</div>
              <div class="d">Цели / бюджет / стратегические решения</div>
            </div>
          </div>

          <div class="fox-org-row">
            <div class="fox-node" data-id="coo">
              <div class="r">Опердир (COO)</div>
              <div class="d">Контур исполнения: план-факт, регламенты, KPI, эскалации</div>
            </div>
          </div>

          <div class="fox-org-row">
            <div class="fox-node" data-id="rop">
              <div class="r">РОП / Sales</div>
              <div class="d">Продажи, реклама, выполнение планов, отчётность</div>
            </div>
            <div class="fox-node" data-id="product">
              <div class="r">Продуктолог</div>
              <div class="d">Ассортимент, карточки, SEO/контент, матрица</div>
            </div>
            <div class="fox-node" data-id="buy">
              <div class="r">Закупщик</div>
              <div class="d">Поставки: ETA, риски, закрытие узких мест</div>
            </div>
            <div class="fox-node" data-id="ms">
              <div class="r">ОМ МойСклад</div>
              <div class="d">Учёт прихода/перемещений, инвентаризация, качество остатков</div>
            </div>
            <div class="fox-node" data-id="fin">
              <div class="r">Финансист</div>
              <div class="d">ДДС, P&amp;L, контроль расходов, прозрачность кассы</div>
            </div>
            <div class="fox-node" data-id="asst">
              <div class="r">Ассистент</div>
              <div class="d">Документооборот, протоколы, напоминания, сбор данных</div>
            </div>
          </div>
        </div>

        <div class="fox-note"><b>Правило решений:</b> ${escapeHtml(DECISION_RULE_NEW)}</div>
      </div>
    `;
  }

  function drawOrgLines(root) {
    const wrap = root.querySelector("[data-fox-org]");
    if (!wrap) return;

    const chart = wrap.querySelector("#foxOrg");
    const svg = wrap.querySelector("#foxOrgLines");
    if (!chart || !svg) return;

    const rect = chart.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));

    svg.setAttribute("width", String(w));
    svg.setAttribute("height", String(h));
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.innerHTML = "";

    const nodeById = {};
    chart.querySelectorAll(".fox-node[data-id]").forEach((el) => {
      nodeById[el.getAttribute("data-id")] = el;
    });

    const links = [
      ["owners", "coo"],
      ["coo", "rop"],
      ["coo", "product"],
      ["coo", "buy"],
      ["coo", "ms"],
      ["coo", "fin"],
      ["coo", "asst"],
    ];

    const chartRect = chart.getBoundingClientRect();

    function centerTop(el) {
      const r = el.getBoundingClientRect();
      return { x: r.left - chartRect.left + r.width / 2, y: r.top - chartRect.top };
    }
    function centerBottom(el) {
      const r = el.getBoundingClientRect();
      return { x: r.left - chartRect.left + r.width / 2, y: r.bottom - chartRect.top };
    }

    links.forEach(([from, to]) => {
      const a = nodeById[from];
      const b = nodeById[to];
      if (!a || !b) return;

      const p1 = centerBottom(a);
      const p2 = centerTop(b);

      const midY = p1.y + Math.min(26, Math.max(14, (p2.y - p1.y) / 2));

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute(
        "d",
        `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} L ${p1.x.toFixed(1)} ${midY.toFixed(
          1
        )} L ${p2.x.toFixed(1)} ${midY.toFixed(1)} L ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
      );
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "rgba(255,255,255,.22)");
      path.setAttribute("stroke-width", "1.2");
      path.setAttribute("stroke-linecap", "round");
      svg.appendChild(path);
    });
  }

  function replaceObjectObjectWithOrgChart(container) {
    // 1) находим элементы, где текст ровно "[object Object]"
    const all = Array.from(container.querySelectorAll("*"));
    const targets = all.filter((el) => (el.textContent || "").trim() === "[object Object]");

    if (targets.length > 0) {
      targets.forEach((el, idx) => {
        // заменяем первый найденный на нашу схему, остальные просто удаляем
        if (idx === 0) {
          const box = document.createElement("div");
          box.innerHTML = orgChartHtml();
          el.replaceWith(box);
        } else {
          el.remove();
        }
      });
      return true;
    }

    // 2) если вдруг это текстовый узел внутри блока — вычищаем
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    let found = false;

    nodes.forEach((n) => {
      if ((n.nodeValue || "").includes("[object Object]")) {
        n.nodeValue = (n.nodeValue || "").replace(/\[object Object\]/g, "");
        found = true;
      }
    });

    // если нашли, но не было “чистого элемента”, всё равно вставим схему после заголовка
    if (found) {
      insertOrgChartAfterHeader(container);
      return true;
    }

    return false;
  }

  function insertOrgChartAfterHeader(container) {
    const h2 = Array.from(container.querySelectorAll("h2, h3")).find((h) =>
      (h.textContent || "").toLowerCase().includes("оргструктура")
    );
    const anchor = h2 || container.querySelector("h1") || container.firstElementChild;
    if (!anchor) return;

    // не дублируем
    if (container.querySelector("[data-fox-org]")) return;

    const box = document.createElement("div");
    box.innerHTML = orgChartHtml();
    anchor.insertAdjacentElement("afterend", box);
  }

  // =========================
  // LOGO picker
  // =========================
  async function pickLogo(imgEl) {
    for (const rel of LOGO_CANDIDATES) {
      const url = toAbsUrl(rel);
      const ok = await canLoadImage(url);
      if (ok) {
        imgEl.src = url + (url.includes("?") ? "&" : "?") + cacheBust();
        imgEl.style.visibility = "visible";
        return;
      }
    }
  }

  function canLoadImage(url) {
    return new Promise((resolve) => {
      const i = new Image();
      i.onload = () => resolve(true);
      i.onerror = () => resolve(false);
      i.src = url + (url.includes("?") ? "&" : "?") + cacheBust();
    });
  }

  // =========================
  // Buttons + SPA nav
  // =========================
  function wireButtons(els, mdPath) {
    if (els.btnRefresh) els.btnRefresh.onclick = () => render();
    if (els.btnCopy) els.btnCopy.onclick = () => copyToClipboard(location.href);
    if (els.btnEdit) {
      els.btnEdit.onclick = () => window.open(REPO_EDIT_BASE + mdPath, "_blank", "noopener");
    }

    document.addEventListener("click", (e) => {
      const a = e.target && e.target.closest ? e.target.closest("a") : null;
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href) return;

      // внешние
      if (/^https?:\/\//i.test(href) || href.startsWith("mailto:") || href.startsWith("tel:")) return;

      // якоря
      if (href.startsWith("#")) return;

      // файлы — не перехватываем
      if (
        href.includes("assets/files/") ||
        href.endsWith(".pdf") ||
        href.endsWith(".docx") ||
        href.endsWith(".xlsx") ||
        href.endsWith(".zip")
      ) {
        return;
      }

      const abs = new URL(href, location.href);
      if (abs.origin !== location.origin) return;
      if (!abs.pathname.startsWith(BASE_PATH)) return;

      e.preventDefault();
      history.pushState({}, "", abs.pathname);
      render();
    });

    window.onpopstate = () => render();
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
  }

  // =========================
  // RENDER
  // =========================
  async function render() {
    const els = getEls();

    // лого
    if (els.logoImg) pickLogo(els.logoImg).catch(() => {});

    const route = getRoute();
    const mdPath = routeToMdPath(route);
    wireButtons(els, mdPath);

    if (els.updated) els.updated.textContent = new Date().toLocaleString("ru-RU");

    // загрузка markdown
    const mdUrl = toAbsUrl(mdPath) + "?" + cacheBust();
    let raw = "";
    try {
      const res = await fetch(mdUrl, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      raw = await res.text();
    } catch (e) {
      raw =
        `# Не найден файл\n` +
        `Путь: \`${mdPath}\`\n\n` +
        `Создай файл в репозитории: **docs/${mdPath}**\n`;
    }

    raw = String(raw ?? "");
    const { metaText, body } = splitFrontmatter(raw);

    const marked = await ensureMarked();
    marked.setOptions({ gfm: true, breaks: true });

    const html = marked.parse(body);
    els.content.innerHTML = html;

    // Title
    if (els.title) {
      const h1 = els.content.querySelector("h1");
      els.title.textContent = h1 ? h1.textContent.trim() : (route || "org-structure");
    }

    // assets links
    fixAssetLinks(els.content);

    // files panel
    const files = parseFilesFromMeta(metaText);
    renderFilesPanel(els.filesPanel, files);

    // правило решений — актуализировать текст в контенте
    patchDecisionRule(els.content);

    // критичный фикс: оргструктура “[object Object]” → заменить на схему
    const isOrg = (route || "org-structure") === "org-structure";
    if (isOrg) {
      const replaced = replaceObjectObjectWithOrgChart(els.content);
      if (!replaced) {
        // даже если не нашли — всё равно вставим схему после заголовка, чтобы точно была
        insertOrgChartAfterHeader(els.content);
      }

      // линии рисуем после layout
      requestAnimationFrame(() => {
        const root = els.content;
        drawOrgLines(root);
      });

      // перерисовка линий при ресайзе
      window.addEventListener("resize", () => drawOrgLines(els.content), { passive: true });
    }
  }

  // =========================
  // Utils
  // =========================
  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // =========================
  // INIT
  // =========================
  document.addEventListener("DOMContentLoaded", () => {
    render().catch((e) => {
      const els = getEls();
      els.content.innerHTML =
        `<h2>Ошибка загрузки</h2><pre style="white-space:pre-wrap;">${escapeHtml(e?.message || String(e))}</pre>`;
    });
  });
})();
