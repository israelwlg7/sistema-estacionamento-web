/* Comunidade — chat ao vivo + avisos, ORDEM CRONOLÓGICA (nova embaixo),
merge incremental (sem re-render), auto-scroll pro fim. */

(function(){
  function init(){
    const fab = document.getElementById('muralFab');
    const drawer = document.getElementById('muralDrawer');
    const back = document.getElementById('muralBack');
    const x = document.getElementById('muralX');
    const feed = document.getElementById('muralFeed');
    const formWrap = document.getElementById('muralForm');
    const badge = document.getElementById('muralBadge');

    if(!fab || !drawer || !feed) return;

    const notify = (msg, type) => {
      const fn = window.vcToast || window.toast;
      if (typeof fn === 'function') return fn(msg, type);
      if (window.console) console.warn(msg);
    };

    const isGuest = () => !!document.querySelector('.visitor');
    const ME = ((document.querySelector('.user-trigger .who') || {}).textContent || '').trim();

    const rendered = new Set();
    let firstLoad = true;
    let open = false;
    let loading = false;

    try {
      if (localStorage.getItem('vc-mural') === '0') fab.style.display = 'none';
    } catch(e){}

    const hSmall = drawer.querySelector('.mural-h small');
    const hBig   = drawer.querySelector('.mural-h b');

    if (hSmall) hSmall.textContent = 'Converse e avise o estado das vagas';
    if (hBig)   hBig.textContent   = 'Comunidade';

    function showBadge(n){
      if(!badge) return;
      badge.textContent = n > 9 ? '9+' : n;
      badge.style.display = 'grid';
    }

    function hideBadge(){
      if(badge) badge.style.display = 'none';
    }

    function openM(){
      open = true;
      drawer.classList.add('show');
      if(back) back.classList.add('show');
      drawer.setAttribute('aria-hidden','false');
      hideBadge();
      scrollBottom();
    }

    function closeM(){
      open = false;
      drawer.classList.remove('show');
      if(back) back.classList.remove('show');
      drawer.setAttribute('aria-hidden','true');
    }

    fab.addEventListener('click', openM);
    if(x) x.addEventListener('click', closeM);
    if(back) back.addEventListener('click', closeM);

    document.addEventListener('keydown', e => {
      if(e.key === 'Escape' && open) closeM();
    });

    const esc = s => (s || '').replace(/[&<>"]/g, c => ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;'
    }[c]));

    const time = m => {
      const n = Number(m) || 0;
      return n < 1 ? 'agora' : 'há ' + n + ' min';
    };

    const nodeFromHTML = h => {
      const t = document.createElement('template');
      t.innerHTML = h.trim();
      return t.content.firstChild;
    };

    function chatNode(m, animate){
      const mine = m.usuario === ME;

      const el = nodeFromHTML(
        '<div class="msg chat' + (mine ? ' mine' : '') + '">' +
          '<div class="m-av">' + esc(m.inicial) + '</div>' +
          '<div class="m-body">' +
            '<div class="m-top">' +
              '<span class="m-name">' + esc(m.usuario) + '</span>' +
              '<span class="m-time">' + time(m.min) + '</span>' +
            '</div>' +
            '<div class="m-text">' + esc(m.texto) + '</div>' +
          '</div>' +
        '</div>'
      );

      if(!animate) el.style.animation = 'none';
      return el;
    }

    function avisoNode(a, animate){
      const cls = a.status === 'OCUPADA' ? 'oc' : 'lv';
      const txt = a.status === 'OCUPADA' ? 'ocupada' : 'livre';

      const el = nodeFromHTML(
        '<div class="msg aviso">' +
          '<div class="m-av"><i class="fas fa-square-parking"></i></div>' +
          '<div class="m-body">' +
            '<div class="m-top">' +
              '<span class="m-name">' + esc(a.usuario) + '</span>' +
              '<span class="m-time">' + time(a.min) + '</span>' +
            '</div>' +
            '<div class="m-text">' +
              'Avisou: <span class="vtag">vaga ' + esc(String(a.vaga)) + '</span> (' + esc(a.setor) + ') ' +
              '<span class="st ' + cls + '">' + txt + '</span>' +
            '</div>' +
          '</div>' +
        '</div>'
      );

      if(!animate) el.style.animation = 'none';
      return el;
    }

    function emptyNode(){
      return nodeFromHTML(
        '<div class="mural-empty" id="muralEmpty">' +
          '<i class="fas fa-comments"></i>' +
          'Nada por aqui ainda.<br>Mande um oi ou avise uma vaga!' +
        '</div>'
      );
    }

    function ensureNoEmpty(){
      const e = feed.querySelector('#muralEmpty');
      if(e) e.remove();
    }

    function append(kind, data, animate){
      ensureNoEmpty();
      feed.appendChild(kind === 'chat' ? chatNode(data, animate) : avisoNode(data, animate));
    }

    function renderForm(){
      if(!formWrap) return;

      if (isGuest()){
        formWrap.innerHTML =
          '<div class="mf-lock">' +
            '<i class="fas fa-lock"></i> ' +
            '<a href="/login/">Entre</a> para conversar e avisar a comunidade.' +
          '</div>';
        return;
      }

      formWrap.innerHTML =
        '<div class="mf-chat">' +
          '<textarea id="mfTexto" maxlength="280" rows="1" placeholder="Converse com a comunidade…"></textarea>' +
          '<button class="send" id="mfSend" aria-label="Enviar"><i class="fas fa-paper-plane"></i></button>' +
        '</div>' +
        '<div class="mf-div">ou avise o estado de uma vaga</div>' +
        '<div class="mf-vaga-row">' +
          '<span class="mf-lbl">Vaga</span>' +
          '<input type="text" id="mfVaga" maxlength="2" inputmode="numeric" placeholder="1–18">' +
        '</div>' +
        '<div class="mf-btns">' +
          '<button class="oc" data-st="OCUPADA"><i class="fas fa-car"></i> Tá ocupada</button>' +
          '<button class="lv" data-st="LIVRE"><i class="fas fa-square-parking"></i> Tá livre</button>' +
        '</div>';

      const ta = document.getElementById('mfTexto');
      if(ta){
        ta.addEventListener('input', () => {
          ta.style.height = 'auto';
          ta.style.height = Math.min(110, ta.scrollHeight) + 'px';
        });

        ta.addEventListener('keydown', e => {
          if(e.key === 'Enter' && !e.shiftKey){
            e.preventDefault();
            enviarChat();
          }
        });
      }

      const send = document.getElementById('mfSend');
      if(send) send.addEventListener('click', enviarChat);

      const inp = document.getElementById('mfVaga');
      if(inp){
        inp.addEventListener('input', () => {
          inp.value = inp.value.replace(/\D/g,'').slice(0,2);
        });
      }

      formWrap.querySelectorAll('.mf-btns button').forEach(b => {
        b.onclick = async () => {
          if(!inp) return;

          const n = parseInt(inp.value, 10);
          if(!n){
            notify('Digite o número da vaga (1–18).', 'err');
            inp.focus();
            return;
          }

          b.disabled = true;

          try{
            if (typeof API === 'undefined') throw new Error('API não carregada.');

            const d = await API.get('/api/vagas/');
            const v = ((d && d.vagas) || []).find(x => x.numero === n);

            if(!v) throw new Error('Vaga ' + n + ' não existe.');

            const r = await API.post('/api/aviso/', {
              vaga_id: v.id,
              status: b.dataset.st
            });

            if(!r || !r.success) throw new Error((r && r.error) || 'erro');

            notify('Aviso enviado: vaga ' + n + ' ' + b.dataset.st.toLowerCase() + ' 👥', 'ok');
            inp.value = '';
            load();
          }catch(e){
            notify((e && e.message) || 'Não foi possível avisar.', 'err');
          }finally{
            b.disabled = false;
          }
        };
      });
    }

    let sending = false;

    async function enviarChat(){
      const ta = document.getElementById('mfTexto');
      if(!ta) return;

      const texto = ta.value.trim();
      if(!texto || sending) return;

      sending = true;
      const btn = document.getElementById('mfSend');
      if(btn) btn.disabled = true;

      try{
        if (typeof API === 'undefined') throw new Error('API não carregada.');

        const r = await API.post('/api/chat/', { texto });

        if(!r || !r.success) throw new Error((r && r.error) || 'erro');

        ta.value = '';
        ta.style.height = 'auto';
        load();
      }catch(e){
        notify((e && e.message) || 'Não foi possível enviar.', 'err');
      }finally{
        sending = false;
        if(btn) btn.disabled = false;
        ta.focus();
      }
    }

    async function load(){
      if(loading) return;
      loading = true;

      try{
        if (typeof API === 'undefined') return;

        const [av, ch] = await Promise.all([
          API.get('/api/avisos/'),
          API.get('/api/chat/')
        ]);

        const avisos = (av && av.avisos) || [];
        const msgs = (ch && ch.msgs) || [];

        const mix = avisos.map(a => ({k:'aviso', key:'a' + a.id, min:a.min, d:a}))
          .concat(msgs.map(m => ({k:'chat', key:'m' + m.id, min:m.min, d:m})))
          .sort((p,q) => q.min - p.min);

        const novos = mix.filter(it => !rendered.has(it.key));

        if (firstLoad){
          feed.innerHTML = '';
          rendered.clear();

          if(!mix.length){
            feed.appendChild(emptyNode());
          } else {
            mix.forEach(it => {
              append(it.k, it.d, false);
              rendered.add(it.key);
            });
          }

          firstLoad = false;
          scrollBottom();
        } else {
          if(novos.length){
            novos.sort((p,q) => q.min - p.min).forEach(it => {
              append(it.k, it.d, true);
              rendered.add(it.key);
            });

            scrollBottom();
          }

          if(!open && novos.length){
            showBadge(novos.length);
          }
        }
      }catch(e){
        // Mantém o comportamento silencioso original.
      }finally{
        loading = false;
      }
    }

    function scrollBottom() {
      feed.scrollTop = feed.scrollHeight;
    }

    renderForm();
    load();
    setInterval(load, 8000);

    fab.addEventListener('click', () => {
      hideBadge();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();