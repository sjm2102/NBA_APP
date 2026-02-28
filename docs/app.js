const MOBILE_MAX_W = 820; // a bit wider so phones + small tablets use cards
function isMobile() { return window.innerWidth <= MOBILE_MAX_W; }

/* ---------- JSON ---------- */
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

/* ---------- Format ---------- */
function pct(x) { const n = Number(x); return Number.isFinite(n) ? (n * 100).toFixed(1) + "%" : ""; }
function num(x, d=3) { const n = Number(x); return Number.isFinite(n) ? n.toFixed(d) : ""; }
function oddsFmt(x) {
  if (x === null || x === undefined || x === "") return "";
  const n = Number(x);
  return Number.isFinite(n) ? String(Math.trunc(n)) : String(x);
}
function safeStr(x){ return (x===null||x===undefined) ? "" : String(x); }

function extractProbFromPick(txt) {
  if (!txt) return null;
  const m = String(txt).match(/p\s*=\s*(0\.\d+)/i);
  return m ? Number(m[1]) : null;
}
function extractOddsFromPick(txt) {
  if (!txt) return null;
  const m = String(txt).match(/\(([+-]?\d+)\)/);
  return m ? Number(m[1]) : null;
}
function shortPick(txt) {
  // Input example: "OVER 18.5 (+245) | p=0.29 | edge=+0.07"
  if (!txt) return "";
  const s = String(txt);
  const main = s.split("|")[0].trim();     // "OVER 18.5 (+245)"
  const p = extractProbFromPick(s);
  const pStr = (typeof p === "number") ? ` ${Math.round(p*100)}%` : "";
  return (main + pStr).trim();
}
function hasFlameFromPick(txt) {
  const p = extractProbFromPick(txt);
  return typeof p === "number" && p >= 0.80;
}

/* ---------- Normalize ---------- */
function normalizeMoneyline(rows) {
  return (rows || []).map(r => {
    const awayModel = Number(r.away_model_win_prob ?? 0) || 0;
    const homeModel = Number(r.home_model_win_prob ?? 0) || 0;
    return {
      date: r.date ?? "",
      away: r.away ?? "",
      home: r.home ?? "",
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
  }));
}

/* ---------- Mobile full-width enforcement ---------- */
function enforceMobileFullWidth() {
  if (!isMobile()) return;
  // Kill any "center column" effect even if CSS fights it
  const page = document.querySelector(".page");
  const panel = document.querySelector(".panel");
  const wrapEls = document.querySelectorAll(".table-wrap, .view, .view-stack, .panel-big");

  if (page) { page.style.maxWidth = "none"; page.style.width = "100%"; page.style.padding = "8px"; }
  if (panel) { panel.style.borderRadius = "0px"; panel.style.margin = "0"; panel.style.width = "100%"; }

  wrapEls.forEach(el => {
    el.style.width = "100%";
    el.style.maxWidth = "none";
  });
}

/* ---------- Cards ---------- */
function clearNode(el){ while(el && el.firstChild) el.removeChild(el.firstChild); }
function makeEl(tag, cls){ const e=document.createElement(tag); if(cls) e.className=cls; return e; }

function renderMoneylineCards(container, rows) {
  clearNode(container);
  const frag = document.createDocumentFragment();

  rows.forEach(r => {
    const card = makeEl("div","mcard");
    const top = makeEl("div","mcard-top");
    top.innerHTML = `
      <div class="mcard-title">${(Number(r.ml_best_prob) >= 0.80) ? "🔥 " : ""}${safeStr(r.away)} @ ${safeStr(r.home)}</div>
      <div class="mcard-sub">${safeStr(r.date)}</div>
    `;
    const pick = makeEl("div","mcard-pick");
    pick.innerHTML = `<div class="pill">Pick</div><div class="picktext big">${safeStr(r["Model pick"])}</div>`;

    const grid = makeEl("div","mgrid");
    grid.innerHTML = `
      <div class="kv"><div class="k">Away Model</div><div class="v">${pct(r.away_model_win_prob)}</div></div>
      <div class="kv"><div class="k">Home Model</div><div class="v">${pct(r.home_model_win_prob)}</div></div>
      <div class="kv"><div class="k">Away Edge</div><div class="v">${num(r.away_ml_edge,3)}</div></div>
      <div class="kv"><div class="k">Home Edge</div><div class="v">${num(r.home_ml_edge,3)}</div></div>
    `;

    const more = makeEl("details","mmore");
    more.innerHTML = `
      <summary>More details</summary>
      <div class="mgrid">
        <div class="kv"><div class="k">Away ML</div><div class="v">${oddsFmt(r.away_ml)}</div></div>
        <div class="kv"><div class="k">Home ML</div><div class="v">${oddsFmt(r.home_ml)}</div></div>
        <div class="kv"><div class="k">Away Mkt</div><div class="v">${pct(r.away_market_win_prob)}</div></div>
        <div class="kv"><div class="k">Home Mkt</div><div class="v">${pct(r.home_market_win_prob)}</div></div>
        <div class="kv"><div class="k">SD</div><div class="v">${num(r.sd_margin,2)}</div></div>
        <div class="kv"><div class="k">Proj Pts</div><div class="v">${num(r.away_proj_pts,1)} - ${num(r.home_proj_pts,1)}</div></div>
      </div>
    `;

    card.append(top,pick,grid,more);
    frag.appendChild(card);
  });

  container.appendChild(frag);
}

function renderPropsCards(container, rows) {
  clearNode(container);
  const frag = document.createDocumentFragment();

  rows.forEach(r => {
    const card = makeEl("div","mcard");

    const top = makeEl("div","mcard-top");
    top.innerHTML = `
      <div class="mcard-title">${hasFlameFromPick(r.pick_conservative) ? "🔥 " : ""}${safeStr(r.Player)}</div>
      <div class="mcard-sub">${safeStr(r.Team)} vs ${safeStr(r.Opponent)} • ${safeStr(r.Position)} • DvP ${safeStr(r.dvp_rank_pos)} • Season ${num(r.season_mean,2)}</div>
    `;

    const picks = makeEl("div","mpicks");
    const cons = shortPick(r.pick_conservative);
    const mod  = shortPick(r.pick_moderate);
    const risk = shortPick(r.pick_risky);

    picks.innerHTML = `
      <div class="prow cons"><div class="pill">Conservative</div><div class="picktext big">${safeStr(cons)}</div></div>
      <div class="prow mod"><div class="pill">Moderate</div><div class="picktext big">${safeStr(mod)}</div></div>
      <div class="prow risk"><div class="pill">Risky</div><div class="picktext big">${safeStr(risk)}</div></div>
    `;

    const more = makeEl("details","mmore");
    more.innerHTML = `
      <summary>Books / odds</summary>
      <div class="mgrid">
        <div class="kv"><div class="k">DK Line</div><div class="v">${safeStr(r.dk_line)}</div></div>
        <div class="kv"><div class="k">DK O/U</div><div class="v">${oddsFmt(r.dk_odds_over)} / ${oddsFmt(r.dk_odds_under)}</div></div>
        <div class="kv"><div class="k">FD Line</div><div class="v">${safeStr(r.fd_line)}</div></div>
        <div class="kv"><div class="k">FD O/U</div><div class="v">${oddsFmt(r.fd_odds_over)} / ${oddsFmt(r.fd_odds_under)}</div></div>
        <div class="kv"><div class="k">Full text</div><div class="v">${safeStr(r.pick_conservative)}<br>${safeStr(r.pick_moderate)}<br>${safeStr(r.pick_risky)}</div></div>
      </div>
    `;

    card.append(top,picks,more);
    frag.appendChild(card);
  });

  container.appendChild(frag);
}

/* ---------- Search ---------- */
let activeView = "moneyline";
let DATA = { moneyline: [], points: [], pa: [], pra: [] };

function rowMatchesQuery(row, q) {
  const keys = ["Player","Team","Opponent","Position","away","home","Model pick","pick_conservative","pick_moderate","pick_risky"];
  return keys.some(k => safeStr(row[k]).toLowerCase().includes(q));
}

function applyGlobalSearch(query) {
  const q = query.toLowerCase().trim();
  if (!q) { renderActive(""); return; }
  renderActive(q);
}

/* ---------- View handling ---------- */
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

function renderActive(q) {
  const query = q || "";
  if (!isMobile()) return; // this file focuses on mobile cards; desktop stays your existing tables

  enforceMobileFullWidth();

  if (activeView === "moneyline") {
    const el = document.getElementById("tblMoneyline");
    const rows = query ? DATA.moneyline.filter(r => rowMatchesQuery(r, query)) : DATA.moneyline;
    renderMoneylineCards(el, rows);
  } else if (activeView === "points") {
    const el = document.getElementById("tblPoints");
    const rows = query ? DATA.points.filter(r => rowMatchesQuery(r, query)) : DATA.points;
    renderPropsCards(el, rows);
  } else if (activeView === "pa") {
    const el = document.getElementById("tblPA");
    const rows = query ? DATA.pa.filter(r => rowMatchesQuery(r, query)) : DATA.pa;
    renderPropsCards(el, rows);
  } else if (activeView === "pra") {
    const el = document.getElementById("tblPRA");
    const rows = query ? DATA.pra.filter(r => rowMatchesQuery(r, query)) : DATA.pra;
    renderPropsCards(el, rows);
  }
}

/* ---------- INIT ---------- */
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

  // If mobile, render cards immediately; desktop keeps your Tabulator UI from the other version.
  if (isMobile()) {
    setActiveViewEl("moneyline");
    setViewTitle("Moneyline Bets", "Moneyline model win probabilities");
    renderActive("");
  }

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const v = btn.dataset.view;
      activeView = v;

      if (v === "moneyline") { setViewTitle("Moneyline Bets", "Moneyline model win probabilities"); }
      if (v === "points")   { setViewTitle("Points Lines", "Points tier picks"); }
      if (v === "pa")       { setViewTitle("Points + Assists", "PA tier picks"); }
      if (v === "pra")      { setViewTitle("Points + Rebounds + Assists", "PRA tier picks"); }

      setActiveViewEl(v);
      renderActive((document.getElementById("globalSearch").value || "").toLowerCase().trim());
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

  window.addEventListener("resize", () => {
    if (isMobile()) renderActive((document.getElementById("globalSearch").value || "").toLowerCase().trim());
  });
}

init().catch(err => {
  console.error(err);
  alert("Error loading dashboard. Check console for details.");
});
