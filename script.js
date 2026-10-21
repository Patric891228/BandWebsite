const eventPage = document.getElementById("eventPage");
const songPage = document.getElementById("songPage");
const eventListEl = document.getElementById("eventList");
const songListEl = document.getElementById("songList");
const subtitleEl = document.getElementById("subtitle");
const loadingEl = document.getElementById("loading");
const backButton = document.getElementById("backButton");
const retryButton = document.getElementById("retryButton");
const eventSearchEl = document.getElementById("eventSearch");
const eventSortEl = document.getElementById("eventSort");
const eventToolsEl = document.getElementById("eventTools");
const eventCountEl = document.getElementById("eventCount");
const eventEmptyEl = document.getElementById("eventEmpty");
const eventDetailsEl = document.getElementById("eventDetails");
const songSearchEl = document.getElementById("songSearch");
const songCountEl = document.getElementById("songCount");
const songEmptyEl = document.getElementById("songEmpty");

const defaultSubtitle = "";
const dataUrl = "https://script.google.com/macros/s/AKfycbwkV_d1-Jl0dLzQLX5URCgxXecjHNHTxAR0KtcbuCD8piiOqCXDrZIm-6FeegTivinD/exec";
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const queryParams = new URLSearchParams(window.location.search);

let allData = [];
let eventSongMap = new Map();
let currentEventTitle = "";
let currentSongs = [];
let requestController = null;

loadData();

async function loadData() {
  if (requestController) requestController.abort();
  requestController = new AbortController();
  loadingEl.hidden = false;
  loadingEl.textContent = "資料載入中...";
  retryButton.hidden = true;
  eventEmptyEl.hidden = true;

  try {
    const response = await fetch(dataUrl, { signal: requestController.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("資料格式錯誤");

    allData = data;
    eventSongMap = buildEventSongMap(data);
    loadingEl.hidden = true;
    eventToolsEl.hidden = eventSongMap.size === 0;
    renderEvents();
    if (eventSongMap.size === 0) showEventEmpty("目前沒有演出資料。");
    openEventFromUrl();
  } catch (error) {
    if (error.name === "AbortError") return;
    loadingEl.hidden = false;
    loadingEl.textContent = "資料載入失敗，請確認網路連線後重試。";
    retryButton.hidden = false;
  }
}

function buildEventSongMap(data) {
  const map = new Map();
  data.forEach((item) => {
    if (!item?.title) return;
    if (!map.has(item.title)) map.set(item.title, []);
    map.get(item.title).push(item);
  });
  return map;
}

function getEvents() {
  const search = eventSearchEl.value.trim().toLocaleLowerCase("zh-TW");
  const events = Array.from(eventSongMap, ([title, songs]) => ({ title, songs, date: parseDate(songs[0]?.date) }));
  const filtered = events.filter(({ title, songs }) => {
    if (!search) return true;
    const searchable = [title, ...songs.flatMap((song) => {
      const [mainTitle, inlineArtist] = splitSongTitle(song.song || "");
      return [mainTitle, inlineArtist, song.artist || ""];
    })].join(" ").toLocaleLowerCase("zh-TW");
    return searchable.includes(search);
  });
  const sort = eventSortEl.value;

  filtered.sort((a, b) => {
    if (sort === "title-asc") return a.title.localeCompare(b.title, "zh-TW");
    const aTime = a.date?.getTime() ?? (sort === "date-asc" ? Infinity : -Infinity);
    const bTime = b.date?.getTime() ?? (sort === "date-asc" ? Infinity : -Infinity);
    return sort === "date-asc" ? aTime - bTime : bTime - aTime;
  });
  return filtered;
}

function renderEvents() {
  eventListEl.textContent = "";
  const events = getEvents();
  eventCountEl.textContent = `${events.length} 場演出`;
  eventEmptyEl.hidden = events.length > 0;
  if (!events.length) {
    showEventEmpty(eventSearchEl.value.trim() ? "找不到符合的演出、歌曲或歌手。" : "目前沒有演出資料。");
    return;
  }

  const fragment = document.createDocumentFragment();
  events.forEach(({ title, songs }) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "event-card";
    card.innerHTML = `<div><h2 class="event-card-title">${escapeHtml(title)}</h2><p class="event-card-date">${escapeHtml(formatDate(songs[0]?.date))}</p></div><p class="event-card-count">${songs.length} 首歌曲</p>`;
    card.addEventListener("click", () => showSongsForEvent(title, true));
    fragment.appendChild(card);
  });
  eventListEl.appendChild(fragment);
  animateEventCards();
}

function showEventEmpty(message) {
  eventEmptyEl.textContent = message;
  eventEmptyEl.hidden = false;
}

function openEventFromUrl() {
  const title = queryParams.get("event");
  if (title && eventSongMap.has(title)) showSongsForEvent(title, false);
}

function showSongsForEvent(eventTitle, updateUrl = true) {
  const songs = eventSongMap.get(eventTitle) || [];
  currentEventTitle = eventTitle;
  currentSongs = songs;
  subtitleEl.textContent = `🎼 ${eventTitle}`;
  songSearchEl.value = "";
  renderEventDetails(songs);
  renderSongs();
  switchPage(eventPage, songPage);
  if (updateUrl) setEventUrl(eventTitle);
}

function renderEventDetails(songs) {
  const event = songs[0] || {};
  const details = [
    event.date ? `日期：${formatDate(event.date)}` : "",
    event.venue || event.location ? `地點：${event.venue || event.location}` : "",
    event.time ? `時間：${event.time}` : "",
    `${songs.length} 首歌曲`
  ].filter(Boolean);
  eventDetailsEl.textContent = details.join("・");
  eventDetailsEl.hidden = details.length === 0;
}

function renderSongs() {
  songListEl.textContent = "";
  const search = songSearchEl.value.trim().toLocaleLowerCase("zh-TW");
  const songs = currentSongs.filter((song) => `${song.song || ""} ${song.artist || ""} ${song.title || ""}`.toLocaleLowerCase("zh-TW").includes(search));
  songCountEl.textContent = `顯示 ${songs.length} / ${currentSongs.length} 首歌曲`;
  songEmptyEl.textContent = search ? "找不到符合的歌曲。" : "這場演出目前沒有歌曲資料。";
  songEmptyEl.hidden = songs.length > 0;

  const fragment = document.createDocumentFragment();
  songs.forEach((song) => {
    const row = document.createElement("tr");
    const [mainTitle, artist] = splitSongTitle(song.song || "");
    const ytID = extractYouTubeID(song.link || "");
    row.innerHTML = `<td class="px-4 py-4 text-center"><div class="song-title">${escapeHtml(mainTitle)}</div>${artist ? `<div class="song-artist">${escapeHtml(artist)}</div>` : ""}</td><td class="px-4 py-4 text-left">${renderThumbnail(song.link, ytID, mainTitle)}</td>`;
    fragment.appendChild(row);
  });
  songListEl.appendChild(fragment);
  animateSongRows();
  bindThumbnailMotion();
}

function renderThumbnail(link, ytID, title) {
  if (!ytID) return '<span class="video-unavailable">無影片</span>';
  const safeLink = escapeAttribute(link);
  const safeTitle = escapeAttribute(`${title} YouTube 影片`);
  return `<a class="thumbnail-link" href="${safeLink}" target="_blank" rel="noopener noreferrer" aria-label="${safeTitle}"><img class="thumbnail-image" src="https://img.youtube.com/vi/${ytID}/mqdefault.jpg" alt="${safeTitle}" loading="lazy" decoding="async" /><span class="thumbnail-fallback" hidden>縮圖無法載入</span></a>`;
}

function splitSongTitle(songTitle = "") {
  const parts = songTitle.split(" / ").map((part) => part.trim()).filter(Boolean);
  return [parts[0] || "未命名歌曲", parts[1] || ""];
}

function setEventUrl(title) {
  const url = new URL(window.location.href);
  url.searchParams.set("event", title);
  window.history.pushState({ event: title }, "", url);
}

function clearEventUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("event");
  window.history.pushState({}, "", url);
}

backButton.addEventListener("click", () => {
  subtitleEl.textContent = defaultSubtitle;
  currentEventTitle = "";
  switchPage(songPage, eventPage);
  clearEventUrl();
});

eventSearchEl.addEventListener("input", renderEvents);
eventSortEl.addEventListener("change", renderEvents);
songSearchEl.addEventListener("input", renderSongs);
retryButton.addEventListener("click", loadData);
window.addEventListener("popstate", () => {
  const title = new URLSearchParams(window.location.search).get("event");
  if (title && eventSongMap.has(title)) showSongsForEvent(title, false);
  else if (!songPage.classList.contains("hidden")) {
    subtitleEl.textContent = defaultSubtitle;
    switchPage(songPage, eventPage);
  }
});
songListEl.addEventListener("error", (event) => {
  if (event.target.matches(".thumbnail-image")) {
    event.target.hidden = true;
    const fallback = event.target.nextElementSibling;
    if (fallback) fallback.hidden = false;
  }
}, true);

function switchPage(fromElement, toElement) {
  if (!canUseGsap()) {
    toElement.classList.remove("hidden");
    fromElement.classList.add("hidden");
    return;
  }
  toElement.classList.remove("hidden");
  toElement.classList.add("page-section");
  fromElement.classList.add("page-section");
  gsap.killTweensOf([fromElement, toElement]);
  gsap.set(toElement, { autoAlpha: 0, y: 18, scale: 0.992 });
  const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
  if (!fromElement.classList.contains("hidden")) {
    timeline.to(fromElement, { autoAlpha: 0, y: -8, scale: 0.996, duration: 0.18, ease: "power2.in", onComplete: () => {
      fromElement.classList.add("hidden");
      gsap.set(fromElement, { clearProps: "opacity,visibility,transform" });
    } });
  }
  timeline.to(toElement, { autoAlpha: 1, y: 0, scale: 1, duration: 0.38, clearProps: "opacity,visibility,transform" }, "-=0.04");
}

function animateEventCards() {
  const cards = canUseGsap() ? gsap.utils.toArray(".event-card") : Array.from(document.querySelectorAll(".event-card"));
  if (!canUseGsap()) {
    cards.forEach((card, index) => { card.classList.add("is-entering"); card.style.animationDelay = `${index * 0.06}s`; });
    return;
  }
  gsap.fromTo(cards, { autoAlpha: 0, y: 24, scale: 0.985 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.055, ease: "power3.out", clearProps: "opacity,visibility,transform" });
}

function animateSongRows() {
  const rows = Array.from(songListEl.querySelectorAll("tr"));
  if (!canUseGsap()) {
    rows.forEach((row, index) => { row.classList.add("fade-in-up-delayed"); row.style.animationDelay = `${index * 0.05}s`; });
    return;
  }
  gsap.fromTo(rows, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.36, stagger: 0.045, ease: "power2.out", clearProps: "opacity,visibility,transform" });
}

function bindThumbnailMotion() {
  if (!canUseGsap()) return;
  songListEl.querySelectorAll(".thumbnail-link").forEach((link) => {
    const image = link.querySelector(".thumbnail-image");
    const lift = () => { gsap.to(image, { scale: 1.055, duration: 0.24, ease: "power2.out" }); gsap.to(link, { y: -2, duration: 0.24, ease: "power2.out" }); };
    const settle = () => { gsap.to(image, { scale: 1, duration: 0.28, ease: "power2.out" }); gsap.to(link, { y: 0, duration: 0.28, ease: "power2.out" }); };
    link.addEventListener("mouseenter", lift);
    link.addEventListener("focus", lift);
    link.addEventListener("mouseleave", settle);
    link.addEventListener("blur", settle);
  });
}

function canUseGsap() { return Boolean(window.gsap) && !reducedMotionQuery.matches; }
function parseDate(value) {
  if (!value) return null;
  const normalized = /^\d{4}-\d{1,2}-\d{1,2}$/.test(String(value)) ? `${value}T00:00:00` : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}
function formatDate(value) {
  if (!value) return "日期未提供";
  const date = parseDate(value);
  if (!date) return String(value);
  return date.toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" });
}
function extractYouTubeID(url = "") {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-]+)/);
  return match ? match[1] : null;
}
function escapeHtml(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function escapeAttribute(value = "") { return escapeHtml(value); }
