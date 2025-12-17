/* docs/assets/app.js
   Fox Ops Portal — stable renderer (Markdown + Mermaid + Files + GitHub Edit)
   Fixes: [object Object] on org-structure, base paths on GitHub Pages, cache busting.
*/
(() => {
  "use strict";

  // =========================
  // CONFIG (под твой репо)
  // =========================
  const REPO_OWNER = "Alisia777";
  const REPO_NAME = "Four";
  const BRANCH = "main";
  const REPO_EDIT_BASE = `https://github.com/${REPO_OWNER}/${REPO_NAME}/edit/${BRANCH}/docs/`; // <= как ты просила

  // Решение Дамира (порог согласования)
  const DECISION_RULE_TEXT =
    "Изменения, которые опускают цену/маржу ниже плановых значений — согласовать с Опердиром (COO). " +
    "Повышение цены выше плановой (без ухудшения маржи) — на усмотрение менеджера, без согласования.";

  // Кандидаты логотипа (первый существующий подхватится)
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
    // GitHub Pages project site: https://<user>.github.io/<repo>/
    // тогда pathname начинается с "/<repo>/..."
    const parts = location.pathname.split("/").filter(Boolean);
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
  // DOM HELPERS (не ломаем верстку)
  // =========================
  const $ = (sel) => document.querySelector(sel);

  // максимально “мягко” ищем элементы, чтобы код жил при любых айдишниках
  const getEls = () => {
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

    const breadcrumbs =
      $("#breadcrumbs") ||
      $("#doc-breadcrumbs") ||
      $(".breadcrumbs") ||
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

    // “Правило:” плашка (если есть)
    const rulePill =
      $("#rulePill") ||
      $(".rule-pill") ||
      $('[data-role="rule-pill"]') ||
      null;

    // логотип (если есть img)
    const logoImg =
      $("#brandLogo") ||
      $(".brand__logo img") ||
      $(".logo img") ||
      $('img[alt*="Fox"]') ||
      $('img[alt*="fox"]') ||
      null;

    return {
      content,
      title,
      breadcrumbs,
      updated,
      btnRefresh,
      btnCopy,
      btnEdit,
      filesPanel,
      rulePill,
      logoImg,
    };
  };

  // =========================
  // MARKDOWN + FRONTMATTER
  // =========================
  function splitFrontmatter(md) {
    const text = String(md ?? "");
    if (!text.startsWith("---")) {
      return { metaText: "", body: text };
    }
    const end = text.indexOf("\n---", 3);
    if (end === -1) return { metaText: "", body: text };
    const metaText = text.slice(3, end).trim();
    const body = text.slice(end + 4).replace(/^\s+/, "");
    return { metaText, body };
  }

  // очень простой парсер для files: в frontmatter
  // формат:
  // files:
  //   - label: "..."
  //     path: "assets/files/..."
  function parseFilesFromMeta(metaText) {
    const lines = (metaText || "").split("\n").map((l) => l.trimEnd());
    const idx = lines.findIndex((l) => /^files\s*:\s*$/i.test(l.trim()));
    if (idx === -1) return [];

    const items = [];
    let cur = null;

    for (let i = idx + 1; i < lines.length; i++) {
      const l = lines[i].trim();
      if (!l) continue;
      if (/^[a-z0-9_]+\s*:/i.test(l) && !l.startsWith("-")) break; // новый раздел meta

      if (l.startsWith("-")) {
        if (cur) items.push(cur);
        cur = { label: "", path: "" };
        const rest = l.replace(/^-+\s*/, "");
        if (rest) {
          // - label: "x"
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

  function unquote(s) {
    const t = String(s ?? "").trim();
    return t.replace(/^["']|["']$/g, "");
  }

  async function ensureMarked() {
    if (window.marked) return window.marked;
    // подгружаем marked, если нет
    await loadScript("https://cdn.jsdelivr.net/npm/marked/marked.min.js");
    return window.marked;
  }

  async function ensureMermaid() {
    if (window.mermaid) return window.mermaid;
    await loadScript("https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js");
    return window.mermaid;
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
    // ожидается /Four/<slug>
    const path = location.pathname.replace(BASE_PATH, "/");
    const clean = path.replace(/^\/+/, "").replace(/\/+$/, "");
    return clean || ""; // "" = home
  }

  function routeToMdPath(route) {
    // твои страницы — slug-и совпадают с именем md
    // /org-structure => content/org-structure.md
    const slug = route || "org-structure"; // если главная пустая — ведём на структуру
    return `content/${slug}.md`;
  }

  // =========================
  // RENDER
  // =========================
  const FALLBACK_ORG_MERMAID = `flowchart TB
    CEO["Собственники"] --> COO["Опердир (COO)"]
    COO --> ROP["РОП / Sales"]
    COO --> PROD["Продуктолог / Product"]
    COO --> BUY["Закупщик / Procurement"]
    COO --> MS["ОМ МойСклад / Warehouse Ops"]
    COO --> FIN["Финансист / Finance"]
    COO --> ASST["Ассистент / Assistant"]

    ROP <--> PROD
    PROD <--> BUY
    BUY <--> MS
    FIN <--> COO
  `;

  async function render() {
    const els = getEls();
    applyDecisionRule(els);

    // логотип: подхватить первый существующий
    if (els.logoImg) pickLogo(els.logoImg).catch(() => {});

    const route = getRoute();
    const mdPath = routeToMdPath(route);

    // кнопки
    wireButtons(els, route, mdPath);

    // заголовки/крошки
    if (els.breadcrumbs) els.breadcrumbs.textContent = route ? route.replace(/-/g, " / ") : "Главная";
    if (els.updated) els.updated.textContent = new Date().toLocaleString("ru-RU");

    // загрузка md
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

    // защита от ситуации "[object Object]" в исходнике (или когда кто-то сунул объект вместо строки)
    raw = String(raw ?? "");

    // frontmatter + body
    const { metaText, body } = splitFrontmatter(raw);

    // если на странице оргструктуры вместо диаграммы выводится [object Object],
    // то добавляем fallback mermaid блок (чтобы точно отрисовалось)
    const isOrg = (route || "org-structure") === "org-structure";
    let safeBody = body;

    if (isOrg && safeBody.includes("[object Object]")) {
      safeBody = safeBody.replace("[object Object]", "");
      safeBody =
        safeBody +
        `\n\n## Оргструктура (диаграмма)\n\n\`\`\`mermaid\n${FALLBACK_ORG_MERMAID}\n\`\`\`\n`;
    }

    // markdown -> html
    const marked = await ensureMarked();
    marked.setOptions({
      gfm: true,
      breaks: true,
    });

    const html = marked.parse(safeBody);

    // вставка
    els.content.innerHTML = html;

    // title из первого h1 (если есть)
    if (els.title) {
      const h1 = els.content.querySelector("h1");
      els.title.textContent = h1 ? h1.textContent.trim() : humanTitleFromRoute(route);
    }

    // правим относительные ссылки на assets/files и assets/img (на случай кривых путей)
    fixAssetLinks(els.content);

    // рендер мермейда
    await renderMermaidInside(els.content);

    // файлы (из frontmatter)
    const files = parseFilesFromMeta(metaText);
    renderFilesPanel(els.filesPanel, files);
  }

  function humanTitleFromRoute(route) {
    const slug = route || "org-structure";
    return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function wireButtons(els, route, mdPath) {
    if (els.btnRefresh) {
      els.btnRefresh.onclick = () => render();
    }
    if (els.btnCopy) {
      els.btnCopy.onclick = async () => {
        try {
          await navigator.clipboard.writeText(location.href);
        } catch {
          // fallback
          const ta = document.createElement("textarea");
          ta.value = location.href;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }
      };
    }
    if (els.btnEdit) {
      els.btnEdit.onclick = () => {
        const editUrl = REPO_EDIT_BASE + mdPath;
        window.open(editUrl, "_blank", "noopener");
      };
    }

    // перехват кликов по внутренним ссылкам (SPA)
    document.addEventListener("click", (e) => {
      const a = e.target && e.target.closest ? e.target.closest("a") : null;
      if (!a) return;

      const href = a.getAttribute("href");
      if (!href) return;

      // внешние не трогаем
      if (/^https?:\/\//i.test(href) || href.startsWith("mailto:") || href.startsWith("tel:")) return;

      // якоря
      if (href.startsWith("#")) return;

      // ссылки на файлы открываем обычно
      if (href.includes("assets/files/") || href.endsWith(".pdf") || href.endsWith(".docx") || href.endsWith(".xlsx")) {
        return;
      }

      // иначе считаем внутренней страницей
      const abs = new URL(href, location.href);
      if (abs.origin !== location.origin) return;

      // внутри базового префикса?
      if (!abs.pathname.startsWith(BASE_PATH)) return;

      e.preventDefault();
      history.pushState({}, "", abs.pathname);
      render();
    });

    window.onpopstate = () => render();
  }

  function applyDecisionRule(els) {
    if (!els.rulePill) return;
    // если там уже есть “Правило:” — заменим текст на актуальный
    els.rulePill.textContent = `Правило: ${DECISION_RULE_TEXT}`;
  }

  async function pickLogo(imgEl) {
    for (const rel of LOGO_CANDIDATES) {
      const url = toAbsUrl(rel);
      try {
        const ok = await canLoadImage(url);
        if (ok) {
          imgEl.src = url;
          imgEl.style.visibility = "visible";
          return;
        }
      } catch {}
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

  function fixAssetLinks(container) {
    // картинки: если кто-то в md написал /assets/..., делаем правильно для GitHub Pages
    const imgs = container.querySelectorAll("img");
    imgs.forEach((img) => {
      const src = img.getAttribute("src") || "";
      if (src.startsWith("/assets/")) img.setAttribute("src", toAbsUrl(src.slice(1)));
      if (src.startsWith("assets/")) img.setAttribute("src", toAbsUrl(src));
    });

    // ссылки на файлы
    const links = container.querySelectorAll("a");
    links.forEach((a) => {
      const href = a.getAttribute("href") || "";
      if (href.startsWith("/assets/")) a.setAttribute("href", toAbsUrl(href.slice(1)));
      if (href.startsWith("assets/")) a.setAttribute("href", toAbsUrl(href));
    });
  }

  async function renderMermaidInside(container) {
    // ищем мермейд блоки
    const codeBlocks = Array.from(container.querySelectorAll("pre > code"))
      .filter((c) => (c.className || "").includes("language-mermaid") || (c.className || "").includes("lang-mermaid"));

    // если marked не поставил class — попробуем найти по содержимому fence (на всякий)
    if (codeBlocks.length === 0) {
      // ничего
    }

    if (codeBlocks.length === 0) return;

    const mermaid = await ensureMermaid();
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: "dark",
    });

    // заменяем на div.mermaid
    const nodes = [];
    codeBlocks.forEach((code) => {
      const pre = code.parentElement;
      const src = code.textContent || "";
      const div = document.createElement("div");
      div.className = "mermaid";
      div.textContent = src; // важно: именно текст, не объект
      pre.replaceWith(div);
      nodes.push(div);
    });

    try {
      // mermaid 10+
      await mermaid.run({ nodes });
    } catch (e) {
      // если упало — покажем текстом, но без [object Object]
      nodes.forEach((n) => {
        n.innerHTML =
          `<div style="padding:12px;border:1px solid rgba(255,255,255,.12);border-radius:12px;">` +
          `<b>Mermaid error</b><br><pre style="white-space:pre-wrap;margin:10px 0 0;">${escapeHtml(n.textContent || "")}</pre>` +
          `</div>`;
      });
    }
  }

  function renderFilesPanel(panel, files) {
    if (!panel) return;
    if (!files || files.length === 0) {
      panel.innerHTML = `<div style="opacity:.8">Нет прикреплённых файлов.</div>`;
      return;
    }

    const items = files
      .map((f) => {
        const label = f.label || f.path.split("/").pop();
        const href = toAbsUrl(f.path);
        // download атрибут помогает “скачиванию кнопкой”
        return `
          <div style="margin:10px 0;">
            <a href="${href}" download style="text-decoration:none;">
              📎 ${escapeHtml(label)}
            </a>
          </div>`;
      })
      .join("");

    panel.innerHTML = items;
  }

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
      // на крайний случай — не оставляем “вечную загрузку”
      const els = getEls();
      els.content.innerHTML =
        `<h2>Ошибка загрузки</h2><pre style="white-space:pre-wrap;">${escapeHtml(e?.message || String(e))}</pre>`;
    });
  });
})();
