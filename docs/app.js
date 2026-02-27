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

/* 🔥 Flame cell formatter: show flame if prob >= 0.80 */
function flameFormatter(cell) {
  const v = Number(cell.getValue());
  return Number.isFinite(v) && v >= 0.80 ? "🔥" : "";
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

      // flame driver: max model win prob
      ml_best_prob: Math.max(awayModel, homeModel),
    };
  });
}

function normalizeSpreads(rows) {
  return (rows || []).map(r => {
    const awayCover = Number(r.away_model_cover_prob ?? 0) || 0;
    const homeCover = Number(r.home_model_cover_prob ?? 0) || 0;

    return {
      date: r.date ?? "",
      away: r.away ?? "",
      home: r.home ?? "",
      away_spread: r.away_spread ?? "",
      home_spread: r.home_spread ?? "",

      market_cover_prob_assumed: r.market_cover_prob_assumed ?? "",
      away_model_cover_prob: r.away_model_cover_prob ?? "",
      home_model_cover_prob: r.home_model_cover_prob ?? "",

      away_spread_edge: r.away_spread_edge ?? "",
      home_spread_edge: r.home_spread_edge ?? "",

      away_proj_pts: r.away_proj_pts ?? "",
      home_proj_pts: r.home_proj_pts ?? "",
      total: r.total ?? "",

      "Model pick": r["Model pick"] ?? r.Model_pick ?? r.model_pick ?? "",

      pick_conservative: r.pick_conservative ?? "",
      pick_moderate: r.pick_moderate ?? "",
      pick_risky: r.pick_risky ?? "",

      // flame driver: max cover prob
      spread_best_prob: Math.max(awayCover, homeCover),
    };
  });
}

function normalizeProps(rows) {
  return (rows || []).map(r => ({
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

    pick_conservative: r.pick_conservative ?? "",
    pick_moderate: r.pick_moderate ?? "",
    pick_risky: r.pick_risky ?? "",

    // flame driver: if your picks include p=0.xxx, you could parse it.
    // For now: no flame based on pick text; leaving blank is fine.
    // We'll compute a simple proxy: if pick_conservative contains "p=0." parse it.
    best_prob_proxy: extractProbFromPick(r.pick_conservative),
  }));
}

function extractProbFromPick(txt) {
  if (!txt) return "";
  // supports "... p=0.823 ..." or "... p=0.82 ..."
  const m = String(txt).match(/p\s*=\s*(0\.\d+)/i);
  return m ? Number(m[1]) : "";
}

/* =========================
   TABLE BUILDERS
   ========================= */

function buildMoneylineTable(el, data) {
  return new Tabulator(el, {
    data,
    layout: "fitColumns",
    responsiveLayout: false,
    height: "100%",
    initialSort: [{ column: "ml_best_prob", dir: "desc" }],
    columns: [
      {
        title: "",
        field: "ml_best_prob",
        formatter: flameFormatter,
        headerFormatter: () => "",
        hozAlign: "center",
        width: 50,
        headerSort: false,
      },
      { title: "Date", field: "date", widthGrow: 1 },
      { title: "Away", field: "away", widthGrow: 1 },
      { title: "Home", field: "home", widthGrow: 1 },

      { title: "Away ML", field: "away_ml", formatter: c => oddsFmt(c.getValue()), hozAlign: "right", widthGrow: 1 },
      { title: "Home ML", field: "home_ml", formatter: c => oddsFmt(c.getValue()), hozAlign: "right", widthGrow: 1 },

      { title: "Away Mkt %", field: "away_market_win_prob", formatter: c => pct(c.getValue()), hozAlign: "right", widthGrow: 1 },
      { title: "Home Mkt %", field: "home_market_win_prob", formatter: c => pct(c.getValue()), hozAlign: "right", widthGrow: 1 },

      { title: "Away Model %", field: "away_model_win_prob", formatter: c => pct(c.getValue()), hozAlign: "right", widthGrow: 1 },
      { title: "Home Model %", field: "home_model_win_prob", formatter: c => pct(c.getValue()), hozAlign: "right", widthGrow: 1 },

      { title: "Away Edge", field: "away_ml_edge", formatter: c => num(c.getValue(), 3), hozAlign: "right", widthGrow: 1 },
      { title: "Home Edge", field: "home_ml_edge", formatter: c => num(c.getValue(), 3), hozAlign: "right", widthGrow: 1 },

      { title: "SD", field: "sd_margin", formatter: c => num(c.getValue(), 2), hozAlign: "right", widthGrow: 1 },
      { title: "Away Pts", field: "away_proj_pts", formatter: c => num(c.getValue(), 1), hozAlign: "right", widthGrow: 1 },
      { title: "Home Pts", field: "home_proj_pts", formatter: c => num(c.getValue(), 1), hozAlign: "right", widthGrow: 1 },

      { title: "Model Pick", field: "Model pick", widthGrow: 1 },
    ],
  });
}

function buildSpreadsTable(el, data) {
  return new Tabulator(el, {
    data,
    layout: "fitColumns",
    responsiveLayout: false,
    height: "100%",
    initialSort: [{ column: "spread_best_prob", dir: "desc" }],
    columns: [
      {
        title: "",
        field: "spread_best_prob",
        formatter: flameFormatter,
        headerFormatter: () => "",
        hozAlign: "center",
        width: 50,
        headerSort: false,
      },
      { title: "Date", field: "date", widthGrow: 1 },
      { title: "Away", field: "away", widthGrow: 1 },
      { title: "Home", field: "home", widthGrow: 1 },

      { title: "Away Spr", field: "away_spread", hozAlign: "right", widthGrow: 1 },
      { title: "Home Spr", field: "home_spread", hozAlign: "right", widthGrow: 1 },

      { title: "Mkt Cover %", field: "market_cover_prob_assumed", formatter: c => pct(c.getValue()), hozAlign: "right", widthGrow: 1 },
      { title: "Away Model %", field: "away_model_cover_prob", formatter: c => pct(c.getValue()), hozAlign: "right", widthGrow: 1 },
      { title: "Home Model %", field: "home_model_cover_prob", formatter: c => pct(c.getValue()), hozAlign: "right", widthGrow: 1 },

      { title: "Away Edge", field: "away_spread_edge", formatter: c => num(c.getValue(), 3), hozAlign: "right", widthGrow: 1 },
      { title: "Home Edge", field: "home_spread_edge", formatter: c => num(c.getValue(), 3), hozAlign: "right", widthGrow: 1 },

      { title: "Away Pts", field: "away_proj_pts", formatter: c => num(c.getValue(), 1), hozAlign: "right", widthGrow: 1 },
      { title: "Home Pts", field: "home_proj_pts", formatter: c => num(c.getValue(), 1), hozAlign: "right", widthGrow: 1 },
      { title: "Total", field: "total", formatter: c => num(c.getValue(), 1), hozAlign: "right", widthGrow: 1 },

      { title: "Model Pick", field: "Model pick", widthGrow: 1 },

      { title: "Conservative", field: "pick_conservative", widthGrow: 2 },
      { title: "Moderate", field: "pick_moderate", widthGrow: 2 },
      { title: "Risky", field: "pick_risky", widthGrow: 2 },
    ],
  });
}

function buildPropsTable(el, data) {
  return new Tabulator(el, {
    data,
    layout: "fitColumns",
    responsiveLayout: false,
    height: "100%",
    // sort by proxy prob from conservative pick if present
    initialSort: [{ column: "best_prob_proxy", dir: "desc" }],
    columns: [
      {
        title: "",
        field: "best_prob_proxy",
        formatter: flameFormatter,
        headerFormatter: () => "",
        hozAlign: "center",
        width: 50,
        headerSort: false,
      },
      { title: "Player", field: "Player", widthGrow: 1.5 },
      { title: "Pos", field: "Position", widthGrow: 0.8 },
      { title: "Team", field: "Team", widthGrow: 1 },
      { title: "Opp", field: "Opponent", widthGrow: 1 },
      { title: "DvP Rank", field: "dvp_rank_pos", hozAlign: "right", widthGrow: 1 },

      { title: "Season Mean", field: "season_mean", formatter: c => num(c.getValue(), 2), hozAlign: "right", widthGrow: 1 },

      { title: "DK Line", field: "dk_line", hozAlign: "right", widthGrow: 1 },
      { title: "DK O", field: "dk_odds_over", formatter: c => oddsFmt(c.getValue()), hozAlign: "right", widthGrow: 1 },
      { title: "DK U", field: "dk_odds_under", formatter: c => oddsFmt(c.getValue()), hozAlign: "right", widthGrow: 1 },

      { title: "FD Line", field: "fd_line", hozAlign: "right", widthGrow: 1 },
      { title: "FD O", field: "fd_odds_over", formatter: c => oddsFmt(c.getValue()), hozAlign: "right", widthGrow: 1 },
      { title: "FD U", field: "fd_odds_under", formatter: c => oddsFmt(c.getValue()), hozAlign: "right", widthGrow: 1 },

      { title: "Conservative", field: "pick_conservative", widthGrow: 2 },
      { title: "Moderate", field: "pick_moderate", widthGrow: 2 },
      { title: "Risky", field: "pick_risky", widthGrow: 2 },
    ],
  });
}

/* =========================
   SEARCH (ACTIVE TABLE ONLY)
   ========================= */

let activeTable = null;

function applyGlobalSearch(query) {
  if (!activeTable) return;

  const q = query.toLowerCase().trim();
  if (!q) {
    activeTable.clearFilter();
    return;
  }

  activeTable.setFilter(row => {
    // Search across common fields from all tables
    const keys = [
      "Player", "Team", "Opponent", "Position",
      "away", "home",
      "Model pick",
      "pick_conservative", "pick_moderate", "pick_risky",
    ];
    return keys.some(k => String(row[k] || "").toLowerCase().includes(q));
  });
}

/* =========================
   VIEW SWITCHING
   ========================= */

function switchView(viewId, title, hint, table) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  const viewEl = document.getElementById(`view-${viewId}`);
  if (viewEl) viewEl.classList.add("active");

  document.getElementById("viewTitle").textContent = title;
  document.getElementById("viewHint").textContent = hint;

  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  const btn = document.querySelector(`.tab-btn[data-view="${viewId}"]`);
  if (btn) btn.classList.add("active");

  activeTable = table;
  setTimeout(() => table.redraw(true), 50);
  applyGlobalSearch(document.getElementById("globalSearch").value || "");
}

/* =========================
   INIT
   ========================= */

async function init() {
  const [mlRaw, spRaw, ptRaw, paRaw, praRaw] = await Promise.all([
    fetchJSONAny(["./data/moneyline.json", "./moneyline.json"]),
    fetchJSONAny(["./data/spreads.json", "./spreads.json"]),
    fetchJSONAny(["./data/points_lines.json", "./points_lines.json"]),
    fetchJSONAny(["./data/pa_lines.json", "./pa_lines.json"]),
    fetchJSONAny(["./data/pra_lines.json", "./pra_lines.json"]),
  ]);

  const mlData = normalizeMoneyline(mlRaw);
  const spData = normalizeSpreads(spRaw);
  const ptData = normalizeProps(ptRaw);
  const paData = normalizeProps(paRaw);
  const praData = normalizeProps(praRaw);

  const mlTable = buildMoneylineTable("#tblMoneyline", mlData);
  const spTable = buildSpreadsTable("#tblSpreads", spData);
  const ptTable = buildPropsTable("#tblPoints", ptData);
  const paTable = buildPropsTable("#tblPA", paData);
  const praTable = buildPropsTable("#tblPRA", praData);

  activeTable = mlTable;

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const v = btn.dataset.view;

      if (v === "moneyline")
        switchView("moneyline", "Moneyline Bets", "Moneyline model win probabilities", mlTable);

      if (v === "spreads")
        switchView("spreads", "Spreads", "Spread cover probabilities + tier picks", spTable);

      if (v === "points")
        switchView("points", "Points Lines", "Points tier picks", ptTable);

      if (v === "pa")
        switchView("pa", "Points + Assists", "PA tier picks", paTable);

      if (v === "pra")
        switchView("pra", "Points + Rebounds + Assists", "PRA tier picks", praTable);
    });
  });

  const search = document.getElementById("globalSearch");
  const clearBtn = document.getElementById("clearSearchBtn");

  search.addEventListener("input", () => applyGlobalSearch(search.value));
  clearBtn.addEventListener("click", () => {
    search.value = "";
    applyGlobalSearch("");
  });

  document.getElementById("reloadBtn").addEventListener("click", () => location.reload());
}

init().catch(err => {
  console.error(err);
  alert("Error loading dashboard. Check console for details.");
});
