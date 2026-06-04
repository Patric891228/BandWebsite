const eventPage = document.getElementById("eventPage");
const songPage = document.getElementById("songPage");
const eventListEl = document.getElementById("eventList");
const songListEl = document.getElementById("songList");
const subtitleEl = document.getElementById("subtitle");
const loadingEl = document.getElementById("loading");
const backButton = document.getElementById("backButton");

const defaultSubtitle = "點選一場演出，查看當天的歌曲與影片。";
const dataUrl = "https://script.google.com/macros/s/AKfycbwkV_d1-Jl0dLzQLX5URCgxXecjHNHTxAR0KtcbuCD8piiOqCXDrZIm-6FeegTivinD/exec";
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

let allData = [];
let eventSongMap = new Map();

fetch(dataUrl)
  .then((res) => res.json())
  .then((data) => {
    allData = Array.isArray(data) ? data : [];
    eventSongMap = buildEventSongMap(allData);
    renderEvents(eventSongMap);
    loadingEl.style.display = "none";
  })
  .catch(() => {
    loadingEl.textContent = "資料載入失敗，請稍後再試。";
  });

function buildEventSongMap(data) {
  const map = new Map();

  data.forEach((item) => {
    if (!item?.title) {
      return;
    }

    if (!map.has(item.title)) {
      map.set(item.title, []);
    }

    map.get(item.title).push(item);
  });

  return map;
}

function renderEvents(eventsMap) {
  eventListEl.textContent = "";

  const fragment = document.createDocumentFragment();

  eventsMap.forEach((songs, title) => {
    const eventCard = document.createElement("button");
    eventCard.type = "button";
    eventCard.className = "event-card";
    eventCard.innerHTML = `
      <div>
        <h2 class="event-card-title">${escapeHtml(title)}</h2>
        <p class="event-card-date">${formatDate(songs[0]?.date)}</p>
      </div>
    `;
    eventCard.addEventListener("click", () => showSongsForEvent(title));
    fragment.appendChild(eventCard);
  });

  eventListEl.appendChild(fragment);
  animateEventCards();
}

function showSongsForEvent(eventTitle) {
  const songs = eventSongMap.get(eventTitle) || allData.filter((item) => item.title === eventTitle);
  subtitleEl.textContent = `🎼 ${eventTitle}`;
  renderSongs(songs);
  switchPage(eventPage, songPage);
}

function renderSongs(songs) {
  songListEl.textContent = "";

  const fragment = document.createDocumentFragment();

  songs.forEach((song, index) => {
    const row = document.createElement("tr");

    const [mainTitle, artist] = splitSongTitle(song.song);
    const ytID = extractYouTubeID(song.link);

    row.innerHTML = `
      <td class="px-4 py-4 text-center">
        <div class="song-title">${escapeHtml(mainTitle)}</div>
        ${artist ? `<div class="song-artist">${escapeHtml(artist)}</div>` : ""}
      </td>
      <td class="px-4 py-4 text-left">${renderThumbnail(song.link, ytID, mainTitle)}</td>
    `;

    fragment.appendChild(row);
  });

  songListEl.appendChild(fragment);
  animateSongRows();
  bindThumbnailMotion();
}

function renderThumbnail(link, ytID, title) {
  if (!ytID) {
    return '<span class="video-unavailable">無影片</span>';
  }

  const safeLink = escapeAttribute(link);
  const safeTitle = escapeAttribute(`${title} YouTube 影片`);

  return `
    <a class="thumbnail-link" href="${safeLink}" target="_blank" rel="noopener noreferrer" aria-label="${safeTitle}">
      <img
        class="thumbnail-image"
        src="https://img.youtube.com/vi/${ytID}/mqdefault.jpg"
        alt="${safeTitle}"
        loading="lazy"
        decoding="async"
      />
    </a>
  `;
}

function splitSongTitle(songTitle = "") {
  const parts = songTitle.split(" / ").map((part) => part.trim()).filter(Boolean);
  return [parts[0] || "未命名歌曲", parts[1] || ""];
}

backButton.addEventListener("click", () => {
  subtitleEl.textContent = defaultSubtitle;
  switchPage(songPage, eventPage);
});

function switchPage(fromElement, toElement) {
  if (!canUseGsap()) {
    toElement.classList.remove("hidden");

    if (!fromElement.classList.contains("hidden")) {
      fromElement.classList.add("hidden");
    }

    return;
  }

  toElement.classList.remove("hidden");
  toElement.classList.add("page-section");
  fromElement.classList.add("page-section");

  gsap.killTweensOf([fromElement, toElement]);
  gsap.set(toElement, { autoAlpha: 0, y: 18, scale: 0.992 });

  const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });

  if (!fromElement.classList.contains("hidden")) {
    timeline.to(fromElement, {
      autoAlpha: 0,
      y: -8,
      scale: 0.996,
      duration: 0.18,
      ease: "power2.in",
      onComplete: () => {
        fromElement.classList.add("hidden");
        gsap.set(fromElement, { clearProps: "opacity,visibility,transform" });
      }
    });
  }

  timeline.to(toElement, {
    autoAlpha: 1,
    y: 0,
    scale: 1,
    duration: 0.38,
    clearProps: "opacity,visibility,transform"
  }, "-=0.04");
}

function animateEventCards() {
  const cards = canUseGsap()
    ? gsap.utils.toArray(".event-card")
    : Array.from(document.querySelectorAll(".event-card"));

  if (!canUseGsap()) {
    cards.forEach((card, index) => {
      card.classList.add("is-entering");
      card.style.animationDelay = `${index * 0.06}s`;
    });
    return;
  }

  gsap.fromTo(cards, {
    autoAlpha: 0,
    y: 24,
    scale: 0.985
  }, {
    autoAlpha: 1,
    y: 0,
    scale: 1,
    duration: 0.5,
    stagger: 0.055,
    ease: "power3.out",
    clearProps: "opacity,visibility,transform"
  });
}

function animateSongRows() {
  const rows = Array.from(songListEl.querySelectorAll("tr"));

  if (!canUseGsap()) {
    rows.forEach((row, index) => {
      row.classList.add("fade-in-up-delayed");
      row.style.animationDelay = `${index * 0.05}s`;
    });
    return;
  }

  gsap.fromTo(rows, {
    autoAlpha: 0,
    y: 16
  }, {
    autoAlpha: 1,
    y: 0,
    duration: 0.36,
    stagger: 0.045,
    ease: "power2.out",
    clearProps: "opacity,visibility,transform"
  });
}

function bindThumbnailMotion() {
  const links = Array.from(songListEl.querySelectorAll(".thumbnail-link"));

  if (!canUseGsap()) {
    return;
  }

  links.forEach((link) => {
    const image = link.querySelector(".thumbnail-image");
    const liftThumbnail = () => {
      gsap.to(image, { scale: 1.055, duration: 0.24, ease: "power2.out" });
      gsap.to(link, { y: -2, duration: 0.24, ease: "power2.out" });
    };
    const settleThumbnail = () => {
      gsap.to(image, { scale: 1, duration: 0.28, ease: "power2.out" });
      gsap.to(link, { y: 0, duration: 0.28, ease: "power2.out" });
    };

    link.addEventListener("mouseenter", liftThumbnail);
    link.addEventListener("focus", liftThumbnail);
    link.addEventListener("mouseleave", settleThumbnail);
    link.addEventListener("blur", settleThumbnail);
  });
}

function canUseGsap() {
  return Boolean(window.gsap) && !reducedMotionQuery.matches;
}

function formatDate(dateStr) {
  if (!dateStr) {
    return "日期未提供";
  }

  const date = new Date(dateStr);

  if (Number.isNaN(date.getTime())) {
    return dateStr;
  }

  return date.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function extractYouTubeID(url = "") {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-]+)/);
  return match ? match[1] : null;
}

function escapeHtml(value = "") {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value = "") {
  return escapeHtml(value);
}
