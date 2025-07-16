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

// Initial tile layers
const lightTile = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
const darkTile = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap, CartoDB',
});

let map = L.map('map', {
  center: [35.68, 139.76],
  zoom: 13,
  layers: [lightTile]
});

let markerCluster = L.markerClusterGroup().addTo(map);
let shopData = [];
let markers = [];
let visibleShops = [];
let useCluster = true;

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
    const icon = shopIcons[type] || shopIcons.default;
    const phone = tags.phone ? `<br>📞 ${tags.phone}` : '';
    const website = tags.website ? `<br>🔗 <a href="${tags.website}" target="_blank">Webサイト</a>` : '';
    const address = tags['addr:full'] || '';

    const item = document.createElement('div');
    item.className = 'shop-item';
    item.innerHTML = `${icon} <strong>${name}</strong><br><small>${type}</small><br>${address}${phone}${website}`;
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
    const tags = shop.tags || {};
    const name = (tags.name || '').toLowerCase();
    const type = (tags.shop || '').toLowerCase();
    const address = (tags['addr:full'] || '').toLowerCase();
    return (name.includes(search) || type.includes(search) || address.includes(search)) &&
      (typeFilter === '' || type === typeFilter);
  });

  markerCluster.clearLayers();
  markers.forEach(m => map.removeLayer(m));

  if (useCluster) {
    visibleShops.forEach((_, i) => markerCluster.addLayer(markers[i]));
    map.addLayer(markerCluster);
  } else {
    visibleShops.forEach((_, i) => markers[i].addTo(map));
  }

  renderShopList(visibleShops);
}

// Debounced input handler
let debounceTimeout;
document.getElementById('search').addEventListener('input', () => {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(applyFilters, 300);
});
document.getElementById('filter').addEventListener('change', applyFilters);

async function loadArea(area) {
  try {
    document.querySelectorAll('#area-buttons button').forEach(btn =>
      btn.classList.remove('active')
    );
    const activeBtn = document.querySelector(`#area-buttons button[data-area="${area}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    document.getElementById('shop-list').textContent = '🔄 データを読み込み中...';

    const res = await fetch(areaFiles[area]);
    if (!res.ok) throw new Error('データの読み込みに失敗しました。');

    const data = await res.json();
    const elements = data.elements || data;

    shopData = elements.filter(s => s.lat && s.lon);
    markerCluster.clearLayers();
    markers = [];

    shopData.forEach(shop => {
      const tags = shop.tags || {};
      const name = tags.name || '名前なしのショップ';
      const rawType = tags.shop;
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

// Persistent settings
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('filter').value = localStorage.getItem('shopFilter') || '';
  document.getElementById('search').value = localStorage.getItem('shopSearch') || '';
  applyFilters();

  const prefersDark = localStorage.getItem('darkMode') === 'true';
  if (prefersDark) {
    document.body.classList.add('dark');
    map.removeLayer(lightTile);
    darkTile.addTo(map);
  }
});

// Geolocation
let userLocationMarker;
document.getElementById('geo-btn').addEventListener('click', () => {
  if (!navigator.geolocation) {
    alert("位置情報が利用できません。");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude, longitude } = pos.coords;
      if (userLocationMarker) map.removeLayer(userLocationMarker);

      userLocationMarker = L.marker([latitude, longitude])
        .addTo(map)
        .bindPopup("📍 現在地")
        .openPopup();

      map.setView([latitude, longitude], 16);
    },
    () => alert("現在地を取得できませんでした。")
  );
});

// Dark mode toggle with tile switch
const darkToggle = document.getElementById('dark-mode-toggle');
darkToggle.addEventListener('click', () => {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('darkMode', isDark);
  darkToggle.classList.toggle('active', isDark);

  map.removeLayer(isDark ? lightTile : darkTile);
  (isDark ? darkTile : lightTile).addTo(map);
});

// Restore toggle state on load
if (localStorage.getItem('darkMode') === 'true') {
  document.getElementById('dark-mode-toggle').classList.add('active');
}

if (useCluster) {
  document.getElementById('cluster-toggle').classList.add('active');
}

// CSV Export
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

// Cluster toggle button
const clusterToggle = document.getElementById('cluster-toggle');
clusterToggle.addEventListener('click', () => {
  useCluster = !useCluster;
  clusterToggle.classList.toggle('active', useCluster);

  markerCluster.clearLayers();
  markers.forEach(m => map.removeLayer(m));

  if (useCluster) {
    visibleShops.forEach((_, i) => markerCluster.addLayer(markers[i]));
    map.addLayer(markerCluster);
  } else {
    visibleShops.forEach((_, i) => markers[i].addTo(map));
  }
});
