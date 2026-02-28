/* =========================
   RESPONSIVE MODE
   ========================= */
const MOBILE_MAX_W = 768;
function isMobile() {
  return window.innerWidth <= MOBILE_MAX_W;
}

/* =========================
   JSON LOADING (robust)
   ========================= */
async function fetchJSONAny(paths) {
  let lastErr = null;
  for (const p of paths) {
    try {
      const res = await fetch(p, { cache: "no-store" });
      if (!res.ok) {
        lastErr = new Error(`${p} -> ${res.status}`);
        continue;
      }
      return await res.json();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Failed to load JSON");
}

/* =========================
   FORMATTERS
   ========================= */
function pct(x) {
  const n = Number(x);
  return Number.isFinite(n) ? (n * 100).toFixed(1) + "%" : "";
}
function num(x, d = 3) {
  const n = Number(x);
  return Number.isFinite(n) ? n.toFixed(d) : "";
}
function oddsFmt(x) {
  if (x === null || x === undefined || x === "") return "";
  const n = Number(x);
  return Number.isFinite(n) ? String(Math.trunc(n)) : String(x);
}
function safeStr(x) {
  if (x === null || x === undefined) return "";
  return String(x);
}

/* 🔥 Flame cell formatter: show flame if prob >= 0.80 */
function flameFormatter(cell) {
  const v = Number(cell.getValue());
  return Number.isFinite(v) && v >= 0.80 ? "🔥" : "";
}

/* Extract p=0.xxx from pick text */
function extractProbFromPick(txt) {
  if (!txt) return "";
  const m = String(txt).match(/p\s*=\s*(0\.\d+)/i);
  return m ? Number(m[1]) : "";
}
function hasFlameFromPick(txt) {
  const p = extractProbFromPick(txt);
  return Number.isFinite(p) && p >= 0.80;
}

/* =========================
   NORMALIZE DATA (match your cleaned Excel columns)
   ========================= */
function normalizeMoneyline(rows) {
  return (rows || []).map(r => {
    const away = r.away ?? "";
    const home = r.home ?? "";
    const awayModel = Number(r.away_model_win_prob ?? 0) || 0;
    const homeModel = Number(r.home_model_win_prob ?? 0) || 0;

    return {
      date: r.date ?? "",
      away,
      home,
      away_ml: r.away_ml ?? "",
      home_ml: r.home_ml ?? "",
      away_market_win_prob: r.away_market_win_prob ?? "",
      home_market_win_prob: r.home_market_win_prob ?? "",
      away_model_win_prob: r.away_model_win_prob ?? "",
      home_model_win_prob: r.home_model_win_prob ?? "",
      away_ml_edge: r.away_ml_edge ?? "",
      home_ml_edge: r.home_ml_edge ?? "",
      sd_margin: r.sd_margin ?? "",
      away_proj_pts: r.away_proj_pts ?? "",
      home_proj_pts: r.home_proj_pts ?? "",
      "Model pick": r["Model pick"] ?? r.Model_pick ?? r.model_pick ?? "",
      ml_best_prob: Math.max(awayModel, homeModel),
    };
  });
}

function normalizeProps(rows) {
  return (rows || []).map(r => {
    const cons = r.pick_conservative ?? "";
    return {
      Player: r.Player ?? "",
      Position: r.Position ?? "",
      Team: r.Team ?? "",
      Opponent: r.Opponent ?? "",
      dvp_rank_pos: r.dvp_rank_pos ?? "",
      season_mean: r.season_mean ?? "",
      dk_line: r.dk_line ?? "",
      dk_odds_under: r.dk_odds_under ?? "",
      dk_odds_over: r.dk_odds_over ?? "",
      fd_line: r.fd_line ?? "",
      fd_odds_under: r.fd_odds_under ?? "",
      fd_odds_over: r.fd_odds_over ?? "",
      pick_conservative: cons,
      pick_moderate: r.pick_moderate ?? "",
      pick_risky: r.pick_risky ?? "",
      best_prob_proxy: extractProbFromPick(cons),
    };
  });
}

/* =========================
   TABULATOR TABLE BUILDERS (DESKTOP)
   ========================= */

function baseTableOptions() {
  return {
    layout: "fitDataFill",
    responsiveLayout: "hide",
    responsiveLayoutCollapseStartOpen: false,
    height: "calc(100vh - 240px)",
    placeholder: "No data available",
  };
}

function buildMoneylineTable(el, data) {
  return new Tabulator(el, {
    ...baseTableOptions(),
    data,
    initialSort: [{ column: "ml_best_prob", dir: "desc" }],
    columns: [
      { title: "", field: "ml_best_prob", formatter: flameFormatter, headerFormatter: () => "", hozAlign: "center", width: 46, headerSort: false, responsive: 0 },
      { title: "Date", field: "date", widthGrow: 1, responsive: 6 },
      { title: "Away", field: "away", widthGrow: 1, responsive: 0 },
      { title: "Home", field: "home", widthGrow: 1, responsive: 0 },
      { title: "Away ML", field: "away_ml", formatter: c => oddsFmt(c.getValue()), hozAlign: "right", widthGrow: 1, responsive: 5 },
      { title: "Home ML", field: "home_ml", formatter: c => oddsFmt(c.getValue()), hozAlign: "right", widthGrow: 1, responsive: 5 },
      { title: "Away Mkt %", field: "away_market_win_prob", formatter: c => pct(c.getValue()), hozAlign: "right", widthGrow: 1, responsive: 7 },
      { title: "Home Mkt %", field: "home_market_win_prob", formatter: c => pct(c.getValue()), hozAlign: "right", widthGrow: 1, responsive: 7 },
      { title: "Away Model %", field: "away_model_win_prob", formatter: c => pct(c.getValue()), hozAlign: "right", widthGrow: 1, responsive: 1 },
      { title: "Home Model %", field: "home_model_win_prob", formatter: c => pct(c.getValue()), hozAlign: "right", widthGrow: 1, responsive: 1 },
      { title: "Away Edge", field: "away_ml_edge", formatter: c => num(c.getValue(), 3), hozAlign: "right", widthGrow: 1, responsive: 8 },
      { title: "Home Edge", field: "home_ml_edge", formatter: c => num(c.getValue(), 3), hozAlign: "right", widthGrow: 1, responsive: 8 },
      { title: "SD", field: "sd_margin", formatter: c => num(c.getValue(), 2), hozAlign: "right", widthGrow: 1, responsive: 9 },
      { title: "Away Pts", field: "away_proj_pts", formatter: c => num(c.getValue(), 1), hozAlign: "right", widthGrow: 1, responsive: 9 },
      { title: "Home Pts", field: "home_proj_pts", formatter: c => num(c.getValue(), 1), hozAlign: "right", widthGrow: 1, responsive: 9 },
      { title: "Model Pick", field: "Model pick", widthGrow: 1, responsive: 0 },
    ],
  });
}

function buildPropsTable(el, data) {
  return new Tabulator(el, {
    ...baseTableOptions(),
    data,
    initialSort: [{ column: "best_prob_proxy", dir: "desc" }],
    columns: [
      { title: "", field: "best_prob_proxy", formatter: flameFormatter, headerFormatter: () => "", hozAlign: "center", width: 46, headerSort: false, responsive: 0 },
      { title: "Player", field: "Player", widthGrow: 1.4, responsive: 0 },
      { title: "Pos", field: "Position", widthGrow: 0.6, responsive: 4 },
      { title: "Team", field: "Team", widthGrow: 0.9, responsive: 1 },
      { title: "Opp", field: "Opponent", widthGrow: 0.9, responsive: 1 },
      { title: "DvP", field: "dvp_rank_pos", hozAlign: "right", widthGrow: 0.7, responsive: 5 },
      { title: "Season", field: "season_mean", formatter: c => num(c.getValue(), 2), hozAlign: "right", widthGrow: 0.8, responsive: 6 },

      { title: "DK L", field: "dk_line", hozAlign: "right", widthGrow: 0.8, responsive: 7 },
      { title: "DK O", field: "dk_odds_over", formatter: c => oddsFmt(c.getValue()), hozAlign: "right", widthGrow: 0.7, responsive: 8 },
      { title: "DK U", field: "dk_odds_under", formatter: c => oddsFmt(c.getValue()), hozAlign: "right", widthGrow: 0.7, responsive: 8 },

      { title: "FD L", field: "fd_line", hozAlign: "right", widthGrow: 0.8, responsive: 7 },
      { title: "FD O", field: "fd_odds_over", formatter: c => oddsFmt(c.getValue()), hozAlign: "right", widthGrow: 0.7, responsive: 8 },
      { title: "FD U", field: "fd_odds_under", formatter: c => oddsFmt(c.getValue()), hozAlign: "right", widthGrow: 0.7, responsive: 8 },

      { title: "Conservative", field: "pick_conservative", widthGrow: 1.8, responsive: 0 },
      { title: "Moderate", field: "pick_moderate", widthGrow: 1.8, responsive: 1 },
      { title: "Risky", field: "pick_risky", widthGrow: 1.8, responsive: 2 },
    ],
  });
}

/* =========================
   MOBILE CARD RENDERING
   ========================= */

function clearNode(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function cardEl(html) {
  const d = document.createElement("div");
  d.className = "mcard";
  d.innerHTML = html;
  return d;
}

function renderMoneylineCards(container, rows) {
  clearNode(container);
  const frag = document.createDocumentFragment();

  (rows || []).forEach(r => {
    const flame = (Number(r.ml_best_prob) >= 0.80) ? "🔥" : "";
    const html = `
      <div class="mcard-top">
        <div class="mcard-title">${flame} ${safeStr(r.away)} @ ${safeStr(r.home)}</div>
        <div class="mcard-sub">${safeStr(r.date)}</div>
      </div>

      <div class="mcard-pick">
        <div class="pill pill-primary">Pick</div>
        <div class="mcard-picktext">${safeStr(r["Model pick"])}</div>
      </div>

      <div class="mcard-grid">
        <div class="kv"><div class="k">Away Model</div><div class="v">${pct(r.away_model_win_prob)}</div></div>
        <div class="kv"><div class="k">Home Model</div><div class="v">${pct(r.home_model_win_prob)}</div></div>
        <div class="kv"><div class="k">Away Edge</div><div class="v">${num(r.away_ml_edge, 3)}</div></div>
        <div class="kv"><div class="k">Home Edge</div><div class="v">${num(r.home_ml_edge, 3)}</div></div>
      </div>

      <details class="mcard-more">
        <summary>More</summary>
        <div class="mcard-grid">
          <div class="kv"><div class="k">Away ML</div><div class="v">${oddsFmt(r.away_ml)}</div></div>
          <div class="kv"><div class="k">Home ML</div><div class="v">${oddsFmt(r.home_ml)}</div></div>
          <div class="kv"><div class="k">Away Mkt</div><div class="v">${pct(r.away_market_win_prob)}</div></div>
          <div class="kv"><div class="k">Home Mkt</div><div class="v">${pct(r.home_market_win_prob)}</div></div>
          <div class="kv"><div class="k">SD</div><div class="v">${num(r.sd_margin, 2)}</div></div>
          <div class="kv"><div class="k">Proj Pts</div><div class="v">${num(r.away_proj_pts, 1)} - ${num(r.home_proj_pts, 1)}</div></div>
        </div>
      </details>
    `;
    frag.appendChild(cardEl(html));
  });

  container.appendChild(frag);
}

function renderPropsCards(container, rows) {
  clearNode(container);
  const frag = document.createDocumentFragment();

  (rows || []).forEach(r => {
    const flame = hasFlameFromPick(r.pick_conservative) ? "🔥" : "";
    const title = `${flame} ${safeStr(r.Player)} (${safeStr(r.Team)} vs ${safeStr(r.Opponent)})`;
    const meta = `${safeStr(r.Position)} • DvP ${safeStr(r.dvp_rank_pos)} • Season ${num(r.season_mean, 2)}`;

    const html = `
      <div class="mcard-top">
        <div class="mcard-title">${title}</div>
        <div class="mcard-sub">${meta}</div>
      </div>

      <div class="mcard-picks">
        <div class="pickrow pick-cons">
          <div class="pill">Conservative</div>
          <div class="picktext">${safeStr(r.pick_conservative)}</div>
        </div>
        <div class="pickrow pick-mod">
          <div class="pill">Moderate</div>
          <div class="picktext">${safeStr(r.pick_moderate)}</div>
        </div>
        <div class="pickrow pick-risk">
          <div class="pill">Risky</div>
          <div class="picktext">${safeStr(r.pick_risky)}</div>
        </div>
      </div>

      <details class="mcard-more">
        <summary>Books / Lines</summary>
        <div class="mcard-grid">
          <div class="kv"><div class="k">DK Line</div><div class="v">${safeStr(r.dk_line)}</div></div>
          <div class="kv"><div class="k">DK O/U</div><div class="v">${oddsFmt(r.dk_odds_over)} / ${oddsFmt(r.dk_odds_under)}</div></div>
          <div class="kv"><div class="k">FD Line</div><div class="v">${safeStr(r.fd_line)}</div></div>
          <div class="kv"><div class="k">FD O/U</div><div class="v">${oddsFmt(r.fd_odds_over)} / ${oddsFmt(r.fd_odds_under)}</div></div>
        </div>
      </details>
    `;
    frag.appendChild(cardEl(html));
  });

  container.appendChild(frag);
}

/* =========================
   SEARCH (tables vs cards)
   ========================= */
let activeMode = "table"; // "table" | "cards"
let activeView = "moneyline";
let activeTable = null;

let DATA = {
  moneyline: [],
  points: [],
  pa: [],
  pra: [],
};

function rowMatchesQuery(row, q) {
  const keys = [
    "Player","Team","Opponent","Position",
    "away","home",
    "Model pick",
    "pick_conservative","pick_moderate","pick_risky",
  ];
  return keys.some(k => safeStr(row[k]).toLowerCase().includes(q));
}

function applyGlobalSearch(query) {
  const q = query.toLowerCase().trim();
  if (!q) {
    if (activeMode === "table" && activeTable) activeTable.clearFilter();
    if (activeMode === "cards") renderActiveCards(""); // rerender full
    return;
  }

  if (activeMode === "table" && activeTable) {
    activeTable.setFilter(row => rowMatchesQuery(row, q));
  } else if (activeMode === "cards") {
    renderActiveCards(q);
  }
}

/* =========================
   VIEW SWITCHING
   ========================= */
function setViewTitle(title, hint) {
  document.getElementById("viewTitle").textContent = title;
  document.getElementById("viewHint").textContent = hint;
}

function setActiveViewEl(viewId) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  const viewEl = document.getElementById(`view-${viewId}`);
  if (viewEl) viewEl.classList.add("active");

  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  const btn = document.querySelector(`.tab-btn[data-view="${viewId}"]`);
  if (btn) btn.classList.add("active");
}

function renderActiveCards(q) {
  const query = q || "";
  const wrap = (id) => document.querySelector(`#tbl${id}`);
  // Note: existing IDs: tblMoneyline, tblPoints, tblPA, tblPRA
  // We'll map based on activeView.
  let rows = [];
  let container = null;

  if (activeView === "moneyline") {
    rows = DATA.moneyline;
    container = document.getElementById("tblMoneyline");
    const filtered = query ? rows.filter(r => rowMatchesQuery(r, query)) : rows;
    renderMoneylineCards(container, filtered);
    return;
  }

  if (activeView === "points") {
    rows = DATA.points;
    container = document.getElementById("tblPoints");
    const filtered = query ? rows.filter(r => rowMatchesQuery(r, query)) : rows;
    renderPropsCards(container, filtered);
    return;
  }

  if (activeView === "pa") {
    rows = DATA.pa;
    container = document.getElementById("tblPA");
    const filtered = query ? rows.filter(r => rowMatchesQuery(r, query)) : rows;
    renderPropsCards(container, filtered);
    return;
  }

  if (activeView === "pra") {
    rows = DATA.pra;
    container = document.getElementById("tblPRA");
    const filtered = query ? rows.filter(r => rowMatchesQuery(r, query)) : rows;
    renderPropsCards(container, filtered);
    return;
  }
}

function switchView(viewId, title, hint, table) {
  activeView = viewId;

  setActiveViewEl(viewId);
  setViewTitle(title, hint);

  if (isMobile()) {
    activeMode = "cards";
    activeTable = null;
    renderActiveCards((document.getElementById("globalSearch").value || "").toLowerCase().trim());
  } else {
    activeMode = "table";
    activeTable = table;
    setTimeout(() => table.redraw(true), 50);
    applyGlobalSearch(document.getElementById("globalSearch").value || "");
  }
}

/* =========================
   INIT
   ========================= */
let TABLES = {
  moneyline: null,
  points: null,
  pa: null,
  pra: null,
};

async function init() {
  const [mlRaw, ptRaw, paRaw, praRaw] = await Promise.all([
    fetchJSONAny(["./data/moneyline.json", "./moneyline.json"]),
    fetchJSONAny(["./data/points_lines.json", "./points_lines.json"]),
    fetchJSONAny(["./data/pa_lines.json", "./pa_lines.json"]),
    fetchJSONAny(["./data/pra_lines.json", "./pra_lines.json"]),
  ]);

  DATA.moneyline = normalizeMoneyline(mlRaw);
  DATA.points = normalizeProps(ptRaw);
  DATA.pa = normalizeProps(paRaw);
  DATA.pra = normalizeProps(praRaw);

  // Desktop tables
  TABLES.moneyline = buildMoneylineTable("#tblMoneyline", DATA.moneyline);
  TABLES.points = buildPropsTable("#tblPoints", DATA.points);
  TABLES.pa = buildPropsTable("#tblPA", DATA.pa);
  TABLES.pra = buildPropsTable("#tblPRA", DATA.pra);

  // Default active view
  if (isMobile()) {
    activeMode = "cards";
    activeView = "moneyline";
    setActiveViewEl("moneyline");
    setViewTitle("Moneyline Bets", "Moneyline model win probabilities");
    renderActiveCards("");
  } else {
    activeMode = "table";
    activeTable = TABLES.moneyline;
  }

  // Tabs
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const v = btn.dataset.view;

      if (v === "moneyline")
        switchView("moneyline", "Moneyline Bets", "Moneyline model win probabilities", TABLES.moneyline);

      if (v === "points")
        switchView("points", "Points Lines", "Points tier picks", TABLES.points);

      if (v === "pa")
        switchView("pa", "Points + Assists", "PA tier picks", TABLES.pa);

      if (v === "pra")
        switchView("pra", "Points + Rebounds + Assists", "PRA tier picks", TABLES.pra);
    });
  });

  // Search
  const search = document.getElementById("globalSearch");
  const clearBtn = document.getElementById("clearSearchBtn");

  search.addEventListener("input", () => applyGlobalSearch(search.value));
  clearBtn.addEventListener("click", () => {
    search.value = "";
    applyGlobalSearch("");
  });

  document.getElementById("reloadBtn").addEventListener("click", () => location.reload());

  // Re-render on resize (rotate phone / change width)
  window.addEventListener("resize", () => {
    const wasMobile = activeMode === "cards";
    const nowMobile = isMobile();

    if (nowMobile && !wasMobile) {
      // switch to cards
      activeMode = "cards";
      activeTable = null;
      renderActiveCards((document.getElementById("globalSearch").value || "").toLowerCase().trim());
    } else if (!nowMobile && wasMobile) {
      // switch back to tables
      activeMode = "table";
      // set activeTable based on activeView
      activeTable =
        activeView === "moneyline" ? TABLES.moneyline :
        activeView === "points" ? TABLES.points :
        activeView === "pa" ? TABLES.pa :
        TABLES.pra;

      setTimeout(() => activeTable.redraw(true), 50);
      applyGlobalSearch(document.getElementById("globalSearch").value || "");
    }
  });
}

init().catch(err => {
  console.error(err);
  alert("Error loading dashboard. Check console for details.");
});
