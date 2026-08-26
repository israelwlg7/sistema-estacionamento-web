/* Mapa de Vagas — carro (versão aprovada) + validação forte de modelo/cor */

/* ---------- utilidades ---------- */
if (typeof window.fmtPlaca !== 'function') {
  window.fmtPlaca = function (v) {
    const s = (v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
    if (s.length > 3 && /^[A-Z]{3}[0-9]{4}$/.test(s)) return s.slice(0, 3) + '-' + s.slice(3);
    return s;
  };
}

function notifyMsg(msg, type) {
  const fn = window.vcToast || window.toast;
  if (typeof fn === 'function') return fn(msg, type);
  if (window.console) console.warn(msg);
}

function readFlags() {
  try {
    const el = document.getElementById('pageFlags');
    if (el) return JSON.parse(el.textContent);
  } catch (e) {}
  return { is_staff: !!window.IS_STAFF };
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const letras = s => (s.match(/[A-Za-zÀ-ÖØ-öø-ÿ]/g) || []).length;
const MODELO_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ0-9\s\-\.]+$/;

/* ---------- VALIDAÇÃO FORTE ---------- */
const CORES_BASE = new Set(['preto','branco','prata','cinza','vermelho','azul','verde','amarelo','laranja','marrom','bege','dourado','vinho','roxo','rosa','grafite','champagne','bronze','cobre','titânio','titanio','creme']);
const CORES_MOD = new Set(['claro','escuro','metalico','metálico','fosco','perolado','brilhante']);

function corValida(cor) {
  const t = cor.toLowerCase().split(/\s+/).filter(Boolean);
  if (!t.length) return false;
  return t.some(w => CORES_BASE.has(w)) && t.every(w => CORES_BASE.has(w) || CORES_MOD.has(w));
}

function modeloValido(m) {
  const low = m.toLowerCase();
  const VOG = 'aeiouáéíóúâêôãõàü';
  if (!/[aeiouáéíóúâêôãõàü]/.test(low)) return false;          // precisa de vogal
  if (/(.)\1{3,}/.test(low)) return false;                     // 4+ letras repetidas
  let run = 0, max = 0;
  for (const ch of low) {
    if (/[a-zà-öø-ÿ]/i.test(ch) && !VOG.includes(ch)) { run++; max = Math.max(max, run); }
    else run = 0;
  }
  return max < 4;                                              // sem 4+ consoantes grudadas
}

let VAGAS = [];
window.VAGAS = VAGAS;

/* ---------- reconstrói a camada do mapa ---------- */
function rebuildMap(svg) {
  if (!svg) return;
  svg.querySelectorAll('.vaga-svg, text.vn, text.cota-tx, line.cota-tk, line.cota-line, line.cota-v, text.cota-vt, .car-wrap, .crowd-eye')
     .forEach((el) => el.remove());

  const add = (tag, attrs, txt) => {
    const el = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    if (txt != null) el.textContent = txt;
    svg.appendChild(el);
    return el;
  };

  for (let i = 0; i < 9; i++) {
    const n = i + 1, x = +(84 + i * 97.5).toFixed(1), w = 88, cx = +(x + w / 2).toFixed(1);
    add('rect', { 'class': 'vaga-svg', 'data-numero': n, x: x, y: 44, width: w, height: 150, rx: 6 });
    add('text', { 'class': 'vn', x: cx, y: 126 }, String(n));
    add('line', { 'class': 'cota-tk', x1: cx, y1: 198, x2: cx, y2: 205 });
    add('text', { 'class': 'cota-tx', x: cx, y: 215 }, '3.00');
  }
  add('line', { 'class': 'cota-line', x1: 84, y1: 201, x2: 965, y2: 201 });
  add('line', { 'class': 'cota-v', x1: 80, y1: 44, x2: 80, y2: 194 });
  add('text', { 'class': 'cota-vt', x: 80, y: 119, transform: 'rotate(-90 80 119)' }, '6.00');

  add('line', { 'class': 'cota-v', x1: 50, y1: 222, x2: 50, y2: 326 });
  add('text', { 'class': 'cota-vt', x: 50, y: 274, transform: 'rotate(-90 50 274)' }, '6.00');

  add('line', { 'class': 'cota-line', x1: 150, y1: 345, x2: 970, y2: 345 });
  for (let i = 0; i < 9; i++) {
    const n = 10 + i, x = +(150 + i * 92).toFixed(1), w = 84, cx = +(x + w / 2).toFixed(1);
    add('line', { 'class': 'cota-tk', x1: cx, y1: 341, x2: cx, y2: 348 });
    add('text', { 'class': 'cota-tx', x: cx, y: 338 }, '3.00');
    add('rect', { 'class': 'vaga-svg', 'data-numero': n, x: x, y: 350, width: w, height: 150, rx: 6 });
    add('text', { 'class': 'vn', x: cx, y: 432 }, String(n));
  }
}

/* ---------- gradientes do carro ---------- */
function ensureCarDefs(svg) {
  if (svg.querySelector('#carGrad')) return;
  const defs = document.createElementNS(SVG_NS, 'defs');
  defs.innerHTML =
    '<linearGradient id="carGrad" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#ffffff"/>' +
      '<stop offset="0.55" stop-color="#eaeff6"/>' +
      '<stop offset="1" stop-color="#c8d3e0"/>' +
    '</linearGradient>' +
    '<linearGradient id="glassGrad" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#0f172a"/>' +
      '<stop offset="1" stop-color="#3d4d61"/>' +
    '</linearGradient>';
  svg.insertBefore(defs, svg.firstChild);
}

/* ---------- CARRO (VERSÃO APROVADA — volta pro anterior) ---------- */
function carIcon(r, n) {
  const x = parseFloat(r.getAttribute('x')) || 0;
  const y = parseFloat(r.getAttribute('y')) || 0;
  const w = parseFloat(r.getAttribute('width')) || 0;
  const h = parseFloat(r.getAttribute('height')) || 0;
  if (w <= 0 || h <= 0) return null;

  const bw = Math.min(60, w * 0.66), bh = Math.min(122, h * 0.8);
  const cx = x + (w - bw) / 2, cy = y + (h - bh) / 2;
  const R = v => Math.round(v * 10) / 10;

  const bodyPath =
    'M ' + R(bw * 0.5) + ' ' + R(bh * 0.012) + ' ' +
    'C ' + R(bw * 0.72) + ' ' + R(bh * 0.012) + ' ' + R(bw * 0.90) + ' ' + R(bh * 0.05) + ' ' + R(bw * 0.94) + ' ' + R(bh * 0.14) + ' ' +
    'C ' + R(bw * 0.98) + ' ' + R(bh * 0.30) + ' ' + R(bw * 0.99) + ' ' + R(bh * 0.50) + ' ' + R(bw * 0.97) + ' ' + R(bh * 0.72) + ' ' +
    'C ' + R(bw * 0.95) + ' ' + R(bh * 0.90) + ' ' + R(bw * 0.80) + ' ' + R(bh * 0.988) + ' ' + R(bw * 0.5) + ' ' + R(bh * 0.988) + ' ' +
    'C ' + R(bw * 0.20) + ' ' + R(bh * 0.988) + ' ' + R(bw * 0.05) + ' ' + R(bh * 0.90) + ' ' + R(bw * 0.03) + ' ' + R(bh * 0.72) + ' ' +
    'C ' + R(bw * 0.01) + ' ' + R(bh * 0.50) + ' ' + R(bw * 0.02) + ' ' + R(bh * 0.30) + ' ' + R(bw * 0.06) + ' ' + R(bh * 0.14) + ' ' +
    'C ' + R(bw * 0.10) + ' ' + R(bh * 0.05) + ' ' + R(bw * 0.28) + ' ' + R(bh * 0.012) + ' ' + R(bw * 0.5) + ' ' + R(bh * 0.012) + ' Z';

  const glassFront =
    'M ' + R(bw * 0.18) + ' ' + R(bh * 0.20) + ' ' +
    'Q ' + R(bw * 0.5) + ' ' + R(bh * 0.14) + ' ' + R(bw * 0.82) + ' ' + R(bh * 0.20) + ' ' +
    'L ' + R(bw * 0.78) + ' ' + R(bh * 0.30) + ' ' +
    'Q ' + R(bw * 0.5) + ' ' + R(bh * 0.255) + ' ' + R(bw * 0.22) + ' ' + R(bh * 0.30) + ' Z';

  const glassRear =
    'M ' + R(bw * 0.22) + ' ' + R(bh * 0.68) + ' ' +
    'Q ' + R(bw * 0.5) + ' ' + R(bh * 0.72) + ' ' + R(bw * 0.78) + ' ' + R(bh * 0.68) + ' ' +
    'L ' + R(bw * 0.82) + ' ' + R(bh * 0.78) + ' ' +
    'Q ' + R(bw * 0.5) + ' ' + R(bh * 0.83) + ' ' + R(bw * 0.18) + ' ' + R(bh * 0.78) + ' Z';

  const wrap = document.createElementNS(SVG_NS, 'g');
  wrap.setAttribute('class', 'car-wrap');
  wrap.setAttribute('data-n', n);
  wrap.setAttribute('transform', 'translate(' + cx.toFixed(1) + ',' + cy.toFixed(1) + ')');

  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'car-icon');
  g.innerHTML =
    /* rodas */
    '<rect x="-2.5" y="' + R(bh * 0.17) + '" width="5" height="' + R(bh * 0.15) + '" rx="2" fill="#111827" opacity="0.9"/>' +
    '<rect x="' + R(bw - 2.5) + '" y="' + R(bh * 0.17) + '" width="5" height="' + R(bh * 0.15) + '" rx="2" fill="#111827" opacity="0.9"/>' +
    '<rect x="-2.5" y="' + R(bh * 0.67) + '" width="5" height="' + R(bh * 0.15) + '" rx="2" fill="#111827" opacity="0.9"/>' +
    '<rect x="' + R(bw - 2.5) + '" y="' + R(bh * 0.67) + '" width="5" height="' + R(bh * 0.15) + '" rx="2" fill="#111827" opacity="0.9"/>' +
    /* retrovisores */
    '<rect x="' + R(-bw * 0.06) + '" y="' + R(bh * 0.21) + '" width="' + R(bw * 0.09) + '" height="' + R(bh * 0.05) + '" rx="2" fill="#64748b"/>' +
    '<rect x="' + R(bw * 0.97) + '" y="' + R(bh * 0.21) + '" width="' + R(bw * 0.09) + '" height="' + R(bh * 0.05) + '" rx="2" fill="#64748b"/>' +
    /* carroceria */
    '<path d="' + bodyPath + '" fill="url(#carGrad)" stroke="#8fa1b6" stroke-width="1.4"/>' +
    /* faróis dianteiros (amarelos) */
    '<rect x="' + R(bw * 0.14) + '" y="' + R(bh * 0.02) + '" width="' + R(bw * 0.14) + '" height="' + R(bh * 0.045) + '" rx="2" fill="#fde047"/>' +
    '<rect x="' + R(bw * 0.72) + '" y="' + R(bh * 0.02) + '" width="' + R(bw * 0.14) + '" height="' + R(bh * 0.045) + '" rx="2" fill="#fde047"/>' +
    /* lanternas traseiras (vermelhas) */
    '<rect x="' + R(bw * 0.14) + '" y="' + R(bh * 0.935) + '" width="' + R(bw * 0.14) + '" height="' + R(bh * 0.045) + '" rx="2" fill="#e11d48"/>' +
    '<rect x="' + R(bw * 0.72) + '" y="' + R(bh * 0.935) + '" width="' + R(bw * 0.14) + '" height="' + R(bh * 0.045) + '" rx="2" fill="#e11d48"/>' +
    /* para-brisa */
    '<path d="' + glassFront + '" fill="url(#glassGrad)"/>' +
    /* teto */
    '<rect x="' + R(bw * 0.2) + '" y="' + R(bh * 0.31) + '" width="' + R(bw * 0.6) + '" height="' + R(bh * 0.34) + '" rx="' + R(bw * 0.1) + '" fill="#f4f7fa" stroke="#d7dfe8" stroke-width="0.8"/>' +
    /* janelas laterais */
    '<rect x="' + R(bw * 0.07) + '" y="' + R(bh * 0.32) + '" width="' + R(bw * 0.09) + '" height="' + R(bh * 0.3) + '" rx="' + R(bw * 0.045) + '" fill="url(#glassGrad)" opacity="0.85"/>' +
    '<rect x="' + R(bw * 0.84) + '" y="' + R(bh * 0.32) + '" width="' + R(bw * 0.09) + '" height="' + R(bh * 0.3) + '" rx="' + R(bw * 0.045) + '" fill="url(#glassGrad)" opacity="0.85"/>' +
    /* vidro traseiro */
    '<path d="' + glassRear + '" fill="url(#glassGrad)"/>';

  wrap.appendChild(g);
  return wrap;
}

/* ---------- tooltip ---------- */
function bindTooltip(svg) {
  let tip = document.getElementById('mapTooltip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'mapTooltip';
    tip.className = 'map-tooltip';
    document.body.appendChild(tip);
  }
  svg.addEventListener('mousemove', (e) => {
    const rect = e.target && e.target.closest ? e.target.closest('.vaga-svg') : null;
    if (!rect) { tip.classList.remove('show'); return; }
    const n = parseInt(rect.dataset.numero, 10);
    const v = VAGAS.find((q) => q.numero === n);
    const st = v ? v.status : 'LIVRE';
    const pill = st === 'OCUPADA'
      ? 'background:rgba(239,68,68,.15);color:var(--red)'
      : 'background:rgba(34,197,94,.15);color:var(--green)';
    tip.innerHTML =
      '<div class="tt-n">Vaga ' + n + '</div>' +
      '<span class="tt-s" style="' + pill + '">' + (st === 'OCUPADA' ? 'OCUPADA' : 'LIVRE') + '</span>' +
      (st !== 'OCUPADA' ? '<div class="tt-s" style="background:none;padding:0;margin-top:3px">Clique para estacionar</div>' : '');
    tip.classList.add('show');
    tip.style.left = (e.clientX + 14) + 'px';
    tip.style.top = (e.clientY + 14) + 'px';
  });
  svg.addEventListener('mouseleave', () => tip.classList.remove('show'));
}

/* ---------- modal ---------- */
function ensureModal() {
  let ov = document.getElementById('modalOverlay');
  if (ov) return ov;
  ov = document.createElement('div');
  ov.id = 'modalOverlay';
  ov.className = 'modal-overlay';
  ov.setAttribute('aria-hidden', 'true');
  ov.innerHTML =
    '<div class="modal" role="dialog" aria-modal="true">' +
      '<div class="modal-h" id="mHead"></div>' +
      '<div class="modal-b" id="mBody"></div>' +
    '</div>';
  document.body.appendChild(ov);
  ov.addEventListener('click', (e) => { if (e.target === ov) closeModal(); });
  ov.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('#mClose')) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && ov.classList.contains('show')) closeModal(); });
  return ov;
}

function closeModal() {
  const ov = document.getElementById('modalOverlay');
  if (!ov) return;
  ov.classList.remove('show');
  ov.setAttribute('aria-hidden', 'true');
}
window.closeModal = closeModal;

function openModal(v) {
  const ov = ensureModal();
  const head = ov.querySelector('#mHead');
  const body = ov.querySelector('#mBody');
  const ocup = v.status === 'OCUPADA' && v.veiculo;

  head.innerHTML =
    '<div class="vbadge' + (ocup ? ' ocup' : '') + '">' + v.numero + '</div>' +
    '<div><b>Vaga ' + v.numero + '</b><small>· ' + (ocup ? 'OCUPADA' : 'LIVRE') + '</small></div>' +
    '<button class="x" id="mClose" aria-label="Fechar"><i class="fas fa-xmark"></i></button>';

  let html = '';

  if (ocup) {
    const veic = v.veiculo;
    html += '<div class="modal-info">' +
      '<span class="placa">' + (veic.placa || 'SEM PLACA') + '</span><br>' +
      'Modelo: <b>' + (veic.modelo || '-') + '</b>' +
      (veic.valor_final ? '<br>Valor: <b>R$ ' + veic.valor_final + '</b>' : '') +
      '</div>';

    if (veic.meu && !veic.pagamento) {
      html += '<button class="btn btn-primary btn-full" id="ckSolicitar"><i class="fas fa-right-from-bracket"></i> Solicitar saída</button>';
    } else if (veic.meu && veic.pagamento === 'SOLICITADO') {
      html += '<button class="btn btn-primary btn-full" id="ckPagar"><i class="fas fa-credit-card"></i> Pagar R$ ' + (veic.valor_final || '') + '</button>';
    } else if (veic.pagamento === 'PAGO' && readFlags().is_staff) {
      html += '<button class="btn btn-primary btn-full" id="admLiberar"><i class="fas fa-unlock"></i> Liberar saída</button>';
    } else if (veic.pagamento === 'PAGO') {
      html += '<div class="modal-note"><i class="fas fa-circle-check"></i><span>Pagamento confirmado — aguardando liberação.</span></div>';
    } else {
      html += '<div class="modal-note"><i class="fas fa-circle-info"></i><span>Vaga ocupada por outro veículo.</span></div>';
    }
  } else if (document.querySelector('.visitor')) {
    html += '<div class="modal-note"><i class="fas fa-lock"></i><span><a href="/login/">Entre ou crie uma conta</a> para estacionar nesta vaga.</span></div>';
  } else {
    html += '<form id="mForm">' +
      '<div class="field"><label for="mPlaca">Placa (opcional)</label>' +
      '<input id="mPlaca" type="text" maxlength="8" placeholder="ABC-1234" autocomplete="off">' +
      '<div class="plate-hint">Mercosul: <b>ABC-1D23</b> · ou antiga: <b>ABC-1234</b></div></div>' +
      '<div class="field"><label for="mModelo">Modelo</label>' +
      '<input id="mModelo" type="text" maxlength="50" placeholder="Ex: Onix 1.0"></div>' +
      '<div class="field"><label for="mCor">Cor</label>' +
      '<input id="mCor" type="text" maxlength="20" placeholder="Ex: Prata" list="vcCores">' +
      '<datalist id="vcCores">' +
        '<option value="Preto"></option><option value="Branco"></option><option value="Prata"></option>' +
        '<option value="Cinza"></option><option value="Cinza escuro"></option><option value="Vermelho"></option>' +
        '<option value="Azul"></option><option value="Azul claro"></option><option value="Verde"></option>' +
        '<option value="Amarelo"></option><option value="Laranja"></option><option value="Marrom"></option>' +
        '<option value="Bege"></option><option value="Dourado"></option><option value="Vinho"></option>' +
        '<option value="Roxo"></option><option value="Rosa"></option><option value="Grafite"></option>' +
        '<option value="Champagne"></option><option value="Bronze"></option><option value="Creme"></option>' +
      '</datalist></div>' +
      '<button class="btn btn-primary btn-full" type="submit"><i class="fas fa-square-parking"></i> Estacionar na vaga ' + v.numero + '</button>' +
      '</form>';
  }

  body.innerHTML = html;
  ov.classList.add('show');
  ov.setAttribute('aria-hidden', 'false');

  bindModal(v);
}

/* ---------- carga + pintura ---------- */
async function load() {
  const svg = document.getElementById('garagem-svg');
  try {
    if (typeof API === 'undefined') return;
    const d = await API.get('/api/vagas/');
    VAGAS = (d && d.vagas) || [];
    window.VAGAS = VAGAS;

    if (svg) {
      ensureCarDefs(svg);
      svg.querySelectorAll('.vaga-svg').forEach((r) => {
        const n = parseInt(r.dataset.numero, 10);
        const v = VAGAS.find((q) => q.numero === n);

        const old = svg.querySelector('.car-wrap[data-n="' + n + '"]');
        if (old) old.remove();
        r.classList.remove('ocup-glow');
        if (!r.classList.contains('vaga-crowd')) r.style.removeProperty('stroke');

        if (v && v.status === 'OCUPADA') {
          r.classList.add('ocup-glow');
          if (!r.classList.contains('vaga-crowd')) r.style.stroke = 'var(--red)';
          const c = carIcon(r, n);
          if (c) svg.appendChild(c);
        }
      });
    }
  } catch (e) { /* silencioso */ }
}
window.load = load;

/* ---------- clique ---------- */
function bindClicks(svg) {
  if (!svg || svg.dataset.bound) return;
  svg.dataset.bound = '1';
  svg.addEventListener('click', (e) => {
    const el = e.target;
    if (!el) return;
    let n = null;
    const rect = el.closest ? el.closest('.vaga-svg') : null;
    if (rect) n = parseInt(rect.dataset.numero, 10);
    else if (el.classList && el.classList.contains('vn')) n = parseInt(el.textContent, 10);
    if (!n) return;
    const v = VAGAS.find((q) => q.numero === n);
    if (v) openModal(v);
  });
}

/* ---------- ações do modal + VALIDAÇÃO FORTE ---------- */
function bindModal(v) {
  if (!v) return;

  const notify = notifyMsg;
  const safeCloseModal = () => { if (typeof closeModal === 'function') closeModal(); };
  const safeLoad = () => { if (typeof load === 'function') load(); };
  const ensureAPI = () => { if (typeof API === 'undefined') throw new Error('API não carregada.'); };

  const s = document.getElementById('ckSolicitar');
  if (s) s.onclick = async () => {
    s.disabled = true;
    try {
      ensureAPI();
      const veiculoId = v.veiculo && v.veiculo.id;
      if (!veiculoId) throw new Error('Veículo não encontrado.');
      const r = await API.post('/api/checkout/solicitar/' + veiculoId + '/');
      if (!r || !r.success) throw new Error((r && r.error) || 'Erro ao solicitar saída.');
      notify('Saída solicitada — reabra a vaga pra ver o valor.', 'ok');
      safeCloseModal(); safeLoad();
    } catch (e) { s.disabled = false; notify(e.message || 'Erro ao solicitar saída', 'err'); }
  };

  const pg = document.getElementById('ckPagar');
  if (pg) pg.onclick = async () => {
    pg.disabled = true;
    try {
      ensureAPI();
      const veiculoId = v.veiculo && v.veiculo.id;
      if (!veiculoId) throw new Error('Veículo não encontrado.');
      const r = await API.post('/api/checkout/pagar/' + veiculoId + '/');
      if (!r || !r.success) throw new Error((r && r.error) || 'Erro ao confirmar pagamento.');
      notify('Pagamento confirmado! Aguarde a liberação do admin.', 'ok');
      safeCloseModal(); safeLoad();
    } catch (e) { pg.disabled = false; notify(e.message || 'Erro ao confirmar pagamento', 'err'); }
  };

  const ad = document.getElementById('admLiberar');
  if (ad) ad.onclick = async () => {
    ad.disabled = true;
    try {
      ensureAPI();
      const veiculoId = v.veiculo && v.veiculo.id;
      if (!veiculoId) throw new Error('Veículo não encontrado.');
      const r = await API.post('/api/saida/' + veiculoId + '/');
      if (!r || !r.success) throw new Error((r && r.error) || 'Erro ao liberar vaga.');
      notify('Vaga ' + (v.numero || '') + ' liberada!', 'ok');
      safeCloseModal(); safeLoad();
    } catch (e) { ad.disabled = false; notify(e.message || 'Erro ao liberar vaga', 'err'); }
  };

  const f = document.getElementById('mForm');
  if (f) {
    const mp = document.getElementById('mPlaca');
    const mm = document.getElementById('mModelo');
    const mc = document.getElementById('mCor');

    if (mp) mp.oninput = () => { mp.value = window.fmtPlaca(mp.value); };

    f.onsubmit = async (e) => {
      e.preventDefault();
      if (!mp || !mm || !mc) { notify('Formulário incompleto.', 'err'); return; }

      const b = f.querySelector('button');
      const placa = mp.value.trim();
      const modelo = mm.value.trim();
      const cor = mc.value.trim();

      /* PLACA (opcional, estrita) */
      if (placa) {
        const placaLimpa = placa.replace(/[^A-Z0-9]/g, '');
        if (!/^[A-Z]{3}[0-9]{4}$/.test(placaLimpa) && !/^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(placaLimpa)) {
          notify('Placa inválida! Use ABC-1234 ou ABC1D23', 'err'); mp.focus(); return;
        }
      }
      /* MODELO — forte */
      if (!modelo) { notify('Informe o modelo do veículo', 'err'); mm.focus(); return; }
      if (modelo.length < 2 || modelo.length > 50) { notify('Modelo deve ter entre 2 e 50 caracteres', 'err'); mm.focus(); return; }
      if (!MODELO_RE.test(modelo)) { notify('Modelo com caracteres inválidos — use letras, números, espaço ou hífen', 'err'); mm.focus(); return; }
      if (letras(modelo) < 2) { notify('Modelo deve conter letras (ex: Onix, Civic)', 'err'); mm.focus(); return; }
      if (!modeloValido(modelo)) { notify('Modelo inválido — digite um nome de carro válido (ex: Onix, Civic, HB20)', 'err'); mm.focus(); return; }
      /* COR — só cores conhecidas */
      if (!cor) { notify('Informe a cor do veículo', 'err'); mc.focus(); return; }
      if (cor.length < 2 || cor.length > 20) { notify('Cor deve ter entre 2 e 20 caracteres', 'err'); mc.focus(); return; }
      if (!corValida(cor)) { notify('Cor inválida — use uma cor conhecida (ex: Prata, Preto, Cinza escuro)', 'err'); mc.focus(); return; }

      if (!v || !v.id) { notify('Vaga não encontrada.', 'err'); return; }

      if (b) b.disabled = true;
      try {
        ensureAPI();
        const r = await API.post('/api/entrada/', { placa: placa || null, modelo: modelo, cor: cor, vaga_id: v.id });
        if (r && r.success) {
          safeCloseModal();
          notify('Vaga ' + (v.numero || '') + ' ocupada — olha o carro no mapa!', 'ok');
          safeLoad();
        } else {
          throw new Error((r && r.error) || 'Erro ao estacionar');
        }
      } catch (err) {
        if (b) b.disabled = false;
        const msg = err.message || 'Erro ao estacionar';
        if (msg.includes('Placa inválida')) notify('Placa inválida! Use ABC-1234 ou ABC1D23', 'err');
        else notify(msg, 'err');
      }
    };
  }
}

/* ---------- init ---------- */
(function () {
  const boot = () => {
    const svg = document.getElementById('garagem-svg');
    rebuildMap(svg);
    bindClicks(svg);
    bindTooltip(svg);
    load();
    setInterval(load, 10000);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();