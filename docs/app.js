async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

function pct(x) {
  return (x * 100).toFixed(1) + "%";
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
      { title: "Away", field: "away", headerSort:true },
      { title: "Home", field: "home", headerSort:true },
      {
        title: "Home Win %",
        field: "home_win_prob",
        formatter: c => pct(c.getValue()),
        hozAlign: "right"
      },
      {
        title: "Away Win %",
        field: "away_win_prob",
        formatter: c => pct(c.getValue()),
        hozAlign: "right"
      }
    ]
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
      { title: "Team", field: "Team" },
      { title: "Opp", field: "Opponent" },
      { title: "Line", field: "line", hozAlign:"right" },
      { title: "Model %", field: "best_prob", formatter:c=>pct(c.getValue()), hozAlign:"right" },
      { title: "Edge", field: "best_edge", formatter:c=>c.getValue().toFixed(3), hozAlign:"right" },
      { title: "EV / $1", field: "best_ev_$1", formatter:c=>c.getValue().toFixed(3), hozAlign:"right" }
    ]
  });
}

/* ======================
   SEARCH FILTERS ONLY
   ====================== */

function attachSearch(table, inputId, clearId, fields) {
  const input = document.getElementById(inputId);
  const clear = document.getElementById(clearId);

  function apply() {
    const q = input.value.toLowerCase().trim();
    if (!q) {
      table.clearFilter();
      return;
    }

    table.setFilter(row => {
      return fields.some(f =>
        String(row[f] || "").toLowerCase().includes(q)
      );
    });
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
  const moneyline = await loadJSON("./data/moneyline.json");
  const points = await loadJSON("./data/points_lines.json");
  const pa = await loadJSON("./data/pa_lines.json");
  const pra = await loadJSON("./data/pra_lines.json");

  const ml = buildMoneylineTable("#tblMoneyline", moneyline);
  attachSearch(ml, "mlSearch", "mlClear", ["away", "home"]);

  const pt = buildLinesTable("#tblPoints", points);
  attachSearch(pt, "ptSearch", "ptClear", ["Player", "Team", "Opponent"]);

  const paT = buildLinesTable("#tblPA", pa);
  attachSearch(paT, "paSearch", "paClear", ["Player", "Team", "Opponent"]);

  const praT = buildLinesTable("#tblPRA", pra);
  attachSearch(praT, "praSearch", "praClear", ["Player", "Team", "Opponent"]);
}

init();
