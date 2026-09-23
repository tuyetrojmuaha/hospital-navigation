/* Shared, dependency-free routing and validation. No DOM access. */
(function (root) {
  'use strict';
  const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/\s+/g, ' ').trim();
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const bearing = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
  const angleDelta = (previous, next) => ((next - previous) * 180 / Math.PI + 540) % 360 - 180;
  function turnLabel(previous, next) {
    const angle = angleDelta(previous, next);
    if (Math.abs(angle) < 40) return 'Đi thẳng';
    if (Math.abs(angle) >= 150) return 'Quay lại';
    return angle > 0 ? 'Rẽ phải' : 'Rẽ trái'; // SVG/image coordinates: Y increases downwards.
  }
  function buildQrUrl(base, nodeId) {
    const url = new URL(base);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Địa chỉ phải là URL http/https đầy đủ, không chứa tài khoản hoặc mật khẩu.');
    url.hash = '';
    url.searchParams.set('node', nodeId);
    return url.href;
  }
  function create(map, directory, image) {
    const errors = [], warnings = [];
    const nodes = new Map(), adjacency = new Map(), destinations = [], connected = new Set();
    const checkFlags = (value, fields, label) => {
      for (const field of fields) {
        if (Object.prototype.hasOwnProperty.call(value, field) && typeof value[field] !== 'boolean') errors.push(`${label}: ${field} phải là boolean true/false.`);
      }
    };
    if (!map || !Array.isArray(map.nodes) || !Array.isArray(map.edges)) throw new Error('Thiếu dữ liệu nodes/edges.');
    if (!image || !Number.isFinite(image.width) || image.width <= 0 || !Number.isFinite(image.height) || image.height <= 0 || typeof image.src !== 'string' || !image.src) errors.push('Ảnh bản đồ không hợp lệ.');
    for (const node of map.nodes) {
      if (!node || typeof node.id !== 'string' || !/^[A-Za-z0-9_-]+$/.test(node.id) || nodes.has(node.id)) { errors.push('ID điểm trống, trùng hoặc không hợp lệ: ' + node?.id); continue; }
      checkFlags(node, ['isDestination', 'isGate', 'isWaypoint', 'isQRPoint', 'isTransitPoint', 'isEntrance', 'routingEnabled'], 'Điểm ' + node.id);
      if (typeof node.name !== 'string' || !node.name.trim() || !Number.isFinite(node.x) || !Number.isFinite(node.y) || !Number.isInteger(node.floor) || node.floor < 1) errors.push('Tên/tọa độ/tầng không hợp lệ: ' + node.id);
      if (image && (node.x < 0 || node.y < 0 || node.x > image.width || node.y > image.height)) errors.push('Điểm nằm ngoài ảnh: ' + node.id);
      nodes.set(node.id, node); adjacency.set(node.id, []);
    }
    const edgeKeys = new Set();
    for (const edge of map.edges) {
      if (!edge || !nodes.has(edge.from) || !nodes.has(edge.to)) { errors.push('Cạnh tham chiếu điểm không tồn tại: ' + JSON.stringify(edge)); continue; }
      checkFlags(edge, ['oneWay', 'enabled', 'isElevator'], 'Cạnh ' + edge.from + ' → ' + edge.to);
      const a = nodes.get(edge.from), b = nodes.get(edge.to);
      if (edge.kind != null && !['walk', 'stairs', 'elevator', 'vertical'].includes(edge.kind)) { errors.push('Loại cạnh không hợp lệ: ' + edge.kind); continue; }
      if (['instruction', 'reverseInstruction'].some(key => edge[key] != null && typeof edge[key] !== 'string')) { errors.push('Chỉ dẫn cạnh phải là chuỗi: ' + edge.from); continue; }
      const key = [edge.from, edge.to].sort().join('|');
      if (a.id === b.id || edgeKeys.has(key)) { errors.push('Cạnh tự nối hoặc bị trùng: ' + key); continue; }
      edgeKeys.add(key);
      if (edge.weight != null && (!Number.isFinite(edge.weight) || edge.weight < 0)) { errors.push('Trọng số không hợp lệ: ' + key); continue; }
      if (a.floor !== b.floor && !edge.isElevator && !['stairs', 'elevator', 'vertical'].includes(edge.kind)) { errors.push('Cạnh đổi tầng thiếu loại di chuyển: ' + key); continue; }
      if (edge.enabled === false || a.routingEnabled === false || b.routingEnabled === false) continue;
      connected.add(a.id); connected.add(b.id);
      const vertical = a.floor !== b.floor;
      const text = normalize(edge.instruction);
      const kind = edge.kind || (vertical ? (text.includes('thang may') && !text.includes('thang bo') && !text.includes('cau thang') ? 'elevator' : text.includes('thang bo') && !text.includes('thang may') ? 'stairs' : 'vertical') : 'walk');
      const weight = (edge.weight ?? distance(a, b)) + (vertical ? 80 * Math.abs(a.floor - b.floor) : 0);
      adjacency.get(a.id).push({from: a.id, to: b.id, weight, kind, instruction: edge.instruction || ''});
      if (edge.oneWay !== true) adjacency.get(b.id).push({from: b.id, to: a.id, weight, kind, instruction: edge.reverseInstruction || '', reversed: true});
    }
    if (!directory || typeof directory !== 'object' || Array.isArray(directory)) errors.push('Danh mục khoa/phòng không hợp lệ.');
    for (const [buildingId, entries] of Object.entries(directory || {})) {
      if (!nodes.has(buildingId) || !Array.isArray(entries)) { errors.push('Danh mục tham chiếu khu nhà không hợp lệ: ' + buildingId); continue; }
      entries.forEach((entry, i) => {
        const targetId = entry?.nodeId || buildingId;
        if (!entry || !nodes.has(targetId) || typeof entry.desc !== 'string' || !entry.desc.trim() || (entry.floor != null && (!Number.isInteger(entry.floor) || entry.floor < 1))) { errors.push('Đích đến không hợp lệ: ' + buildingId + ':' + i); return; }
        if (entry.nodeId && entry.floor != null && nodes.get(targetId).floor !== entry.floor) errors.push('Tầng đích không khớp: ' + targetId);
        const buildingName = nodes.get(buildingId).name;
        destinations.push({...entry, id: buildingId + ':' + i, buildingId, buildingName, targetId, searchText: normalize(entry.desc + ' ' + buildingName + ' ' + (entry.floor ? 'tang ' + entry.floor : ''))});
      });
    }
    if (errors.length) throw new Error(errors.join('\n'));
    const isSupported = id => nodes.has(id) && nodes.get(id).routingEnabled !== false && connected.has(id);
    for (const node of nodes.values()) if (node.routingEnabled !== false && !connected.has(node.id)) warnings.push('Điểm không có kết nối, không đưa vào lựa chọn/QR: ' + node.id);
    const canTransit = id => {
      const n = nodes.get(id);
      if (n.isTransitPoint != null) return n.isTransitPoint;
      return !!(n.isWaypoint || n.isGate || n.isEntrance || adjacency.get(id).some(e => e.kind !== 'walk') || !n.isDestination);
    };
    function findPath(start, end) {
      if (!nodes.has(start) || !nodes.has(end)) return {status: 'invalid', steps: []};
      if (!isSupported(start) || !isSupported(end)) return {status: 'unsupported', steps: [], start, end};
      if (start === end) return {status: 'same', steps: [], start, end, cost: 0};
      const dist = new Map([[start, 0]]), previous = new Map(), visited = new Set();
      while (true) {
        let current = null, best = Infinity;
        for (const [id, value] of dist) if (!visited.has(id) && value < best) { current = id; best = value; }
        if (current === null) return {status: 'unreachable', steps: [], start, end};
        if (current === end) break;
        visited.add(current);
        if (current !== start && !canTransit(current)) continue;
        for (const edge of adjacency.get(current)) {
          if (visited.has(edge.to)) continue;
          const candidate = best + edge.weight;
          if (candidate < (dist.get(edge.to) ?? Infinity)) { dist.set(edge.to, candidate); previous.set(edge.to, edge); }
        }
      }
      const steps = [];
      for (let id = end; id !== start;) { const edge = previous.get(id); steps.push(edge); id = edge.from; }
      steps.reverse();
      return {status: 'ok', steps, start, end, cost: dist.get(end)};
    }
    function directions(result, destination) {
      if (result.status === 'same') return [{icon: '📍', text: destination.floor && destination.floor !== nodes.get(result.end).floor ? `Bạn đang ở ${destination.buildingName}. Hãy hỏi nhân viên hướng dẫn đến Tầng ${destination.floor}: ${destination.desc}.` : `Vị trí đã chọn trùng với đích: ${destination.desc}.`}];
      if (result.status !== 'ok') return [];
      const output = [{icon: '📍', text: 'Từ ' + nodes.get(result.start).name + ', đi theo đường được tô trên sơ đồ. Đối chiếu biển chỉ dẫn tại chỗ để xác định hướng ban đầu.'}];
      let prev = null, accumulatedTurn = 0, pending = null;
      const flush = () => { if (pending) output.push(pending); pending = null; };
      for (const step of result.steps) {
        const a = nodes.get(step.from), b = nodes.get(step.to);
        if (a.floor !== b.floor) {
          flush();
          const mode = step.kind === 'stairs' ? 'thang bộ' : step.kind === 'elevator' ? 'thang máy' : 'lối chuyển tầng';
          output.push({icon: step.kind === 'stairs' ? '↕️' : '🛗', text: `Đi ${mode} ${b.floor > a.floor ? 'lên' : 'xuống'} Tầng ${b.floor} (từ Tầng ${a.floor}).`});
          prev = null; accumulatedTurn = 0; continue;
        }
        if (step.instruction) { flush(); output.push({icon: '➡️', text: step.instruction}); prev = null; accumulatedTurn = 0; continue; }
        if (distance(a, b) < 0.01) continue;
        const next = bearing(a, b);
        const localTurn = prev === null ? 'Đi thẳng' : turnLabel(prev, next);
        if (prev !== null) accumulatedTurn += angleDelta(prev, next);
        // A sequence of small bends can change heading substantially. Keep its
        // signed total, but prioritize a sharp local turn (including an S bend).
        const gradual = localTurn === 'Đi thẳng' && Math.abs(accumulatedTurn) >= 40;
        const turn = gradual ? (accumulatedTurn > 0 ? 'Theo lối đi cong sang phải' : 'Theo lối đi cong sang trái') : localTurn;
        const label = b.isWaypoint ? '' : ', hướng tới ' + b.name;
        if (turn !== 'Đi thẳng') { flush(); pending = {icon: gradual ? (accumulatedTurn > 0 ? '➡️' : '⬅️') : turn === 'Rẽ trái' ? '⬅️' : turn === 'Rẽ phải' ? '➡️' : '🔄', text: turn + label}; accumulatedTurn = 0; }
        else if (pending) { if (label) pending.text = pending.text.split(', hướng tới ')[0] + label; }
        else pending = {icon: '⬆️', text: 'Đi theo lối đi' + label};
        prev = next;
      }
      flush();
      if (destination.floor && destination.floor !== nodes.get(result.end).floor) output.push({icon: 'ℹ️', text: `Tuyến trên sơ đồ kết thúc tại ${destination.buildingName}. Hãy hỏi nhân viên hướng dẫn đến Tầng ${destination.floor}: ${destination.desc}.`});
      else output.push({icon: '🏁', text: 'Đích đến: ' + destination.desc + (destination.floor ? ' · Tầng ' + destination.floor : '')});
      return output;
    }
    const qrNodes = [...nodes.values()].filter(n => isSupported(n.id) && (n.isDestination || n.isGate || n.isQRPoint));
    return {nodes, adjacency, destinations, warnings, isSupported, canTransit, findPath, directions, qrNodes};
  }
  const api = {normalize, bearing, turnLabel, buildQrUrl, create};
  root.HospitalNavigation = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis === 'undefined' ? window : globalThis);
