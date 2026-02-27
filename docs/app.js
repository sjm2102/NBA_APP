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

/* =========================
   NORMALIZE DATA
   ========================= */

function normalizeMoneyline(rows) {
  return (rows || []).map(r => ({
    away: r.away ?? r.Away ?? "",
    home: r.home ?? r.Home ?? "",
    home_win_prob:
      r.home_win_prob ?? r.homeProb ?? r.HomeProb ?? r.home_prob ?? "",
    away_win_prob:
      r.away_win_prob ?? r.awayProb ?? r.AwayProb ?? r.away_prob ?? ""
  }));
}

function normalizeLines(rows) {
  return (rows || []).map(r => ({
    Player: r.Player ?? r.player ?? "",
    Team: r.Team ?? r.team ?? "",
    Opponent: r.Opponent ?? r.opponent ?? "",
    line: r.line ?? r.Line ?? "",
    best_prob: r.best_prob ?? r.model_prob ?? r.bestProb ?? "",
    best_edge: r.best_edge ?? r.edge ?? r.bestEdge ?? "",
    best_ev_$1: r["best_ev_$1"] ?? r.ev_$1 ?? r.bestEV ?? ""
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
    initialSort: [{ column: "home_win_prob", dir: "desc" }],
    columns: [
      { title: "Away", field: "away", minWidth: 120, widthGrow: 2 },
      { title: "Home", field: "home", minWidth: 120, widthGrow: 2 },
      {
        title: "Home Win %",
        field: "home_win_prob",
        formatter: c => pct(c.getValue()),
        hozAlign: "right",
        width: 120
      },
      {
        title: "Away Win %",
        field: "away_win_prob",
        formatter: c => pct(c.getValue()),
        hozAlign: "right",
        width: 120
      }
    ]
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
      { title: "Player", field: "Player", minWidth: 180, widthGrow: 4 },
      { title: "Team", field: "Team", width: 80 },
      { title: "Opp", field: "Opponent", width: 80 },
      { title: "Line", field: "line", hozAlign: "right", width: 80 },
      {
        title: "Model %",
        field: "best_prob",
        formatter: c => pct(c.getValue()),
        hozAlign: "right",
        width: 100
      },
      {
        title: "Edge",
        field: "best_edge",
        formatter: c => num(c.getValue(), 3),
        hozAlign: "right",
        width: 90
      },
      {
        title: "EV / $1",
        field: "best_ev_$1",
        formatter: c => num(c.getValue(), 3),
        hozAlign: "right",
        minWidth: 100,
        widthGrow: 2
      }
    ]
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
    return ["Player", "Team", "Opponent", "away", "home"].some(k =>
      String(row[k] || "").toLowerCase().includes(q)
    );
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
}

/* =========================
   INIT
   ========================= */

async function init() {
  const [mlRaw, ptRaw, paRaw, praRaw] = await Promise.all([
    fetchJSONAny(["./data/moneyline.json", "./moneyline.json"]),
    fetchJSONAny(["./data/points_lines.json", "./points_lines.json"]),
    fetchJSONAny(["./data/pa_lines.json", "./pa_lines.json"]),
    fetchJSONAny(["./data/pra_lines.json", "./pra_lines.json"])
  ]);

  const mlData = normalizeMoneyline(mlRaw);
  const ptData = normalizeLines(ptRaw);
  const paData = normalizeLines(paRaw);
  const praData = normalizeLines(praRaw);

  const mlTable = buildMoneylineTable("#tblMoneyline", mlData);
  const ptTable = buildLinesTable("#tblPoints", ptData);
  const paTable = buildLinesTable("#tblPA", paData);
  const praTable = buildLinesTable("#tblPRA", praData);

  // Default view
  activeTable = mlTable;

  // Tab buttons
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const v = btn.dataset.view;
      if (v === "moneyline")
        switchView("moneyline", "Predictions", "Moneyline model win probabilities", mlTable);
      if (v === "points")
        switchView("points", "RW Projections", "Points projections", ptTable);
      if (v === "pa")
        switchView("pa", "Hit Rates", "Points + Assists", paTable);
      if (v === "pra")
        switchView("pra", "Lines", "Points + Rebounds + Assists", praTable);
    });
  });

  // Global search
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
