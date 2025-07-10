const areaFiles = {
  shibuya: 'shibuya.json',
  azabudai: 'azabudai.json',
  yaesu: 'yaesu.json',
  umeda: 'umeda.json'
};

let map = L.map('map').setView([35.6804, 139.7690], 13);
let markers = L.layerGroup().addTo(map);

// Base tile
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

async function loadArea(area) {
  const file = areaFiles[area];
  const response = await fetch(file);
  const data = await response.json();
  const elements = data.elements || data;

  markers.clearLayers();

  const shopCoords = [];

  elements.forEach((el) => {
    if (el.lat && el.lon) {
      const name = el.tags?.name || 'Unnamed shop';
      const type = el.tags?.shop || 'Unknown type';
      const popupContent = `<strong>${name}</strong><br/>Type: ${type}`;
      const marker = L.marker([el.lat, el.lon]).bindPopup(popupContent);
      marker.addTo(markers);
      shopCoords.push([el.lat, el.lon]);
    }
  });

  if (shopCoords.length > 0) {
    const bounds = L.latLngBounds(shopCoords);
    map.fitBounds(bounds, { padding: [50, 50] });
  }
}
