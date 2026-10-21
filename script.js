const eventPage = document.getElementById("eventPage");
const songPage = document.getElementById("songPage");
const eventListEl = document.getElementById("eventList");
const songListEl = document.getElementById("songList");
const subtitleEl = document.getElementById("subtitle");
const loadingEl = document.getElementById("loading");
const loadingCanvas = document.getElementById("loadingAnimation");
const loadingMessageEl = document.getElementById("loadingMessage");
const backButton = document.getElementById("backButton");
const retryButton = document.getElementById("retryButton");
const eventSearchEl = document.getElementById("eventSearch");
const eventSortEl = document.getElementById("eventSort");
const eventToolsEl = document.getElementById("eventTools");
const eventCountEl = document.getElementById("eventCount");
const eventEmptyEl = document.getElementById("eventEmpty");
const globalSongResultsEl = document.getElementById("globalSongResults");
const globalSongHeadingEl = document.getElementById("globalSongHeading");
const globalSongListEl = document.getElementById("globalSongList");
const eventDetailsEl = document.getElementById("eventDetails");
const eventGalleryEl = document.getElementById("eventGallery");
const eventGalleryTrackEl = document.getElementById("eventGalleryTrack");
const songSearchEl = document.getElementById("songSearch");
const songCountEl = document.getElementById("songCount");
const songEmptyEl = document.getElementById("songEmpty");
const themeToggleEl = document.getElementById("themeToggle");
const themeIconEl = document.getElementById("themeIcon");

const defaultSubtitle = "";
const dataUrl = "https://script.google.com/macros/s/AKfycbwkV_d1-Jl0dLzQLX5URCgxXecjHNHTxAR0KtcbuCD8piiOqCXDrZIm-6FeegTivinD/exec";
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const queryParams = new URLSearchParams(window.location.search);

// Add photos by event title here; each event can use local paths or image URLs.
// Example: "Event title": ["images/show-1.jpg", "images/show-2.jpg"]
const EVENT_PHOTOS = {};
let eventGalleryFrame = 0;
let eventGalleryResizeObserver = null;

function applyTheme(theme, persist = false) {
  const isDark = theme === "dark";
  document.body.dataset.theme = isDark ? "dark" : "light";
  themeToggleEl.setAttribute("aria-pressed", String(isDark));
  themeToggleEl.setAttribute("aria-label", isDark ? "切換至淺色模式" : "切換至深色模式");
  themeToggleEl.title = isDark ? "切換至淺色模式" : "切換至深色模式";
  themeIconEl.textContent = isDark ? "☀" : "☾";
  if (persist) {
    try { window.localStorage.setItem("band-website-theme", isDark ? "dark" : "light"); } catch {}
  }
}

let savedTheme = null;
try { savedTheme = window.localStorage.getItem("band-website-theme"); } catch {}
applyTheme(savedTheme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
themeToggleEl.addEventListener("click", () => {
  applyTheme(document.body.dataset.theme === "dark" ? "light" : "dark", true);
});

let allData = [];
let eventSongMap = new Map();
let currentEventTitle = "";
let currentSongs = [];
let requestController = null;
let loadingFrame = 0;
let loadingStart = 0;

// Motion Prompt #134 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#134
// Repeater: keep the reference geometry, 4.7 s cycle, timing and easing; adapt only palette/background and omit the counter.
const REPEATER_CYCLE = 4.7;
const REPEATER_PALETTE = ["#7c9ebb", "#9bb4ca", "#bacbd9", "#d4e0e9"];
const REPEATER_WHITE = "#ffffff";
const repeaterCanvasContext = loadingCanvas.getContext("2d");

function drawRepeater(time) {
  const u = (time % REPEATER_CYCLE + REPEATER_CYCLE) % REPEATER_CYCLE;
  const ctx = repeaterCanvasContext;
  const w = loadingCanvas.width;
  const h = loadingCanvas.height;
  ctx.clearRect(0, 0, w, h);
  const N = 12, X = w / 2, Y = h / 2, R = 58, spin = 2 * Math.PI * u / REPEATER_CYCLE;
  const progress = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
  const easeInOutQuad = (x) => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
  const count = 1 + (N - 1) * (easeInOutQuad(progress(u, 0.35, 1.7)) - easeInOutQuad(progress(u, 3.6, 4.45)));
  const palette = document.body.dataset.theme === "dark"
    ? ["#274690", "#576CA8", "#F5F3F5", "#1B264F"]
    : REPEATER_PALETTE;

  for (let i = N - 1; i >= 0; i--) {
    const visibility = i === 0 ? 1 : Math.max(0, Math.min(1, count - i));
    if (visibility <= 0) continue;
    const angle = spin + (i === 0 ? 0 : (i - 1 + easeOutCubic(visibility)) * 2 * Math.PI / N);
    const pulse = (1 + 0.22 * Math.sin(2 * Math.PI * 2 * u / REPEATER_CYCLE - i * 0.55)) * (0.55 + 0.45 * visibility);
    ctx.save();
    ctx.translate(X + Math.cos(angle) * R, Y + Math.sin(angle) * R);
    ctx.rotate(angle + Math.PI / 2);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = palette[i % palette.length];
    ctx.beginPath();
    ctx.roundRect(-12, -30, 24, 60, 12);
    ctx.fill();
    if (i === 0) {
      ctx.strokeStyle = REPEATER_WHITE;
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    ctx.restore();
  }
}

function animateLoading(time) {
  if (loadingEl.hidden || !loadingCanvas.isConnected) {
    loadingFrame = 0;
    return;
  }
  if (!loadingStart) loadingStart = time;
  drawRepeater((time - loadingStart) / 1000);
  loadingFrame = window.requestAnimationFrame(animateLoading);
}

function startLoadingAnimation() {
  if (loadingFrame) return;
  loadingStart = 0;
  loadingFrame = window.requestAnimationFrame(animateLoading);
}

function stopLoadingAnimation() {
  if (loadingFrame) window.cancelAnimationFrame(loadingFrame);
  loadingFrame = 0;
  loadingStart = 0;
  repeaterCanvasContext.clearRect(0, 0, loadingCanvas.width, loadingCanvas.height);
}

loadData();

async function loadData() {
  if (requestController) requestController.abort();
  requestController = new AbortController();
  loadingEl.hidden = false;
  loadingMessageEl.hidden = true;
  loadingMessageEl.textContent = "";
  startLoadingAnimation();
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
    stopLoadingAnimation();
    eventToolsEl.hidden = true;
    renderEvents();
    if (eventSongMap.size === 0) showEventEmpty("目前沒有演出資料。");
    openEventFromUrl();
  } catch (error) {
    if (error.name === "AbortError") return;
    loadingEl.hidden = false;
    loadingMessageEl.textContent = "資料載入失敗，請確認網路連線後重試。";
    loadingMessageEl.hidden = false;
    stopLoadingAnimation();
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
  const search = normalizeSearch(eventSearchEl.value);
  const events = Array.from(eventSongMap, ([title, songs]) => ({ title, songs, date: parseDate(songs[0]?.date) }));
  const filtered = events.filter(({ title }) => !search || normalizeSearch(title).includes(search));
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
  globalSongListEl.textContent = "";
  const query = eventSearchEl.value.trim();
  const search = normalizeSearch(query);
  const matchingSongs = search ? getMatchingSongs(search) : [];
  const hasSongMatches = matchingSongs.length > 0;
  globalSongResultsEl.hidden = !hasSongMatches;
  eventListEl.hidden = hasSongMatches;
  eventCountEl.hidden = hasSongMatches;

  if (hasSongMatches) {
    eventEmptyEl.hidden = true;
    globalSongHeadingEl.textContent = `找到 ${matchingSongs.length} 首不重複歌曲`;
    renderGlobalSongResults(matchingSongs);
    return;
  }

  const events = getEvents();
  const isSearching = Boolean(search);
  eventListEl.hidden = isSearching && events.length === 0;
  eventCountEl.textContent = `${events.length} 場演出`;
  eventEmptyEl.hidden = events.length > 0;
  if (!events.length) {
    showEventEmpty(isSearching ? "找不到符合的演出、歌曲或歌手。" : "目前沒有演出資料。");
    return;
  }

  const fragment = document.createDocumentFragment();
  events.forEach(({ title, songs }) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "event-card";
    card.innerHTML = `<span class="event-card-image" aria-hidden="true"></span><span class="event-card-body"><span class="event-card-date">${escapeHtml(formatDate(songs[0]?.date))}</span><span class="event-card-title">${escapeHtml(title)}</span><span class="event-card-meta"><span>${songs.length} 首歌曲</span><span class="event-card-arrow" aria-hidden="true">↗</span></span></span>`;
    card.addEventListener("click", () => showSongsForEvent(title, true));
    fragment.appendChild(card);
  });
  eventListEl.appendChild(fragment);
  animateEventCards();
}

function getMatchingSongs(search) {
  const uniqueSongs = new Map();
  allData.forEach((song) => {
    const [title, inlineArtist] = splitSongTitle(song.song || "");
    const artist = song.artist || inlineArtist;
    const eventTitle = song.title || "未命名演出";
    const fields = [title, artist, song.song || ""].map(normalizeSearch);
    if (!fields.some((field) => field.includes(search))) return;

    const key = `${normalizeSearch(title)}::${normalizeSearch(artist)}`;
    if (!uniqueSongs.has(key)) {
      uniqueSongs.set(key, { title, artist, link: song.link || "", eventTitles: new Set() });
    }
    uniqueSongs.get(key).eventTitles.add(eventTitle);
    if (!uniqueSongs.get(key).link && song.link) uniqueSongs.get(key).link = song.link;
  });
  return Array.from(uniqueSongs.values());
}

function renderGlobalSongResults(songs) {
  const fragment = document.createDocumentFragment();
  songs.forEach((song) => {
    const row = document.createElement("tr");
    const eventTitles = Array.from(song.eventTitles);
    const eventButtons = eventTitles.map((title) =>
      `<button class="song-event-link" type="button" data-event-title="${escapeAttribute(title)}">${escapeHtml(title)}</button>`
    ).join("、");
    const ytID = extractYouTubeID(song.link);
    row.innerHTML = `<td class="px-4 py-4 text-center"><div class="song-title">${escapeHtml(song.title)}</div>${song.artist ? `<div class="song-artist">${escapeHtml(song.artist)}</div>` : ""}</td><td class="px-4 py-4 text-center">${eventButtons}</td><td class="px-4 py-4 text-left">${renderThumbnail(song.link, ytID, song.title)}</td>`;
    fragment.appendChild(row);
  });
  globalSongListEl.appendChild(fragment);
}

globalSongListEl.addEventListener("click", (event) => {
  const button = event.target.closest("[data-event-title]");
  if (button) showSongsForEvent(button.dataset.eventTitle, true);
});

function normalizeSearch(value = "") {
  return String(value).normalize("NFKC").trim().toLocaleLowerCase("zh-TW");
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
  renderEventGallery(eventTitle, songs);
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

function renderEventGallery(eventTitle, songs) {
  stopEventGalleryPlayback();
  eventGalleryTrackEl.textContent = "";
  const photos = getEventPhotos(eventTitle, songs);
  eventGalleryEl.hidden = photos.length === 0;
  if (!photos.length) return;

  const createPhotoGroup = (duplicate = false) => {
    const group = document.createElement("div");
    group.className = "event-gallery-group";
    if (duplicate) group.setAttribute("aria-hidden", "true");
    photos.forEach((src, index) => {
      const item = document.createElement("div");
      item.className = "event-gallery-item";
      const image = document.createElement("img");
      image.src = src;
      image.alt = duplicate ? "" : `${eventTitle} 活動照片 ${index + 1}`;
      image.loading = duplicate ? "lazy" : (index < 2 ? "eager" : "lazy");
      image.decoding = "async";
      item.appendChild(image);
      group.appendChild(item);
    });
    eventGalleryTrackEl.appendChild(group);
  };

  createPhotoGroup();
  createPhotoGroup(true);
  startEventGalleryPlayback(eventGalleryEl, eventGalleryTrackEl);
}

function getEventPhotos(eventTitle, songs) {
  const configured = EVENT_PHOTOS[eventTitle];
  const values = configured ? (Array.isArray(configured) ? [...configured] : [configured]) : [];
  songs.forEach((song) => {
    [song.photos, song.images, song.photo, song.image].forEach((value) => {
      if (Array.isArray(value)) values.push(...value);
      else if (typeof value === "string" && value.trim()) {
        const trimmed = value.trim();
        try {
          const parsed = JSON.parse(trimmed);
          values.push(...(Array.isArray(parsed) ? parsed : [parsed]));
        } catch {
          values.push(...trimmed.split(/[\n|;]/));
        }
      }
    });
  });
  return Array.from(new Set(values.map((value) => safeImageUrl(value)).filter(Boolean)));
}

function safeImageUrl(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  const src = value.trim();
  try {
    const url = new URL(src, window.location.href);
    return ["http:", "https:"].includes(url.protocol) ? src : "";
  } catch {
    return "";
  }
}

function startEventGalleryPlayback(gallery, track) {
  if (reducedMotionQuery.matches) return;
  let previousTime = 0;
  let cycleWidth = 0;
  const measure = () => {
    const groups = track.children;
    if (groups.length < 2) return;
    cycleWidth = groups[1].offsetLeft - groups[0].offsetLeft;
    while (cycleWidth > 0 && track.scrollWidth < gallery.clientWidth + cycleWidth && groups.length < 50) {
      const duplicate = groups[0].cloneNode(true);
      duplicate.setAttribute("aria-hidden", "true");
      track.appendChild(duplicate);
    }
  };
  measure();
  if ("ResizeObserver" in window) {
    eventGalleryResizeObserver = new ResizeObserver(measure);
    eventGalleryResizeObserver.observe(gallery);
  }

  const tick = (time) => {
    if (!gallery.isConnected) {
      return;
    }
    if (previousTime && !document.hidden && !songPage.classList.contains("hidden") && !gallery.matches(":hover") && !gallery.matches(":focus-within")) {
      gallery.scrollLeft += Math.min(time - previousTime, 50) * 0.022;
      if (cycleWidth > 0 && gallery.scrollLeft >= cycleWidth) gallery.scrollLeft -= cycleWidth;
    }
    previousTime = time;
    eventGalleryFrame = window.requestAnimationFrame(tick);
  };
  eventGalleryFrame = window.requestAnimationFrame(tick);
}

function stopEventGalleryPlayback() {
  if (eventGalleryFrame) window.cancelAnimationFrame(eventGalleryFrame);
  eventGalleryFrame = 0;
  eventGalleryResizeObserver?.disconnect();
  eventGalleryResizeObserver = null;
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
