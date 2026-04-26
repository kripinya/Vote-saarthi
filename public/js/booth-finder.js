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

    // Load Google Maps
    const keyRes = await apiFetch('/api/maps-key');
    if (keyRes.key) {
      loadGoogleMaps(keyRes.key);
    } else {
      showDemoMap();
    }

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
  if (map && mapsApiLoaded) {
    map.panTo({ lat: booth.lat, lng: booth.lng });
    map.setZoom(16);
    // Show directions if user position available
    if (userPosition && directionsRenderer) {
      const directionsService = new google.maps.DirectionsService();
      directionsService.route({
        origin: userPosition,
        destination: { lat: booth.lat, lng: booth.lng },
        travelMode: google.maps.TravelMode.DRIVING
      }, (result, status) => {
        if (status === 'OK') directionsRenderer.setDirections(result);
      });
    }
  }
}

function loadGoogleMaps(apiKey) {
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap`;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

function initMap() {
  mapsApiLoaded = true;
  document.getElementById('mapDemoOverlay').style.display = 'none';

  const center = { lat: boothData.centerLat, lng: boothData.centerLng };
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 13, center,
    styles: [
      { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#8888aa' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a4a' }] },
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1a3a' }] }
    ]
  });

  directionsRenderer = new google.maps.DirectionsRenderer({ map, suppressMarkers: false });

  const crowdColors = { low: '#2ed573', moderate: '#ffa502', high: '#ff4757' };
  allBooths.forEach((booth, i) => {
    const marker = new google.maps.Marker({
      position: { lat: booth.lat, lng: booth.lng },
      map, title: booth.name,
      icon: { path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: crowdColors[booth.crowdLevel], fillOpacity: 0.9, strokeWeight: 2, strokeColor: '#fff' }
    });
    const infoWindow = new google.maps.InfoWindow({
      content: `<div style="color:#333;"><strong>${booth.name}</strong><br>${booth.address}<br><span style="color:${crowdColors[booth.crowdLevel]};">${booth.crowdLevel} crowd</span> • ${booth.estimatedWait}<br><button onclick="selectBooth(${i})" style="margin-top:5px;padding:4px 12px;background:#FF9933;color:#fff;border:none;border-radius:4px;cursor:pointer;">Get Directions</button></div>`
    });
    marker.addListener('click', () => infoWindow.open(map, marker));
    markers.push(marker);
  });

  // User location marker
  if (userPosition) {
    new google.maps.Marker({
      position: userPosition, map, title: 'Your Location',
      icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#3498db', fillOpacity: 1, strokeWeight: 3, strokeColor: '#fff' }
    });
  }
}

function showDemoMap() {
  document.getElementById('mapDemoOverlay').style.display = 'flex';
  // Render a simple canvas map as fallback
  const mapEl = document.getElementById('map');
  mapEl.style.background = 'linear-gradient(135deg, #0a0e27 0%, #111640 50%, #0a0e27 100%)';
}

// Expose initMap globally for Google Maps callback
window.initMap = initMap;
document.addEventListener('DOMContentLoaded', initBoothFinder);
