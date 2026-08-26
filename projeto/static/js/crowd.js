/* Vaguinha-crowd — avisos colaborativos com sincronização correta */
(function () {
  const svg = document.getElementById('garagem-svg');
  const isGuest = () => !!document.querySelector('.visitor');
  const COR = { LIVRE: '#22c55e', OCUPADA: '#ef4444' };
  let AV = {}, OFICIAL = {};

  function toast(msg, type) {
    const fn = window.vcToast || window.toast;
    if (typeof fn === 'function') return fn(msg, type);
    if (window.console) console.warn(msg);
  }

  /* limpa TUDO e repinta só o que diverge — nunca deixa traço velho */
  function pintarCrowd() {
    if (!svg) return;
    svg.querySelectorAll('.vaga-svg').forEach((r) => {
      const n = +r.dataset.numero;
      const av = AV[n];
      const eye = svg.querySelector('.crowd-eye[data-n="' + n + '"]');

      r.classList.remove('vaga-crowd');
      if (eye) eye.remove();
      if (OFICIAL[n] !== 'OCUPADA') r.style.removeProperty('stroke');

      if (!av) return;

      r.classList.add('vaga-crowd');
      r.style.stroke = COR[av.status] || '#38bdf8';
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('class', 'crowd-eye');
      t.setAttribute('x', (+r.getAttribute('x')) + 8);
      t.setAttribute('y', (+r.getAttribute('y')) + 20);
      t.setAttribute('data-n', n);
      t.textContent = '👥';
      svg.appendChild(t);
    });
  }

  async function carregar() {
    if (!svg || typeof API === 'undefined') return;
    try {
      const d = await API.get('/api/vagas/');
      OFICIAL = {}; AV = {}; window.VAGAS_ID = {};
      (d.vagas || []).forEach((v) => {
        OFICIAL[v.numero] = v.status;
        window.VAGAS_ID[v.numero] = v.id;
        if (v.aviso) AV[v.numero] = v.aviso;   // só divergentes vêm do backend
      });
      pintarCrowd();
    } catch (e) { /* silencioso */ }
  }

  function numDoModal() {
    const b = document.querySelector('#mHead b');
    return b ? parseInt(b.textContent.replace(/\D/g, ''), 10) : null;
  }

  async function injetarCrowd() {
    const body = document.getElementById('mBody');
    if (!body) return;
    if (body.querySelector('.crowd-box')) return;
    const n = numDoModal();
    if (!n) return;

    const av = AV[n], oficial = OFICIAL[n];
    const box = document.createElement('div');
    box.className = 'crowd-box';

    let html = '<div class="ct"><i class="fas fa-users"></i> Comunidade</div>';
    html += av
      ? '<div class="crowd-now">👥 <b>' + av.usuario + '</b> avisou como <b style="color:' + (COR[av.status] || '#fff') + '">' + av.status + '</b> há ' + av.min + ' min' + (oficial && av.status !== oficial ? ' <em>(difere do sistema)</em>' : '') + '</div>'
      : '<div class="crowd-now" style="opacity:.7">Nenhum aviso recente. Viu algo? Avise a galera 👇</div>';

    if (isGuest()) {
      html += '<div class="crowd-login"><i class="fas fa-lock"></i> <a href="/login/">Entre</a> para avisar a comunidade.</div>';
    } else {
      html += '<div class="crowd-btns">' +
        '<button class="oc" data-st="OCUPADA"><i class="fas fa-car"></i> Está ocupada</button>' +
        '<button class="lv" data-st="LIVRE"><i class="fas fa-square-parking"></i> Está livre</button></div>';
    }

    box.innerHTML = html;
    body.appendChild(box);

    box.querySelectorAll('.crowd-btns button').forEach((btn) => {
      btn.onclick = async () => {
        btn.disabled = true;
        try {
          if (typeof API === 'undefined') throw new Error('API não carregada.');
          const vid = (window.VAGAS_ID || {})[n];
          const r = await API.post('/api/aviso/', { vaga_id: vid, status: btn.dataset.st });
          if (!r || !r.success) throw new Error((r && r.error) || 'erro');
          toast('Aviso enviado à comunidade! 👥', 'ok');
          await carregar();                       // ← atualiza o mapa NA HORA
          const bb = body.querySelector('.crowd-box');
          if (bb) bb.remove();
          injetarCrowd();
        } catch (e) {
          btn.disabled = false;
          toast((e && e.message) || 'Não foi possível avisar.', 'err');
        }
      };
    });
  }

  /* observa o modal abrir */
  const obs = new MutationObserver(() => {
    const m = document.getElementById('modalOverlay');
    if (m && m.classList.contains('show')) injetarCrowd();
  });
  function startObs() {
    const m = document.getElementById('modalOverlay');
    if (m) {
      obs.observe(m, { attributes: true, attributeFilter: ['class'] });
      obs.observe(document.getElementById('mBody') || m, { childList: true, subtree: true });
    } else setTimeout(startObs, 300);
  }

  carregar();
  setInterval(carregar, 8000);   // sincroniza mais rápido
  startObs();
})();