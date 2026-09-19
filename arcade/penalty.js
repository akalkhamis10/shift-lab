(function () {
  const G = (typeof window !== 'undefined' ? window : globalThis);
  const S = G.SHIFT; const A = S.arcade;
  const AR = A.AR, PAL = A.PAL;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cssVar = v => (getComputedStyle(document.documentElement).getPropertyValue(v) || '').trim();
   
  const teamHex = c => /^var\(/.test(c) ? (cssVar(c.slice(4, -1)) || '#4e9fc7') : c;

  A.games.penalty = {
    mount(el, api) {
      const F = A.frame(el);
      const season = A.seasonActive();
      const nT = api.teams.length;
      let lg = A.league.read();
      if (lg && (!season || lg.season !== season.id || Object.keys(lg.assign || {}).length !== nT)) lg = null;
      let live = null, sheetTimers = [];
      const later = (fn, ms) => { const t = setTimeout(fn, ms); sheetTimers.push(t); return t; };

      function sheet() {
        const cur = A.level.get();
        const std = lg ? A.league.standings(lg) : [];
        F.sheet.hidden = false;
        F.sheet.innerHTML =
          '<div class="gp-card ar-card gw-mine">' +
            '<h1>ضربات الترجيح</h1>' +
            (season ? '<p class="gp-sub">' + esc(season.name) + (lg
              ? ' — أكمل الدوري: الجولة ' + AR(lg.rounds + 1) + (std[0] && std[0].pts ? ' · المتصدّر ' + esc(std[0].name) : '')
              : ' — القرعة تسحب منتخباً لكل فريق') + '</p>' : '') +
            '<p class="gp-sub">اختر الصعوبة — الحارس أسرع كلما صعدت</p>' +
            '<div class="gp-acts ar-levels">' +
              ['easy', 'mid', 'hard'].map(k => '<button class="gp-b' + (cur && cur.id === k ? ' gp-b-main' : '') + '" type="button" data-lv="' + k + '">' + A.LEVELS[k].name + '</button>').join('') +
            '</div>' +
            '<p class="gp-sub">الهدّاف</p>' +
            '<div class="gp-acts ar-levels">' +
              [['auto', 'يتبادلان'], ['boy', 'الولد'], ['girl', 'البنت']].map(h => '<button class="gp-b gp-b-x' + (A.hero.get() === h[0] ? ' gp-b-main' : '') + '" type="button" data-hero="' + h[0] + '">' + h[1] + '</button>').join('') +
            '</div>' +
            '<div class="gp-acts">' +
              '<button class="gp-b gp-b-x" type="button" data-free="1">تسديد حرّ بلا أسئلة</button>' +
              (lg ? '<button class="gp-b gp-b-x" type="button" data-newlg="1">دوري جديد</button>' : '') +
            '</div>' +
          '</div>';
        F.sheet.querySelectorAll('[data-lv]').forEach(b => { b.onclick = () => begin(A.level.set(b.dataset.lv), false); });
        F.sheet.querySelector('[data-free]').onclick = () => begin(A.level.get() || A.LEVELS.mid, true);
        F.sheet.querySelectorAll('[data-hero]').forEach(b => { b.onclick = () => { A.hero.set(b.dataset.hero); sheet(); }; });
        const nl = F.sheet.querySelector('[data-newlg]');
        if (nl) nl.onclick = () => { A.league.clear(); lg = null; sheet(); };
      }

      function begin(level, free) {
        if (season && !free && !lg) return draw(level);
        start(level, free);
      }

      function draw(level) {
        const names = A.league.draw(season, nT, api.rnd);
        F.sheet.innerHTML =
          '<div class="gp-card ar-card gw-mine"><h1>القرعة</h1>' +
          '<div class="ar-draw">' + api.teams.map((t, i) => {
            const kit = A.league.kitOf(season, names[i]) || ['#888', '#fff'];
            return '<div class="ar-cardflip" style="--d:' + (0.45 + i * 0.75) + 's">' +
              '<div class="ar-face ar-back"><i style="background:' + esc(t.color) + '"></i>' + esc(t.name) + '</div>' +
              '<div class="ar-face ar-front" style="background:' + esc(kit[0]) + ';color:' + esc(kit[1]) + '"><b>' + esc(names[i]) + '</b><small>فريق ' + esc(t.name) + '</small></div>' +
            '</div>'; }).join('') + '</div></div>';
        api.teams.forEach((t, i) => later(() => api.sfx('pop'), 450 + i * 750 + 300));
        later(() => {
          const assign = {}; names.forEach((n, i) => { assign[i] = n; });
          lg = A.league.fresh(season, assign);
          if (!A.league.write(lg)) api.say('لم يُحفظ الدوري على هذا الجهاز — تُلعب الجولة ولا تُسجَّل', 'bad');
          start(level, false);
        }, 450 + nT * 750 + 900);
      }

      function start(level, free) {
         
        F.sheet.hidden = false;
        F.sheet.innerHTML = (S.games.get('penalty').loaderHtml || (() => ''))('ضربات الترجيح');
        A.onProgress = (f, label) => { const b = F.sheet.querySelector('#arLoadBar'), t = F.sheet.querySelector('#arLoadTxt');
          if (b) b.style.transform = 'scaleX(' + Math.max(0.03, Math.min(1, f)).toFixed(3) + ')'; if (t && label) t.textContent = label; };
        const kits = api.teams.map((t, i) => {
          const k = (season && lg && !free) ? A.league.kitOf(season, lg.assign[i]) : null;
          return k || [teamHex(t.color), '#ffffff'];
        });
        const labels = api.teams.map((t, i) => (season && lg && !free) ? lg.assign[i] : t.name);
         
        if (api.setTag) api.teams.forEach((t, i) => api.setTag(i, (season && lg && !free) ? lg.assign[i] : ''));
        A.load().then(() => {
          if (!live) return;                         
          live.game = A.boot(F.mount, { scenes: [makeScene({ api, F, level, free, kits, labels, season, lg, done, ready() { F.sheet.hidden = true; F.sheet.innerHTML = ''; } })] });
        }).catch(e => {
          console.warn('SHIFT: محرّك الأركيد لم يصل —', e && e.message);
          F.sheet.hidden = false;
          F.sheet.innerHTML = '<div class="gp-card"><h1>لم تُفتح اللعبة</h1><p class="gp-sub">تعذّر تحميل محرّك الحركة على هذا الجهاز. جرّب إعادة الفتح أو اختر لعبة أخرى بالأسئلة نفسها.</p></div>';
        });
      }

      function done(goals) {
        if (season && lg && Object.keys(lg.assign).length === nT) {
          A.league.record(lg, api.teams, goals);
          const saved = A.league.write(lg);
          const std = A.league.standings(lg);
          F.sheet.hidden = false;
          F.sheet.innerHTML =
            '<div class="gp-card ar-card gw-mine"><h1>جدول الدوري</h1>' +
            (saved ? '' : '<p class="gp-sub">لم يُحفظ الجدول على هذا الجهاز — هذه نتيجة الجولة فقط.</p>') +
            '<table class="ar-table"><thead><tr><th>المنتخب</th><th>لعب</th><th>فاز</th><th>تعادل</th><th>خسر</th><th>أهداف</th><th>نقاط</th></tr></thead><tbody>' +
            std.map(r => { const mine = Object.values(lg.assign).indexOf(r.name) >= 0;
              return '<tr' + (mine ? ' class="mine"' : '') + '><td>' + esc(r.name) + '</td><td>' + AR(r.p) + '</td><td>' + AR(r.w) + '</td><td>' + AR(r.d) + '</td><td>' + AR(r.l) + '</td><td>' + AR(r.gf) + '</td><td><b>' + AR(r.pts) + '</b></td></tr>'; }).join('') +
            '</tbody></table>' +
            '<div class="gp-acts"><button class="gp-b gp-b-main" type="button" data-go="1">النتيجة</button></div></div>';
          F.sheet.querySelector('[data-go]').onclick = () => { F.sheet.hidden = true; api.finish(); };
        } else api.finish();
      }

      live = { game: null };
      sheet();
      return {
        destroy() {
          sheetTimers.forEach(clearTimeout);
          if (live && live.game) live.game.destroy();
          live = null;
        },
      };
    },
  };

  function makeScene(ctx) {
    const Phaser = G.Phaser;
    const { api, F, level, free, kits, labels } = ctx;
    const rnd = api.rnd;
    const M = A.art;

    return class Pitch extends Phaser.Scene {
      constructor() { super('pitch'); }

      preload() { if (M) A.preloadArt(this); }

      create() {
        const sc = this;
        sc.slow = 1;
        sc.state = 'idle'; sc.i = 0; sc.qi = 0;
        sc.streak = api.teams.map(() => 0);
        sc.goals = api.teams.map(() => 0);
        sc.period = level.period; sc.kt = 0; sc.timeLeft = 0; sc.freeGoals = 0;
        sc.frozen = A.frozen();
        sc.zones = []; sc.hl = -1;
        sc.art = !!(M && A.artReady(sc));

        A.feel.ensureTex(sc);
        makeBallTexture(sc);

        sc.bg = sc.add.graphics().setDepth(0);
        sc.crowdC = sc.add.container(0, 0).setDepth(1);
        sc.crowd = [];
        if (sc.art) {
          sc.bgImg = sc.add.image(0, 0, 'art-bg').setOrigin(0, 0).setDepth(1);
          sc.bandL = sc.add.image(0, 0, 'art-bg').setOrigin(0, 0).setDepth(1);
          sc.bandR = sc.add.image(0, 0, 'art-bg').setOrigin(0, 0).setDepth(1);
           
          sc.netImg = sc.add.image(0, 0, 'art-bg').setOrigin(0, 0).setDepth(4);
          sc.ringG = sc.add.graphics().setDepth(9);
          sc.keeperImg = sc.add.image(0, 0, A.artKey('keeper', 'ready')).setOrigin(0.5, 1).setDepth(10);
          sc.smear = sc.add.image(0, 0, A.artKey('boy', 'runup')).setOrigin(0.5, 1).setDepth(12).setAlpha(0).setVisible(false);
          sc.hero = sc.add.image(0, 0, A.artKey('boy', 'ready')).setOrigin(0.5, 1).setDepth(13);
          sc.heroChar = 'boy';
        } else {
          sc.netG = sc.add.graphics().setDepth(4);
          sc.goalG = sc.add.graphics().setDepth(5);
          sc.keeper = A.doll(sc, 0, 0, { h: 120, kit: kits[1 % kits.length], depth: 10 }).ready();
          sc.striker = A.doll(sc, 0, 0, { h: 150, kit: kits[0], depth: 13 }).idle();
        }
        sc.plateG = sc.add.graphics().setDepth(6);
        sc.hlG = sc.add.graphics().setDepth(7);
         
        sc.shadow = sc.add.image(0, 0, 'ar-shadow').setDepth(3).setAlpha(0.75);
        sc.heroShadow = sc.add.image(0, 0, 'ar-shadow').setDepth(3).setAlpha(0.8).setVisible(!!sc.art);
        sc.keepShadow = sc.add.image(0, 0, 'ar-shadow').setDepth(3).setAlpha(0.7).setVisible(!!sc.art);
         
        const ballKey = sc.art && sc.textures.exists('art-ball') ? 'art-ball' : 'ar-ball';
        sc.ballSmear = sc.add.image(0, 0, ballKey).setDepth(11).setAlpha(0).setVisible(false);
        sc.ball = sc.add.image(0, 0, ballKey).setDepth(12);
        sc.flashes = []; sc.flashT = 0;
        sc.sc = { W: 0, H: 0 };

        sc.layout();
        sc.scale.on('resize', () => {
          const W = sc.scale.width, H = sc.scale.height;
          if (Math.abs(W - sc.sc.W) < 2 && Math.abs(H - sc.sc.H) < 2) return;       
          if (sc.state === 'shot') { sc.pendingLayout = true; return; }              
          sc.layout();
        });
        A.onFonts(sc, () => { sc.zones.forEach(z => z.txt && z.txt.updateText()); });

        sc.ctl = A.input(sc, {
          dragIsTap: true,
          onTap: (x, y) => sc.tap(x, y),
          onMove: (x, y) => { if (sc.state === 'aim') { const k = sc.zoneAt(x, y, false); if (k >= 0 && k !== sc.hl) sc.setHl(k); } },
          onKey: k => sc.key(k),
        });
        sc.events.once('shutdown', () => { sc.ctl.off(); clearTimeout(sc.__hs); A.sound.quiet(); });
        sc.events.once('destroy', () => { sc.ctl.off(); clearTimeout(sc.__hs); A.sound.quiet(); });

        A.sound.on = () => api.sound();
        sc.input.once('pointerdown', () => { if (A.sound.ok()) A.sound.ambient(); });

        S.arcadeDbg = { scene: sc, shoot: k => sc.shoot(k), art: sc.art, occlusion: () => sc.occlusion() };

        if (ctx.ready) ctx.ready();            
        if (free) sc.freeShot(); else sc.ask(0);
      }

      layout() {
        const sc = this, W = sc.scale.width, H = sc.scale.height;
        if (!W || !H) return;
        const s = Phaser.Math.Clamp(Math.min(W / 1280, H / 560), 0.42, 1.6);
        const portrait = H > W * 1.1;
        let L;
        if (sc.art) L = sc.layoutArt(W, H, s, portrait); else L = sc.layoutDoll(W, H, s, portrait);
        sc.sc = L;
         
        L.ballScale = (2 * L.ballR) / sc.ball.width;
        sc.ball.setPosition(L.bx, L.by - L.ballR).setScale(L.ballScale).setAngle(0).setAlpha(1);
        sc.ballSmear.setScale(L.ballScale);
        sc.shadow.setPosition(L.bx, L.by + 2).setDisplaySize(L.ballR * 2.6, L.ballR * 1.1).setAlpha(0.75);
        sc.buildZones();
      }

      layoutArt(W, H, s, portrait) {
        const sc = this;
         
        const wide = !!(M.bgWide && sc.textures.exists('art-bg-wide'));
        const B = wide ? M.bgWide : M.bg, key = wide ? 'art-bg-wide' : 'art-bg';
        sc.bgImg.setTexture(key); sc.netImg.setTexture(key);
        const tex = sc.textures.get(key).getSourceImage();
        const bw = tex.width, bh = tex.height;
        let k, ox, oy;
        if (!portrait) {
           
          if (wide) { k = Math.max(W / bw, H / bh, (0.48 * W) / ((B.goal[2] - B.goal[0]) * bw)); ox = (W - bw * k) / 2; oy = Math.min(0, (H - bh * k) * 0.72); }
          else { k = H / bh; ox = (W - bw * k) / 2; oy = 0; }
        } else { k = (W * 0.98) / ((B.goal[2] - B.goal[0]) * bw); ox = (W - bw * k) / 2; oy = Math.max(0, H * 0.04 - B.goal[1] * bh * k); }
        sc.bgImg.setPosition(ox, oy).setScale(k);
         
        const band = wide ? 0 : Math.max(0, ox);
        const bwBand = Math.min(bw * 0.5, band / k);
        sc.bandL.setVisible(band > 1); sc.bandR.setVisible(band > 1);
        if (band > 1) {
          sc.bandL.setTexture(key).setCrop(0, 0, bwBand, bh).setScale(-k, k).setPosition(band, oy);
          sc.bandR.setTexture(key).setCrop(bw - bwBand, 0, bwBand, bh).setScale(-k, k).setPosition(W - band + bw * k, oy);
        }
         
        const gx0 = B.goal[0] * bw, gy0 = B.goal[1] * bh, gw0 = (B.goal[2] - B.goal[0]) * bw, gh0 = (B.goal[3] - B.goal[1]) * bh;
        sc.netImg.setCrop(gx0, gy0, gw0, gh0).setPosition(ox, oy).setScale(k);
         
        const g = sc.bg; g.clear();
        if (portrait) {
          const sky = sc.textures.getPixel(Math.round(bw / 2), 4, 'art-bg'), grass = sc.textures.getPixel(Math.round(bw / 2), bh - 6, 'art-bg');
          g.fillStyle(sky ? sky.color : PAL.sky, 1); g.fillRect(0, 0, W, Math.max(0, oy + 1));
          g.fillStyle(grass ? grass.color : PAL.grass, 1); g.fillRect(0, oy + bh * k - 1, W, H);
        } else {
          g.fillStyle(PAL.standDark, 1); g.fillRect(0, 0, W, H);
        }
        const gx = ox + (gx0 + gw0 / 2) * k, gw = gw0 * k, gTop = oy + gy0 * k, gBot = oy + B.line * bh * k, gh = gBot - gTop;
        const bx = ox + B.spot[0] * bw * k;
         
        const by = portrait ? Math.max(H * 0.80, oy + B.spot[1] * bh * k + H * 0.12) : oy + B.spot[1] * bh * k;
        const ballR = Math.max(9, (portrait ? 0.035 : 0.045) * H);
        const L = { W, H, s, portrait, gw, gh, gx, gTop, gBot, bx, by, ballR, pad: 10 * s, k, ox, oy, wide };
         
        L.heroH = (portrait ? 0.24 : 0.44) * H;
        sc.hero.setScale(L.heroH / sc.hero.height); sc.smear.setScale(L.heroH / sc.hero.height);
         
        const box = (M.chars[sc.heroChar || 'boy'].poses.ready || {}).box || [0, 0, 1, 1];
        const dw = sc.hero.displayWidth;
        L.heroX = portrait ? bx - 0.16 * W : (gx - gw / 2 - 0.012 * W) + dw / 2 - (box[0] + box[2]) * dw;
        L.heroY = by + (portrait ? 0.02 : 0.06) * H;
        L.heroBox = box;
        sc.hero.setPosition(L.heroX, L.heroY);
         
        L.keepH = gh * 0.62; L.keepScale = L.keepH / sc.keeperImg.height;
        L.keepGround = gBot + gh * 0.02;
        sc.keeperImg.setPosition(gx, L.keepGround).setScale(L.keepScale);
        sc.keeperX = gx;
         
        sc.heroShadow.setPosition(L.heroX, L.heroY - 1).setDisplaySize(dw * box[2] * 0.95, L.heroH * 0.09);
        sc.keepShadow.setPosition(gx, L.keepGround - 1).setDisplaySize(L.keepH * 0.55, L.keepH * 0.09);
        sc.heroShadow.baseSX = sc.heroShadow.scaleX; sc.heroShadow.baseSY = sc.heroShadow.scaleY;
        sc.keepShadow.baseSX = sc.keepShadow.scaleX; sc.keepShadow.baseSY = sc.keepShadow.scaleY;
        sc.drawRings();
        return L;
      }

      layoutDoll(W, H, s, portrait) {
        const sc = this;
        const gw = portrait ? W * 0.92 : Math.min(W * 0.72, H * 1.3);
        const gh = portrait ? gw * 0.56 : gw * 0.34;
        const gx = W / 2, gTop = portrait ? Math.max(H * 0.05, 10) : Math.max(H * 0.09, 12), gBot = gTop + gh;
        const horizon = portrait ? gBot + 26 * s : H * 0.36;
        const standTop = portrait ? gTop * 0.5 : horizon * 0.3;
        const bx = W / 2, by = portrait ? H * 0.68 : H * 0.80;
        const L = { W, H, s, horizon, standTop, gw, gh, gx, gTop, gBot, bx, by, ballR: 17 * s, pad: 10 * s, portrait };
        const g = sc.bg; g.clear();
        g.fillStyle(PAL.sky, 1); g.fillRect(0, 0, W, standTop * 0.6);
        g.fillStyle(PAL.skyLow, 1); g.fillRect(0, standTop * 0.6, W, horizon - standTop * 0.6);
        g.fillStyle(PAL.standDark, 1); g.fillRect(0, standTop, W, horizon - standTop);
        g.fillStyle(PAL.stand, 1); g.fillRect(0, standTop, W, (horizon - standTop) * 0.16);
        g.fillStyle(PAL.sun, 1); g.fillRect(0, horizon - 14 * s, W, 14 * s);
        const bands = 7, bh = (H - horizon) / bands;
        for (let k = 0; k < bands; k++) { g.fillStyle(k % 2 ? PAL.grassAlt : PAL.grass, 1); g.fillRect(0, horizon + k * bh, W, bh + 1); }
        g.lineStyle(4 * s, PAL.line, 0.9);
        g.strokeRect(gx - gw * 0.95, gBot, gw * 1.9, (by - gBot) * 0.62);
        g.strokeRect(gx - gw * 0.62, gBot, gw * 1.24, (by - gBot) * 0.28);
        g.lineBetween(0, gBot, W, gBot);
        g.fillStyle(PAL.line, 0.9); g.fillCircle(bx, by, 5 * s);
        g.lineStyle(4 * s, PAL.line, 0.9); g.beginPath(); g.arc(bx, by, gw * 0.42, Math.PI * 1.15, Math.PI * 1.85, false); g.strokePath();
        sc.crowdC.removeAll(true); sc.crowd = [];
        const cols = Math.floor(W / (22 * s)), rows = 4, rowH = (horizon - standTop) * 0.19;
        const palette = PAL.crowd.concat(kits.map(k => A.hex(k[0])));
        for (let r = 0; r < rows; r++) for (let c = 0; c <= cols; c++) {
          const cx = c * 22 * s + ((r % 2) * 11 * s), cy = standTop + (horizon - standTop) * 0.22 + r * rowH;
          const col = palette[Math.floor(rnd() * palette.length)];
          const d = sc.add.circle(cx, cy, 8.5 * s, col).setStrokeStyle(2 * s, PAL.ink, 0.5);
          d.baseY = cy; sc.crowdC.add(d); sc.crowd.push(d);
        }
        const ng = sc.netG; ng.clear(); ng.setPosition(gx, gTop + gh / 2); ng.setScale(1);
        const X = x => x - gx, Y = y => y - (gTop + gh / 2);
        const depth = gh * 0.28;
        ng.fillStyle(0xffffff, 0.16); ng.fillRect(X(gx - gw / 2), Y(gTop), gw, gh);
        ng.lineStyle(1.5 * s, 0xffffff, 0.55);
        const nx = 12, ny = 6;
        for (let k = 0; k <= nx; k++) { const x = gx - gw / 2 + k * gw / nx; const xi = gx + (x - gx) * 0.82; ng.lineBetween(X(x), Y(gTop), X(xi), Y(gTop + depth)); ng.lineBetween(X(xi), Y(gTop + depth), X(xi), Y(gBot)); }
        for (let k = 0; k <= ny; k++) { const y = gTop + depth + k * (gh - depth) / ny; ng.lineBetween(X(gx - gw / 2 * 0.82), Y(y), X(gx + gw / 2 * 0.82), Y(y)); }
        ng.lineBetween(X(gx - gw / 2), Y(gTop), X(gx - gw / 2 * 0.82), Y(gTop + depth)); ng.lineBetween(X(gx + gw / 2), Y(gTop), X(gx + gw / 2 * 0.82), Y(gTop + depth));
        const pg = sc.goalG; pg.clear();
        const pw = 9 * s;
        pg.fillStyle(PAL.ink, 1); pg.fillRoundedRect(gx - gw / 2 - pw / 2 - 2, gTop - pw / 2 - 2, gw + pw + 4, pw + 4, 4);
        pg.fillRoundedRect(gx - gw / 2 - pw / 2 - 2, gTop - pw / 2, pw + 4, gh + pw / 2 + 2, 4);
        pg.fillRoundedRect(gx + gw / 2 - pw / 2 - 2, gTop - pw / 2, pw + 4, gh + pw / 2 + 2, 4);
        pg.fillStyle(0xffffff, 1); pg.fillRoundedRect(gx - gw / 2 - pw / 2, gTop - pw / 2, gw + pw, pw, 3);
        pg.fillRoundedRect(gx - gw / 2 - pw / 2, gTop - pw / 2, pw, gh + pw / 2, 3);
        pg.fillRoundedRect(gx + gw / 2 - pw / 2, gTop - pw / 2, pw, gh + pw / 2, 3);
        sc.keeper.destroy(); sc.keeper = A.doll(sc, gx, gBot + 2, { h: gh * 0.66, kit: kits[sc.keeperKit == null ? 1 % kits.length : sc.keeperKit], depth: 10 }).ready();
        sc.keeperX = gx;
        sc.striker.destroy(); sc.striker = A.doll(sc, bx - 60 * s, by + 26 * s, { h: 150 * s, kit: kits[api.turn()], depth: 13 }).idle();
        return L;
      }

      heroTex(pose) {
        const sc = this, ch = sc.heroChar || 'boy', key = A.artKey(ch, pose);
        if (A.kitMode !== 'shift' || !sc.heroKit) return key;
        const hex = sc.heroKit.join('').replace(/#/g, '');
        return A.recolorKit(sc, key, key + '|' + hex, A.KIT_RANGE.hero, sc.heroKit);
      }
      keeperTex(pose) {
        const sc = this, key = A.artKey('keeper', pose);
        if (A.kitMode !== 'shift' || !sc.keeperKitC) return key;
        const hex = sc.keeperKitC.join('').replace(/#/g, '');
        return A.recolorKit(sc, key, key + '|' + hex, A.KIT_RANGE.keeper, sc.keeperKitC);
      }
      heroPose(pose) { const sc = this; if (!sc.art) return; sc.hero.setTexture(sc.heroTex(pose)); }
      keeperPose(pose, flip) { const sc = this; if (!sc.art) return; sc.keeperImg.setTexture(sc.keeperTex(pose)); sc.keeperImg.setFlipX(!!flip); }
       
      drawRings() {
        const sc = this, g = sc.ringG, L = sc.sc; if (!g) return; g.clear();
        if (A.kitMode !== 'ring' || !L.W) return;
        const hk = sc.heroKit || kits[api.turn()], kk = sc.keeperKitC || kits[(api.turn() + 1) % kits.length];
        g.lineStyle(Math.max(4, 7 * L.s), A.hex(hk[0]), 0.95); g.strokeEllipse(L.heroX, L.heroY - 2, L.heroH * 0.42, L.heroH * 0.12);
        g.lineStyle(Math.max(3, 5 * L.s), A.hex(kk[0]), 0.95); g.strokeEllipse(sc.keeperX, L.gBot + L.gh * 0.02, L.keepH * 0.46, L.keepH * 0.11);
      }

      buildZones() {
        const sc = this, L = sc.sc, s = L.s;
        const q = free ? null : api.qs[sc.qi];
        const n = free ? 4 : (q ? q.a.length : 0);
        sc.zones.forEach(z => { if (z.txt) z.txt.destroy(); });
        sc.zones = [];
        if (!n) { sc.plateG.clear(); sc.hlG.clear(); return; }
        const inset = sc.art ? L.gw * 0.035 : L.pad * 1.6;
        const x0 = L.gx - L.gw / 2 + inset, x1 = L.gx + L.gw / 2 - inset, y0 = L.gTop + (sc.art ? L.gh * 0.06 : L.pad * 1.4), y1 = L.gBot - (sc.art ? L.gh * 0.08 : L.pad * 2.2);
         
        const gap = 8 * s, W = x1 - x0, H = y1 - y0;
        const lane = Math.max((sc.art ? L.keepH * 0.36 : L.gh * 0.62 * 0.36), W * 0.16);
        const side = (W - lane - gap * 2) / 2;
        let rects = [];
        if (n === 2) rects = [{ x: x0, y: y0, w: side + lane * 0.25, h: H }, { x: x1 - side - lane * 0.25, y: y0, w: side + lane * 0.25, h: H }];
        else if (n === 3) {
          const mid = Math.max(lane, W * 0.38), sd = (W - mid - gap * 2) / 2;
          rects = [{ x: x0, y: y0, w: sd, h: H }, { x: x0 + sd + gap, y: y0, w: mid, h: H * 0.44 }, { x: x1 - sd, y: y0, w: sd, h: H }];
        }
        else { const h = (H - gap) / 2;
          rects = [{ x: x0, y: y0, w: side, h }, { x: x1 - side, y: y0, w: side, h }, { x: x0, y: y0 + h + gap, w: side, h }, { x: x1 - side, y: y0 + h + gap, w: side, h }]; }
        rects = n <= 3 ? rects.reverse() : [rects[1], rects[0], rects[3], rects[2]];
        const fs = Math.max(sc.art ? 32 : 30, Math.round((sc.art ? 40 : 36) * s));
        rects.forEach((r, k) => {
          const z = { idx: k, x: r.x, y: r.y, w: r.w, h: r.h, cx: r.x + r.w / 2, cy: r.y + r.h / 2, st: '' };
          if (!free) {
            const maxW = Math.max(40, r.w - 18 * s), maxH = r.h - 10 * s;
             
            z.txt = sc.add.text(z.cx, sc.art ? z.y + 8 * s : z.cy, q.a[k], Object.assign({
              fontFamily: A.FONT_DISPLAY, fontSize: fs + 'px', align: 'center', rtl: true,
              wordWrap: { width: maxW, useAdvancedWrap: false },
            }, sc.art ? { color: '#ffffff', stroke: '#0b1f2e', strokeThickness: Math.max(6, 8 * s) } : { color: '#0b1f2e' })).setOrigin(0.5, sc.art ? 0 : 0.5).setDepth(8);
            for (let pass = 0; pass < 3 && (z.txt.width > maxW + 1 || z.txt.height > maxH); pass++) {
              const cur = parseFloat(z.txt.style.fontSize);
              const next = Math.max(20, Math.floor(cur * Math.min(maxW / z.txt.width, maxH / z.txt.height) * 0.98));
              if (next >= cur) break;
              z.txt.setFontSize(next + 'px');
            }
          }
          sc.zones.push(z);
        });
        sc.drawPlates();
        if (sc.hl < 0 || sc.hl >= n) sc.hl = Math.floor((n - 1) / 2);
        sc.drawHl();
      }

      drawPlates() {
        const sc = this, g = sc.plateG, s = sc.sc.s; g.clear();
        sc.zones.forEach(z => {
          const fill = z.st === 'ok' ? PAL.good : z.st === 'no' ? PAL.bad : PAL.plate;
          if (sc.art) {
             
            g.fillStyle(fill, z.st ? 0.62 : 0.13); g.fillRoundedRect(z.x, z.y, z.w, z.h, 12 * s);
            g.lineStyle(Math.max(2, 3 * s), z.st ? fill : 0xffffff, z.st ? 1 : 0.85); g.strokeRoundedRect(z.x, z.y, z.w, z.h, 12 * s);
          } else {
            g.fillStyle(PAL.ink, 0.35); g.fillRoundedRect(z.x + 4 * s, z.y + 5 * s, z.w, z.h, 14 * s);
            g.fillStyle(fill, z.st ? 1 : 0.94); g.fillRoundedRect(z.x, z.y, z.w, z.h, 14 * s);
            g.lineStyle(4 * s, PAL.ink, 1); g.strokeRoundedRect(z.x, z.y, z.w, z.h, 14 * s);
            if (z.txt) z.txt.setColor(z.st ? '#ffffff' : '#0b1f2e');
          }
          if (free) {
            g.lineStyle(5 * s, z.st === 'ok' ? 0xffffff : PAL.bad, 0.9); g.strokeCircle(z.cx, z.cy, Math.min(z.w, z.h) * 0.3);
            g.strokeCircle(z.cx, z.cy, Math.min(z.w, z.h) * 0.15);
          }
        });
      }
      drawHl() {
        const sc = this, g = sc.hlG, s = sc.sc.s; g.clear();
        const z = sc.zones[sc.hl]; if (!z || sc.state !== 'aim') return;
        g.lineStyle(Math.max(4, 7 * s), PAL.sun, 1); g.strokeRoundedRect(z.x - 5 * s, z.y - 5 * s, z.w + 10 * s, z.h + 10 * s, 16 * s);
      }
      setHl(k) { this.hl = k; this.drawHl(); }

      zoneAt(x, y, loose) {
        const sc = this, s = sc.sc.s, m = 28 * s;
        let hit = -1;
        sc.zones.forEach(z => { if (x >= z.x - m && x <= z.x + z.w + m && y >= z.y - m && y <= z.y + z.h + m) hit = z.idx; });
        if (hit >= 0 || !loose) return hit;
        if (y > sc.sc.gBot + 70 * s) return -1;
        let best = -1, bd = 1e9;
        sc.zones.forEach(z => { const d = Math.hypot(x - z.cx, y - z.cy); if (d < bd) { bd = d; best = z.idx; } });
        return best;
      }
      tap(x, y) {
        if (this.state !== 'aim') return;
        const k = this.zoneAt(x, y, true);
        if (k >= 0) this.shoot(k);
        else A.feel.pop(this, x, y, 'المس زاوية في المرمى', { fontSize: Math.max(26, 28 * this.sc.s) + 'px', strokeThickness: 6 });
      }
      key(k) {
        const sc = this; if (sc.state !== 'aim' || !sc.zones.length) return;
        const n = sc.zones.length;
        if (k === ' ' || k === 'Enter') return sc.shoot(sc.hl);
        let z = sc.zones[sc.hl] || sc.zones[0], best = -1, bd = 1e9;
        const dir = k === 'ArrowLeft' ? [-1, 0] : k === 'ArrowRight' ? [1, 0] : k === 'ArrowUp' ? [0, -1] : [0, 1];
        sc.zones.forEach(o => {
          if (o.idx === z.idx) return;
          const dx = o.cx - z.cx, dy = o.cy - z.cy;
          if (dx * dir[0] + dy * dir[1] <= 0) return;
          const d = Math.hypot(dx, dy); if (d < bd) { bd = d; best = o.idx; }
        });
        if (best >= 0) sc.setHl(best); else if (n === 1) sc.setHl(0);
      }

      ask(i) {
        const sc = this;
        sc.qi = i;
        if (sc.pendingLayout) { sc.pendingLayout = false; sc.layout(); }
        const q = api.qs[i];
        if (!q) return sc.endRound();
        api.step(i, api.qs.length);
        F.q.textContent = q.q;
        sc.keeperKit = (api.turn() + 1) % kits.length;
        sc.recolor();
        sc.resetBall();
        sc.buildZones();
        sc.timeLeft = level.secs * 1000; sc.timeMax = sc.timeLeft;
        F.timer.hidden = false; F.timer.style.visibility = ''; F.timer.classList.remove('is-low'); sc.tick(0);
        sc.state = 'aim'; sc.drawHl();
        if (i > 0) A.sound.whistle(300);
        if (sc.bonus() > 2) api.say('ضربة الفرصة — الهدف بثلاث نقاط', 'good');
      }
      bonus() {
        const top = Math.max.apply(null, api.teams.map(t => t.score || 0).concat([0]));
        return (top - (api.teams[api.turn()].score || 0)) >= 3 ? 3 : 2;
      }
      freeShot() {
        const sc = this;
        if (sc.pendingLayout) { sc.pendingLayout = false; sc.layout(); }
        F.q.textContent = 'تسديد حرّ — سدّد على أي زاوية' + (sc.freeGoals ? ' · أهدافك ' + AR(sc.freeGoals) : '');
        F.timer.hidden = true;
        sc.keeperKit = 1 % kits.length;
        sc.recolor();
        sc.resetBall(); sc.buildZones();
        sc.state = 'aim'; sc.drawHl();
      }
      resetBall() {
        const sc = this, L = sc.sc;
        sc.tweens.killTweensOf(sc.ball); sc.tweens.killTweensOf(sc.shadow);
        sc.ball.setPosition(L.bx, L.by - L.ballR).setScale(L.ballScale).setAngle(0).setAlpha(1).setVisible(true);
        sc.ballSmear.setVisible(false).setAlpha(0);
        sc.shadow.setPosition(L.bx, L.by + 2).setDisplaySize(L.ballR * 2.6, L.ballR * 1.1).setAlpha(0.75);
        sc.zones.forEach(z => { z.st = ''; });
      }
       
      recolor() {
        const sc = this, L = sc.sc, s = L.s, t = api.turn();
        sc.heroKit = kits[t]; sc.keeperKitC = kits[sc.keeperKit == null ? (t + 1) % kits.length : sc.keeperKit];
        if (sc.art) {
          const ch = free ? A.hero.pick(sc.freeGoals) : A.hero.pick(sc.qi);
          sc.heroChar = ch;
          sc.tweens.killTweensOf(sc.hero); sc.tweens.killTweensOf(sc.keeperImg);
          sc.heroPose('ready');
          sc.hero.setAlpha(1).setAngle(0).setScale(L.heroH / sc.hero.height);
          sc.smear.setScale(L.heroH / sc.hero.height);
          const box = (M.chars[sc.heroChar].poses.ready || {}).box || [0, 0, 1, 1], dw = sc.hero.displayWidth;
          if (!L.portrait) L.heroX = (L.gx - L.gw / 2 - 0.012 * L.W) + dw / 2 - (box[0] + box[2]) * dw;
          L.heroBox = box;
          sc.hero.setPosition(L.heroX, L.heroY);
          sc.heroShadow.setPosition(L.heroX, L.heroY - 1).setDisplaySize(dw * box[2] * 0.95, L.heroH * 0.09);
          sc.heroShadow.baseSX = sc.heroShadow.scaleX; sc.heroShadow.baseSY = sc.heroShadow.scaleY;
          sc.keeperPose('ready', false);
          L.keepScale = L.keepH / sc.keeperImg.height;
          sc.keeperImg.setPosition(L.gx, L.keepGround).setScale(L.keepScale).setAlpha(1); sc.keeperX = L.gx;
          sc.smear.setVisible(false).setAlpha(0);
          sc.drawRings();
           
          sc.breath = sc.tweens.add({ targets: sc.hero, scaleY: sc.hero.scaleY * 1.012, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
          sc.keepBob = sc.tweens.add({ targets: sc.keeperImg, scaleY: sc.keeperImg.scaleY * 1.03, scaleX: sc.keeperImg.scaleX * 0.99, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
          return;
        }
        const sh = 150 * s;
        sc.striker.destroy(); sc.striker = A.doll(sc, L.bx - 60 * s, L.by + 26 * s, { h: sh, kit: kits[t], depth: 13 }).idle();
        sc.keeper.destroy(); sc.keeper = A.doll(sc, L.gx, L.gBot + 2, { h: L.gh * 0.66, kit: sc.keeperKitC, depth: 10 }).ready();
        sc.keeperX = L.gx;
      }

      update(t, dt) {
        const sc = this, L = sc.sc; if (!L.W) return;
        const d = dt * (sc.slow || 1);
        if (sc.state === 'aim' || sc.state === 'idle') {
          sc.kt += d;
          const half = sc.art ? L.keepH * 0.2 : L.gh * 0.66 * 0.3;
          const amp = L.gw / 2 - half - L.pad;
          const x = sc.frozen ? L.gx : L.gx + Math.sin(sc.kt / 1000 * Math.PI * 2 / sc.period) * amp;
          sc.keeperX = x;
          if (sc.art) { sc.keeperImg.x = x; if (A.kitMode === 'ring') sc.drawRings(); } else sc.keeper.c.x = x;
        }
        if (sc.art) {
           
          const hk = Math.min(1, Math.max(0, L.heroY - sc.hero.y) / (L.heroH * 0.5));
          sc.heroShadow.x = sc.hero.x; sc.heroShadow.setScale(sc.heroShadow.baseSX * (1 - 0.45 * hk), sc.heroShadow.baseSY * (1 - 0.45 * hk)).setAlpha(0.8 * (1 - 0.7 * hk));
          const kk = Math.min(1, Math.max(0, L.keepGround - sc.keeperImg.y) / (L.keepH * 0.5));
          sc.keepShadow.x = sc.keeperImg.x; sc.keepShadow.setScale(sc.keepShadow.baseSX * (1 - 0.4 * kk), sc.keepShadow.baseSY * (1 - 0.4 * kk)).setAlpha(0.7 * (1 - 0.7 * kk));
           
          if (!sc.frozen) { sc.flashT -= d; if (sc.flashT <= 0) { sc.flashT = 450 + Math.random() * 700; sc.cameraFlash(1); } }
        }
        if (sc.smearOn && sc.art) {
           
          sc.smear.setVisible(true).setAlpha(0.28).setTexture(sc.hero.texture.key).setFlipX(sc.hero.flipX);
          sc.smear.x = sc.hero.x - 14 * L.s; sc.smear.y = sc.hero.y; sc.smear.scaleX = sc.hero.scaleX * 1.18; sc.smear.scaleY = sc.hero.scaleY * 0.98;
        }
        if (sc.state === 'aim' && !free) {
          sc.timeLeft -= d;
          sc.tick(1 - sc.timeLeft / sc.timeMax);
          if (sc.timeLeft <= 0) sc.timeout();
        }
      }
      tick(frac) {
        const bar = F.timer.firstElementChild; if (!bar) return;
        bar.style.transform = 'scaleX(' + Math.max(0, 1 - frac).toFixed(3) + ')';
        if (this.timeLeft < 5000) F.timer.classList.add('is-low');
      }

      shoot(k) {
        const sc = this, L = sc.sc, s = L.s;
        if (sc.state !== 'aim') return;
        const z = sc.zones[k]; if (!z) return;
        sc.state = 'shot'; sc.hlG.clear(); F.timer.style.visibility = 'hidden';
        const q = free ? null : api.qs[sc.qi];
        const correct = free ? true : (k === q.c);
        const turn = api.turn();
        const kx = sc.keeperX, dx = z.cx - kx, reach = level.reach * L.gw;
        const reads = rnd() < level.react;
        const saved = correct && (Math.abs(dx) <= reach || (reads && Math.abs(dx) <= reach * 2.3));
        const dir = dx >= 0 ? 1 : -1;
        const flight = level.flight;
        const high = z.cy < L.gTop + L.gh * 0.5;
        api.sfx('turn'); A.sound.crowd(0.22, 0.5);

        const launch = () => {
          api.sfx('pop'); A.sound.kick();
          const x0 = sc.ball.x, y0 = sc.ball.y, x1 = z.cx, y1 = z.cy;
          const arc = 90 * s * (high ? 1.3 : 0.8);
          const base0 = L.ballScale;
          let px = x0, py = y0;
          sc.ballSmear.setVisible(true).setTexture(sc.ball.texture.key);
          sc.tweens.addCounter({ from: 0, to: 1, duration: flight, ease: 'Sine.easeOut',
            onUpdate: tw => { const p = tw.getValue();
              sc.ball.x = x0 + (x1 - x0) * p; sc.ball.y = y0 + (y1 - y0) * p - Math.sin(Math.PI * p) * arc;
              const base = base0 * (1 - 0.42 * p), sq = Math.max(0, 1 - p * 5);
              sc.ball.setScale(base * (1 + 0.38 * sq), base * (1 - 0.34 * sq)); sc.ball.angle += 16;
               
              const vx = sc.ball.x - px, vy = sc.ball.y - py, vlen = Math.hypot(vx, vy);
              if (vlen > 0.5) { sc.ballSmear.setPosition(sc.ball.x - vx * 1.6, sc.ball.y - vy * 1.6).setRotation(Math.atan2(vy, vx)).setScale(base * 1.9, base * 0.7).setAlpha(0.3 * (1 - p * 0.5)); }
              px = sc.ball.x; py = sc.ball.y;
              sc.shadow.x = sc.ball.x; sc.shadow.y = L.by + 2 + (L.gBot - L.by) * p;
              sc.shadow.setDisplaySize(L.ballR * 2.6 * (1 - 0.5 * p), L.ballR * 1.1 * (1 - 0.5 * p)).setAlpha(0.75 * (1 - p * 0.8)); },
            onComplete: () => { sc.ballSmear.setVisible(false).setAlpha(0); sc.land(z, correct, saved, turn); } });
           
          const diveTo = saved ? (z.cx - kx) : (dir * reach * 0.8 * (reads ? -1 : 1));
          sc.time.delayedCall(flight * 0.2, () => {
            if (sc.art) {
              const centre = Math.abs(diveTo) < L.gw * 0.08;
              sc.keeperPose(centre && high ? 'jump' : (high ? 'dive-high' : 'dive-low'), diveTo < 0);
              if (sc.keepBob) sc.keepBob.stop();
              sc.tweens.add({ targets: sc.keeperImg, x: kx + diveTo, y: L.keepGround - (high ? L.gh * 0.12 : L.gh * 0.02), duration: flight * 0.75, ease: 'Quad.easeOut' });
            } else if (sc.keeper) sc.keeper.dive(diveTo >= 0 ? 1 : -1, diveTo, flight * 0.7);
          });
        };

        if (sc.art) {
          if (sc.breath) sc.breath.stop();
           
          sc.heroPose('runup'); sc.smearOn = true;
          sc.tweens.add({ targets: sc.hero, x: L.bx - 0.035 * L.W, y: L.by + 0.012 * L.H, scaleY: sc.hero.scaleY * 0.97, duration: 260, ease: 'Quad.easeIn', onComplete: () => {
            sc.heroPose('windup');
            sc.tweens.add({ targets: sc.hero, scaleX: sc.hero.scaleX * 1.05, scaleY: sc.hero.scaleY * 1.02, duration: 110, ease: 'Sine.easeOut', onComplete: () => {
              sc.heroPose('strike');
              sc.tweens.add({ targets: sc.hero, scaleX: sc.hero.scaleX / 1.05, scaleY: sc.hero.scaleY / 1.02, duration: 140, ease: 'Back.easeOut' });
              A.feel.hitstop(sc, 70, 0.08);       
              sc.time.delayedCall(10, () => { launch(); sc.time.delayedCall(180, () => { sc.smearOn = false; sc.smear.setVisible(false); }); });
            } });
          } });
          return;
        }
        sc.striker.run();
        sc.tweens.add({ targets: sc.striker.c, x: L.bx - 22 * s, y: L.by + 10 * s, duration: 280, ease: 'Quad.easeIn', onComplete: () => { sc.striker.kick(); launch(); } });
      }

      land(z, correct, saved, turn) {
        const sc = this, L = sc.sc, s = L.s;
        const kit = kits[turn].map(A.hex);
        const heroJoy = () => { if (sc.art) { sc.heroPose('celebrate'); sc.tweens.add({ targets: sc.hero, y: L.heroY - L.heroH * 0.18, duration: 240, yoyo: true, repeat: 2, ease: 'Quad.easeOut' }); } else sc.striker.joy(); };
        const heroMiss = () => { if (sc.art) { sc.heroPose('miss'); sc.tweens.add({ targets: sc.hero, y: L.heroY + L.heroH * 0.02, duration: 260, ease: 'Sine.easeOut' }); } else sc.striker.miss(); };
        const keeperJoy = () => { if (sc.art) { sc.keeperPose('save', sc.keeperImg.flipX); sc.tweens.add({ targets: sc.keeperImg, y: '-=' + (L.gh * 0.1), duration: 220, yoyo: true, repeat: 1, ease: 'Quad.easeOut' }); } else sc.keeper.joy(); };
        const keeperMiss = () => { if (sc.art) sc.time.delayedCall(220, () => sc.keeperPose('beaten', false)); else sc.keeper.miss(); };
        if (!correct) {
          z.st = 'no'; const c = api.qs[sc.qi].c; if (sc.zones[c]) sc.zones[c].st = 'ok';
          sc.drawPlates();
          A.feel.hitstop(sc, 70); A.feel.shake(sc, 140, 0.004);
          api.sfx('soft'); A.sound.thud(); A.sound.groan();
          sc.tweens.add({ targets: sc.ball, x: z.cx + (rnd() - 0.5) * 120 * s, y: L.by - 90 * s, scale: L.ballScale * 0.9, duration: 520, ease: 'Bounce.easeOut' });
          sc.tweens.add({ targets: sc.shadow, x: z.cx, y: L.by - 10 * s, alpha: 0.2, duration: 520 });
          A.feel.burst(sc, z.cx, z.cy, [PAL.bad, 0xffffff], 14, { tex: 'ar-dot', vmin: 120, vmax: 260, s: 0.7, g: 700 });
          A.feel.pop(sc, L.gx, L.gBot + 60 * s, 'خطأ', { color: '#ffd5d5', fontSize: Math.max(44, 58 * s) + 'px' });
          heroMiss(); keeperJoy();
          sc.streak[turn] = 0;
          api.judge(false, { text: 'الصحيح: ' + api.qs[sc.qi].a[c] });
          return sc.after(1800);
        }
        if (saved) {
          z.st = 'ok'; sc.drawPlates();
          const kx = sc.art ? sc.keeperImg.x : sc.keeper.c.x, ky = sc.art ? sc.keeperImg.y - L.keepH * 0.45 : sc.keeper.c.y - L.gh * 0.45;
          sc.tweens.add({ targets: sc.ball, x: kx, y: ky, scale: L.ballScale * 0.6, duration: 160 });
          sc.shadow.setAlpha(0);
          A.feel.hitstop(sc, 80); A.feel.shake(sc, 160, 0.005); A.sound.groan();
          A.feel.burst(sc, z.cx, z.cy, [0xffffff, PAL.sun], 12, { tex: 'ar-dot', vmin: 100, vmax: 240, s: 0.6, g: 600 });
          A.feel.pop(sc, L.gx, L.gBot + 60 * s, 'تصدّى الحارس', { color: '#fff3c4', fontSize: Math.max(40, 50 * s) + 'px' });
          keeperJoy(); heroMiss();
          if (!free) { api.score(turn, 1); api.judge(true, { text: 'صحيح — نقطة' }); sc.streak[turn]++; }
          else api.sfx('good');
          return sc.after(1700);
        }
         
        z.st = 'ok'; sc.drawPlates();
        sc.tweens.add({ targets: sc.ball, y: z.cy + 14 * s, scale: L.ballScale * 0.5, alpha: 0.85, duration: 180, ease: 'Sine.easeOut' });
        sc.cameraFlash(28);
        sc.shadow.setAlpha(0);
        if (sc.art) sc.tweens.add({ targets: sc.netImg, scaleX: L.k * 1.02, scaleY: L.k * 1.03, duration: 110, yoyo: true, repeat: 3, ease: 'Sine.easeInOut' });
        else sc.tweens.add({ targets: sc.netG, scaleX: 1.025, scaleY: 1.03, duration: 120, yoyo: true, repeat: 2, ease: 'Sine.easeInOut' });
        A.feel.hitstop(sc, 95); A.feel.flash(sc, 110); A.feel.shake(sc, 220, 0.008);
        api.sfx('good'); A.sound.roar(0.9, 2.2);
        sc.time.delayedCall(60, () => {
          A.feel.burst(sc, z.cx, z.cy, kit.concat([PAL.sun, 0xffffff]), 46);
          A.feel.burst(sc, L.gx, L.gTop, kit, 30, { a0: 20, a1: 160, vmin: 150, vmax: 380 });
        });
        sc.wave();
        heroJoy(); keeperMiss();
        sc.goals[turn]++;
        A.feel.pop(sc, L.gx, L.gBot + 60 * s, 'هدف!', { fontSize: Math.max(60, 84 * s) + 'px', color: '#fff9c4' });
        if (free) { sc.freeGoals++; return sc.after(1400); }
        sc.streak[turn]++;
        const chain = sc.streak[turn] >= 3 ? 1 : 0;
        const pts = sc.bonus() + chain;
        api.score(turn, pts);
        api.judge(true, { text: 'هدف — ' + ['', 'نقطة', 'نقطتان', 'ثلاث نقاط', 'أربع نقاط'][pts] });
        if (sc.streak[turn] >= 2) sc.time.delayedCall(500, () => {
          A.feel.pop(sc, L.gx, L.gBot + 130 * s, 'سلسلة ×' + AR(sc.streak[turn]) + (chain ? ' — نقطة إضافية' : ''), { fontSize: Math.max(36, 46 * s) + 'px', color: '#ffe08a' });
          A.feel.burst(sc, L.gx, L.gBot + 130 * s, [PAL.sun, 0xff7a59], 18, { tex: 'ar-dot', s: 0.8, g: 500 });
        });
        return sc.after(2000);
      }
      timeout() {
        const sc = this, L = sc.sc, s = L.s;
        sc.state = 'shot'; sc.hlG.clear(); F.timer.style.visibility = 'hidden';
        A.sound.whistle(600);
        const c = api.qs[sc.qi].c; if (sc.zones[c]) sc.zones[c].st = 'ok'; sc.drawPlates();
        A.feel.pop(sc, L.gx, L.gBot + 60 * s, 'انتهى الوقت', { color: '#ffd5d5', fontSize: Math.max(40, 52 * s) + 'px' });
        if (sc.art) { sc.heroPose('miss'); sc.keeperPose('save', false); } else { sc.striker.miss(); sc.keeper.joy(); }
        sc.streak[api.turn()] = 0;
        api.judge(false, { text: 'الصحيح: ' + api.qs[sc.qi].a[c] });
        sc.after(1800);
      }
       
      cameraFlash(n) {
        const sc = this, L = sc.sc; if (!sc.art || !L.W) return;
        for (let i = 0; i < n; i++) {
          const delay = n > 1 ? Math.random() * 1300 : 0;
          sc.time.delayedCall(delay, () => {
            if (!sc.sys || !sc.sys.isActive()) return;
            let x, y, tries = 0;
            do { x = Math.random() * L.W; y = Math.max(4, L.gTop - L.gh * 0.9) + Math.random() * L.gh * 1.2; tries++; }
            while (tries < 6 && x > L.gx - L.gw / 2 - 20 && x < L.gx + L.gw / 2 + 20 && y > L.gTop);
            const f = sc.add.image(x, y, 'ar-dot').setDepth(2).setScale(0.25).setAlpha(0.95);
            sc.tweens.add({ targets: f, scale: 0.9, alpha: 0, duration: 200, ease: 'Quad.easeOut', onComplete: () => f.destroy() });
          });
        }
      }
       
      occlusion() {
        const sc = this, out = [];
        const figRect = (img, box) => {
          const dw = img.displayWidth, dh = img.displayHeight, left = img.x - dw * img.originX, top = img.y - dh * img.originY;
          return new Phaser.Geom.Rectangle(left + box[0] * dw, top + box[1] * dh, box[2] * dw, box[3] * dh);
        };
        const chars = [];
        if (sc.art) {
          const hb = (M.chars[sc.heroChar || 'boy'].poses.ready || {}).box || [0, 0, 1, 1];
          const kb = (M.chars.keeper.poses.ready || {}).box || [0, 0, 1, 1];
          chars.push(['hero', figRect(sc.hero, hb)], ['keeper', figRect(sc.keeperImg, kb)]);
        }
        chars.forEach(([n, r]) => sc.zones.forEach(z => {
          if (!z.txt) return;
          const t = z.txt.getBounds();
          if (Phaser.Geom.Intersects.RectangleToRectangle(r, t)) out.push(n + '×' + z.idx + ' «' + z.txt.text + '»');
        }));
        return out;
      }
      wave() {
        const sc = this, s = sc.sc.s;
        sc.crowd.forEach((d, i) => {
          sc.tweens.add({ targets: d, y: d.baseY - 16 * s, duration: 220, yoyo: true, delay: (i % 60) * 9, ease: 'Sine.easeOut' });
        });
      }
      after(ms) {
        const sc = this;
        sc.time.delayedCall(ms, () => {
          if (!sc.sys || !sc.sys.isActive()) return;
          if (free) { sc.period = Math.max(level.minPeriod, sc.period * 0.94); return sc.freeShot(); }
          api.nextTurn();
          sc.period = Math.max(level.minPeriod, sc.period * 0.96);
          sc.qi++;
          if (sc.qi >= api.qs.length) { api.step(api.qs.length, api.qs.length); return sc.endRound(); }
          sc.ask(sc.qi);
        });
      }
      endRound() {
        const sc = this; sc.state = 'end';
        F.q.textContent = ''; F.timer.hidden = true;
        ctx.done(sc.goals.slice());
      }
    };
  }

  function makeBallTexture(scene) {
    if (scene.textures.exists('ar-ball')) return;
    const g = scene.make.graphics({ x: 0, y: 0 }, false), R = 60;
    g.fillStyle(0xffffff, 1); g.fillCircle(64, 64, R);
    g.lineStyle(7, PAL.ink, 1); g.strokeCircle(64, 64, R - 3);
    g.fillStyle(PAL.ink, 1); g.fillCircle(64, 64, 15);
    for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * Math.PI * 2 / 5; g.fillCircle(64 + Math.cos(a) * 38, 64 + Math.sin(a) * 38, 11); }
    g.generateTexture('ar-ball', 128, 128); g.destroy();
  }
})();
