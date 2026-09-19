(function () {
  const G = (typeof window !== 'undefined' ? window : globalThis);
  const S = G.SHIFT = G.SHIFT || {};
  const A = S.arcade = S.arcade || {};

  const AR = n => String(n).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);
  A.AR = AR;

  A.PAL = {
    ink: 0x0b1f2e, white: 0xffffff,
    sky: 0x1e78e0, skyLow: 0x53a6ff, standDark: 0x2b2f4a, stand: 0x3a4066,
    grass: 0x2f9e4f, grassAlt: 0x37b05a, line: 0xffffff,
    good: 0x2fbf71, bad: 0xe5484d, sun: 0xf7c443, plate: 0xffffff,
    crowd: [0xf7c443, 0xff7a59, 0x5ad1ff, 0xc084fc, 0xffffff, 0x9be15d, 0xff5fa2],
  };

  const PHASER_SRC = 'vendor/phaser-4.2.1.iife.js';
  const pending = {};
   
  A.script = function (src) {
    if (pending[src]) return pending[src];
    pending[src] = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = () => res(src);
      s.onerror = () => { delete pending[src]; rej(new Error('تعذّر تحميل ' + src)); };
      document.head.appendChild(s);
    });
    return pending[src];
  };
  A.load = function () {
    if (G.Phaser) return Promise.resolve(G.Phaser);
    return A.script(PHASER_SRC).then(() => {
      if (!G.Phaser) throw new Error('المحرّك حُمِّل ولم يُعرَّف');
      return G.Phaser;
    });
  };
   
  A.SEASON_FILES = ['arcade/season-gulf-2026.js'];
  A.loadSeason = function () {
    return Promise.all(A.SEASON_FILES.map(f => A.script(f).catch(() => null))).then(() => A.season || null);
  };

  const LEVEL_KEY = 'shift.arcade.level.v1';
  A.LEVELS = {
    easy: { id: 'easy', name: 'سهل',   period: 2.7, minPeriod: 2.0, reach: 0.13, react: 0.12, secs: 20, flight: 500 },
    mid:  { id: 'mid',  name: 'متوسط', period: 2.0, minPeriod: 1.45, reach: 0.17, react: 0.32, secs: 18, flight: 440 },
    hard: { id: 'hard', name: 'صعب',   period: 1.5, minPeriod: 1.05, reach: 0.21, react: 0.55, secs: 15, flight: 380 },
  };
  A.level = {
    get() { try { return A.LEVELS[localStorage.getItem(LEVEL_KEY)] || null; } catch (e) { return null; } },
    set(id) {
      try { localStorage.setItem(LEVEL_KEY, id); }
      catch (e) { console.warn('SHIFT: تعذّر حفظ درجة الصعوبة —', e && e.message); }    
      return A.LEVELS[id] || A.LEVELS.mid;
    },
  };

  A.frame = function (el) {
    el.classList.add('is-arcade');
     
    const gp = el.closest('.gp'); if (gp) gp.classList.add('gp-arcade');
    el.innerHTML =
      '<h2 class="gw-q ar-q" id="arQ"></h2>' +
      '<div class="ar-timer" id="arTimer" hidden><i></i></div>' +
      '<div class="ar-host" id="arHost"><div class="ar-mount" id="arMount"></div>' +
        '<div class="ar-sheet" id="arSheet" hidden></div></div>';
    return {
      q: el.querySelector('#arQ'), timer: el.querySelector('#arTimer'),
      host: el.querySelector('#arHost'), mount: el.querySelector('#arMount'), sheet: el.querySelector('#arSheet'),
    };
  };

  A.boot = function (mount, opts) {
    const P = G.Phaser;
    const game = new P.Game({
      type: P.AUTO,
      parent: mount,
      backgroundColor: opts.bg || '#1e78e0',
      scale: { mode: P.Scale.RESIZE, width: '100%', height: '100%', autoCenter: P.Scale.NO_CENTER, expandParent: false },
      render: { antialias: true, roundPixels: false, pixelArt: false },
      fps: { target: 60, forceSetTimeOut: false },
      input: { keyboard: true, mouse: true, touch: true, activePointers: 2 },
      audio: { noAudio: true },         
      banner: false,
      scene: opts.scenes,
      callbacks: opts.callbacks || {},
    });
    return {
      game,
      destroy() { try { game.destroy(true); } catch (e) { console.warn('SHIFT: تعذّر إنهاء محرّك الأركيد —', e && e.message); } },
    };
  };

  A.input = function (scene, h) {
    const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter', 'Spacebar'];
    let down = null;
    const onDown = p => { down = { x: p.x, y: p.y, t: Date.now() }; if (h.onDown) h.onDown(p.x, p.y); };
    const onUp = p => {
      if (!down) return;
      const d = Math.hypot(p.x - down.x, p.y - down.y), dt = Date.now() - down.t;
      down = null;
       
      if (h.onTap && (d < 40 || dt < 900 || h.dragIsTap)) h.onTap(p.x, p.y, d);
    };
    const onMove = p => { if (h.onMove) h.onMove(p.x, p.y, !!down); };
    scene.input.on('pointerdown', onDown);
    scene.input.on('pointerup', onUp);
    scene.input.on('pointermove', onMove);
    const onKey = e => {
      if (keys.indexOf(e.key) < 0) return;
       
      const a = document.activeElement;
      if (a && (a.tagName === 'BUTTON' || a.tagName === 'A' || a.tagName === 'INPUT')) return;
      e.preventDefault();
      if (h.onKey) h.onKey(e.key === 'Spacebar' ? ' ' : e.key);
    };
    window.addEventListener('keydown', onKey);
    return {
      off() {
        scene.input.off('pointerdown', onDown); scene.input.off('pointerup', onUp); scene.input.off('pointermove', onMove);
        window.removeEventListener('keydown', onKey);
      },
    };
  };

  A.feel = {
     
    hitstop(scene, ms, scale) {
      const k = (scale == null ? 0.06 : scale);
      scene.slow = k; scene.tweens.timeScale = k; scene.time.timeScale = k;
      clearTimeout(scene.__hs);
      scene.__hs = setTimeout(() => { scene.slow = 1; if (scene.tweens) scene.tweens.timeScale = 1; if (scene.time) scene.time.timeScale = 1; }, ms || 90);
    },
    shake(scene, ms, k) { scene.cameras.main.shake(ms || 180, k == null ? 0.006 : k); },
    flash(scene, ms, rgb) { const c = rgb || [255, 255, 255]; scene.cameras.main.flash(ms || 110, c[0], c[1], c[2]); },
     
    squash(scene, obj, sx, sy, ms) {
      scene.tweens.killTweensOf(obj);
      const bx = obj.scaleX, by = obj.scaleY;           
      obj.setScale(bx * sx, by * sy);
      return scene.tweens.add({ targets: obj, scaleX: bx, scaleY: by, duration: ms || 260, ease: 'Back.easeOut' });
    },
     
    ensureTex(scene) {
      if (scene.textures.exists('ar-dot')) return;
      const g = scene.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xffffff, 1); g.fillCircle(8, 8, 8); g.generateTexture('ar-dot', 16, 16);
      g.clear(); g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 12, 18); g.generateTexture('ar-bit', 12, 18);
      g.destroy();
    },
    burst(scene, x, y, colors, n, opt) {
      A.feel.ensureTex(scene);
      const o = opt || {};
      const em = scene.add.particles(x, y, o.tex || 'ar-bit', {
        speed: { min: o.vmin || 220, max: o.vmax || 520 },
        angle: { min: o.a0 == null ? 200 : o.a0, max: o.a1 == null ? 340 : o.a1 },
        gravityY: o.g == null ? 900 : o.g,
        lifespan: { min: 700, max: 1300 },
        scale: { start: o.s || 1, end: 0.2 },
        rotate: { min: 0, max: 360 },
        alpha: { start: 1, end: 0.6 },
        tint: colors && colors.length ? colors : [0xffffff],
        emitting: false,
      });
      em.setDepth(o.depth == null ? 50 : o.depth);
      em.explode(n || 40);
      scene.time.delayedCall(1600, () => em.destroy());
      return em;
    },
     
    pop(scene, x, y, text, style) {
       
      const t = scene.add.text(x, y, text, Object.assign({
        fontFamily: A.FONT_DISPLAY, fontSize: '64px', color: '#ffffff', stroke: '#0b1f2e', strokeThickness: 10,
        align: 'center', rtl: true, wordWrap: { width: Math.max(120, scene.scale.width * 0.9), useAdvancedWrap: true },
      }, style || {})).setOrigin(0.5).setDepth(60).setScale(0.6);
      scene.tweens.add({ targets: t, scale: 1, duration: 260, ease: 'Back.easeOut' });
      scene.tweens.add({ targets: t, y: y - 70, alpha: 0, delay: 650, duration: 520, ease: 'Sine.easeIn', onComplete: () => t.destroy() });
      return t;
    },
  };
   
  A.FONT_DISPLAY = "'Baloo Sea','Baloo Bhaijaan 2',system-ui,sans-serif";
  A.FONT_TEXT = "'Readex Sea','Readex Pro',system-ui,sans-serif";

  A.onFonts = function (scene, fn) {
    if (!document.fonts || !document.fonts.ready) return;
    document.fonts.ready.then(() => { if (scene.sys && scene.sys.isActive && scene.sys.isActive()) fn(); }).catch(() => {});
  };

  A.doll = function (scene, x, y, o) {
    const h = o.h || 150, u = h / 460;                     
    const kit = o.kit || ['#1e63c9', '#ffffff'];
    const c1 = P2H(kit[0]), c2 = P2H(kit[1]);
    const skin = o.skin == null ? 0xf1c39b : o.skin;
    const INK = A.PAL.ink;
    const C = scene.add.container(x, y);
    const legL = scene.add.rectangle(-38 * u, -160 * u, 44 * u, 170 * u, o.shorts == null ? c2 : o.shorts).setOrigin(0.5, 0.06).setStrokeStyle(4 * u, INK);
    const legR = scene.add.rectangle(38 * u, -160 * u, 44 * u, 170 * u, o.shorts == null ? c2 : o.shorts).setOrigin(0.5, 0.06).setStrokeStyle(4 * u, INK);
    const bootL = scene.add.ellipse(-38 * u, -8 * u, 70 * u, 34 * u, INK);
    const bootR = scene.add.ellipse(38 * u, -8 * u, 70 * u, 34 * u, INK);
    const body = scene.add.rectangle(0, -260 * u, 150 * u, 190 * u, c1).setStrokeStyle(4 * u, INK);
    const stripe = scene.add.rectangle(0, -260 * u, 44 * u, 190 * u, c2);
    const armL = scene.add.rectangle(-84 * u, -330 * u, 40 * u, 150 * u, c1).setOrigin(0.5, 0.08).setStrokeStyle(4 * u, INK);
    const armR = scene.add.rectangle(84 * u, -330 * u, 40 * u, 150 * u, c1).setOrigin(0.5, 0.08).setStrokeStyle(4 * u, INK);
    const handL = scene.add.circle(-84 * u, -190 * u, 24 * u, skin).setStrokeStyle(3 * u, INK);
    const handR = scene.add.circle(84 * u, -190 * u, 24 * u, skin).setStrokeStyle(3 * u, INK);
    const head = scene.add.circle(0, -400 * u, 62 * u, skin).setStrokeStyle(4 * u, INK);
    const hair = scene.add.ellipse(0, -438 * u, 118 * u, 52 * u, o.hair == null ? 0x2b1b12 : o.hair);
    const eyeL = scene.add.circle(-22 * u, -402 * u, 7 * u, INK);
    const eyeR = scene.add.circle(22 * u, -402 * u, 7 * u, INK);
    const mouth = scene.add.ellipse(0, -372 * u, 30 * u, 12 * u, INK);
     
    const parts = { legL, legR, bootL, bootR, body, stripe, armL, armR, handL, handR, head, hair, eyeL, eyeR, mouth };
    C.add([legL, legR, bootL, bootR, body, stripe, armL, armR, handL, handR, head, hair, eyeL, eyeR, mouth]);
    C.setDepth(o.depth == null ? 10 : o.depth);
    let anims = [];
    const stop = () => { anims.forEach(t => t.stop()); anims = []; };
    const sync = () => {
      const L = 150 * u;
      handL.x = armL.x + Math.sin(armL.rotation) * -L * 0.92; handL.y = armL.y + Math.cos(armL.rotation) * L * 0.92;
      handR.x = armR.x + Math.sin(armR.rotation) * -L * 0.92; handR.y = armR.y + Math.cos(armR.rotation) * L * 0.92;
      bootL.x = legL.x + Math.sin(legL.rotation) * -170 * u * 0.92; bootL.y = legL.y + Math.cos(legL.rotation) * 170 * u * 0.92;
      bootR.x = legR.x + Math.sin(legR.rotation) * -170 * u * 0.92; bootR.y = legR.y + Math.cos(legR.rotation) * 170 * u * 0.92;
    };
    const reset = () => {
      [armL, armR, legL, legR].forEach(p => { p.rotation = 0; });
      body.y = stripe.y = -260 * u; head.y = -400 * u; hair.y = -438 * u; eyeL.y = eyeR.y = -402 * u; mouth.y = -372 * u;
      mouth.scaleX = mouth.scaleY = 1; C.rotation = 0; C.scaleX = C.scaleY = 1;
      sync();
    };
    const D = {
      c: C, parts, u, sync, reset,
      idle() {
        stop(); reset();
        anims.push(scene.tweens.add({ targets: [body, stripe], y: '-=6', duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
        anims.push(scene.tweens.add({ targets: [head, hair, eyeL, eyeR, mouth], y: '-=5', duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
        anims.push(scene.tweens.add({ targets: armL, rotation: 0.18, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', onUpdate: sync }));
        anims.push(scene.tweens.add({ targets: armR, rotation: -0.18, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
        return D;
      },
       
      ready() {
        stop(); reset();
        armL.rotation = 1.9; armR.rotation = -1.9; sync();
        anims.push(scene.tweens.add({ targets: [body, stripe, head, hair, eyeL, eyeR, mouth], y: '+=8', duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', onUpdate: sync }));
        return D;
      },
      run(ms) {
        stop(); reset();
        const T = 160;
        anims.push(scene.tweens.add({ targets: legL, rotation: 0.9, duration: T, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', onUpdate: sync }));
        anims.push(scene.tweens.add({ targets: legR, rotation: -0.9, duration: T, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
        anims.push(scene.tweens.add({ targets: armL, rotation: -1.0, duration: T, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
        anims.push(scene.tweens.add({ targets: armR, rotation: 1.0, duration: T, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
        if (ms) scene.time.delayedCall(ms, () => D.kick());
        return D;
      },
      kick() {
        stop(); reset();
        legR.rotation = 0.9; armL.rotation = -1.2; armR.rotation = 0.6; sync();
        anims.push(scene.tweens.add({ targets: legR, rotation: -1.5, duration: 140, ease: 'Quad.easeIn', onUpdate: sync,
          onComplete: () => { anims.push(scene.tweens.add({ targets: legR, rotation: 0, duration: 420, delay: 160, ease: 'Sine.easeOut', onUpdate: sync })); } }));
        anims.push(scene.tweens.add({ targets: C, rotation: -0.12, duration: 140, yoyo: true, ease: 'Quad.easeOut' }));
        return D;
      },
      joy() {
        stop(); reset();
        anims.push(scene.tweens.add({ targets: [armL], rotation: 2.8, duration: 200, ease: 'Back.easeOut', onUpdate: sync }));
        anims.push(scene.tweens.add({ targets: [armR], rotation: -2.8, duration: 200, ease: 'Back.easeOut' }));
        anims.push(scene.tweens.add({ targets: C, y: C.y - 70 * (h / 150), duration: 260, yoyo: true, repeat: 2, ease: 'Quad.easeOut' }));
        anims.push(scene.tweens.add({ targets: mouth, scaleX: 1.8, scaleY: 1.6, duration: 180 }));
        return D;
      },
      miss() {
        stop(); reset();
        anims.push(scene.tweens.add({ targets: [head, hair, eyeL, eyeR, mouth], y: '+=26', duration: 320, ease: 'Sine.easeOut' }));
        anims.push(scene.tweens.add({ targets: armL, rotation: 0.45, duration: 320, ease: 'Sine.easeOut', onUpdate: sync }));
        anims.push(scene.tweens.add({ targets: armR, rotation: -0.45, duration: 320, ease: 'Sine.easeOut' }));
        anims.push(scene.tweens.add({ targets: mouth, scaleX: 0.6, duration: 200 }));
         
        anims.push(scene.tweens.add({ targets: [head, hair, eyeL, eyeR, mouth], x: '+=10', duration: 110, yoyo: true, repeat: 3, delay: 300, ease: 'Sine.easeInOut' }));
        return D;
      },
       
      dive(dir, dx, ms) {
        stop(); reset();
        armL.rotation = 2.6 * -dir; armR.rotation = 2.6 * -dir; sync();
        anims.push(scene.tweens.add({ targets: C, x: C.x + dx, rotation: 1.25 * dir, duration: ms || 320, ease: 'Quad.easeOut',
          onComplete: () => { anims.push(scene.tweens.add({ targets: C, rotation: 0, duration: 380, delay: 350, ease: 'Sine.easeInOut' })); } }));
        return D;
      },
      destroy() { stop(); C.destroy(); },
    };
    reset();
    return D;
  };
   
  function P2H(s) { return typeof s === 'number' ? s : parseInt(String(s).replace('#', ''), 16); }
  A.hex = P2H;

  A.sheets = {
    manifest: {}, ready: {},
    register(id, spec) { A.sheets.manifest[id] = spec; },
    preload(scene) {
      Object.keys(A.sheets.manifest).forEach(id => {
        const s = A.sheets.manifest[id];
        scene.load.spritesheet('sheet-' + id, s.url, { frameWidth: s.fw || 512, frameHeight: s.fh || 512 });
      });
      scene.load.on('loaderror', f => { console.warn('SHIFT: شريط حركة لم يصل —', f && f.key); });
    },
    build(scene) {
      Object.keys(A.sheets.manifest).forEach(id => {
        if (!scene.textures.exists('sheet-' + id)) return;
        const s = A.sheets.manifest[id];
        Object.keys(s.anims || {}).forEach(k => {
          const r = s.anims[k];
          if (!scene.anims.exists(id + '-' + k))
            scene.anims.create({ key: id + '-' + k, frames: scene.anims.generateFrameNumbers('sheet-' + id, { start: r[0], end: r[1] }), frameRate: r[2] || 12, repeat: r[3] == null ? -1 : r[3] });
        });
        A.sheets.ready[id] = true;
      });
    },
    has: id => !!A.sheets.ready[id],
  };

  const LEAGUE_KEY = 'shift.arcade.league.v1';
  A.seasonActive = function () {
    const s = A.season; if (!s || !Array.isArray(s.teams) || s.teams.length < 2) return null;
    if (s.to) { const end = new Date(s.to + 'T23:59:59'); if (!isNaN(end) && Date.now() > end.getTime() + 86400000) return null; }
    return s;
  };
  A.league = {
    read() {
      try { const v = JSON.parse(localStorage.getItem(LEAGUE_KEY) || 'null'); return v && v.season ? v : null; }
      catch (e) { console.warn('SHIFT: تعذّرت قراءة الدوري —', e && e.message); return null; }
    },
     
    write(v) {
      try {
        localStorage.setItem(LEAGUE_KEY, JSON.stringify(v));
        const back = JSON.parse(localStorage.getItem(LEAGUE_KEY) || 'null');
        return !!back && back.season === v.season && back.rounds === v.rounds;
      } catch (e) { console.warn('SHIFT: تعذّر حفظ الدوري —', e && e.message); return false; }
    },
    clear() { try { localStorage.removeItem(LEAGUE_KEY); } catch (e) {} },    
     
    draw(season, nTeams, rnd) {
      const pool = season.teams.slice();
      for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
      return pool.slice(0, nTeams).map(t => t.name);
    },
    fresh(season, assign) {
      const table = {};
      season.teams.forEach(t => { table[t.name] = { p: 0, w: 0, d: 0, l: 0, gf: 0, pts: 0 }; });
      return { season: season.id, assign, table, rounds: 0, at: Date.now() };
    },
     
    record(lg, teams, goals) {
      const top = Math.max.apply(null, teams.map(t => t.score || 0).concat([0]));
      const winners = teams.filter(t => (t.score || 0) === top);
      teams.forEach((t, i) => {
        const nm = lg.assign[i]; if (!nm || !lg.table[nm]) return;
        const r = lg.table[nm]; r.p++; r.gf += (goals && goals[i]) || 0;
        if (winners.length === teams.length) { r.d++; r.pts += 1; }
        else if (winners.indexOf(t) >= 0) { r.w++; r.pts += 3; }
        else r.l++;
      });
      lg.rounds++;
      return lg;
    },
    standings(lg) {
      return Object.keys(lg.table).map(n => Object.assign({ name: n }, lg.table[n]))
        .sort((a, b) => b.pts - a.pts || b.gf - a.gf || (b.w - a.w) || a.name.localeCompare(b.name, 'ar'));
    },
    kitOf(season, name) {
      const t = (season && season.teams || []).filter(x => x.name === name)[0];
      return t ? t.kit : null;
    },
  };

  A.games = A.games || {};

  A.frozen = function () { try { return sessionStorage.getItem('shift.arcade.freeze') === '1'; } catch (e) { return false; } };
})();
