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
  if (!Number.isFinite(n)) return "";
  return (n * 100).toFixed(1) + "%";
}

function toNum(x, digits = 3) {
  const n = Number(x);
  if (!Number.isFinite(n)) return "";
  return n.toFixed(digits);
}

function normalizeMoneyline(rows) {
  return (rows || []).map(r => ({
    away: r.away ?? r.Away ?? "",
    home: r.home ?? r.Home ?? "",
    home_win_prob: r.home_win_prob ?? r["Home Prob"] ?? r.homeProb ?? r.HomeProb ?? r.home_prob ?? r.homeProbability,
    away_win_prob: r.away_win_prob ?? r["Away Prob"] ?? r.awayProb ?? r.AwayProb ?? r.away_prob ?? r.awayProbability,
  }));
}

function normalizeLines(rows) {
  return (rows || []).map(r => ({
    Player: r.Player ?? r.player ?? r.NAME ?? "",
    Team: r.Team ?? r.team ?? r.TM ?? "",
    Opponent: r.Opponent ?? r.opponent ?? r.Opp ?? "",
    line: r.line ?? r.Line ?? "",
    best_prob: r.best_prob ?? r["model_prob"] ?? r["Model Prob"] ?? r.bestProb ?? "",
    best_edge: r.best_edge ?? r.edge ?? r["Best Edge"] ?? r.bestEdge ?? "",
    best_ev_$1: r["best_ev_$1"] ?? r.ev_$1 ?? r["EV / $1"] ?? r.bestEV ?? "",
  }));
}

function showError(msg) {
  const el = document.createElement("div");
  el.style.padding = "12px";
  el.style.margin = "10px";
  el.style.border = "1px solid #ff6c6c";
  el.style.borderRadius = "12px";
  el.style.background = "rgba(255,108,108,0.12)";
  el.style.color = "#fff";
  el.textContent = msg;
  document.body.prepend(el);
}

/* ======================
   TABLE BUILDERS
   ====================== */

function buildMoneylineTable(el, data) {
  return new Tabulator(el, {
    data,
    layout: "fitDataStretch",
    responsiveLayout: "collapse",
    initialSort: [{ column: "home_win_prob", dir: "desc" }],
    columns: [
      { title: "Away", field: "away" },
      { title: "Home", field: "home" },
      { title: "Home Win %", field: "home_win_prob", formatter: c => pct(c.getValue()), hozAlign: "right" },
      { title: "Away Win %", field: "away_win_prob", formatter: c => pct(c.getValue()), hozAlign: "right" },
    ],
  });
}

function buildLinesTable(el, data) {
  return new Tabulator(el, {
    data,
    layout: "fitDataStretch",
    responsiveLayout: "collapse",
    initialSort: [{ column: "best_edge", dir: "desc" }],
    columns: [
      { title: "Player", field: "Player", minWidth: 140 },
      { title: "Team", field: "Team", width: 80 },
      { title: "Opp", field: "Opponent", width: 80 },
      { title: "Line", field: "line", hozAlign: "right", width: 80 },
      { title: "Model %", field: "best_prob", formatter: c => pct(c.getValue()), hozAlign: "right", width: 95 },
      { title: "Edge", field: "best_edge", formatter: c => toNum(c.getValue(), 3), hozAlign: "right", width: 85 },
      { title: "EV / $1", field: "best_ev_$1", formatter: c => toNum(c.getValue(), 3), hozAlign: "right", width: 85 },
    ],
  });
}

/* ======================
   SEARCH FILTERS ONLY
   ====================== */

function attachSearch(table, inputId, clearId, fields) {
  const input = document.getElementById(inputId);
  const clear = document.getElementById(clearId);

  function apply() {
    const q = (input.value || "").toLowerCase().trim();
    if (!q) {
      table.clearFilter();
      return;
    }
    table.setFilter(row => fields.some(f => String(row[f] || "").toLowerCase().includes(q)));
  }

  input.addEventListener("input", apply);
  clear.addEventListener("click", () => {
    input.value = "";
    table.clearFilter();
  });
}

/* ======================
   INIT
   ====================== */

async function init() {
  try {
    // Try BOTH folder layouts automatically
    const moneylineRaw = await fetchJSONAny([
      "./data/moneyline.json",
      "./moneyline.json",
    ]);
    const pointsRaw = await fetchJSONAny([
      "./data/points_lines.json",
      "./points_lines.json",
    ]);
    const paRaw = await fetchJSONAny([
      "./data/pa_lines.json",
      "./pa_lines.json",
    ]);
    const praRaw = await fetchJSONAny([
      "./data/pra_lines.json",
      "./pra_lines.json",
    ]);

    const moneyline = normalizeMoneyline(moneylineRaw);
    const points = normalizeLines(pointsRaw);
    const pa = normalizeLines(paRaw);
    const pra = normalizeLines(praRaw);

    // Clear containers (prevents double render)
    document.getElementById("tblMoneyline").innerHTML = "";
    document.getElementById("tblPoints").innerHTML = "";
    document.getElementById("tblPA").innerHTML = "";
    document.getElementById("tblPRA").innerHTML = "";

    const ml = buildMoneylineTable("#tblMoneyline", moneyline);
    attachSearch(ml, "mlSearch", "mlClear", ["away", "home"]);

    const pt = buildLinesTable("#tblPoints", points);
    attachSearch(pt, "ptSearch", "ptClear", ["Player", "Team", "Opponent"]);

    const paT = buildLinesTable("#tblPA", pa);
    attachSearch(paT, "paSearch", "paClear", ["Player", "Team", "Opponent"]);

    const praT = buildLinesTable("#tblPRA", pra);
    attachSearch(praT, "praSearch", "praClear", ["Player", "Team", "Opponent"]);

  } catch (e) {
    showError(
      "DATA LOAD FAILED. Most likely your JSON files are not where app.js expects.\n" +
      "Open DevTools Console for the exact 404.\n\n" +
      "Error: " + (e?.message || e)
    );
    console.error(e);
  }
}

init();
