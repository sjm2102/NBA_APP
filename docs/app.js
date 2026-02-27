async function fetchJSONAny(paths) {
  let lastErr = null;
  for (const p of paths) {
    try {
      const res = await fetch(p, { cache: "no-store" });
      if (!res.ok) { lastErr = new Error(`${p} -> ${res.status}`); continue; }
      return await res.json();
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("Failed to load JSON");
}

function pct(x){
  const n = Number(x);
  if(!Number.isFinite(n)) return "";
  return (n * 100).toFixed(1) + "%";
}
function num(x, d=3){
  const n = Number(x);
  if(!Number.isFinite(n)) return "";
  return n.toFixed(d);
}

function normalizeMoneyline(rows){
  return (rows||[]).map(r=>({
    away: r.away ?? r.Away ?? "",
    home: r.home ?? r.Home ?? "",
    home_win_prob: r.home_win_prob ?? r.homeProb ?? r.HomeProb ?? r.home_prob ?? "",
    away_win_prob: r.away_win_prob ?? r.awayProb ?? r.AwayProb ?? r.away_prob ?? "",
  }));
}
function normalizeLines(rows){
  return (rows||[]).map(r=>({
    Player: r.Player ?? r.player ?? "",
    Team: r.Team ?? r.team ?? "",
    Opponent: r.Opponent ?? r.opponent ?? "",
    line: r.line ?? r.Line ?? "",
    best_prob: r.best_prob ?? r.model_prob ?? r.bestProb ?? "",
    best_edge: r.best_edge ?? r.edge ?? r.bestEdge ?? "",
    best_ev_$1: r["best_ev_$1"] ?? r.ev_$1 ?? r.bestEV ?? "",
  }));
}

function attachSearch(table, inputId, clearId, fields){
  const input = document.getElementById(inputId);
  const clear = document.getElementById(clearId);

  function apply(){
    const q = (input.value||"").toLowerCase().trim();
    if(!q){ table.clearFilter(); return; }
    table.setFilter(row => fields.some(f => String(row[f]||"").toLowerCase().includes(q)));
  }
  input.addEventListener("input", apply);
  clear.addEventListener("click", ()=>{ input.value=""; table.clearFilter(); });
}

function buildMoneylineTable(el, data){
  return new Tabulator(el, {
    data,
    layout: "fitColumns",          // fill available width
    responsiveLayout: false,       // ✅ removes the injected “collapse” column
    height: "100%",
    initialSort: [{column:"home_win_prob", dir:"desc"}],
    columns: [
      {title:"Away", field:"away", minWidth: 110, widthGrow: 2},
      {title:"Home", field:"home", minWidth: 110, widthGrow: 2},
      {title:"Home Win %", field:"home_win_prob", formatter:c=>pct(c.getValue()), hozAlign:"right", width: 120},
      {title:"Away Win %", field:"away_win_prob", formatter:c=>pct(c.getValue()), hozAlign:"right", width: 120},
    ]
  });
}

function buildLinesTable(el, data){
  return new Tabulator(el, {
    data,
    layout: "fitColumns",          // ✅ fill width (prevents right-side dead space)
    responsiveLayout: false,       // ✅ removes the injected “collapse” column
    height: "100%",
    initialSort: [{column:"best_edge", dir:"desc"}],
    columns: [
      {title:"Player", field:"Player", minWidth: 180, widthGrow: 4},
      {title:"Team", field:"Team", width: 80},
      {title:"Opp", field:"Opponent", width: 80},
      {title:"Line", field:"line", hozAlign:"right", width: 80},
      {title:"Model %", field:"best_prob", formatter:c=>pct(c.getValue()), hozAlign:"right", width: 95},
      {title:"Edge", field:"best_edge", formatter:c=>num(c.getValue(),3), hozAlign:"right", width: 90},

      // ✅ last column grows to absorb extra width (stops weird stretching/gaps)
      {title:"EV/$1", field:"best_ev_$1", formatter:c=>num(c.getValue(),3), hozAlign:"right", minWidth: 90, widthGrow: 2},
    ]
  });
}

/* ======================
   3D WHEEL / CAROUSEL
   ====================== */

let idx = 0;
let cards = [];
let tables = []; // [ml, points, pa, pra]

function updateWheel(){
  const label = document.getElementById("panelLabel");
  cards.forEach((card, i)=>{
    const offset = i - idx;
    const angle = offset * 26;
    const x = offset * 220;
    const z = Math.max(-700, -Math.abs(offset) * 260);

    card.classList.toggle("active", i === idx);
    card.style.transform = `translateX(${x}px) translateZ(${z}px) rotateY(${angle}deg)`;
  });

  const activeTitle = cards[idx]?.getAttribute("data-title") || "";
  if(label) label.textContent = activeTitle;

  // IMPORTANT: Tabulator needs redraw when its container becomes visible/active
  const t = tables[idx];
  if (t && typeof t.redraw === "function") {
    setTimeout(()=>t.redraw(true), 50);
  }
}

function prev(){
  idx = (idx - 1 + cards.length) % cards.length;
  updateWheel();
}
function next(){
  idx = (idx + 1) % cards.length;
  updateWheel();
}

function addSwipe(){
  let startX = null;
  const wheel = document.getElementById("wheel");
  wheel.addEventListener("touchstart", (e)=>{
    startX = e.touches[0].clientX;
  }, {passive:true});
  wheel.addEventListener("touchend", (e)=>{
    if(startX === null) return;
    const endX = e.changedTouches[0].clientX;
    const dx = endX - startX;
    startX = null;
    if(Math.abs(dx) < 35) return;
    if(dx > 0) prev(); else next();
  }, {passive:true});
}

async function init(){
  // Load data from either /data or root
  const [mlRaw, ptRaw, paRaw, praRaw] = await Promise.all([
    fetchJSONAny(["./data/moneyline.json", "./moneyline.json"]),
    fetchJSONAny(["./data/points_lines.json", "./points_lines.json"]),
    fetchJSONAny(["./data/pa_lines.json", "./pa_lines.json"]),
    fetchJSONAny(["./data/pra_lines.json", "./pra_lines.json"]),
  ]);

  const moneyline = normalizeMoneyline(mlRaw);
  const points = normalizeLines(ptRaw);
  const pa = normalizeLines(paRaw);
  const pra = normalizeLines(praRaw);

  // Build tables
  const ml = buildMoneylineTable("#tblMoneyline", moneyline);
  attachSearch(ml, "mlSearch", "mlClear", ["away","home"]);

  const pt = buildLinesTable("#tblPoints", points);
  attachSearch(pt, "ptSearch", "ptClear", ["Player","Team","Opponent"]);

  const paT = buildLinesTable("#tblPA", pa);
  attachSearch(paT, "paSearch", "paClear", ["Player","Team","Opponent"]);

  const praT = buildLinesTable("#tblPRA", pra);
  attachSearch(praT, "praSearch", "praClear", ["Player","Team","Opponent"]);

  tables = [ml, pt, paT, praT];

  // 3D wheel setup
  cards = Array.from(document.querySelectorAll(".card"));
  idx = 0;
  updateWheel();

  // Controls
  document.getElementById("prevBtn").addEventListener("click", prev);
  document.getElementById("nextBtn").addEventListener("click", next);
  document.getElementById("reloadBtn").addEventListener("click", ()=>location.reload());
  window.addEventListener("keydown", (e)=>{
    if(e.key === "ArrowLeft") prev();
    if(e.key === "ArrowRight") next();
  });

  addSwipe();
}

init().catch(err=>{
  console.error(err);
  alert("Dashboard error loading data. Check console for details.");
});
