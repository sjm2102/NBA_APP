// app.js
// Loads JSON exports from /data and renders 4 filterable tables using Tabulator.

async function loadJSON(path){
  const res = await fetch(path, {cache: "no-store"});
  if(!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return await res.json();
}

function uniqSorted(arr){
  return [...new Set(arr.filter(Boolean))].sort((a,b)=> String(a).localeCompare(String(b)));
}

function setSelectOptions(selectEl, values, placeholder){
  selectEl.innerHTML = "";
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = placeholder;
  selectEl.appendChild(opt0);
  values.forEach(v=>{
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    selectEl.appendChild(opt);
  });
}

function fmtPct(val){
  if(val === null || val === undefined || val === "") return "";
  const num = Number(val);
  if(Number.isNaN(num)) return String(val);
  return (num * 100).toFixed(1) + "%";
}

function fmtNum(val, digits=2){
  if(val === null || val === undefined || val === "") return "";
  const num = Number(val);
  if(Number.isNaN(num)) return String(val);
  return num.toFixed(digits);
}

function buildMoneylineTable(el, data){
  return new Tabulator(el, {
    data,
    layout: "fitDataFill",
    height: 420,
    pagination: true,
    paginationSize: 10,
    reactiveData: true,
    initialSort: [{column:"ml_best_prob", dir:"desc"}],
    columns: [
      {title:"Date", field:"date", width: 105},
      {title:"Away", field:"away"},
      {title:"Home", field:"home"},
      {title:"Best", field:"ml_best_team"},
      {title:"Best Prob", field:"ml_best_prob", formatter:(c)=>fmtPct(c.getValue()), hozAlign:"right"},
      {title:"Home Prob", field:"home_win_prob", formatter:(c)=>fmtPct(c.getValue()), hozAlign:"right"},
      {title:"Away Prob", field:"away_win_prob", formatter:(c)=>fmtPct(c.getValue()), hozAlign:"right"},
      {title:"Conf Gap", field:"confidence_gap", formatter:(c)=>fmtNum(c.getValue(),3), hozAlign:"right"},
    ],
  });
}

function buildLinesTable(el, data){
  return new Tabulator(el, {
    data,
    layout: "fitDataFill",
    height: 420,
    pagination: true,
    paginationSize: 12,
    reactiveData: true,
    initialSort: [{column:"best_edge", dir:"desc"}],
    columns: [
      {title:"Player", field:"Player", minWidth: 160},
      {title:"Pos", field:"Position", width: 70},
      {title:"Team", field:"Team", width: 80},
      {title:"Opp", field:"Opponent", width: 80},
      {title:"Line", field:"line", hozAlign:"right", formatter:(c)=>fmtNum(c.getValue(),1), width: 90},
      {title:"Side", field:"best_side", width: 85},
      {title:"Model Prob", field:"best_prob", hozAlign:"right", formatter:(c)=>fmtPct(c.getValue()), width: 115},
      {title:"Implied (Over)", field:"implied_over", hozAlign:"right", formatter:(c)=>fmtPct(c.getValue()), width: 120, visible:false},
      {title:"Implied (Under)", field:"implied_under", hozAlign:"right", formatter:(c)=>fmtPct(c.getValue()), width: 125, visible:false},
      {title:"Best Edge", field:"best_edge", hozAlign:"right", formatter:(c)=>fmtNum(c.getValue(),3), width: 110},
      {title:"Best EV/$1", field:"best_ev_$1", hozAlign:"right", formatter:(c)=>fmtNum(c.getValue(),3), width: 110},
      {title:"Odds", field:"best_odds", hozAlign:"right", width: 90},
      {title:"Season Mean", field:"season_mean", hozAlign:"right", formatter:(c)=>fmtNum(c.getValue(),2), visible:false},
      {title:"DvP Mult", field:"dvp_mult", hozAlign:"right", formatter:(c)=>fmtNum(c.getValue(),3), visible:false},
      {title:"Adj Mean", field:"adj_mean", hozAlign:"right", formatter:(c)=>fmtNum(c.getValue(),2), visible:false},
      {title:"SD", field:"sd", hozAlign:"right", formatter:(c)=>fmtNum(c.getValue(),2), visible:false},
    ],
  });
}

function attachMoneylineFilters(table){
  const search = document.getElementById("mlSearch");
  const minProb = document.getElementById("mlMinProb");
  const clear = document.getElementById("mlClear");

  function apply(){
    const q = (search.value || "").toLowerCase().trim();
    const mp = Number(minProb.value || 0);

    table.setFilter((rowData)=>{
      const p = Number(rowData.ml_best_prob ?? -1);
      const passProb = !Number.isFinite(mp) ? true : p >= mp;

      if(!q) return passProb;

      const hay = [
        rowData.away, rowData.home, rowData.ml_best_team, rowData.game_id
      ].map(x=>String(x||"").toLowerCase()).join(" ");
      return passProb && hay.includes(q);
    });
  }

  ["input","change"].forEach(ev=>{
    search.addEventListener(ev, apply);
    minProb.addEventListener(ev, apply);
  });

  clear.addEventListener("click", ()=>{
    search.value = "";
    minProb.value = "0.60";
    table.clearFilter(true);
    apply();
  });

  apply();
}

function attachLinesFilters(table, prefix, dataset){
  const search = document.getElementById(prefix+"Search");
  const team = document.getElementById(prefix+"Team");
  const opp = document.getElementById(prefix+"Opp");
  const side = document.getElementById(prefix+"Side");
  const minEdge = document.getElementById(prefix+"MinEdge");
  const clear = document.getElementById(prefix+"Clear");

  // populate selects from dataset
  setSelectOptions(team, uniqSorted(dataset.map(r=>r.Team)), "Team (Any)");
  setSelectOptions(opp, uniqSorted(dataset.map(r=>r.Opponent)), "Opponent (Any)");

  function apply(){
    const q = (search.value || "").toLowerCase().trim();
    const t = team.value || "";
    const o = opp.value || "";
    const s = side.value || "";
    const me = Number(minEdge.value || 0);

    table.setFilter((r)=>{
      const edge = Number(r.best_edge ?? -999);
      if(Number.isFinite(me) && edge < me) return false;
      if(t && String(r.Team||"") !== t) return false;
      if(o && String(r.Opponent||"") !== o) return false;
      if(s && String(r.best_side||"") !== s) return false;

      if(!q) return true;
      const hay = [
        r.Player, r.Team, r.Opponent, r.Position, r.best_side
      ].map(x=>String(x||"").toLowerCase()).join(" ");
      return hay.includes(q);
    });
  }

  ["input","change"].forEach(ev=>{
    search.addEventListener(ev, apply);
    team.addEventListener(ev, apply);
    opp.addEventListener(ev, apply);
    side.addEventListener(ev, apply);
    minEdge.addEventListener(ev, apply);
  });

  clear.addEventListener("click", ()=>{
    search.value = "";
    team.value = "";
    opp.value = "";
    side.value = "";
    minEdge.value = "0.03";
    table.clearFilter(true);
    apply();
  });

  apply();
}

async function init(){
  const meta = await loadJSON("./data/meta.json");
  document.getElementById("meta").textContent =
    `Source: ${meta.generated_from} • Updated: ${meta.generated_at.replace("T"," ").slice(0,19)}`;

  const [moneyline, points, pa, pra] = await Promise.all([
    loadJSON("./data/moneyline.json"),
    loadJSON("./data/points_lines.json"),
    loadJSON("./data/pa_lines.json"),
    loadJSON("./data/pra_lines.json"),
  ]);

  const mlTable = buildMoneylineTable("#tblMoneyline", moneyline);
  attachMoneylineFilters(mlTable);

  const ptTable = buildLinesTable("#tblPoints", points);
  attachLinesFilters(ptTable, "pt", points);

  const paTable = buildLinesTable("#tblPA", pa);
  attachLinesFilters(paTable, "pa", pa);

  const praTable = buildLinesTable("#tblPRA", pra);
  attachLinesFilters(praTable, "pra", pra);

  document.getElementById("refreshBtn").addEventListener("click", ()=>location.reload());
}

init().catch(err=>{
  console.error(err);
  alert("Error loading dashboard data. Open DevTools console for details.");
});
