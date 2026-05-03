// ===== BOOTH FINDER LOGIC =====

let boothData = null;
let allBooths = [];
let map = null;
let markers = [];
let directionsRenderer = null;
let userPosition = null;
let mapsApiLoaded = false;

async function initBoothFinder() {
  const session = await checkSession();
  if (!session) return;
  renderNavbar('booth-finder');

  const constId = session.voter.constituency;
  document.getElementById('constLabel').textContent = `Constituency: ${constId.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}`;

  try {
    boothData = await apiFetch(`/api/booths/${constId}`);
    allBooths = boothData.booths || [];

    // Try user geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => { userPosition = { lat: pos.coords.latitude, lng: pos.coords.longitude }; sortBoothsByDistance(); renderBoothList(allBooths); },
        () => { renderBoothList(allBooths); }
      );
    } else {
      renderBoothList(allBooths);
    }

    // Load Leaflet Map
    showMap();
    
    // Show recommendation
    showRecommendation();
  } catch (err) {
    document.getElementById('boothList').innerHTML = '<p style="color:var(--danger);">Failed to load booth data.</p>';
  }
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function sortBoothsByDistance() {
  if (!userPosition) return;
  allBooths.forEach(b => {
    b.distance = haversineDistance(userPosition.lat, userPosition.lng, b.lat, b.lng);
  });
  allBooths.sort((a, b) => a.distance - b.distance);
}

function showRecommendation() {
  const lowCrowd = allBooths.filter(b => b.crowdLevel === 'low');
  const best = lowCrowd.length > 0 ? lowCrowd[0] : allBooths.reduce((a,b) => a.currentFootfall < b.currentFootfall ? a : b, allBooths[0]);
  if (best) {
    const banner = document.getElementById('recommendBanner');
    banner.style.display = 'block';
    const dist = best.distance ? ` (${best.distance.toFixed(1)} km)` : '';
    document.getElementById('recommendText').textContent = `${best.name}${dist} — ${best.estimatedWait} wait`;
  }
}

function renderBoothList(booths) {
  const list = document.getElementById('boothList');
  if (booths.length === 0) {
    list.innerHTML = '<p style="color:var(--text-muted);">No booths match the filter.</p>';
    return;
  }
  list.innerHTML = booths.map((b, i) => `
    <div class="glass-card booth-item" onclick="selectBooth(${i})" id="booth-${i}">
      <h4>${b.name}</h4>
      <p class="booth-address">📍 ${b.address}</p>
      <div class="booth-meta">
        <span class="crowd-badge crowd-${b.crowdLevel}">${crowdIcon(b.crowdLevel)} ${b.crowdLevel}</span>
        <span>⏱️ ${b.estimatedWait}</span>
        ${b.distance ? `<span>📏 ${b.distance.toFixed(1)} km</span>` : ''}
      </div>
    </div>
  `).join('');
}

function crowdIcon(level) {
  return level === 'low' ? '🟢' : level === 'moderate' ? '🟡' : '🔴';
}

function filterBooths(level) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  const filtered = level === 'all' ? allBooths : allBooths.filter(b => b.crowdLevel === level);
  renderBoothList(filtered);
}

function selectBooth(index) {
  document.querySelectorAll('.booth-item').forEach(el => el.classList.remove('selected'));
  const el = document.getElementById(`booth-${index}`);
  if (el) el.classList.add('selected');

  const booth = allBooths[index];
  if (map) {
    map.setView([booth.lat, booth.lng], 16);
    markers[index].openPopup();
  }
}

function showMap() {
  document.getElementById('mapDemoOverlay').style.display = 'none';

  const center = [boothData.centerLat, boothData.centerLng];
  map = L.map('map').setView(center, 13);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);

  const crowdColors = { low: '#2ed573', moderate: '#ffa502', high: '#ff4757' };
  
  allBooths.forEach((booth, i) => {
    const markerHtml = `<div style="background-color:${crowdColors[booth.crowdLevel]};width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.4);"></div>`;
    const icon = L.divIcon({ html: markerHtml, className: 'custom-marker', iconSize: [16,16], iconAnchor: [8,8] });
    
    const marker = L.marker([booth.lat, booth.lng], { icon }).addTo(map);
    
    const popupContent = `<div style="color:#333;"><strong>${booth.name}</strong><br>${booth.address}<br><span style="color:${crowdColors[booth.crowdLevel]};">${booth.crowdLevel} crowd</span> • ${booth.estimatedWait}<br><button onclick="selectBooth(${i})" style="margin-top:5px;padding:4px 12px;background:var(--nic-blue);color:#fff;border:none;border-radius:4px;cursor:pointer;">Focus</button></div>`;
    
    marker.bindPopup(popupContent);
    markers.push(marker);
  });

  if (userPosition) {
    const userIcon = L.divIcon({ html: '<div style="background-color:#3498db;width:14px;height:14px;border-radius:50%;border:2px solid white;"></div>', className: 'user-marker', iconSize:[14,14]});
    L.marker([userPosition.lat, userPosition.lng], { icon: userIcon }).addTo(map).bindPopup('Your Location');
  }
}
document.addEventListener('DOMContentLoaded', initBoothFinder);
