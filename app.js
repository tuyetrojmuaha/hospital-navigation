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

const adjacency = {}; // adjacency[nodeId] = [{to, weight, isElevator, instruction, icon}]
HOSPITAL_MAP.nodes.forEach((n) => (adjacency[n.id] = []));
HOSPITAL_MAP.edges.forEach((e) => {
  const w = e.weight != null ? e.weight : euclideanDistance(nodeById[e.from], nodeById[e.to]);
  adjacency[e.from].push({ to: e.to, weight: w, isElevator: !!e.isElevator, instruction: e.instruction, icon: e.icon });
  adjacency[e.to].push({ to: e.from, weight: w, isElevator: !!e.isElevator, instruction: e.instruction, icon: e.icon });
});

// Một điểm được coi là "hạ tầng chung" (được phép đi NGANG QUA để tới chỗ khác) nếu là:
// điểm lối đi mặt bằng (isWaypoint), cổng ra vào (isGate), được đánh dấu rõ isTransitPoint
// (vd các điểm thang máy/thang bộ trong Toà Tháp đôi), hoặc có cạnh thang máy (isElevator)
// gắn trực tiếp vào nó (vì bản thân việc lên/xuống tầng bắt buộc phải "đi qua" đúng điểm đó).
// Các điểm ĐÍCH CỤ THỂ khác (phòng khám, khu chức năng...) sẽ bị PHẠT NẶNG nếu bị dùng làm
// điểm trung chuyển cho một lộ trình tới nơi khác - không cắt ngang qua phòng người khác.
function isTransitInfrastructure(nodeId) {
  const n = nodeById[nodeId];
  if (!n) return false;
  if (n.isWaypoint || n.isGate || n.isTransitPoint) return true;
  return (adjacency[nodeId] || []).some((e) => e.isElevator);
}
const THROUGH_DESTINATION_PENALTY = 5000; // đủ lớn để Dijkstra luôn ưu tiên đường khác nếu có

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
      let weight = edge.weight;
      // Nếu "current" là 1 điểm ĐÍCH cụ thể (không phải hạ tầng chung) và KHÔNG phải điểm
      // xuất phát/đích của chính lộ trình đang tìm, phạt nặng việc đi tiếp từ đây - tức là
      // không cho phép "cắt ngang" qua phòng/khu chức năng của người khác để tới nơi khác.
      if (current !== startId && current !== endId) {
        const n = nodeById[current];
        if (n && n.isDestination && !isTransitInfrastructure(current)) {
          weight += THROUGH_DESTINATION_PENALTY;
        }
      }
      const alt = dist[current] + weight;
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
  // Ngưỡng 40° (thay vì 25°) vì lưới lối đi dò từ chấm tay vẽ có độ lệch nhỏ tự nhiên giữa
  // các điểm liên tiếp — ngưỡng rộng hơn giúp không báo "rẽ" vặt ở những đoạn thực chất vẫn thẳng.
  if (Math.abs(diff) < 40) return "đi thẳng";
  if (diff >= 40 && diff < 150) return "rẽ trái";
  if (diff <= -40 && diff > -150) return "rẽ phải";
  return "quay lại";
}

function generateDirections(pathResult, destination) {
  const { steps } = pathResult;
  const instructions = [];

  // Vì lưới lối đi có rất nhiều điểm sát nhau (dò từ ảnh thật), một đoạn "đi thẳng" thực tế
  // có thể gồm hàng chục điểm nhỏ liên tiếp. Để lời chỉ dẫn không bị vụn thành hàng chục dòng
  // "đi thẳng" lặp lại, ta GOM các bước thẳng hàng liên tiếp lại thành 1 dòng duy nhất, và chỉ
  // tách dòng mới khi thực sự có rẽ / đổi tầng / lời chỉ dẫn cố định / tới đích.
  let buffer = null; // { targetLabel, stepCount }
  let runStartBearing = null;

  function startBuffer() {
    buffer = { targetLabel: null, stepCount: 0 };
  }
  function updateBuffer(label) {
    buffer.stepCount += 1;
    if (label) buffer.targetLabel = label;
  }
  function flushBuffer() {
    if (buffer && buffer.stepCount > 0) {
      instructions.push({
        text: buffer.targetLabel ? `Đi thẳng, hướng tới ${buffer.targetLabel}` : "Đi thẳng theo lối đi",
        icon: "⬆️",
      });
    }
    buffer = null;
  }

  steps.forEach((step, idx) => {
    const fromNode = nodeById[step.from];
    const toNode = nodeById[step.to];
    const isLastStep = idx === steps.length - 1;
    // Chỉ nêu tên đích thật (khu nhà/cổng) trong câu chỉ dẫn, không nêu tên waypoint kỹ thuật
    const targetLabel = toNode.isWaypoint ? null : toNode.name;

    // Một số đoạn có lời chỉ dẫn CỐ ĐỊNH riêng (thang máy, cửa vào cụ thể...) — dùng luôn
    // thay vì tự tính rẽ trái/phải, vì bản thân đoạn đó đã mang ý nghĩa rõ ràng hơn.
    if (step.edge.instruction || step.edge.isElevator) {
      flushBuffer();
      instructions.push({
        text: step.edge.instruction || `Di chuyển từ Tầng ${fromNode.floor} lên Tầng ${toNode.floor}`,
        icon: step.edge.icon || (step.edge.isElevator ? "🛗" : "➡️"),
      });
      runStartBearing = null;
      startBuffer();
      return;
    }

    const curBearing = bearing(fromNode, toNode);
    if (runStartBearing === null) {
      // bắt đầu 1 đoạn thẳng mới (đầu lộ trình, hoặc ngay sau 1 lần rẽ/thang máy)
      startBuffer();
      updateBuffer(targetLabel);
      runStartBearing = curBearing;
    } else {
      // so sánh với hướng lúc BẮT ĐẦU đoạn thẳng hiện tại (không phải bước ngay trước đó),
      // để phát hiện đúng cả những khúc cua rất thoải trải dài qua nhiều điểm nhỏ
      const turn = turnLabel(runStartBearing, curBearing);
      if (turn === "đi thẳng") {
        updateBuffer(targetLabel);
      } else {
        flushBuffer();
        const icon = turn === "rẽ trái" ? "⬅️" : turn === "rẽ phải" ? "➡️" : turn === "quay lại" ? "🔄" : "⬆️";
        const turnText = turn.charAt(0).toUpperCase() + turn.slice(1);
        instructions.push({
          text: targetLabel && !isLastStep ? `${turnText}, hướng tới ${targetLabel}` : turnText,
          icon,
        });
        runStartBearing = curBearing;
        startBuffer();
      }
    }
  });
  flushBuffer();

  // Bước cuối: giờ việc "lên tầng mấy" đã là MỘT BƯỚC THẬT trong lộ trình (nếu đích có node
  // hành lang riêng theo tầng, xem targetNodeId/nodeId trong BUILDING_DIRECTORY), nên ở đây
  // chỉ cần báo đã tới đích. Với các khu nhà chưa có cấu trúc tầng chi tiết, vẫn nhắc thêm
  // số tầng bằng chữ để không mất thông tin.
  const hasFloorNode = destination.targetNodeId && destination.targetNodeId !== destination.buildingId;
  if (destination.floor && !hasFloorNode) {
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
  svgEl.setAttribute("viewBox", `0 0 ${MAP_IMAGE.width} ${MAP_IMAGE.height}`);
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

  // Chỉ vẽ đè lên ảnh gốc phần lộ trình cần đi, để không che các chi tiết khác của bản đồ thật.
  HOSPITAL_MAP.edges.forEach((e) => {
    const a = nodeById[e.from];
    const b = nodeById[e.to];
    if (a.floor !== currentFloor || b.floor !== currentFloor) return;
    const isOnPath = pathEdgeKeys.has(e.from + "-" + e.to);
    if (!isOnPath) return;
    const line = document.createElementNS(ns, "line");
    line.setAttribute("x1", a.x);
    line.setAttribute("y1", a.y);
    line.setAttribute("x2", b.x);
    line.setAttribute("y2", b.y);
    line.setAttribute("stroke", "#2563eb");
    line.setAttribute("stroke-width", "10");
    line.setAttribute("stroke-linecap", "round");
    line.setAttribute("opacity", "0.85");
    svgEl.appendChild(line);
  });

  const startId = pathResult ? pathResult.steps[0].from : null;
  const endId = pathResult ? pathResult.steps[pathResult.steps.length - 1].to : null;

  HOSPITAL_MAP.nodes.forEach((n) => {
    if (n.floor !== currentFloor) return;
    if (!pathNodeIds.has(n.id)) return; // ẩn các mốc không liên quan để giữ ảnh gốc sạch sẽ

    const isStart = n.id === startId;
    const isEnd = n.id === endId;
    const circle = document.createElementNS(ns, "circle");
    circle.setAttribute("cx", n.x);
    circle.setAttribute("cy", n.y);
    circle.setAttribute("r", isStart || isEnd ? 14 : 9);
    circle.setAttribute("fill", isStart ? "#16a34a" : isEnd ? "#dc2626" : "#2563eb");
    circle.setAttribute("stroke", "white");
    circle.setAttribute("stroke-width", "3");
    svgEl.appendChild(circle);

    if (isStart || isEnd) {
      const label = document.createElementNS(ns, "text");
      label.setAttribute("x", n.x);
      label.setAttribute("y", n.y - 20);
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("font-size", "22");
      label.setAttribute("font-weight", "700");
      label.setAttribute("fill", isStart ? "#166534" : "#991b1b");
      label.setAttribute("paint-order", "stroke");
      label.setAttribute("stroke", "white");
      label.setAttribute("stroke-width", "4");
      label.textContent = isStart ? "Bạn ở đây" : n.name;
      svgEl.appendChild(label);
    }
  });
}

// ============================================================
// 5. STATE & ĐIỀU HƯỚNG GIỮA CÁC MÀN HÌNH
// ============================================================
const state = { currentNodeId: null, destinationId: null };

const screens = {
  noLocation: document.getElementById("screen-no-location"),
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
      // Nếu tầng này có node hành lang riêng (entry.nodeId, vd B01_F2_5), dùng đúng node đó
      // để tính đường đi xuyên suốt cả vào toà nhà lẫn lên tầng. Không có thì dùng buildingId
      // (áp dụng cho các khu nhà chỉ có 1 tầng/không rõ cấu trúc tầng).
      targetNodeId: entry.nodeId || buildingId,
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
  state.destinationId = destination.targetNodeId;
  const result = findShortestPath(state.currentNodeId, destination.targetNodeId);
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
// 6. XÁC ĐỊNH VỊ TRÍ TỪ ĐƯỜNG LINK CỦA MÃ QR (?node=...)
// ============================================================
// Mã QR dán trên tường giờ chứa 1 đường link dạng:
//   https://ten-mien-cua-ban/index.html?node=B08
// Khi người dùng quét bằng camera điện thoại và bấm vào link, trình duyệt mở
// đúng trang này kèm tham số "node" -> app tự nhận vị trí, KHÔNG cần mở camera
// quét lại bên trong trang.
function setCurrentLocation(nodeId) {
  if (!nodeById[nodeId]) {
    document.getElementById("scan-error").textContent =
      `Mã QR không hợp lệ (${nodeId}). Vui lòng thử lại hoặc chọn vị trí thủ công bên dưới.`;
    showScreen("noLocation");
    return;
  }
  state.currentNodeId = nodeId;
  document.getElementById("current-location-label").textContent =
    `Vị trí hiện tại: ${nodeById[nodeId].name}`;
  populateDestinationList();
  showScreen("destination");
}

function tryReadLocationFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const nodeId = params.get("node");
  if (nodeId) {
    setCurrentLocation(nodeId.trim());
  } else {
    showScreen("noLocation");
  }
}

// nút "chọn thủ công" phòng khi không có link QR (mở trang trực tiếp)
function manualLocationSelect() {
  const select = document.getElementById("manual-location-select");
  const nodeId = select.value;
  if (!nodeId) return;
  setCurrentLocation(nodeId);
}

// nút quay lại màn hình xác định vị trí / chọn đích khác
function backToScan() {
  showScreen("noLocation");
}
function backToDestinations() {
  showScreen("destination");
}

// ============================================================
// 7. KHỞI TẠO KHI TẢI TRANG
// ============================================================
window.addEventListener("DOMContentLoaded", () => {
  // nạp ảnh nền thật (nhúng base64) vào thẻ <img>
  document.getElementById("map-background").src = MAP_IMAGE.src;

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

  tryReadLocationFromUrl();
});
