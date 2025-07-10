const areaFiles = {
  shibuya: 'shibuya.json',
  azabudai: 'azabudai.json',
  yaesu: 'yaesu.json',
  umeda: 'umeda.json'
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
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let markerCluster = L.markerClusterGroup().addTo(map);
let shopData = [];
let markers = [];

function getIcon(type) {
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
    const name = shop.tags?.name || '名前なしのショップ';
    const type = shop.tags?.shop || '不明';
    const item = document.createElement('div');
    item.className = 'shop-item';
    item.innerHTML = `<strong>${name}</strong><br><small>${type}</small>`;
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

  const filtered = shopData.filter(shop => {
    const name = shop.tags?.name?.toLowerCase() || '';
    const type = shop.tags?.shop || '';
    return (
      name.includes(search) &&
      (typeFilter === '' || type === typeFilter)
    );
  });

  markerCluster.clearLayers();
  filtered.forEach((shop, index) => {
    markerCluster.addLayer(markers[index]);
  });

  renderShopList(filtered);
}

document.getElementById('search').addEventListener('input', applyFilters);
document.getElementById('filter').addEventListener('change', applyFilters);

async function loadArea(area) {
  const res = await fetch(areaFiles[area]);
  const data = await res.json();
  const elements = data.elements || data;

  shopData = elements.filter(s => s.lat && s.lon);
  markerCluster.clearLayers();
  markers = [];

  shopData.forEach(shop => {
    const name = shop.tags?.name || '名前なしのショップ';
    const type = shop.tags?.shop || '不明';
    const marker = L.marker([shop.lat, shop.lon], {
      icon: getIcon(type)
    }).bindPopup(`<strong>${name}</strong><br>種類: ${type}`);
    markers.push(marker);
  });

  markers.forEach(m => markerCluster.addLayer(m));
  updateFilterOptions(shopData);
  applyFilters();

  const bounds = L.latLngBounds(shopData.map(s => [s.lat, s.lon]));
  map.flyToBounds(bounds, { padding: [50, 50] });
}
