const rad = n => n * Math.PI / 180;
export function statistics(segments) {
  let distance = 0, seconds = 0, timed = true, edges = 0;
  for (const points of segments) for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
    distance += 6371.0088 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
    const dt = (b.time - a.time) / 1000;
    if (!Number.isFinite(dt) || dt <= 0) timed = false;
    else seconds += dt;
    edges++;
  }
  return { distance, speed: timed && edges && seconds ? distance / (seconds / 3600) : null };
}
export function parseGPX(source) {
  const doc = new DOMParser().parseFromString(source, 'application/xml');
  if (doc.querySelector('parsererror') || doc.documentElement.localName !== 'gpx') throw Error('Invalid GPX');
  const descendants = (el, name) => [...el.getElementsByTagNameNS('*', name)];
  let groups = descendants(doc, 'trkseg').map(el => descendants(el, 'trkpt'));
  if (!groups.length) groups = descendants(doc, 'rte').map(el => descendants(el, 'rtept'));
  const segments = [];
  for (const group of groups) {
    let segment = [];
    for (const el of group) {
      const lat = Number(el.getAttribute('lat')), lon = Number(el.getAttribute('lon'));
      if (!el.getAttribute('lat')?.trim() || !el.getAttribute('lon')?.trim() || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
        if (segment.length) segments.push(segment);
        segment = []; continue;
      }
      segment.push({lat, lon, time: Date.parse(descendants(el, 'time')[0]?.textContent || '')});
    }
    if (segment.length) segments.push(segment);
  }
  if (!segments.some(s => s.length > 1)) throw Error('No route points');
  return segments;
}
function drawMap(container, segments) {
  const width = 400, height = 240;
  const origin = segments[0][0].lon;
  const projected = segments.map(s => s.map(p => {
    let lon = p.lon;
    while (lon - origin > 180) lon -= 360;
    while (lon - origin < -180) lon += 360;
    const lat = rad(Math.max(-85.0511, Math.min(85.0511, p.lat)));
    return [(lon + 180) / 360, (1 - Math.asinh(Math.tan(lat)) / Math.PI) / 2];
  }));
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const s of projected) for (const [x,y] of s) { minX = Math.min(minX,x); maxX = Math.max(maxX,x); minY = Math.min(minY,y); maxY = Math.max(maxY,y); }
  const zoom = Math.max(0, Math.min(16, Math.floor(Math.log2(Math.min((width - 50) / (256 * (maxX - minX || 1e-9)), (height - 50) / (256 * (maxY - minY || 1e-9)))))));
  const scale = 256 * 2 ** zoom, left = (minX + maxX) / 2 * scale - width / 2, top = (minY + maxY) / 2 * scale - height / 2;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('aria-hidden', 'true');
  const add = (tag, attrs) => { const el = document.createElementNS(svg.namespaceURI, tag); for (const [k,v] of Object.entries(attrs)) el.setAttribute(k,v); svg.append(el); return el; };
  for (let x = Math.floor(left / 256); x * 256 < left + width; x++) for (let y = Math.floor(top / 256); y * 256 < top + height; y++) {
    if (y < 0 || y >= 2 ** zoom) continue;
    add('image', {x: x * 256 - left, y: y * 256 - top, width:256, height:256, href:`https://tile.openstreetmap.org/${zoom}/${((x % 2 ** zoom) + 2 ** zoom) % 2 ** zoom}/${y}.png`});
  }
  for (const s of projected) {
    const points = s.map(([x,y]) => `${(x * scale - left).toFixed(2)},${(y * scale - top).toFixed(2)}`).join(' ');
    add('polyline', {points, fill:'none', stroke:'#fff', 'stroke-width':6, 'stroke-linejoin':'round'});
    add('polyline', {points, fill:'none', stroke:'#aa4b3f', 'stroke-width':3, 'stroke-linejoin':'round'});
  }
  container.replaceChildren(svg);
  // Keep the attribution accessible independently of the image role.
  const credit = document.createElement('a');
  credit.className = 'map-credit'; credit.href = 'https://www.openstreetmap.org/copyright'; credit.textContent = '© OpenStreetMap contributors';
  container.after(credit);
}
if (typeof document !== 'undefined') {
  const section = document.querySelector('[data-routes]');
  if (section) {
    const cards = [...section.querySelectorAll('.route-card')];
    const favorites = cards.filter(c => c.dataset.favorite === 'true');
    const preview = (favorites.length ? favorites : cards).slice(0,3);
    const title = section.querySelector('h2'), button = section.querySelector('button');
    const previewTitle = favorites.length ? 'Favorite routes' : 'Routes I’ve ridden';
    let expanded = false;
    const observer = new IntersectionObserver(entries => entries.forEach(async entry => {
      if (!entry.isIntersecting) return;
      const card = entry.target; observer.unobserve(card);
      if (card.dataset.loaded) return;
      card.dataset.loaded = 'true';
      try {
        const response = await fetch(card.dataset.url);
        if (!response.ok) throw Error('Download failed');
        const segments = parseGPX(await response.text()), stats = statistics(segments);
        card.querySelector('[data-distance]').textContent = `${stats.distance.toFixed(1)} km`;
        card.querySelector('[data-speed]').textContent = stats.speed === null ? 'Unavailable' : `${stats.speed.toFixed(1)} km/h`;
        card.querySelector('[data-speed]').title = 'Average over recorded segment time, including stops; gaps between segments excluded.';
        drawMap(card.querySelector('.route-map'), segments);
      } catch {
        card.querySelector('.route-map').textContent = 'Route preview unavailable';
        card.querySelector('.route-status').textContent = 'Could not read this route. You can still download the GPX.';
      }
    }));
    function update() {
      title.textContent = expanded ? 'All routes' : previewTitle;
      for (const card of cards) { card.hidden = !expanded && !preview.includes(card); if (!card.hidden) observer.observe(card); }
      button.textContent = expanded ? 'Show fewer routes ↑' : `View all routes (${cards.length}) →`;
      button.setAttribute('aria-expanded', String(expanded));
    }
    button.hidden = cards.length <= preview.length;
    button.addEventListener('click', () => { expanded = !expanded; update(); });
    update();
  }
}
