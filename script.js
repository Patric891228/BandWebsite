const apiURL = 'https://script.google.com/macros/s/AKfycbwkV_d1-Jl0dLzQLX5URCgxXecjHNHTxAR0KtcbuCD8piiOqCXDrZIm-6FeegTivinD/exec';

const eventListEl = document.getElementById('eventList');
const songListEl = document.getElementById('songList');
const eventPage = document.getElementById('eventPage');
const songPage = document.getElementById('songPage');
const backButton = document.getElementById('backButton');
const loadingEl = document.getElementById('loading');
const subtitle = document.getElementById('subtitle');

let allData = [];

fetch(apiURL)
  .then(res => res.json())
  .then(data => {
    allData = data;
    const events = groupByEvents(data);
    renderEvents(events);
    loadingEl.style.display = 'none';
  })
  .catch(err => {
    console.error('資料載入錯誤', err);
    loadingEl.textContent = '資料載入失敗';
  });

function groupByEvents(data) {
  const grouped = {};
  data.forEach(item => {
    const key = item.date + '_' + item.title;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });
  return grouped;
}

function renderEvents(events) {
  eventListEl.innerHTML = '';
  Object.entries(events).forEach(([key, songs], index) => {
    const [date, title] = key.split('_');
    const dateStr = new Date(date).toLocaleDateString();

    const card = document.createElement('div');
    card.className = 'bg-white rounded-xl p-6 shadow hover:shadow-lg transition-all cursor-pointer fade-in-up';
    card.style.animationDelay = `${index * 0.05}s`;

    card.innerHTML = `
      <h3 class="text-2xl font-bold mb-2">${title}</h3>
      <p class="text-gray-600">${dateStr}</p>
    `;

    card.addEventListener('click', () => {
      renderSongs(songs, title);
      eventPage.classList.add('hidden');
      songPage.classList.remove('hidden');
      songPage.classList.add('fade-in-up');
      subtitle.textContent = title;
    });

    eventListEl.appendChild(card);
  });
}

function renderSongs(songs, title) {
  songListEl.innerHTML = '';

  songs.forEach((song, index) => {
    const row = document.createElement('tr');
    row.className = 'fade-in-up-delayed';
    row.style.animationDelay = `${index * 0.05}s`;

    const ytThumbnail = song.link
      ? `<a href="${song.link}" target="_blank">
           <img src="https://img.youtube.com/vi/${extractYouTubeID(song.link)}/0.jpg" 
                alt="YT縮圖" 
                class="w-40 rounded hover:scale-105 transition duration-300">
         </a>`
      : '—';

    row.innerHTML = `
      <td class="text-center px-4 py-4">${song.song}</td>
      <td class="text-left px-4 py-4">${ytThumbnail}</td>
    `;

    songListEl.appendChild(row);
  });
}

backButton.addEventListener('click', () => {
  songPage.classList.add('hidden');
  eventPage.classList.remove('hidden');
  eventPage.classList.add('fade-in-up');
  subtitle.textContent = '請選擇一場活動查看歌曲';
});

function extractYouTubeID(url) {
  // 擷取 YouTube 影片 ID（支援含 ?si 的參數）
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&\n?#]+)/);
  return match ? match[1] : '';
}
