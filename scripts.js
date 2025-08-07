const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbwkV_d1-Jl0dLzQLX5URCgxXecjHNHTxAR0KtcbuCD8piiOqCXDrZIm-6FeegTivinD/exec';

async function fetchSongs() {
  try {
    const res = await fetch(SHEET_API_URL);
    const data = await res.json();

    const songList = document.getElementById("songList");
    const loading = document.getElementById("loading");
    loading.style.display = "none";

    data.forEach(row => {
      const tr = document.createElement("tr");
      tr.className = "border-b hover:bg-gray-50";

      const videoID = extractYouTubeID(row['YouTube連結']);

      tr.innerHTML = `
        <td class="p-2">${row['日期'] || ''}</td>
        <td class="p-2">${row['演出名稱'] || ''}</td>
        <td class="p-2">${row['歌曲名稱'] || ''}</td>
        <td class="p-2">
          ${videoID ? `
            <a href="${row['YouTube連結']}" target="_blank">
              <img src="https://img.youtube.com/vi/${videoID}/default.jpg" 
                   alt="縮圖" class="w-20 border rounded shadow">
            </a>
          ` : ''}
        </td>
      `;
      songList.appendChild(tr);
    });
  } catch (err) {
    document.getElementById("loading").textContent = "❌ 載入失敗，請稍後再試";
    console.error(err);
  }
}

function extractYouTubeID(url) {
  const regex = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w\-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : '';
}

fetchSongs();
