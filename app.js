// ============================================================
// 1. DỰNG ĐỒ THỊ TỪ HOSPITAL_MAP
// ============================================================
const nodeById = {};
HOSPITAL_MAP.nodes.forEach((n) => (nodeById[n.id] = n));

// Nếu edge không khai báo weight, tự tính bằng khoảng cách Euclid giữa 2 toạ độ x,y.
// Nhờ vậy khi thêm mốc mới trong map-data.js, thường KHÔNG cần tự tay ước lượng weight.
function euclideanDistance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

const adjacency = {}; // adjacency[nodeId] = [{to, weight, isElevator, instruction}]
HOSPITAL_MAP.nodes.forEach((n) => (adjacency[n.id] = []));
HOSPITAL_MAP.edges.forEach((e) => {
  const w = e.weight != null ? e.weight : euclideanDistance(nodeById[e.from], nodeById[e.to]);
  adjacency[e.from].push({ to: e.to, weight: w, isElevator: !!e.isElevator, instruction: e.instruction });
  adjacency[e.to].push({ to: e.from, weight: w, isElevator: !!e.isElevator, instruction: e.instruction });
});

// ============================================================
// 2. THUẬT TOÁN DIJKSTRA - TÌM ĐƯỜNG NGẮN NHẤT
// ============================================================
function findShortestPath(startId, endId) {
  const dist = {};
  const prev = {};
  const visited = new Set();
  Object.keys(adjacency).forEach((id) => (dist[id] = Infinity));
  dist[startId] = 0;

  while (visited.size < Object.keys(adjacency).length) {
    // chọn node chưa thăm có khoảng cách nhỏ nhất
    let current = null;
    let best = Infinity;
    for (const id of Object.keys(dist)) {
      if (!visited.has(id) && dist[id] < best) {
        best = dist[id];
        current = id;
      }
    }
    if (current === null) break;
    if (current === endId) break;
    visited.add(current);

    for (const edge of adjacency[current]) {
      const alt = dist[current] + edge.weight;
      if (alt < dist[edge.to]) {
        dist[edge.to] = alt;
        prev[edge.to] = { id: current, edge };
      }
    }
  }

  if (dist[endId] === Infinity) return null;

  // truy vết đường đi
  const path = [];
  let cur = endId;
  while (cur !== startId) {
    const p = prev[cur];
    if (!p) return null;
    path.unshift({ from: p.id, to: cur, edge: p.edge });
    cur = p.id;
  }
  return { steps: path, totalDistance: dist[endId] };
}

// ============================================================
// 3. SINH CHỈ DẪN BẰNG VĂN BẢN (rẽ trái / phải / đi thẳng / thang máy)
// ============================================================
function bearing(a, b) {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

function turnLabel(prevBearing, nextBearing) {
  let diff = ((nextBearing - prevBearing) * 180) / Math.PI;
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  if (Math.abs(diff) < 25) return "đi thẳng";
  if (diff >= 25 && diff < 150) return "rẽ trái";
  if (diff <= -25 && diff > -150) return "rẽ phải";
  return "quay lại";
}

function generateDirections(pathResult, destination) {
  const { steps } = pathResult;
  const instructions = [];
  let prevBearing = null;

  steps.forEach((step) => {
    const fromNode = nodeById[step.from];
    const toNode = nodeById[step.to];

    if (step.edge.isElevator) {
      instructions.push({
        text: step.edge.instruction || `Di chuyển từ Tầng ${fromNode.floor} lên Tầng ${toNode.floor}`,
        icon: "🛗",
      });
      prevBearing = null; // reset hướng sau khi đổi tầng
      return;
    }

    const curBearing = bearing(fromNode, toNode);
    if (prevBearing === null) {
      instructions.push({ text: `Đi thẳng về hướng ${toNode.name}`, icon: "⬆️" });
    } else {
      const turn = turnLabel(prevBearing, curBearing);
      const icon = turn === "rẽ trái" ? "⬅️" : turn === "rẽ phải" ? "➡️" : turn === "quay lại" ? "🔄" : "⬆️";
      instructions.push({ text: `${turn.charAt(0).toUpperCase() + turn.slice(1)}, hướng tới ${toNode.name}`, icon });
    }
    prevBearing = curBearing;
  });

  // Bước cuối: nếu khoa/phòng nằm ở tầng cụ thể trong toà nhà, nhắc lên tầng đó.
  if (destination.floor) {
    instructions.push({
      text: `Vào ${destination.buildingName}, lên Tầng ${destination.floor} để đến: ${destination.desc}`,
      icon: "🛗",
    });
  } else {
    instructions.push({ text: `Bạn đã đến: ${destination.desc}`, icon: "🏁" });
  }
  return instructions;
}

// ============================================================
// 4. VẼ BẢN ĐỒ SVG (nền mờ + tô đậm đường đi)
// ============================================================
function renderMap(svgEl, pathResult, currentFloor) {
  svgEl.innerHTML = "";
  const ns = "http://www.w3.org/2000/svg";
  const pathNodeIds = new Set();
  const pathEdgeKeys = new Set();
  if (pathResult) {
    pathResult.steps.forEach((s) => {
      pathNodeIds.add(s.from);
      pathNodeIds.add(s.to);
      pathEdgeKeys.add(s.from + "-" + s.to);
      pathEdgeKeys.add(s.to + "-" + s.from);
    });
  }

  // vẽ tất cả các hành lang (mờ) của tầng hiện tại
  HOSPITAL_MAP.edges.forEach((e) => {
    const a = nodeById[e.from];
    const b = nodeById[e.to];
    if (a.floor !== currentFloor || b.floor !== currentFloor) return;
    const isOnPath = pathEdgeKeys.has(e.from + "-" + e.to);
    const line = document.createElementNS(ns, "line");
    line.setAttribute("x1", a.x);
    line.setAttribute("y1", a.y);
    line.setAttribute("x2", b.x);
    line.setAttribute("y2", b.y);
    line.setAttribute("stroke", isOnPath ? "#2563eb" : "#d1d5db");
    line.setAttribute("stroke-width", isOnPath ? "6" : "3");
    line.setAttribute("stroke-linecap", "round");
    svgEl.appendChild(line);
  });

  // vẽ các node của tầng hiện tại
  HOSPITAL_MAP.nodes.forEach((n) => {
    if (n.floor !== currentFloor) return;
    const onPath = pathNodeIds.has(n.id);
    const circle = document.createElementNS(ns, "circle");
    circle.setAttribute("cx", n.x);
    circle.setAttribute("cy", n.y);
    circle.setAttribute("r", onPath ? 10 : 7);
    circle.setAttribute("fill", onPath ? "#2563eb" : "#9ca3af");
    svgEl.appendChild(circle);

    const label = document.createElementNS(ns, "text");
    label.setAttribute("x", n.x);
    label.setAttribute("y", n.y - 14);
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("font-size", "13");
    label.setAttribute("fill", onPath ? "#1e3a8a" : "#6b7280");
    label.setAttribute("font-weight", onPath ? "700" : "400");
    label.textContent = n.name;
    svgEl.appendChild(label);
  });
}

// ============================================================
// 5. STATE & ĐIỀU HƯỚNG GIỮA CÁC MÀN HÌNH
// ============================================================
const state = { currentNodeId: null, destinationId: null, qrScanner: null };

const screens = {
  scan: document.getElementById("screen-scan"),
  destination: document.getElementById("screen-destination"),
  directions: document.getElementById("screen-directions"),
};

function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.add("hidden"));
  screens[name].classList.remove("hidden");
}

// Gộp BUILDING_DIRECTORY thành 1 danh sách phẳng, dễ tìm kiếm theo tên khoa/phòng
// hoặc theo tên khu nhà (vd: gõ "cấp cứu" hoặc gõ "N1A" đều ra kết quả).
const DESTINATIONS = [];
Object.keys(BUILDING_DIRECTORY).forEach((buildingId) => {
  const building = nodeById[buildingId];
  BUILDING_DIRECTORY[buildingId].forEach((entry) => {
    DESTINATIONS.push({
      buildingId,
      buildingName: building.name,
      floor: entry.floor,
      desc: entry.desc,
    });
  });
});

function renderDestinationButtons(items) {
  const list = document.getElementById("destination-list");
  list.innerHTML = "";
  if (items.length === 0) {
    list.innerHTML = '<p class="no-result">Không tìm thấy khoa/phòng phù hợp. Hãy hỏi nhân viên hỗ trợ gần nhất.</p>';
    return;
  }
  items.forEach((d) => {
    const btn = document.createElement("button");
    btn.className = "dest-btn";
    const sameName = d.desc === d.buildingName;
    btn.innerHTML = sameName
      ? `<span class="dest-desc">${d.desc}</span>`
      : `<span class="dest-desc">${d.desc}</span><span class="dest-building">${d.buildingName}${d.floor ? " · Tầng " + d.floor : ""}</span>`;
    btn.onclick = () => selectDestination(d);
    list.appendChild(btn);
  });
}

function populateDestinationList() {
  renderDestinationButtons(DESTINATIONS);
  const searchInput = document.getElementById("destination-search");
  searchInput.value = "";
  searchInput.oninput = () => {
    const q = searchInput.value.trim().toLowerCase();
    const filtered = DESTINATIONS.filter(
      (d) => d.desc.toLowerCase().includes(q) || d.buildingName.toLowerCase().includes(q)
    );
    renderDestinationButtons(filtered);
  };
}

function selectDestination(destination) {
  state.destinationId = destination.buildingId;
  const result = findShortestPath(state.currentNodeId, destination.buildingId);
  if (!result) {
    alert("Không tìm được đường đi đến địa điểm này. Vui lòng liên hệ nhân viên hỗ trợ.");
    return;
  }
  const directions = generateDirections(result, destination);
  const list = document.getElementById("directions-list");
  list.innerHTML = "";
  directions.forEach((step) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="step-icon">${step.icon}</span><span>${step.text}</span>`;
    list.appendChild(li);
  });

  document.getElementById("directions-title").textContent = `Đường đến: ${destination.desc}`;

  const floorsInPath = new Set(result.steps.flatMap((s) => [nodeById[s.from].floor, nodeById[s.to].floor]));
  renderFloorTabs(Array.from(floorsInPath).sort(), result);
  showScreen("directions");
}

function renderFloorTabs(floors, result) {
  const tabsEl = document.getElementById("floor-tabs");
  tabsEl.innerHTML = "";
  const svgEl = document.getElementById("map-svg");
  floors.forEach((floor, idx) => {
    const btn = document.createElement("button");
    btn.className = "floor-tab" + (idx === 0 ? " active" : "");
    btn.textContent = `Tầng ${floor}`;
    btn.onclick = () => {
      document.querySelectorAll(".floor-tab").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderMap(svgEl, result, floor);
    };
    tabsEl.appendChild(btn);
  });
  renderMap(svgEl, result, floors[0]);
}

// ============================================================
// 6. QUÉT MÃ QR BẰNG CAMERA (thư viện html5-qrcode)
// ============================================================
function startQrScanner() {
  const readerId = "qr-reader";
  state.qrScanner = new Html5Qrcode(readerId);
  const config = { fps: 10, qrbox: { width: 240, height: 240 } };

  state.qrScanner
    .start(
      { facingMode: "environment" },
      config,
      (decodedText) => onQrScanSuccess(decodedText),
      () => {} // lỗi từng frame (không tìm thấy mã) - bỏ qua, không cần hiện lỗi
    )
    .catch((err) => {
      document.getElementById("scan-error").textContent =
        "Không thể mở camera. Hãy cấp quyền camera cho trình duyệt và đảm bảo trang chạy trên HTTPS.";
      console.error(err);
    });
}

function onQrScanSuccess(decodedText) {
  const nodeId = decodedText.trim();
  if (!nodeById[nodeId]) {
    document.getElementById("scan-error").textContent =
      `Mã QR không hợp lệ (${nodeId}). Vui lòng thử lại hoặc gọi nhân viên hỗ trợ.`;
    return;
  }
  state.currentNodeId = nodeId;
  if (state.qrScanner) {
    state.qrScanner.stop().catch(() => {});
  }
  document.getElementById("current-location-label").textContent =
    `Vị trí hiện tại: ${nodeById[nodeId].name}`;
  populateDestinationList();
  showScreen("destination");
}

// nút "nhập thủ công" phòng khi camera lỗi / không có QR
function manualLocationSelect() {
  const select = document.getElementById("manual-location-select");
  const nodeId = select.value;
  if (!nodeId) return;
  onQrScanSuccess(nodeId);
}

// nút quay lại quét vị trí mới / chọn đích khác
function backToScan() {
  showScreen("scan");
  startQrScanner();
}
function backToDestinations() {
  showScreen("destination");
}

// ============================================================
// 7. KHỞI TẠO KHI TẢI TRANG
// ============================================================
window.addEventListener("DOMContentLoaded", () => {
  // đổ danh sách vào combo "chọn thủ công" (dự phòng)
  const select = document.getElementById("manual-location-select");
  HOSPITAL_MAP.nodes
    .filter((n) => n.isDestination || n.isGate)
    .forEach((n) => {
      const opt = document.createElement("option");
      opt.value = n.id;
      opt.textContent = n.isGate ? `${n.name} (cổng)` : n.name;
      select.appendChild(opt);
    });

  document.getElementById("btn-manual-select").addEventListener("click", manualLocationSelect);
  document.getElementById("btn-back-to-scan").addEventListener("click", backToScan);
  document.getElementById("btn-back-to-destinations").addEventListener("click", backToDestinations);

  startQrScanner();
});
