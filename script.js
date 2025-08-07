const eventPage = document.getElementById("eventPage");
const songPage = document.getElementById("songPage");
const eventListEl = document.getElementById("eventList");
const songListEl = document.getElementById("songList");
const subtitleEl = document.getElementById("subtitle");
const loadingEl = document.getElementById("loading");
const backButton = document.getElementById("backButton");

let allData = [];

fetch("https://script.google.com/macros/s/AKfycbwkV_d1-Jl0dLzQLX5URCgxXecjHNHTxAR0KtcbuCD8piiOqCXDrZIm-6FeegTivinD/exec")
  .then((res) => res.json())
  .then((data) => {
    allData = data;
    renderEvents(data);
    loadingEl.style.display = "none";
  });

function renderEvents(data) {
  const events = [...new Set(data.map((d) => d.title))];
  events.forEach((title, index) => {
    const eventCard = document.createElement("div");
    eventCard.className = "bg-white rounded-xl shadow hover:shadow-lg p-6 cursor-pointer transition duration-300 hover:-translate-y-1";
    eventCard.innerHTML = `
      <h2 class="text-2xl font-bold text-gray-800 mb-2">${title}</h2>
      <p class="text-gray-500 text-sm">${formatDate(data.find(d => d.title === title).date)}</p>
    `;
    eventCard.addEventListener("click", () => showSongsForEvent(title));
    eventListEl.appendChild(eventCard);
  });
}

function showSongsForEvent(eventTitle) {
  const songs = allData.filter((d) => d.title === eventTitle);
  subtitleEl.textContent = `🎤 ${eventTitle}`;

  eventPage.classList.add("hidden");
  songPage.classList.remove("hidden");

  // 套用整體動畫（避免卡頓）
  songPage.classList.remove("fade-in-up");
  void songPage.offsetWidth;
  songPage.classList.add("fade-in-up");

  renderSongs(songs);
}

function renderSongs(songs, title) {
  songListEl.innerHTML = '';

  songs.forEach((song, index) => {
    const row = document.createElement('tr');
    row.className = 'fade-in-up-delayed';
    row.style.animationDelay = `${index * 0.05}s`;

    const [mainTitle, artist] = song.song.split(' / ').map(s => s.trim());
    const ytID = extractYouTubeID(song.link);

    const ytThumbnail = ytID
      ? `<a href="${song.link}" target="_blank">
           <img src="https://img.youtube.com/vi/${ytID}/0.jpg" 
                alt="YT縮圖" 
                class="w-40 rounded hover:scale-105 transition duration-300">
         </a>`
      : '—';

    row.innerHTML = `
      <td class="text-center px-4 py-4">
        <div class="font-semibold">${mainTitle}</div>
        ${artist ? `<div class="text-sm text-gray-500">${artist}</div>` : ''}
      </td>
      <td class="text-left px-4 py-4">${ytThumbnail}</td>
    `;

    songListEl.appendChild(row);
  });
}

backButton.addEventListener("click", () => {
  songPage.classList.add("hidden");
  eventPage.classList.remove("hidden");
  subtitleEl.textContent = "請選擇一場活動查看歌曲";
});

// 工具函式
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function extractYouTubeID(url) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-]+)/);
  return match ? match[1] : null;
}
