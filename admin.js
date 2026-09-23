'use strict';
(() => {
  const $ = id => document.getElementById(id);
  let engine, generation = 0;
  function invalidate() {
    generation++;
    $('btn-print').disabled = true;
    document.body.classList.remove('print-ready');
    $('qr-grid').replaceChildren();
    $('qr-status').textContent = 'Nhấn “Tạo mã QR” để tạo theo địa chỉ và vị trí đang chọn.';
  }
  function error(text) { $('qr-error').textContent = text; $('qr-error').hidden = !text; }
  function stableImage(holder) {
    const canvas = holder.querySelector('canvas');
    if (!canvas) throw new Error('Trình duyệt không hỗ trợ tạo QR dạng canvas. Hãy dùng trình duyệt hiện đại.');
    const image = new Image(); image.alt = 'Mã QR mở trang chỉ đường'; image.width = 240; image.height = 240;
    return new Promise((resolve, reject) => {
      image.onload = () => { holder.replaceChildren(image); resolve(); };
      image.onerror = () => reject(new Error('Không thể dựng ảnh mã QR.'));
      image.src = canvas.toDataURL('image/png');
    });
  }
  async function generate() {
    invalidate(); const token = generation; error('');
    try {
      if (typeof QRCode !== 'function') throw new Error('Thiếu thư viện tạo QR. Hãy kiểm tra thư mục vendor.');
      const base = $('base-url-input').value.trim();
      const checked = new URL(HospitalNavigation.buildQrUrl(base, 'CHECK'));
      if (checked.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(checked.hostname)) throw new Error('Hãy dùng địa chỉ HTTPS cho bản triển khai thực tế.');
      const selected = $('qr-location-select').value;
      const eligible = engine.qrNodes.filter(n => !selected || n.id === selected);
      if (!eligible.length) throw new Error('Không có vị trí phù hợp để in.');
      $('qr-status').textContent = 'Đang tạo ' + eligible.length + ' mã QR…';
      const fragment = document.createDocumentFragment(), jobs = [];
      for (const node of eligible) {
        const link = HospitalNavigation.buildQrUrl(base, node.id);
        if (new TextEncoder().encode(link).length > 450) throw new Error('Địa chỉ quá dài để in QR rõ ràng. Hãy dùng đường dẫn ngắn hơn.');
        const card = document.createElement('article'); card.className = 'qr-card';
        const holder = document.createElement('div'); holder.className = 'qr-canvas';
        const instruction = document.createElement('div'); instruction.className = 'qr-instruction'; instruction.textContent = 'Quét mã QR để tìm đường đi trong Bệnh viện';
        const name = document.createElement('div'); name.className = 'qr-name'; name.textContent = 'Vị trí hiện tại: ' + node.name;
        const meta = document.createElement('div'); meta.className = 'qr-meta no-print';
        meta.textContent = `${node.id} · Tầng ${node.floor} · Tọa độ (${node.x}, ${node.y})`;
        const preview = document.createElement('a'); preview.href = link; preview.textContent = 'Mở thử vị trí'; preview.target = '_blank'; preview.rel = 'noopener noreferrer';
        meta.append(document.createElement('br'), preview);
        card.append(holder, instruction, name, meta); fragment.append(card);
        new QRCode(holder, {text:link, width:240, height:240, colorDark:'#000000', colorLight:'#ffffff', correctLevel:QRCode.CorrectLevel.M});
        jobs.push(stableImage(holder));
      }
      // Detached images must finish loading before enabling printing.
      await Promise.all(jobs);
      if (token !== generation) return;
      $('qr-grid').replaceChildren(fragment);
      document.body.classList.add('print-ready'); $('btn-print').disabled = false;
      $('qr-status').textContent = `Đã tạo ${eligible.length} mã QR. Kiểm tra địa chỉ ${checked.origin}${checked.pathname} và quét thử trước khi in.`;
    } catch (err) {
      if (token !== generation) return;
      $('qr-grid').replaceChildren(); $('qr-status').textContent = 'Chưa có mã QR sẵn sàng để in.'; error(err.message);
    }
  }
  try {
    engine = HospitalNavigation.create(HOSPITAL_MAP, BUILDING_DIRECTORY, MAP_IMAGE);
    const inferred = ['http:', 'https:'].includes(location.protocol) ? new URL('index.html', location.href).href : APP_CONFIG.publicBaseUrl;
    $('base-url-input').value = inferred;
    for (const node of engine.qrNodes) {
      const option = document.createElement('option'); option.value = node.id; option.textContent = node.name + ' · ' + node.id; $('qr-location-select').append(option);
    }
    $('base-url-input').addEventListener('input', invalidate);
    $('qr-location-select').addEventListener('change', invalidate);
    $('btn-generate').addEventListener('click', generate);
    $('btn-print').addEventListener('click', () => { if (!$('btn-print').disabled) window.print(); });
    invalidate();
  } catch (err) { error('Không thể tải dữ liệu tạo QR. ' + err.message); $('qr-status').textContent = 'Khởi tạo thất bại.'; $('btn-generate').disabled = true; }
})();
