'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const screens = ['no-location', 'destination', 'directions'];
  const state = {origin: null, result: null, destination: null, zoom: 1};
  let engine;
  function message(id, text) { $(id).textContent = text; $(id).hidden = !text; }
  function show(name) {
    for (const screen of screens) $('screen-' + screen).hidden = screen !== name;
    $('screen-' + name).querySelector('h1').focus({preventScroll: true});
    window.scrollTo(0, 0);
  }
  function updateUrl(nodeId) {
    try {
      const url = new URL(window.location.href);
      if (nodeId) url.searchParams.set('node', nodeId); else url.searchParams.delete('node');
      history.replaceState(null, '', url);
    } catch { /* Local-file browser policies may disallow replaceState. */ }
  }
  function setOrigin(id) {
    message('scan-error', '');
    if (!engine.nodes.has(id)) { message('scan-error', 'Mã vị trí không hợp lệ. Vui lòng chọn vị trí hiện tại bên dưới.'); show('no-location'); return; }
    if (!engine.isSupported(id)) { message('scan-error', engine.nodes.get(id).name + ' không thuộc phạm vi dẫn đường hiện tại. Hãy chọn một vị trí được hỗ trợ khi bạn đứng tại đó.'); show('no-location'); return; }
    state.origin = id; state.result = null;
    $('manual-location-select').value = id;
    $('current-location-label').textContent = 'Vị trí xuất phát: ' + engine.nodes.get(id).name;
    $('destination-search').value = '';
    message('route-error', '');
    updateUrl(id); renderDestinations(); show('destination');
  }
  function changeOrigin() {
    state.origin = null; state.result = null; state.destination = null;
    $('manual-location-select').value = ''; updateUrl(null); message('scan-error', ''); show('no-location');
  }
  function renderDestinations() {
    const q = HospitalNavigation.normalize($('destination-search').value);
    const tokens = q.split(' ').filter(Boolean);
    const items = engine.destinations.filter(d => engine.isSupported(d.targetId) && tokens.every(t => d.searchText.includes(t)));
    $('destination-list').replaceChildren();
    $('search-count').textContent = items.length + ' địa điểm phù hợp';
    if (!items.length) {
      const p = document.createElement('p'); p.className = 'no-result';
      p.textContent = 'Không tìm thấy địa điểm phù hợp. B09, B14 và B15 không thuộc phạm vi dẫn đường. Bạn có thể hỏi nhân viên hỗ trợ.';
      $('destination-list').append(p);
    }
    for (const d of items) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'dest-btn';
      const desc = document.createElement('span'); desc.className = 'dest-desc'; desc.textContent = d.desc;
      const building = document.createElement('span'); building.className = 'dest-building'; building.textContent = d.buildingName + (d.floor ? ' · Tầng ' + d.floor : '');
      button.append(desc, building); button.addEventListener('click', () => selectDestination(d));
      $('destination-list').append(button);
    }
  }
  function selectDestination(destination) {
    const result = engine.findPath(state.origin, destination.targetId);
    if (!['ok', 'same'].includes(result.status)) { message('route-error', 'Chưa có tuyến đi hợp lệ đến địa điểm này. Hãy hỏi nhân viên hỗ trợ.'); return; }
    message('route-error', '');
    state.result = result; state.destination = destination;
    $('directions-title').textContent = 'Đường đến: ' + destination.desc;
    $('route-origin').textContent = 'Xuất phát: ' + engine.nodes.get(state.origin).name;
    $('directions-list').replaceChildren();
    for (const step of engine.directions(result, destination)) {
      const li = document.createElement('li'), icon = document.createElement('span'), text = document.createElement('span');
      icon.className = 'step-icon'; icon.setAttribute('aria-hidden', 'true'); icon.textContent = step.icon; text.textContent = step.text;
      li.append(icon, text); $('directions-list').append(li);
    }
    const floors = [...new Set([engine.nodes.get(result.start).floor, ...result.steps.flatMap(s => [engine.nodes.get(s.from).floor, engine.nodes.get(s.to).floor])])].sort((a,b) => a-b);
    const initial = engine.nodes.get(result.start).floor;
    $('floor-tabs').replaceChildren();
    for (const floor of floors) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'floor-tab'; button.textContent = 'Tầng ' + floor;
      button.dataset.floor = floor; button.addEventListener('click', () => renderMap(floor)); $('floor-tabs').append(button);
    }
    zoom(1); renderMap(initial); show('directions');
  }
  function renderMap(floor) {
    const result = state.result, svg = $('map-svg'), ns = 'http://www.w3.org/2000/svg';
    svg.replaceChildren(); svg.setAttribute('viewBox', `0 0 ${MAP_IMAGE.width} ${MAP_IMAGE.height}`);
    document.querySelectorAll('.floor-tab').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.floor) === floor)));
    $('floor-note').textContent = floor > 1 ? `Tầng ${floor}: đường vẽ chỉ minh họa vị trí trên sơ đồ khuôn viên, không phải bản vẽ nội thất. Đối chiếu biển tầng và hỏi nhân viên tại khu nhà.` : 'Sơ đồ khuôn viên. Đường vẽ và các điểm bên trong tòa nhà cần đối chiếu với biển chỉ dẫn tại chỗ.';
    const make = (name, attrs) => { const el = document.createElementNS(ns, name); for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value); svg.append(el); return el; };
    const transitionNodes = new Set();
    for (const step of result.steps) {
      const a = engine.nodes.get(step.from), b = engine.nodes.get(step.to);
      if (a.floor !== b.floor) { if (a.floor === floor) transitionNodes.add(a.id); if (b.floor === floor) transitionNodes.add(b.id); continue; }
      if (a.floor !== floor) continue;
      make('line', {x1:a.x, y1:a.y, x2:b.x, y2:b.y, stroke:'#2563eb', 'stroke-width':9, 'stroke-linecap':'round'});
    }
    for (const id of transitionNodes) { const n = engine.nodes.get(id); make('circle', {cx:n.x, cy:n.y, r:12, fill:'#7c3aed', stroke:'white', 'stroke-width':3}); }
    for (const id of new Set([result.start, result.end])) {
      const n = engine.nodes.get(id); if (n.floor !== floor) continue;
      const isStart = id === result.start;
      make('circle', {cx:n.x, cy:n.y, r:14, fill:isStart?'#16a34a':'#dc2626', stroke:'white', 'stroke-width':3});
      const label = make('text', {x:n.x, y:n.y-22, 'text-anchor':'middle', 'font-size':20, 'font-weight':700, fill:isStart?'#14532d':'#991b1b', stroke:'white', 'stroke-width':4, 'paint-order':'stroke'});
      label.textContent = result.status === 'same' ? 'Vị trí / đích đến' : isStart ? 'Xuất phát' : 'Đích đến';
    }
  }
  function zoom(level) {
    state.zoom = Math.max(1, Math.min(4, level)); $('map-stage').className = 'map-stage zoom-' + state.zoom;
    $('zoom-reset').textContent = (state.zoom * 100) + '%'; $('zoom-out').disabled = state.zoom === 1; $('zoom-in').disabled = state.zoom === 4;
  }
  function fromUrl() {
    const id = new URLSearchParams(window.location.search).get('node');
    state.origin = null;
    if (id) setOrigin(id.trim()); else show('no-location');
  }
  try {
    engine = HospitalNavigation.create(HOSPITAL_MAP, BUILDING_DIRECTORY, MAP_IMAGE);
    if (engine.warnings.length) console.warn(engine.warnings.join('\n'));
    const image = $('map-background');
    image.addEventListener('error', () => { message('image-error', 'Không tải được ảnh sơ đồ. Vui lòng tải lại trang hoặc hỏi nhân viên hỗ trợ.'); $('map-svg').hidden = true; });
    image.addEventListener('load', () => { message('image-error', ''); $('map-svg').hidden = false; });
    image.src = MAP_IMAGE.src; image.width = MAP_IMAGE.width; image.height = MAP_IMAGE.height;
    for (const n of engine.qrNodes) {
      const option = document.createElement('option'); option.value = n.id; option.textContent = n.name + ' · ' + n.id; $('manual-location-select').append(option);
    }
    $('btn-manual-select').addEventListener('click', () => {
      const value = $('manual-location-select').value;
      if (!value) { message('scan-error', 'Vui lòng chọn vị trí bạn đang đứng.'); return; }
      setOrigin(value);
    });
    $('destination-search').addEventListener('input', renderDestinations);
    $('btn-back-to-scan').addEventListener('click', changeOrigin);
    $('btn-route-change-origin').addEventListener('click', changeOrigin);
    $('btn-back-to-destinations').addEventListener('click', () => show('destination'));
    $('zoom-in').addEventListener('click', () => zoom(state.zoom + 1));
    $('zoom-out').addEventListener('click', () => zoom(state.zoom - 1));
    $('zoom-reset').addEventListener('click', () => zoom(1));
    window.addEventListener('popstate', fromUrl);
    fromUrl(); $('boot-status').hidden = true;
  } catch (error) {
    for (const screen of screens) $('screen-' + screen).hidden = true;
    message('boot-status', 'Không thể tải dữ liệu chỉ đường. Vui lòng tải lại trang hoặc hỏi nhân viên hỗ trợ.');
    $('boot-status').setAttribute('role', 'alert'); console.error('Khởi tạo thất bại:', error);
  }
})();
