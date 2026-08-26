/* Vaga Conectada — núcleo (tema + relógio + contadores + drawer + menu + toasts + prefs) */

window.vcToast = function(msg, type){
  type = type || 'info';

  if (!document.body) return;

  let w = document.getElementById('toastWrap');
  if(!w){
    w = document.createElement('div');
    w.id = 'toastWrap';
    w.className = 'toast-wrap';
    document.body.appendChild(w);
  }

  const ic = type === 'ok' ? 'fa-circle-check' : type === 'err' ? 'fa-circle-exclamation' : 'fa-circle-info';
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.innerHTML = '<i class="fas ' + ic + '"></i><span>' + msg + '</span>';
  w.appendChild(t);

  setTimeout(()=>{
    t.style.opacity='0';
    t.style.transform='translateX(20px)';
    t.style.transition='.3s';
    setTimeout(()=>t.remove(),300);
  }, 3400);
};

if (typeof window.toast !== 'function') {
  window.toast = window.vcToast;
}

const App = {
  init(){
    this.applyPrefs();
    this.theme();
    this.clock();
    this.counters();
    this.authTabs();
    this.sidebar();
    this.userMenu();
    this.reveal();

    if (typeof Auth !== 'undefined' && Auth && typeof Auth.init === 'function') {
      Auth.init();
    }
  },

  applyPrefs(){
    try{
      const compact =
        localStorage.getItem('vc-density-compact') === '1' ||
        localStorage.getItem('vc-density') === 'compact';

      if (document.body) {
        document.body.classList.toggle('density-compact', compact);
      }
    }catch(e){}
  },

  theme(){
    const btn = document.getElementById('themeBtn');

    try{
      const saved = localStorage.getItem('vc-theme');
      if (saved === 'light' || saved === 'dark') {
        document.documentElement.setAttribute('data-theme', saved);
      }
    }catch(e){}

    const cur = () => document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const paint = () => {
      if (btn) btn.innerHTML = '<i class="fas ' + (cur() === 'light' ? 'fa-moon' : 'fa-sun') + '"></i>';
    };

    paint();

    if (btn) btn.addEventListener('click', () => {
      const next = cur() === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);

      try {
        localStorage.setItem('vc-theme', next);
      } catch(e){}

      paint();
      document.dispatchEvent(new CustomEvent('themechange', {detail: next}));
    });
  },

  clock(){
    const el = document.getElementById('clock');
    if(!el) return;

    const tick = () => el.textContent = new Date().toLocaleTimeString('pt-BR');
    tick();
    setInterval(tick, 1000);
  },

  counters(){
    document.querySelectorAll('[data-count]').forEach(el => {
      const target = parseInt(el.dataset.count, 10) || 0;
      const dur = 900;
      const t0 = performance.now();

      const step = now => {
        const p = Math.min((now - t0) / dur, 1);
        el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * target);
        if (p < 1) requestAnimationFrame(step);
      };

      requestAnimationFrame(step);
    });
  },

  authTabs(){
    const go = mode => {
      document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === mode));
      document.querySelectorAll('[data-panel]').forEach(p => p.classList.toggle('on', p.dataset.panel === mode));
    };

    document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => go(b.dataset.tab)));
    document.querySelectorAll('[data-goto]').forEach(a => a.addEventListener('click', e => {
      e.preventDefault();
      go(a.dataset.goto);
    }));
  },

  sidebar(){
    const app = document.getElementById('app');
    if(!app) return;

    const btn  = document.getElementById('menuBtn');
    const side = app.querySelector('.sidebar');

    let ov = document.getElementById('sideOverlay');
    if (!ov){
      ov = document.createElement('div');
      ov.id = 'sideOverlay';
      ov.className = 'side-overlay';
      app.appendChild(ov);
    }

    const open  = () => { app.classList.add('open'); document.body.style.overflow='hidden'; };
    const close = () => { app.classList.remove('open'); document.body.style.overflow=''; };
    const isMobile = () => window.innerWidth <= 980;

    if (btn) btn.addEventListener('click', () => app.classList.contains('open') ? close() : open());
    ov.addEventListener('click', close);

    if (side) side.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      if (isMobile()) close();
    }));

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && app.classList.contains('open')) close();
    });

    window.addEventListener('resize', () => {
      if (!isMobile()) close();
    });
  },

  userMenu(){
    const wrap = document.querySelector('.user-wrap');
    if(!wrap) return;

    const btn = wrap.querySelector('.user-trigger');
    const toggle = () => wrap.classList.toggle('open');

    if (btn) btn.addEventListener('click', e => {
      e.stopPropagation();
      toggle();
    });

    document.addEventListener('click', e => {
      if (!wrap.contains(e.target)) wrap.classList.remove('open');
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') wrap.classList.remove('open');
    });
  },

  reveal(){
    const els = document.querySelectorAll('.reveal');

    if (!('IntersectionObserver' in window)){
      els.forEach(e => e.classList.add('in'));
      return;
    }

    const io = new IntersectionObserver(es => es.forEach(en => {
      if (en.isIntersecting){
        en.target.classList.add('in');
        io.unobserve(en.target);
      }
    }), {threshold:.12});

    els.forEach(e => io.observe(e));

    setTimeout(() => els.forEach(e => e.classList.add('in')), 1200);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  App.init();
}

/* Densidade compacta: toggle funcional + persistência */
(function(){
  const KEY = 'vc-density-compact';

  function apply(){
    try{
      const on =
        localStorage.getItem(KEY) === '1' ||
        localStorage.getItem('vc-density') === 'compact';

      if (document.body) {
        document.body.classList.toggle('density-compact', on);
      }

      const tog = document.getElementById('densityToggle');
      if (tog) tog.classList.toggle('on', on);
    }catch(e){}
  }

  function init(){
    apply();

    const tog = document.getElementById('densityToggle');
    if(!tog) return;

    tog.addEventListener('click', () => {
      try{
        const cur =
          localStorage.getItem(KEY) === '1' ||
          localStorage.getItem('vc-density') === 'compact';

        localStorage.setItem(KEY, cur ? '0' : '1');
      }catch(e){}

      apply();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();