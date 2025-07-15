const areaFiles = {
  shibuya: 'data/shibuya.json',
  azabudai: 'data/azabudai.json',
  yaesu: 'data/yaesu.json',
  umeda: 'data/umeda.json'
};

const shopIcons = {
  convenience: '🛒',
  supermarket: '🥦',
  gift: '🎁',
  bakery: '🥐',
  clothes: '👕',
  florist: '🌷',
  car: '🚗',
  jewelry: '💍',
  books: '📚',
  alcohol: '🍶',
  fabric: '🧵',
  hairdresser: '💇',
  default: '📌'
};

let map = L.map('map').setView([35.68, 139.76], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

let markerCluster = L.markerClusterGroup().addTo(map);
let shopData = [];
let markers = [];

function getIcon(type) {
  if (type === 'default') {
    return L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      shadowSize: [41, 41]
    });
  }

  const emoji = shopIcons[type] || shopIcons.default;
  return L.divIcon({
    className: 'custom-icon',
    html: `<div>${emoji}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30]
  });
}

function updateFilterOptions(data) {
  const uniqueTypes = [...new Set(data.map(s => s.tags?.shop).filter(Boolean))];
  const filter = document.getElementById('filter');
  filter.innerHTML = `<option value="">すべての種類</option>`;
  uniqueTypes.forEach(type => {
    filter.innerHTML += `<option value="${type}">${type}</option>`;
  });
}

function renderShopList(data) {
  const list = document.getElementById('shop-list');
  list.innerHTML = '';
  data.forEach((shop, index) => {
    const tags = shop.tags || {};
    const name = tags.name || '名前なしのショップ';
    const type = tags.shop || '不明';
    const phone = tags.phone ? `<br>📞 ${tags.phone}` : '';
    const website = tags.website ? `<br>🔗 <a href="${tags.website}" target="_blank">Webサイト</a>` : '';
    const address = tags['addr:full'] || '';

    const item = document.createElement('div');
    item.className = 'shop-item';
    item.innerHTML = `<strong>${name}</strong><br><small>${type}</small><br>${address}${phone}${website}`;
    item.onclick = () => {
      map.setView([shop.lat, shop.lon], 18);
      markers[index].openPopup();
    };
    list.appendChild(item);
  });
}

function applyFilters() {
  const search = document.getElementById('search').value.toLowerCase();
  const typeFilter = document.getElementById('filter').value;

  localStorage.setItem('shopSearch', search);
  localStorage.setItem('shopFilter', typeFilter);

  visibleShops = shopData.filter(shop => {
    const name = (shop.tags?.name || '').toLowerCase();
    const type = shop.tags?.shop || '';
    return name.includes(search) && (typeFilter === '' || type === typeFilter);
  });

  markerCluster.clearLayers();
  visibleShops.forEach((_, i) => markerCluster.addLayer(markers[i]));
  renderShopList(visibleShops);
}

document.getElementById('search').addEventListener('input', applyFilters);
document.getElementById('filter').addEventListener('change', applyFilters);

async function loadArea(area) {
  try {
    document.querySelectorAll('#area-buttons button').forEach(btn =>
      btn.classList.remove('active')
    );
    const activeBtn = document.querySelector(`#area-buttons button[data-area="${area}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    const list = document.getElementById('shop-list');
    list.textContent = '🔄 データを読み込み中...';

    const res = await fetch(areaFiles[area]);
    if (!res.ok) throw new Error('データの読み込みに失敗しました。');

    const data = await res.json();
    const elements = data.elements || data;

    shopData = elements.filter(s => s.lat && s.lon);
    markerCluster.clearLayers();
    markers = [];

    shopData.forEach(shop => {
      const name = shop.tags?.name || '名前なしのショップ';
      const rawType = shop.tags?.shop;
      const type = shopIcons[rawType] ? rawType : 'default';

      const marker = L.marker([shop.lat, shop.lon], {
        icon: getIcon(type)
      }).bindPopup(`<strong>${name}</strong><br>種類: ${rawType || '不明'}`);

      markers.push(marker);
    });

    markers.forEach(m => markerCluster.addLayer(m));
    updateFilterOptions(shopData);
    applyFilters();

    const bounds = L.latLngBounds(shopData.map(s => [s.lat, s.lon]));
    map.flyToBounds(bounds, { padding: [50, 50] });

  } catch (error) {
    document.getElementById('shop-list').textContent = '❌ データの読み込みに失敗しました。';
    console.error(error);
  }
}

// 🚩 Persist filters/dark mode
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('filter').value = localStorage.getItem('shopFilter') || '';
  document.getElementById('search').value = localStorage.getItem('shopSearch') || '';
  applyFilters();

  const prefersDark = localStorage.getItem('darkMode') === 'true';
  if (prefersDark) document.body.classList.add('dark');
});

// 🌍 Geolocation
document.getElementById('geo-btn').addEventListener('click', () => {
  if (!navigator.geolocation) return alert("位置情報が利用できません。");
  navigator.geolocation.getCurrentPosition(
    pos => map.setView([pos.coords.latitude, pos.coords.longitude], 16),
    () => alert("現在地を取得できませんでした。")
  );
});

// 🌒 Dark mode toggle
document.getElementById('dark-mode-toggle').addEventListener('click', () => {
  document.body.classList.toggle('dark');
  localStorage.setItem('darkMode', document.body.classList.contains('dark'));
});

// 📤 CSV Export
document.getElementById('csv-export').addEventListener('click', () => {
  const rows = visibleShops.map(shop => {
    const tags = shop.tags || {};
    return {
      name: tags.name || '',
      type: tags.shop || '',
      address: tags['addr:full'] || '',
      phone: tags.phone || '',
      website: tags.website || ''
    };
  });

  const csv = [
    ['Name', 'Type', 'Address', 'Phone', 'Website'],
    ...rows.map(r => [r.name, r.type, r.address, r.phone, r.website])
  ].map(row => row.map(field => `"${field.replace(/"/g, '""')}"`).join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'visible_shops.csv';
  link.click();
});