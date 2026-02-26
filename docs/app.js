async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

function pct(x) {
  return (x * 100).toFixed(1) + "%";
}

function buildMoneylineTable(el, data) {
  return new Tabulator(el, {
    data,
    layout: "fitColumns",
    initialSort: [{ column: "home_win_prob", dir: "desc" }],
    columns: [
      { title: "Away", field: "away" },
      { title: "Home", field: "home" },
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
    layout: "fitColumns",
    initialSort: [{ column: "best_edge", dir: "desc" }],
    columns: [
      { title: "Player", field: "Player" },
      { title: "Team", field: "Team" },
      { title: "Opp", field: "Opponent" },
      { title: "Line", field: "line" },
      { title: "Side", field: "best_side" },
      { title: "Model Prob", field: "best_prob", formatter: c => pct(c.getValue()) },
      { title: "Edge", field: "best_edge", formatter: c => c.getValue().toFixed(3) },
      { title: "Odds", field: "best_odds" },
      { title: "EV / $1", field: "best_ev_$1", formatter: c => c.getValue().toFixed(3) }
    ]
  });
}

function attachLinesFilters(table, prefix) {
  const search = document.getElementById(prefix + "Search");
  const side = document.getElementById(prefix + "Side");
  const minEdge = document.getElementById(prefix + "MinEdge");
  const clear = document.getElementById(prefix + "Clear");

  function apply() {
    const q = search.value.toLowerCase();
    const s = side.value;
    const me = Number(minEdge.value);

    table.setFilter(row => {
      if (row.best_edge < me) return false;
      if (s && row.best_side !== s) return false;
      if (!q) return true;
      return `${row.Player} ${row.Team}`.toLowerCase().includes(q);
    });
  }

  [search, side, minEdge].forEach(el =>
    el.addEventListener("input", apply)
  );

  clear.addEventListener("click", () => {
    search.value = "";
    side.value = "";
    minEdge.value = "0.03";
    table.clearFilter();
    apply();
  });

  apply();
}

function attachMoneylineFilters(table) {
  const search = document.getElementById("mlSearch");
  const minProb = document.getElementById("mlMinProb");
  const clear = document.getElementById("mlClear");

  function apply() {
    const q = search.value.toLowerCase();
    const mp = Number(minProb.value);

    table.setFilter(row => {
      if (row.ml_best_prob < mp) return false;
      if (!q) return true;
      return `${row.away} ${row.home} ${row.ml_best_team}`.toLowerCase().includes(q);
    });
  }

  [search, minProb].forEach(el =>
    el.addEventListener("input", apply)
  );

  clear.addEventListener("click", () => {
    search.value = "";
    minProb.value = "0.60";
    table.clearFilter();
    apply();
  });

  apply();
}

async function init() {
  const moneyline = await loadJSON("./data/moneyline.json");
  const points = await loadJSON("./data/points_lines.json");
  const pa = await loadJSON("./data/pa_lines.json");
  const pra = await loadJSON("./data/pra_lines.json");

  const mlTable = buildMoneylineTable("#tblMoneyline", moneyline);
  attachMoneylineFilters(mlTable);

  const ptTable = buildLinesTable("#tblPoints", points);
  attachLinesFilters(ptTable, "pt");

  const paTable = buildLinesTable("#tblPA", pa);
  attachLinesFilters(paTable, "pa");

  const praTable = buildLinesTable("#tblPRA", pra);
  attachLinesFilters(praTable, "pra");
}

init();
