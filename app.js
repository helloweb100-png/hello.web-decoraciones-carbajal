/* ==========================================================================
   CADSA DECORACIONES CARBAJAL · app.js
   JavaScript nativo, sin librerías.

   Arquitectura de movimiento:
   · Un solo bucle requestAnimationFrame (el "ticker") lee scrollY una vez por
     cuadro y alimenta las "escenas". No se usa addEventListener('scroll').
   · Cada escena solo se actualiza mientras su sección está en pantalla
     (IntersectionObserver) y solo anima transform / opacity / clip-path.
   · prefers-reduced-motion apaga bucles, parallax y suavizado.
   ========================================================================== */
(() => {
  'use strict';

  /* ======================================================================
     CONFIGURACIÓN: lo único que normalmente hay que editar
     ====================================================================== */
  const CONFIG = {
    whatsapp: '5219541204137',       // Número con código de país, sin "+" ni espacios (ej. 5212223334444)
    phoneLabel: '+52 954 120 4137',  // Cómo se muestra el teléfono en pantalla
    messages: {
      header:    'Hola CADSA Decoraciones, quiero cotizar para mi casa.',
      hero:      'Hola CADSA Decoraciones, quiero mi cotización. Me interesa vestir mi casa.',
      persianas: 'Hola, quiero cotizar persianas para mi casa.',
      cortinas:  'Hola, quiero cotizar cortinas para mi casa.',
      cojines:   'Hola, quiero cotizar cojines para mi casa.',
      sillas:    'Hola, quiero cotizar sillas para mi casa.',
      camastros: 'Hola, quiero cotizar camastros para mi espacio.',
      sombra:    'Hola, quiero cotizar malla sombra para mi espacio.',
      empezar:   'Hola, estoy listo para empezar. Quiero platicar sobre lo que necesito para mi casa.',
      proyecto:  'Hola, vi sus proyectos y quiero un espacio así. ¿Me ayudan a cotizarlo?',
      contacto:  'Hola CADSA Decoraciones, me gustaría recibir información.',
      idea:      'Hola, tengo una idea para renovar mi espacio y quiero contársela.',
      band:      'Hola, quiero empezar mi proyecto. ¿Me pueden orientar?',
      telas:     'Hola, vi en su página que son distribuidores de Sunbrella y otras marcas. Quiero ver las telas disponibles para mi proyecto.',
      telasfin:  'Hola, vi las telas en su página y quiero elegir la mía. ¿Me pueden orientar?',
      float:     'Hola CADSA Decoraciones, vengo de su página web y quiero cotizar.'
    }
  };

  /* ======================================================================
     Utilidades
     ====================================================================== */
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeIO = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const waUrl = text => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;
  const hasIO = 'IntersectionObserver' in window;

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) window.scrollTo(0, 0);

  /* ======================================================================
     1. Enlaces de WhatsApp, teléfono y año
     ====================================================================== */
  $$('[data-wa]').forEach(a => {
    const key = a.dataset.wa;
    if (key === 'lightbox') return;      // el visor arma su propio mensaje
    a.href = waUrl(CONFIG.messages[key] || CONFIG.messages.contacto);
    a.target = '_blank';
    a.rel = 'noopener';
  });
  $$('[data-phone-text]').forEach(n => { n.textContent = CONFIG.phoneLabel; });
  $$('[data-year]').forEach(n => { n.textContent = new Date().getFullYear(); });

  /* ======================================================================
     2. Titulares partidos en palabras (máscara) y manifiesto (iluminado)
     ====================================================================== */
  function splitWords(el, mode) {
    let idx = 0;
    const walk = node => {
      Array.from(node.childNodes).forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            if (mode === 'mask') {
              const w = document.createElement('span'); w.className = 'w';
              const wi = document.createElement('span'); wi.className = 'wi';
              wi.style.setProperty('--wi', idx++); wi.textContent = part;
              w.appendChild(wi); frag.appendChild(w);
            } else {
              const s = document.createElement('span'); s.className = 'mw'; s.textContent = part; idx++;
              frag.appendChild(s);
            }
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
    return idx;
  }
  $$('[data-split]').forEach(el => splitWords(el, 'mask'));
  const mfText = $('[data-words]');
  const mfWords = mfText ? (splitWords(mfText, 'fade'), $$('.mw', mfText)) : [];

  /* ======================================================================
     3. Revelado al entrar en pantalla
     ====================================================================== */
  const revealEls = $$('[data-reveal], .split');
  if (hasIO && !reduce) {
    const rio = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); rio.unobserve(e.target); }
      });
    }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(el => rio.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-in'));
  }

  /* ======================================================================
     4. Escenas de scroll: un solo ticker
     ====================================================================== */
  const scenes = [];
  const sceneByEl = new Map();
  const sceneIO = hasIO ? new IntersectionObserver(entries => {
    entries.forEach(e => { const s = sceneByEl.get(e.target); if (s) s.active = e.isIntersecting; });
  }, { rootMargin: '120px 0px' }) : null;

  function addScene(el, update, init) {
    if (!el) return null;
    const s = { el, update, active: !hasIO, init };
    scenes.push(s); sceneByEl.set(el, s);
    if (sceneIO) sceneIO.observe(el);
    return s;
  }

  const view = { y: 0, vh: innerHeight, vw: innerWidth, vy: 0, t: 0, dt: 0.016 };
  const smooth = reduce ? 1 : 0.1;       // inercia del scroll (más bajo = más lento)

  /* ---------- 4.1 Barra de progreso + header ---------- */
  const header = $('.site-header');
  const progress = $('.hd-progress i');
  let lastY = window.scrollY, menuOpen = false;

  /* ---------- 4.2 Banda (único marquee) ---------- */
  const bandTrack = $('.band-track');
  let bandX = 0, bandHalf = 0;
  addScene($('.band'), v => {
    const speed = 70 + v.vy * .22;
    bandX -= speed * v.dt;
    if (bandX <= -bandHalf) bandX += bandHalf;
    if (bandX > 0) bandX -= bandHalf;
    bandTrack.style.transform = `translate3d(${bandX}px,0,0)`;
  });

  /* ---------- 4.3 Manifiesto ---------- */
  const mf = $('.manifesto');
  const mfA = $('.mf-img-a'), mfB = $('.mf-img-b');
  let mfCur = 0;
  const mfLast = new Float32Array(mfWords.length).fill(-1);
  addScene(mf, v => {
    const r = mf.getBoundingClientRect();
    const target = clamp(-r.top / Math.max(1, r.height - v.vh));
    mfCur = lerp(mfCur, target, smooth);
    const k = clamp((mfCur - .04) / .8);
    const n = mfWords.length;
    for (let i = 0; i < n; i++) {
      const o = .16 + .84 * clamp((k * (n + 5) - i) / 5);
      if (Math.abs(o - mfLast[i]) > .012) { mfWords[i].style.opacity = o.toFixed(3); mfLast[i] = o; }
    }
    if (mfA && !reduce) mfA.style.transform = `translate3d(0,${(-mfCur * 110).toFixed(1)}px,0) rotate(${(mfCur * 4).toFixed(2)}deg)`;
    if (mfB && !reduce) mfB.style.transform = `translate3d(0,${(mfCur * 80).toFixed(1)}px,0) rotate(${(-mfCur * 3).toFixed(2)}deg)`;
  });

  /* ---------- 4.4 Productos: recorrido horizontal fijado ---------- */
  const prSec = $('.products');
  const prPin = $('.pr-pin');
  const prTrack = $('.pr-track');
  const prCards = $$('.pr-intro, .pcard, .pcard-end', prTrack);
  let prRange = 0, prCur = 0, prTop = 0;
  const prBar = prSec ? $('.pr-bar i', prSec) : null;
  const prGeo = [];

  function measureProducts() {
    if (!prSec) return;
    prTrack.style.transform = 'none';
    const vw = innerWidth, vh = innerHeight;
    prRange = Math.max(0, prTrack.scrollWidth - vw);
    prSec.style.setProperty('--pr-h', (prRange + vh) + 'px');
    prGeo.length = 0;
    prCards.forEach(c => prGeo.push({ el: c, mid: c.offsetLeft + c.offsetWidth / 2, media: $('.pcard-media img, .pcard-media video', c) }));
    prTop = prSec.getBoundingClientRect().top + window.scrollY;
  }
  addScene(prSec, v => {
    const r = prSec.getBoundingClientRect();
    const target = prRange ? clamp(-r.top / prRange) : 0;
    prCur = lerp(prCur, target, smooth);
    const x = -prCur * prRange;
    prTrack.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
    if (prBar) prBar.parentElement.style.setProperty('--pp', prCur.toFixed(4));
    if (!reduce) {
      for (let i = 0; i < prGeo.length; i++) {
        const g = prGeo[i];
        if (!g.media) continue;
        const d = (g.mid + x - v.vw / 2) / v.vw;           // -1 .. 1 respecto al centro de la pantalla
        g.media.style.setProperty('--px', (d * -64).toFixed(1) + 'px');
      }
    }
  });
  if (prPin) {
    // Si el navegador intenta desplazar el contenedor horizontalmente (foco por teclado), lo devolvemos y movemos el scroll vertical.
    prPin.addEventListener('scroll', () => { if (prPin.scrollLeft) prPin.scrollLeft = 0; });
    prTrack.addEventListener('focusin', e => {
      const card = e.target.closest('.pr-intro, .pcard, .pcard-end');
      if (!card || !prRange) return;
      const left = card.offsetLeft - parseFloat(getComputedStyle(prTrack).paddingLeft);
      const p = clamp(left / prRange);
      window.scrollTo({ top: prTop + p * prRange, behavior: 'auto' });
    });
  }

  /* ---------- 4.5 Imagen que se abre ---------- */
  const ex = $('.expand');
  const exCopy = $('.ex-copy');
  let exCur = 0;
  addScene(ex, v => {
    const r = ex.getBoundingClientRect();
    const target = clamp(-r.top / Math.max(1, r.height - v.vh));
    exCur = lerp(exCur, target, smooth);
    const mobile = v.vw < 760;
    const cy0 = mobile ? 26 : 19, cx0 = mobile ? 12 : 29;
    const e = easeIO(clamp(exCur / .6));
    ex.style.setProperty('--cy', (cy0 * (1 - e)).toFixed(2) + '%');
    ex.style.setProperty('--cx', (cx0 * (1 - e)).toFixed(2) + '%');
    ex.style.setProperty('--cr', (26 * (1 - e)).toFixed(1) + 'px');
    ex.style.setProperty('--is', (1.28 - .28 * e).toFixed(3));
    ex.style.setProperty('--gs', (1 + e * .5).toFixed(3));
    ex.style.setProperty('--vo', clamp((exCur - .42) / .3).toFixed(3));
    const co = clamp((exCur - .6) / .25);
    ex.style.setProperty('--co', co.toFixed(3));
    exCopy.classList.toggle('is-on', co > .6);
  });

  /* ---------- 4.6 Proceso ---------- */
  const proc = $('.proc-steps');
  const procLine = $('.proc-line');
  const steps = $$('[data-step]');
  let lpCur = 0;
  addScene(proc, v => {
    const r = proc.getBoundingClientRect();
    const target = clamp((v.vh * .62 - r.top) / Math.max(1, r.height - 110));
    lpCur = lerp(lpCur, target, smooth);
    procLine.style.setProperty('--lp', lpCur.toFixed(4));
    steps.forEach(s => s.classList.toggle('on', s.getBoundingClientRect().top < v.vh * .66));
  });

  /* ---------- 4.7 Parallax suave de imágenes marcadas ---------- */
  $$('[data-speed]').forEach(el => {
    const sp = parseFloat(el.dataset.speed) || 0;
    if (reduce) return;
    addScene(el.parentElement || el, v => {
      const r = el.getBoundingClientRect();
      const off = r.top + r.height / 2 - v.vh / 2;
      el.style.transform = `translate3d(0,${(-off * sp).toFixed(1)}px,0)`;
    });
  });

  /* ---------- 4.8 Footer: palabra gigante ---------- */
  const footer = $('.footer');
  addScene(footer, v => {
    const r = footer.getBoundingClientRect();
    const p = clamp((v.vh - r.top) / Math.max(1, r.height));
    footer.style.setProperty('--fy', ((1 - p) * 30).toFixed(1) + '%');
  });

  /* ---------- 4.9 Hero ---------- */
  const hero = $('#inicio');
  const heroGrid = $('.hero-grid');
  const heroGlow = hero ? $('.hero-glow') : null;
  const canvas = $('.hero-canvas');
  const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  const ptr = { x: .7, y: .35, tx: .7, ty: .35, inside: false };

  // PRNG determinista: el lienzo se ve igual en cada visita
  const rng = (a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; })(20260);
  let W = 0, H = 0, ribbons = [], motes = [], tClock = 0;
  const palette = [
    [60, 182, 176],   // turquesa
    [166, 221, 216],  // turquesa suave
    [232, 112, 58],   // terracota (acento)
    [234, 242, 241]   // lino
  ];

  function buildCanvas() {
    if (!canvas || !ctx) return;
    const mobile = innerWidth < 760;
    const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.6);
    W = hero.clientWidth; H = hero.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = mobile ? 5 : 8;
    ribbons = Array.from({ length: n }, (_, i) => {
      const col = palette[i % 4 === 2 ? 2 : i % 2 === 0 ? 0 : 1];
      const g = ctx.createLinearGradient(0, 0, W, 0);
      const a = i % 4 === 2 ? .16 : .13;
      g.addColorStop(0, `rgba(${col},0)`);
      g.addColorStop(.25, `rgba(${col},${a})`);
      g.addColorStop(.7, `rgba(${col},${a * .6})`);
      g.addColorStop(1, `rgba(${col},0)`);
      return {
        base: .1 + (i / (n - 1)) * .8,
        a1: H * (.045 + rng() * .05), f1: (1.1 + rng() * 1.3) * Math.PI * 2 / W, s1: .18 + rng() * .26, p1: rng() * 6.28,
        a2: H * (.02 + rng() * .03), f2: (2.4 + rng() * 2) * Math.PI * 2 / W, s2: .22 + rng() * .3, p2: rng() * 6.28,
        th: H * (.03 + rng() * .05), f3: (.8 + rng() * 1.4) * Math.PI * 2 / W, s3: .15 + rng() * .25,
        g, edge: `rgba(${col},${i % 4 === 2 ? .5 : .32})`
      };
    });
    const m = mobile ? 34 : 72;
    motes = Array.from({ length: m }, () => ({
      x: rng() * W, y: rng() * H, r: .6 + rng() * 1.8, v: 6 + rng() * 16, ph: rng() * 6.28, tw: .5 + rng() * 1.4,
      warm: rng() > .82
    }));
  }

  function drawCanvas(dt) {
    if (!ctx || !W) return;
    tClock += dt;
    const t = reduce ? 4 : tClock;
    ctx.clearRect(0, 0, W, H);
    const step = W < 760 ? 20 : 12;
    const cols = Math.ceil(W / step) + 2;
    const mx = ptr.x * W, my = ptr.y;
    ctx.lineWidth = 1.2;

    for (const r of ribbons) {
      const top = new Float32Array(cols), bot = new Float32Array(cols);
      for (let i = 0; i < cols; i++) {
        const x = i * step;
        let y = r.base * H + Math.sin(x * r.f1 + t * r.s1 + r.p1) * r.a1 + Math.sin(x * r.f2 - t * r.s2 + r.p2) * r.a2;
        if (ptr.inside) {
          const d = (x - mx) / 200;
          y += Math.exp(-d * d) * (my - .5) * 70;
        }
        top[i] = y;
        bot[i] = y + r.th * (.55 + .45 * Math.sin(x * r.f3 + t * r.s3));
      }
      ctx.beginPath();
      ctx.moveTo(0, top[0]);
      for (let i = 1; i < cols; i++) ctx.lineTo(i * step, top[i]);
      for (let i = cols - 1; i >= 0; i--) ctx.lineTo(i * step, bot[i]);
      ctx.closePath();
      ctx.fillStyle = r.g;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, top[0]);
      for (let i = 1; i < cols; i++) ctx.lineTo(i * step, top[i]);
      ctx.strokeStyle = r.edge;
      ctx.stroke();
    }

    for (const m of motes) {
      if (!reduce) {
        m.y -= m.v * dt; m.x += Math.sin(t * .35 + m.ph) * 9 * dt;
        if (m.y < -8) { m.y = H + 8; m.x = rng() * W; }
      }
      const a = .22 + .38 * (.5 + .5 * Math.sin(t * m.tw + m.ph));
      ctx.fillStyle = m.warm ? `rgba(232,112,58,${a})` : `rgba(234,242,241,${a * .8})`;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.2832); ctx.fill();
    }
  }

  if (hero) {
    if (finePointer) {
      hero.addEventListener('pointermove', e => {
        const r = hero.getBoundingClientRect();
        ptr.tx = (e.clientX - r.left) / r.width; ptr.ty = (e.clientY - r.top) / r.height; ptr.inside = true;
      });
      hero.addEventListener('pointerleave', () => { ptr.inside = false; });
    }
    addScene(hero, v => {
      ptr.x = lerp(ptr.x, ptr.tx, .06); ptr.y = lerp(ptr.y, ptr.ty, .06);
      if (!reduce) drawCanvas(v.dt);
      if (heroGlow && finePointer) {
        heroGlow.style.setProperty('--gx', (ptr.x * 100).toFixed(1) + '%');
        heroGlow.style.setProperty('--gy', (ptr.y * 100).toFixed(1) + '%');
      }
      if (!reduce && heroGrid) {
        const p = clamp(v.y / v.vh);
        heroGrid.style.transform = `translate3d(0,${(p * 70).toFixed(1)}px,0)`;
        heroGrid.style.opacity = (1 - p * 1.15).toFixed(3);
      }
    });
    buildCanvas();
    if (reduce) drawCanvas(0);
  }

  /* ---------- Bucle principal ---------- */
  let lastT = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - lastT) / 1000) || .016;
    lastT = now;
    const y = window.scrollY;
    view.dt = dt; view.t = now / 1000; view.y = y;
    view.vy = lerp(view.vy, (y - lastY) / Math.max(dt, .001), .1);

    if (y !== lastY || view.vh !== innerHeight) {
      const max = Math.max(1, root.scrollHeight - innerHeight);
      progress.parentElement.style.setProperty('--sp', clamp(y / max).toFixed(4));
      if (!menuOpen) {
        if (y > 240 && y > lastY + 5) header.classList.add('is-hidden');
        else if (y < lastY - 5 || y < 120) header.classList.remove('is-hidden');
      }
    }
    lastY = y;

    for (let i = 0; i < scenes.length; i++) {
      const s = scenes[i];
      if (s.active) s.update(view);
    }
  }

  /* ======================================================================
     5. Medidas dependientes del viewport
     ====================================================================== */
  function measureAll() {
    view.vh = innerHeight; view.vw = innerWidth;
    bandHalf = bandTrack ? bandTrack.scrollWidth / 2 : 0;
    measureProducts();
    buildCanvas();
    sizeRotator();
    if (reduce && ctx) drawCanvas(0);
  }
  let rzT;
  addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(measureAll, 160); });
  addEventListener('load', () => setTimeout(measureAll, 60));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setTimeout(measureAll, 30));

  /* ======================================================================
     6. Palabra rotatoria del hero
     ====================================================================== */
  const rot = $('.rot');
  const rotTrack = $('.rot-track');
  const rotWords = rotTrack ? $$('em', rotTrack) : [];
  let rotI = 0, rotW = [];
  function sizeRotator() {
    if (!rot) return;
    rotW = rotWords.map(w => w.offsetWidth);
    rot.style.width = rotW[rotI] + 'px';
  }
  function startRotator() {
    if (!rot || reduce || rotWords.length < 2) return;
    setInterval(() => {
      if (document.hidden) return;
      rotI = (rotI + 1) % rotWords.length;
      rotTrack.style.transform = `translateY(-${rotI * 1.22}em)`;
      rot.style.width = rotW[rotI] + 'px';
    }, 2600);
  }

  /* ======================================================================
     7. Header: tema según sección, menú móvil
     ====================================================================== */
  let themeIO;
  function watchTheme() {
    if (!hasIO) return;
    if (themeIO) themeIO.disconnect();
    const h = innerHeight;
    themeIO = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) header.dataset.on = e.target.dataset.theme === 'light' ? 'light' : 'dark';
      });
    }, { rootMargin: `-44px 0px ${-(h - 47)}px 0px` });
    $$('[data-theme]').forEach(s => themeIO.observe(s));
  }
  watchTheme();
  addEventListener('resize', () => { clearTimeout(watchTheme._t); watchTheme._t = setTimeout(watchTheme, 200); });

  const burger = $('.burger');
  const menu = $('#menu');
  function setMenu(open) {
    menuOpen = open;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    menu.classList.toggle('is-open', open);
    if (open) menu.removeAttribute('inert'); else menu.setAttribute('inert', '');
    root.style.overflow = open ? 'hidden' : '';
    if (open) header.classList.remove('is-hidden');
  }
  burger.addEventListener('click', () => setMenu(!menuOpen));
  menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && menuOpen) setMenu(false); });
  matchMedia('(min-width: 900px)').addEventListener('change', e => { if (e.matches && menuOpen) setMenu(false); });

  /* ======================================================================
     8. Botones magnéticos (solo puntero fino)
     ====================================================================== */
  if (finePointer && !reduce) {
    $$('[data-magnetic]').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        const dx = clamp((e.clientX - (r.left + r.width / 2)) * .22, -10, 10);
        const dy = clamp((e.clientY - (r.top + r.height / 2)) * .3, -8, 8);
        b.style.setProperty('--mx', dx.toFixed(1) + 'px'); b.style.setProperty('--my', dy.toFixed(1) + 'px');
      });
      b.addEventListener('pointerleave', () => { b.style.setProperty('--mx', '0px'); b.style.setProperty('--my', '0px'); });
    });
  }

  /* ======================================================================
     9. Contador animado
     ====================================================================== */
  $$('[data-count]').forEach(el => {
    const end = parseInt(el.dataset.count, 10) || 0;
    const run = () => {
      if (reduce) { el.textContent = end; return; }
      const t0 = performance.now(), dur = 1800;
      const tick = now => {
        const p = clamp((now - t0) / dur);
        el.textContent = Math.round(end * (1 - Math.pow(1 - p, 4)));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if (!hasIO) { el.textContent = end; return; }
    const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { run(); io.disconnect(); } }, { threshold: .5 });
    io.observe(el);
  });

  /* ======================================================================
     10. Videos: reproducir solo cuando se ven
     ====================================================================== */
  if (hasIO && !reduce) {
    const vio = new IntersectionObserver(es => es.forEach(e => {
      const v = e.target;
      if (e.isIntersecting) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } else v.pause();
    }), { threshold: .35 });
    $$('video[data-autoplay]').forEach(v => vio.observe(v));
  }

  /* ======================================================================
     11. Galería: filtros y visor
     ====================================================================== */
  const chips = $$('.chip');
  const items = $$('.gi');
  let activeFilter = 'todo';
  chips.forEach(c => c.addEventListener('click', () => {
    activeFilter = c.dataset.filter;
    chips.forEach(x => { const on = x === c; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', String(on)); });
    let n = 0;
    items.forEach(li => {
      const show = activeFilter === 'todo' || li.dataset.cat === activeFilter;
      li.classList.toggle('is-out', !show);
      li.classList.remove('gi-enter');
      if (show) {
        li.classList.add('is-in');
        li.style.setProperty('--i', n++ % 8);
        void li.offsetWidth;                      // reinicia la animación
        li.classList.add('gi-enter');
      }
    });
  }));

  const lb = $('#lightbox');
  const lbImg = $('.lb-img', lb);
  const lbCap = $('.lb-cap', lb);
  const lbCta = $('.lb-cta', lb);
  let lbList = [], lbIndex = 0, lbOpener = null;
  const visibleItems = () => items.filter(li => !li.classList.contains('is-out'));

  function lbShow(i) {
    lbIndex = (i + lbList.length) % lbList.length;
    const img = $('img', lbList[lbIndex]);
    lbImg.classList.remove('is-in');
    const next = new Image();
    next.onload = () => { lbImg.src = next.src; lbImg.alt = img.alt; requestAnimationFrame(() => lbImg.classList.add('is-in')); };
    next.src = img.dataset.full || img.src;
    lbCap.textContent = img.alt;
    lbCta.href = waUrl(`Hola, vi en su página este proyecto: "${img.alt}". Quiero algo así en mi casa. ¿Me ayudan a cotizarlo?`);
    lbCta.target = '_blank'; lbCta.rel = 'noopener';
    // precarga vecinos
    [lbIndex + 1, lbIndex - 1].forEach(j => {
      const k = (j + lbList.length) % lbList.length; const im = $('img', lbList[k]); const pre = new Image(); pre.src = im.dataset.full || im.src;
    });
  }
  function lbOpen(li) {
    lbList = visibleItems();
    lbOpener = $('.gitem', li);
    if (typeof lb.showModal === 'function') lb.showModal(); else lb.setAttribute('open', '');
    root.style.overflow = 'hidden';
    lbShow(lbList.indexOf(li));
  }
  function lbClose() { if (lb.open) lb.close(); }
  items.forEach(li => $('.gitem', li).addEventListener('click', () => lbOpen(li)));
  $('.lb-x', lb).addEventListener('click', lbClose);
  $('.lb-prev', lb).addEventListener('click', () => lbShow(lbIndex - 1));
  $('.lb-next', lb).addEventListener('click', () => lbShow(lbIndex + 1));
  lb.addEventListener('close', () => { if (!menuOpen) root.style.overflow = ''; if (lbOpener) lbOpener.focus({ preventScroll: true }); });
  lb.addEventListener('click', e => { if (e.target.classList.contains('lb-inner') || e.target === lb) lbClose(); });
  lbCta.addEventListener('click', () => setTimeout(lbClose, 150));
  addEventListener('keydown', e => {
    if (!lb.open) return;
    if (e.key === 'ArrowRight') lbShow(lbIndex + 1);
    if (e.key === 'ArrowLeft') lbShow(lbIndex - 1);
  });
  let sx = null;
  lb.addEventListener('pointerdown', e => { sx = e.clientX; });
  lb.addEventListener('pointerup', e => {
    if (sx === null) return;
    const dx = e.clientX - sx; sx = null;
    if (Math.abs(dx) > 60) lbShow(lbIndex + (dx < 0 ? 1 : -1));
  });

  /* ======================================================================
     11b. Telas: carrusel y visor de muestrarios
     ====================================================================== */
  const fbRail = $('.fb-rail');
  if (fbRail) {
    const fb = fbRail.closest('.fabrics');
    const fbBar = $('.fb-bar', fb), fbPrev = $('.fb-prev', fb), fbNext = $('.fb-next', fb);
    const fbCount = $('[data-count]', fb);
    if (fbCount && hasIO && !reduce) fbCount.textContent = '0';   // el contador sube hasta 1000 al entrar en pantalla

    const fbUpdate = () => {
      const max = fbRail.scrollWidth - fbRail.clientWidth;
      fbBar.style.setProperty('--tp', (max > 0 ? (fbRail.scrollLeft + fbRail.clientWidth) / fbRail.scrollWidth : 1).toFixed(4));
      fbPrev.disabled = fbRail.scrollLeft < 8;
      fbNext.disabled = fbRail.scrollLeft > max - 8;
    };
    const fbStep = dir => fbRail.scrollBy({ left: dir * Math.max(260, fbRail.clientWidth * .6), behavior: reduce ? 'auto' : 'smooth' });
    fbRail.addEventListener('scroll', fbUpdate, { passive: true });
    fbPrev.addEventListener('click', () => fbStep(-1));
    fbNext.addEventListener('click', () => fbStep(1));
    addEventListener('resize', fbUpdate);
    addEventListener('load', fbUpdate);
    fbUpdate();

    // Visor: mismo estilo que el de la galería, con su propio <dialog> para no mezclar las listas
    const tl = $('#tl-viewer');
    const tlImg = $('.lb-img', tl), tlCap = $('.lb-cap', tl), tlCta = $('.lb-cta', tl);
    const tlBtns = $$('.fb-open', fbRail);
    let tlIndex = 0, tlOpener = null;

    function tlShow(i) {
      const n = tlBtns.length;
      const idx = tlIndex = (i + n) % n;
      const btn = tlBtns[idx], img = $('img', btn), name = btn.dataset.name;
      tlImg.classList.remove('is-in');
      const next = new Image();
      next.onload = () => { if (idx !== tlIndex) return; tlImg.src = next.src; tlImg.alt = img.alt; requestAnimationFrame(() => tlImg.classList.add('is-in')); };
      next.src = img.dataset.full || img.src;
      tlCap.textContent = `${name} · ${$('.fb-cap span', btn.closest('li')).textContent}`;
      tlCta.href = waUrl(`Hola, vi en su página el muestrario ${name} y quiero cotizar con estas telas. ¿Me orientan?`);
      tlCta.target = '_blank'; tlCta.rel = 'noopener';
      [idx + 1, idx - 1].forEach(j => { const pre = new Image(); const im = $('img', tlBtns[(j + n) % n]); pre.src = im.dataset.full || im.src; });
    }
    function tlOpen(i) {
      tlOpener = tlBtns[i];
      if (typeof tl.showModal === 'function') tl.showModal(); else tl.setAttribute('open', '');
      root.style.overflow = 'hidden';
      tlShow(i);
    }
    const tlClose = () => { if (tl.open) tl.close(); };
    tlBtns.forEach((b, i) => b.addEventListener('click', () => tlOpen(i)));
    $('.lb-x', tl).addEventListener('click', tlClose);
    $('.lb-prev', tl).addEventListener('click', () => tlShow(tlIndex - 1));
    $('.lb-next', tl).addEventListener('click', () => tlShow(tlIndex + 1));
    tl.addEventListener('close', () => { if (!menuOpen) root.style.overflow = ''; if (tlOpener) tlOpener.focus({ preventScroll: true }); });
    tl.addEventListener('click', e => { if (e.target.classList.contains('lb-inner') || e.target === tl) tlClose(); });
    tlCta.addEventListener('click', () => setTimeout(tlClose, 150));
    addEventListener('keydown', e => {
      if (!tl.open) return;
      if (e.key === 'ArrowRight') tlShow(tlIndex + 1);
      if (e.key === 'ArrowLeft') tlShow(tlIndex - 1);
    });
    let tsx = null;
    tl.addEventListener('pointerdown', e => { tsx = e.clientX; });
    tl.addEventListener('pointerup', e => {
      if (tsx === null) return;
      const dx = e.clientX - tsx; tsx = null;
      if (Math.abs(dx) > 60) tlShow(tlIndex + (dx < 0 ? 1 : -1));
    });
  }

  /* ======================================================================
     12. FAQ
     ====================================================================== */
  $$('.acc-q').forEach(q => q.addEventListener('click', () => {
    const item = q.closest('.acc-item');
    const open = q.getAttribute('aria-expanded') === 'true';
    $$('.acc-q').forEach(o => { o.setAttribute('aria-expanded', 'false'); o.closest('.acc-item').classList.remove('is-open'); });
    if (!open) { q.setAttribute('aria-expanded', 'true'); item.classList.add('is-open'); }
  }));

  /* ======================================================================
     13. Formulario → WhatsApp
     ====================================================================== */
  const form = $('#wa-form');
  const fields = {
    name: $('#f-name'), phone: $('#f-phone'), interest: $('#f-interest'), msg: $('#f-msg')
  };
  const setErr = (input, text) => {
    const wrap = input.closest('.field');
    const out = $('.err', wrap);
    if (out) out.textContent = text || '';
    wrap.classList.toggle('has-err', !!text);
    input.setAttribute('aria-invalid', text ? 'true' : 'false');
  };
  Object.values(fields).forEach(f => f.addEventListener('input', () => setErr(f, '')));
  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = fields.name.value.trim();
    const phone = fields.phone.value.trim();
    const interest = fields.interest.value;
    const msg = fields.msg.value.trim();
    let first = null, bad = false;
    const fail = (input, text) => { setErr(input, text); bad = true; if (!first) first = input; };
    if (name.length < 2) fail(fields.name, 'Escribe tu nombre para poder atenderte.'); else setErr(fields.name, '');
    if (phone && !/^[\d\s()+\-.]{7,20}$/.test(phone)) fail(fields.phone, 'Revisa el teléfono: usa solo números, espacios o guiones.'); else setErr(fields.phone, '');
    if (!interest) fail(fields.interest, 'Elige qué quieres cotizar.'); else setErr(fields.interest, '');
    if (bad) { first.focus(); return; }

    const lines = [`Hola CADSA Decoraciones, soy ${name}.`, `Quiero cotizar: ${interest}.`];
    if (msg) lines.push(`Detalles: ${msg}`);
    if (phone) lines.push(`Mi teléfono: ${phone}`);
    $('#form-ok').hidden = false;
    window.open(waUrl(lines.join('\n')), '_blank', 'noopener');
  });

  /* ======================================================================
     14. Botón flotante: etiqueta temporal
     ====================================================================== */
  const waFloat = $('.wa-float');

  /* ======================================================================
     15. Loader → entrada
     ====================================================================== */
  const loader = $('#loader');
  function boot() {
    measureAll();
    requestAnimationFrame(frame);
  }
  function finishLoader() {
    root.classList.add('is-ready');
    startRotator();
    setTimeout(() => { if (waFloat) { waFloat.classList.add('show-tip'); setTimeout(() => waFloat.classList.remove('show-tip'), 5200); } }, 6500);
    if (location.hash) setTimeout(() => { const t = document.querySelector(location.hash); if (t) t.scrollIntoView(); }, 60);
  }

  if (!loader) {
    root.classList.add('is-ready'); boot(); startRotator();
  } else {
    const countEl = $('.ld-count', loader);
    const line = $('.ld-line', loader);
    const MIN = reduce ? 500 : 2400;
    const t0 = performance.now();
    let assetsDone = false, shown = 0, finished = false;

    const critical = $$('.hero-cols .hcol .hset:first-child img').slice(0, 9).map(img => (img.decode ? img.decode().catch(() => {}) : Promise.resolve()));
    const fonts = document.fonts && document.fonts.ready ? document.fonts.ready.catch(() => {}) : Promise.resolve();
    Promise.all([...critical, fonts]).then(() => { assetsDone = true; });
    setTimeout(() => { assetsDone = true; }, 5500);

    boot();                                       // el ticker ya corre debajo del telón

    const end = () => {
      if (finished) return; finished = true;
      loader.classList.add('ld-done');
      loader.setAttribute('aria-hidden', 'true');
      setTimeout(finishLoader, 380);
      setTimeout(() => loader.remove(), 1900);
    };
    const step = now => {
      const time = clamp((now - t0) / MIN);
      const cap = assetsDone ? 1 : .92;
      const goal = Math.min(easeIO(time), cap);
      shown = lerp(shown, goal, .14);
      const pct = Math.round(shown * 100);
      countEl.textContent = pct;
      line.style.setProperty('--p', shown.toFixed(3));
      if (shown > .995 && assetsDone && time >= 1) { countEl.textContent = 100; line.style.setProperty('--p', 1); setTimeout(end, 260); return; }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    setTimeout(end, 9000);                        // red de seguridad: nunca dejar al usuario atrapado
  }
})();
