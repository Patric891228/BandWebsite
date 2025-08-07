const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbwkV_d1-Jl0dLzQLX5URCgxXecjHNHTxAR0KtcbuCD8piiOqCXDrZIm-6FeegTivinD/exec';

let allData = [];

async function fetchSongs() {
  const res = await fetch(SHEET_API_URL);
  const data = await res.json();
  allData = data;

  document.getElementById("loading").style.display = "none";
  renderEventCards(getUniqueEvents(data));
}

function getUniqueEvents(data) {
  const seen = new Set();
  return data.filter(row => {
    if (seen.has(row.title)) return false;
    seen.add(row.title);
    return true;
  });
}

function renderEventCards(events) {
  const eventList = document.getElementById("eventList");
  eventList.innerHTML = "";

  events.forEach(event => {
    const div = document.createElement("div");
    div.className = "card p-6 cursor-pointer text-center";
    div.innerHTML = `
      <h2 class="card-title">🎤 ${event.title}</h2>
      <p class="card-date">${formatDate(event.date)}</p>
    `;
    div.onclick = () => showSongs(event.title);
    eventList.appendChild(div);
  });
}

function showSongs(title) {
  const songPage = document.getElementById("songPage");
  const eventPage = document.getElementById("eventPage");
  const songList = document.getElementById("songList");

  songList.innerHTML = "";
  eventPage.classList.add("hidden");
  songPage.classList.remove("hidden");

  document.getElementById("subtitle").textContent = `活動：${title}`;

  const songs = allData.filter(row => row.title === title);
  songs.forEach(row => {
    const tr = document.createElement("tr");
    const videoID = extractYouTubeID(row.link);
    tr.innerHTML = `
      <td class="px-4 py-3 text-center text-base">${row.song}</td>
      <td class="px-4 py-3 text-center text-base">
        ${videoID ? `
          <a href="${row.link}" target="_blank">
            <img src="https://img.youtube.com/vi/${videoID}/default.jpg" class="w-20 rounded border">
          </a>
        ` : ''}
      </td>
    `;
    songList.appendChild(tr);
  });
}

function formatDate(iso) {
  const date = new Date(iso);
  return date.toLocaleDateString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function extractYouTubeID(url) {
  const match = url?.match(/(?:youtube\.com\/.*v=|youtu\.be\/)([\w\-]{11})/);
  return match ? match[1] : null;
}

document.getElementById("backButton").onclick = () => {
  document.getElementById("eventPage").classList.remove("hidden");
  document.getElementById("songPage").classList.add("hidden");
  document.getElementById("subtitle").textContent = `請選擇一場活動查看歌曲`;
};

fetchSongs();
