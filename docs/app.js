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
  // Keep odds as-is if numeric; otherwise show string
  return Number.isFinite(n) ? String(Math.trunc(n)) : String(x);
}

/* 🔥 Flame cell formatter: show flame if prob >= 0.80 */
function flameFormatter(cell) {
  const v = Number(cell.getValue());
  return Number.isFinite(v) && v >= 0.80 ? "🔥" : "";
}

/* =========================
   NORMALIZE DATA
   ========================= */

function normalizeMoneyline(rows) {
  return (rows || []).map(r => {
    const away = r.away ?? r.Away ?? "";
    const home = r.home ?? r.Home ?? "";

    const homeP = Number(r.home_win_prob ?? r.homeProb ?? r.HomeProb ?? r.home_prob ?? 0) || 0;
    const awayP = Number(r.away_win_prob ?? r.awayProb ?? r.AwayProb ?? r.away_prob ?? 0) || 0;

    // Try multiple possible field names for best team
    const bestTeam =
      r.ml_best_team ??
      r.ml_best ??
      r.best_team ??
      r.best ??
      r["Best"] ??
      (homeP >= awayP ? home : away);

    return {
      away,
      home,
      home_win_prob: r.home_win_prob ?? r.homeProb ?? r.HomeProb ?? r.home_prob ?? "",
      away_win_prob: r.away_win_prob ?? r.awayProb ?? r.AwayProb ?? r.away_prob ?? "",
      ml_best_team: bestTeam,
      // flame logic on moneyline: max(home, away)
      ml_best_prob: Math.max(homeP, awayP),
    };
  });
}

function normalizeLines(rows) {
  return (rows || []).map(r => ({
    Player: r.Player ?? r.player ?? "",
    Team: r.Team ?? r.team ?? "",
    Opponent: r.Opponent ?? r.opponent ?? "",
    line: r.line ?? r.Line ?? "",
    best_prob: r.best_prob ?? r.model_prob ?? r.bestProb ?? r["Model Prob"] ?? "",
    best_edge: r.best_edge ?? r.edge ?? r.bestEdge ?? "",
    best_ev_$1: r["best_ev_$1"] ?? r.ev_$1 ?? r.bestEV ?? "",
    // NEW requested fields (assumed present in JSON)
    odds_under: r.odds_under ?? r.under_odds ?? r.oddsU ?? r["Odds Under"] ?? "",
    odds_over: r.odds_over ?? r.over_odds ?? r.oddsO ?? r["Odds Over"] ?? "",
    season_mean: r.season_mean ?? r.mean ?? r.avg ?? r["Season Mean"] ?? "",
  }));
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
      { title: "Away", field: "away", widthGrow: 1 },
      { title: "Home", field: "home", widthGrow: 1 },

      // ✅ NEW
      { title: "Best", field: "ml_best_team", widthGrow: 1 },

      {
        title: "Home Win %",
        field: "home_win_prob",
        formatter: c => pct(c.getValue()),
        hozAlign: "right",
        widthGrow: 1,
      },
      {
        title: "Away Win %",
        field: "away_win_prob",
        formatter: c => pct(c.getValue()),
        hozAlign: "right",
        widthGrow: 1,
      },
    ],
  });
}

function buildLinesTable(el, data) {
  return new Tabulator(el, {
    data,
    layout: "fitColumns",
    responsiveLayout: false,
    height: "100%",
    initialSort: [{ column: "best_edge", dir: "desc" }],
    columns: [
      {
        title: "",
        field: "best_prob",
        formatter: flameFormatter,
        headerFormatter: () => "",
        hozAlign: "center",
        width: 50,
        headerSort: false,
      },
      { title: "Player", field: "Player", widthGrow: 1 },
      { title: "Team", field: "Team", widthGrow: 1 },
      { title: "Opp", field: "Opponent", widthGrow: 1 },
      { title: "Line", field: "line", hozAlign: "right", widthGrow: 1 },

      // ✅ NEW
      { title: "Season Mean", field: "season_mean", formatter: c => num(c.getValue(), 2), hozAlign: "right", widthGrow: 1 },
      { title: "Odds O", field: "odds_over", formatter: c => oddsFmt(c.getValue()), hozAlign: "right", widthGrow: 1 },
      { title: "Odds U", field: "odds_under", formatter: c => oddsFmt(c.getValue()), hozAlign: "right", widthGrow: 1 },

      { title: "Model %", field: "best_prob", formatter: c => pct(c.getValue()), hozAlign: "right", widthGrow: 1 },
      { title: "Edge", field: "best_edge", formatter: c => num(c.getValue(), 3), hozAlign: "right", widthGrow: 1 },
      { title: "EV / $1", field: "best_ev_$1", formatter: c => num(c.getValue(), 3), hozAlign: "right", widthGrow: 1 },
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
    return [
      "Player", "Team", "Opponent",
      "away", "home",
      "ml_best_team",
    ].some(k => String(row[k] || "").toLowerCase().includes(q));
  });
}

/* =========================
   VIEW SWITCHING
   ========================= */

function switchView(viewId, title, hint, table) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(`view-${viewId}`).classList.add("active");

  document.getElementById("viewTitle").textContent = title;
  document.getElementById("viewHint").textContent = hint;

  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelector(`.tab-btn[data-view="${viewId}"]`).classList.add("active");

  activeTable = table;
  setTimeout(() => table.redraw(true), 50);
  applyGlobalSearch(document.getElementById("globalSearch").value || "");
}

/* =========================
   INIT
   ========================= */

async function init() {
  const [mlRaw, ptRaw, paRaw, praRaw] = await Promise.all([
    fetchJSONAny(["./data/moneyline.json", "./moneyline.json"]),
    fetchJSONAny(["./data/points_lines.json", "./points_lines.json"]),
    fetchJSONAny(["./data/pa_lines.json", "./pa_lines.json"]),
    fetchJSONAny(["./data/pra_lines.json", "./pra_lines.json"]),
  ]);

  const mlData = normalizeMoneyline(mlRaw);
  const ptData = normalizeLines(ptRaw);
  const paData = normalizeLines(paRaw);
  const praData = normalizeLines(praRaw);

  const mlTable = buildMoneylineTable("#tblMoneyline", mlData);
  const ptTable = buildLinesTable("#tblPoints", ptData);
  const paTable = buildLinesTable("#tblPA", paData);
  const praTable = buildLinesTable("#tblPRA", praData);

  activeTable = mlTable;

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const v = btn.dataset.view;
      if (v === "moneyline")
        switchView("moneyline", "Moneyline Bets", "Moneyline model win probabilities", mlTable);
      if (v === "points")
        switchView("points", "Points Lines", "Points lines edges & EV", ptTable);
      if (v === "pa")
        switchView("pa", "Points + Assists", "PA edges & EV", paTable);
      if (v === "pra")
        switchView("pra", "Points + Rebounds + Assists", "PRA edges & EV", praTable);
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
