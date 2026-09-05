const API_BASE = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w500";
const BACKDROP = "https://image.tmdb.org/t/p/w1280";
const TOKEN_KEY = "cinematch_tmdb_token";
let token = localStorage.getItem(TOKEN_KEY) || "";
let currentMovies = [];
let watchlist = JSON.parse(localStorage.getItem("cinematch_watchlist") || "[]");

const $ = id => document.getElementById(id);
const genreNames = {28:"Action",12:"Adventure",16:"Animation",35:"Comedy",80:"Crime",99:"Documentary",18:"Drama",14:"Fantasy",27:"Horror",9648:"Mystery",10749:"Romance",878:"Science Fiction",53:"Thriller",10751:"Family",36:"History",10752:"War",37:"Western",10402:"Music"};
const moodGenres = {
  action:[28,12,53], feelgood:[35,16,10751,10749], mindbending:[878,9648,53], romance:[10749,18], dark:[80,27,53]
};

function authHeaders() {
  return token ? { Authorization: `Bearer ${token}`, "Content-Type":"application/json" } : {};
}
async function api(path, params={}) {
  if (!token) throw new Error("NO_TOKEN");
  const url = new URL(API_BASE + path);
  Object.entries(params).forEach(([k,v]) => { if(v !== "" && v != null) url.searchParams.set(k,v); });
  const res = await fetch(url, {headers: authHeaders()});
  if(!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}
function escapeHtml(s=""){return s.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function poster(path){return path ? IMG+path : ""}
function year(date){return date ? date.slice(0,4) : "—"}
function isSaved(id){return watchlist.some(m=>m.id===id)}

function renderCards(movies, containerId="movieGrid"){
  const grid=$(containerId);
  if(!movies.length){grid.innerHTML=""; return;}
  grid.innerHTML=movies.map(m=>{
    const genres=(m.genre_ids||[]).slice(0,2).map(g=>genreNames[g]).filter(Boolean).join(" • ");
    const match=calcMatch(m);
    return `<article class="movie-card">
      <div class="poster-wrap">
        ${m.poster_path ? `<img loading="lazy" src="${poster(m.poster_path)}" alt="${escapeHtml(m.title||"Movie poster")}">` : `<div class="poster-fallback">🎬</div>`}
        <button class="heart ${isSaved(m.id)?"saved":""}" data-heart="${m.id}" title="Save to watchlist">${isSaved(m.id)?"♥":"♡"}</button>
        <button class="card-click" data-detail="${m.id}" aria-label="Open details"></button>
      </div>
      <div class="movie-info">
        <div class="movie-title">${escapeHtml(m.title||m.original_title||"Untitled")}</div>
        <div class="movie-meta"><span>${year(m.release_date)}</span><span class="rating">★ ${(m.vote_average||0).toFixed(1)}</span></div>
        <div class="why"><b>${match}% match</b> · ${genres||"Popular pick"}</div>
      </div>
    </article>`
  }).join("");
  bindCardEvents();
  if(containerId==="movieGrid") $("resultCount").textContent=`${movies.length} results`;
}
function calcMatch(m){
  const selected=+$("genreSelect").value;
  const min=+$("ratingRange").value;
  let score=58;
  if(selected && (m.genre_ids||[]).includes(selected)) score+=25;
  if(m.vote_average>=min) score+=Math.min(12,(m.vote_average-min)*5);
  score+=Math.min(5,(m.popularity||0)/20);
  return Math.min(99,Math.round(score));
}
function bindCardEvents(){
  document.querySelectorAll("[data-heart]").forEach(b=>b.onclick=e=>{e.stopPropagation(); toggleWatch(+b.dataset.heart)});
  document.querySelectorAll("[data-detail]").forEach(b=>b.onclick=()=>showDetails(+b.dataset.detail));
}
function toggleWatch(id){
  const movie=currentMovies.find(m=>m.id===id)||watchlist.find(m=>m.id===id);
  if(!movie)return;
  if(isSaved(id)) watchlist=watchlist.filter(m=>m.id!==id); else watchlist.unshift(movie);
  localStorage.setItem("cinematch_watchlist",JSON.stringify(watchlist));
  $("watchCount").textContent=watchlist.length;
  renderCards(watchlist,"watchGrid");
  $("watchEmpty").classList.toggle("hidden",watchlist.length>0);
  renderCards(currentMovies);
  toast(isSaved(id)?"Added to watchlist":"Removed from watchlist");
}
function renderWatchlist(){
  $("watchCount").textContent=watchlist.length;
  $("watchEmpty").classList.toggle("hidden",watchlist.length>0);
  renderCards(watchlist,"watchGrid");
}
function skeletons(){ $("movieGrid").innerHTML=Array.from({length:10},()=>`<div class="skeleton"></div>`).join(""); }

async function loadTrending(){
  if(!token){ showSetup(); return; }
  skeletons();
  try{
    const data=await api("/trending/movie/week",{language:"en-US"});
    currentMovies=data.results||[];
    $("resultsTitle").textContent="Trending this week";
    renderCards(currentMovies);
    $("emptyState").classList.add("hidden");
  }catch(e){handleApiError(e)}
}
async function getRecommendations(){
  if(!token){showSetup();return}
  skeletons();
  try{
    const genre=$("genreSelect").value, min=$("ratingRange").value, period=$("yearSelect").value;
    const params={language:"en-US",sort_by:"vote_average.desc",vote_average_gte:min,vote_count_gte:100,include_adult:false,page:1};
    if(genre)params.with_genres=genre;
    if(period==="2026"||period==="2025"||period==="2024") params.primary_release_year=period;
    if(period==="2020") {params["primary_release_date.gte"]="2020-01-01";params["primary_release_date.lte"]="2023-12-31"}
    if(period==="2010") {params["primary_release_date.gte"]="2010-01-01";params["primary_release_date.lte"]="2019-12-31"}
    if(period==="2000") {params["primary_release_date.gte"]="2000-01-01";params["primary_release_date.lte"]="2009-12-31"}
    if(period==="1990") {params["primary_release_date.gte"]="1990-01-01";params["primary_release_date.lte"]="1999-12-31"}
    const data=await api("/discover/movie",params);
    currentMovies=(data.results||[]).sort((a,b)=>calcMatch(b)-calcMatch(a)).slice(0,10);
    $("resultsTitle").textContent="Recommended for you";
    renderCards(currentMovies);
    $("emptyState").classList.toggle("hidden",currentMovies.length>0);
    $("recommendations").scrollIntoView({behavior:"smooth"});
  }catch(e){handleApiError(e)}
}
async function searchMovies(){
  const q=$("searchInput").value.trim();
  if(!q)return;
  if(!token){showSetup();return}
  skeletons();
  try{
    const data=await api("/search/movie",{query:q,language:"en-US",include_adult:false,page:1});
    currentMovies=data.results||[];
    $("resultsTitle").textContent=`Results for "${q}"`;
    renderCards(currentMovies);
    $("emptyState").classList.toggle("hidden",currentMovies.length>0);
    $("recommendations").scrollIntoView({behavior:"smooth"});
  }catch(e){handleApiError(e)}
}
async function showDetails(id){
  if(!token){showSetup();return}
  try{
    const m=await api(`/movie/${id}`,{language:"en-US",append_to_response:"credits"});
    const saved=isSaved(id);
    const genres=(m.genres||[]).map(g=>g.name).join(" • ");
    $("detailContent").innerHTML=`<div class="detail-hero">
      <div>${m.poster_path?`<img src="${poster(m.poster_path)}" alt="${escapeHtml(m.title)}">`:"🎬"}</div>
      <div>
        <p class="eyebrow">${genres||"MOVIE"}</p>
        <h2>${escapeHtml(m.title)}</h2>
        <div class="movie-meta"><span>${year(m.release_date)} · ${m.runtime||"?"} min</span><span class="rating">★ ${(m.vote_average||0).toFixed(1)}</span></div>
        <p class="detail-score">${calcMatch(m)}% Smart Match</p>
        <p class="detail-copy">${escapeHtml(m.overview||"No overview available.")}</p>
        <p class="detail-copy"><strong>Recommendation logic:</strong> ${buildReason(m)}</p>
        <button class="primary-btn" id="detailSave">${saved?"♥ Remove from Watchlist":"♡ Add to Watchlist"}</button>
      </div>
    </div>`;
    $("detailSave").onclick=()=>{toggleWatch(m.id); $("detailSave").textContent=isSaved(m.id)?"♥ Remove from Watchlist":"♡ Add to Watchlist"};
    $("detailModal").classList.remove("hidden");
  }catch(e){handleApiError(e)}
}
function buildReason(m){
  const selected=+$("genreSelect").value;
  const reasons=[];
  if(selected && (m.genres||[]).some(g=>g.id===selected)) reasons.push("matches your selected genre");
  if(m.vote_average>=+$("ratingRange").value) reasons.push("clears your rating threshold");
  if((m.popularity||0)>20) reasons.push("has strong audience interest");
  return reasons.length?reasons.join(", ")+".":"balances rating quality, popularity and your current preferences.";
}
function handleApiError(e){
  if(e.message==="NO_TOKEN"){showSetup();return}
  console.error(e); toast("Could not load movies. Check your API token and connection.");
}
function showSetup(){
  $("settingsModal").classList.remove("hidden");
  $("tokenInput").value=token;
}
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");clearTimeout(window._toast);window._toast=setTimeout(()=>t.classList.remove("show"),2600)}

$("searchBtn").onclick=searchMovies;
$("searchInput").addEventListener("keydown",e=>{if(e.key==="Enter")searchMovies()});
$("recommendBtn").onclick=getRecommendations;
$("ratingRange").oninput=()=>{$("ratingValue").textContent=+$("ratingRange").value.toFixed(1)};
$("randomBtn").onclick=async()=>{const ids=["28","35","18","27","878","10749","53"]; $("genreSelect").value=ids[Math.floor(Math.random()*ids.length)]; await getRecommendations()};
document.querySelectorAll(".mood-tag").forEach(b=>b.onclick=()=>{const gs=moodGenres[b.dataset.mood];$("genreSelect").value=gs[0];$("ratingRange").value=7;$("ratingValue").textContent="7.0";getRecommendations()});
document.querySelectorAll("[data-scroll]").forEach(b=>b.onclick=()=>document.getElementById(b.dataset.scroll).scrollIntoView({behavior:"smooth"}));
$("settingsBtn").onclick=showSetup;
$("closeSettings").onclick=()=>$("settingsModal").classList.add("hidden");
$("closeModal").onclick=()=>$("detailModal").classList.add("hidden");
$("settingsModal").onclick=e=>{if(e.target===$("settingsModal"))$("settingsModal").classList.add("hidden")};
$("detailModal").onclick=e=>{if(e.target===$("detailModal"))$("detailModal").classList.add("hidden")};
$("saveToken").onclick=()=>{const v=$("tokenInput").value.trim();if(!v){toast("Please paste a TMDB token.");return}token=v;localStorage.setItem(TOKEN_KEY,token);$("settingsModal").classList.add("hidden");toast("TMDB connected.");loadTrending()};
$("clearToken").onclick=()=>{token="";localStorage.removeItem(TOKEN_KEY);$("tokenInput").value="";toast("Token cleared.")};

renderWatchlist();
if(token) loadTrending(); else setTimeout(showSetup,350);
