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
            '<div class="gp-acts">' +
              '<button class="gp-b gp-b-x" type="button" data-free="1">تسديد حرّ بلا أسئلة</button>' +
              (lg ? '<button class="gp-b gp-b-x" type="button" data-newlg="1">دوري جديد</button>' : '') +
            '</div>' +
          '</div>';
        F.sheet.querySelectorAll('[data-lv]').forEach(b => { b.onclick = () => begin(A.level.set(b.dataset.lv), false); });
        F.sheet.querySelector('[data-free]').onclick = () => begin(A.level.get() || A.LEVELS.mid, true);
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
        F.sheet.hidden = true; F.sheet.innerHTML = '';
        const kits = api.teams.map((t, i) => {
          const k = (season && lg && !free) ? A.league.kitOf(season, lg.assign[i]) : null;
          return k || [teamHex(t.color), '#ffffff'];
        });
        const labels = api.teams.map((t, i) => (season && lg && !free) ? lg.assign[i] : t.name);
        A.load().then(() => {
          if (!live) return;                         
          live.game = A.boot(F.mount, { scenes: [makeScene({ api, F, level, free, kits, labels, season, lg, done })], bg: '#1e78e0' });
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

    return class Pitch extends Phaser.Scene {
      constructor() { super('pitch'); }

      create() {
        const sc = this;
        sc.slow = 1;
        sc.state = 'idle'; sc.i = 0; sc.qi = 0;
        sc.streak = api.teams.map(() => 0);
        sc.goals = api.teams.map(() => 0);
        sc.period = level.period; sc.kt = 0; sc.timeLeft = 0; sc.freeGoals = 0;
        sc.frozen = A.frozen();
        sc.zones = []; sc.hl = -1;

        A.feel.ensureTex(sc);
        makeBallTexture(sc);

        sc.bg = sc.add.graphics().setDepth(0);
        sc.crowdC = sc.add.container(0, 0).setDepth(1);
        sc.crowd = [];
        sc.netG = sc.add.graphics().setDepth(4);
        sc.goalG = sc.add.graphics().setDepth(5);
        sc.plateG = sc.add.graphics().setDepth(6);
        sc.hlG = sc.add.graphics().setDepth(7);
        sc.keeper = A.doll(sc, 0, 0, { h: 120, kit: kits[1 % kits.length], depth: 10 }).ready();
        sc.shadow = sc.add.ellipse(0, 0, 40, 14, 0x000000, 0.28).setDepth(11);
        sc.ball = sc.add.image(0, 0, 'ar-ball').setDepth(12);
        sc.striker = A.doll(sc, 0, 0, { h: 150, kit: kits[0], depth: 13 }).idle();
        sc.badge = sc.add.text(0, 0, '', {
          fontFamily: A.FONT_DISPLAY, fontSize: '30px', color: '#ffffff', stroke: '#0b1f2e', strokeThickness: 8, rtl: true,
        }).setOrigin(0.5).setDepth(14);
        sc.sc = { W: 0, H: 0 };

        sc.layout();
        sc.scale.on('resize', () => {
          const W = sc.scale.width, H = sc.scale.height;
          if (Math.abs(W - sc.sc.W) < 2 && Math.abs(H - sc.sc.H) < 2) return;       
          if (sc.state === 'shot') { sc.pendingLayout = true; return; }              
          sc.layout();
        });
        A.onFonts(sc, () => { sc.zones.forEach(z => z.txt && z.txt.updateText()); sc.badge.updateText(); });

        sc.ctl = A.input(sc, {
          dragIsTap: true,
          onTap: (x, y) => sc.tap(x, y),
          onMove: (x, y) => { if (sc.state === 'aim') { const k = sc.zoneAt(x, y, false); if (k >= 0 && k !== sc.hl) sc.setHl(k); } },
          onKey: k => sc.key(k),
        });
        sc.events.once('shutdown', () => { sc.ctl.off(); clearTimeout(sc.__hs); });
        sc.events.once('destroy', () => { sc.ctl.off(); clearTimeout(sc.__hs); });

        S.arcadeDbg = { scene: sc, shoot: k => sc.shoot(k) };

        if (free) sc.freeShot(); else sc.ask(0);
      }

      layout() {
        const sc = this, W = sc.scale.width, H = sc.scale.height;
        if (!W || !H) return;
        const s = Phaser.Math.Clamp(Math.min(W / 1280, H / 560), 0.42, 1.6);
         
        const portrait = H > W * 1.1;
        const gw = portrait ? W * 0.92 : Math.min(W * 0.72, H * 1.3);
        const gh = portrait ? gw * 0.56 : gw * 0.34;
        const gx = W / 2, gTop = portrait ? Math.max(H * 0.05, 10) : Math.max(H * 0.09, 12), gBot = gTop + gh;
        const horizon = portrait ? gBot + 26 * s : H * 0.36;
        const standTop = portrait ? gTop * 0.5 : horizon * 0.3;
        const bx = W / 2, by = portrait ? H * 0.68 : H * 0.80;
        sc.sc = { W, H, s, horizon, standTop, gw, gh, gx, gTop, gBot, bx, by, pad: 10 * s, portrait };

        const g = sc.bg; g.clear();
        g.fillStyle(PAL.sky, 1); g.fillRect(0, 0, W, standTop * 0.6);
        g.fillStyle(PAL.skyLow, 1); g.fillRect(0, standTop * 0.6, W, horizon - standTop * 0.6);
        g.fillStyle(PAL.standDark, 1); g.fillRect(0, standTop, W, horizon - standTop);
        g.fillStyle(PAL.stand, 1); g.fillRect(0, standTop, W, (horizon - standTop) * 0.16);
        g.fillStyle(0xffffff, 0.08); g.fillRect(0, standTop + (horizon - standTop) * 0.5, W, (horizon - standTop) * 0.06);
         
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

        const kh = gh * 0.66;
        sc.keeper.destroy(); sc.keeper = A.doll(sc, gx, gBot + 2, { h: kh, kit: kits[sc.keeperKit == null ? 1 % kits.length : sc.keeperKit], depth: 10 }).ready();
        sc.keeperX = gx;
        const sh = 150 * s;
        sc.striker.destroy(); sc.striker = A.doll(sc, bx - 60 * s, by + 26 * s, { h: sh, kit: kits[api.turn()], depth: 13 }).idle();
        sc.ball.setPosition(bx, by - 17 * s).setScale(s * 0.55).setAngle(0);
        sc.shadow.setPosition(bx, by + 2).setSize(38 * s, 13 * s);
        sc.badge.setPosition(bx - 60 * s, by + 26 * s - sh - 22 * s);
        sc.badge.setFontSize(Math.max(28, 30 * s) + 'px');
        sc.badge.setText(labels[api.turn()] || '');
        if (free) sc.badge.setText('');

        sc.buildZones();
      }

      buildZones() {
        const sc = this, L = sc.sc, s = L.s;
        const q = free ? null : api.qs[sc.qi];
        const n = free ? 4 : (q ? q.a.length : 0);
        sc.zones.forEach(z => { if (z.txt) z.txt.destroy(); });
        sc.zones = [];
        if (!n) { sc.plateG.clear(); sc.hlG.clear(); return; }
        const x0 = L.gx - L.gw / 2 + L.pad * 1.6, x1 = L.gx + L.gw / 2 - L.pad * 1.6, y0 = L.gTop + L.pad * 1.4, y1 = L.gBot - L.pad * 2.2;
         
        const gap = 8 * s, W = x1 - x0, H = y1 - y0;
        const lane = Math.max(L.gh * 0.62 * 0.36, W * 0.16);            
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
        const fs = Math.max(30, Math.round(36 * s));
        rects.forEach((r, k) => {
          const z = { idx: k, x: r.x, y: r.y, w: r.w, h: r.h, cx: r.x + r.w / 2, cy: r.y + r.h / 2, st: '' };
          if (!free) {
             
            const maxW = Math.max(40, r.w - 18 * s), maxH = r.h - 10 * s;
            z.txt = sc.add.text(z.cx, z.cy, q.a[k], {
              fontFamily: A.FONT_DISPLAY, fontSize: fs + 'px', color: '#0b1f2e', align: 'center', rtl: true,
              wordWrap: { width: maxW, useAdvancedWrap: false },
            }).setOrigin(0.5).setDepth(8);
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
          g.fillStyle(PAL.ink, 0.35); g.fillRoundedRect(z.x + 4 * s, z.y + 5 * s, z.w, z.h, 14 * s);
          g.fillStyle(fill, z.st ? 1 : 0.94); g.fillRoundedRect(z.x, z.y, z.w, z.h, 14 * s);
          g.lineStyle(4 * s, PAL.ink, 1); g.strokeRoundedRect(z.x, z.y, z.w, z.h, 14 * s);
          if (free) {  
            g.lineStyle(5 * s, z.st === 'ok' ? 0xffffff : PAL.bad, 0.9); g.strokeCircle(z.cx, z.cy, Math.min(z.w, z.h) * 0.3);
            g.strokeCircle(z.cx, z.cy, Math.min(z.w, z.h) * 0.15);
          }
          if (z.txt) z.txt.setColor(z.st ? '#ffffff' : '#0b1f2e');
        });
      }
      drawHl() {
        const sc = this, g = sc.hlG, s = sc.sc.s; g.clear();
        const z = sc.zones[sc.hl]; if (!z || sc.state !== 'aim') return;
        g.lineStyle(7 * s, PAL.sun, 1); g.strokeRoundedRect(z.x - 5 * s, z.y - 5 * s, z.w + 10 * s, z.h + 10 * s, 18 * s);
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
        sc.resetBall();
        sc.buildZones();
        sc.keeperKit = (api.turn() + 1) % kits.length;
        sc.recolor();
        sc.timeLeft = level.secs * 1000; sc.timeMax = sc.timeLeft;
        F.timer.hidden = false; F.timer.classList.remove('is-low'); sc.tick(0);
        sc.state = 'aim'; sc.drawHl();
         
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
        sc.resetBall(); sc.buildZones();
        sc.state = 'aim'; sc.drawHl();
      }
      resetBall() {
        const sc = this, L = sc.sc, s = L.s;
        sc.tweens.killTweensOf(sc.ball); sc.tweens.killTweensOf(sc.shadow);
        sc.ball.setPosition(L.bx, L.by - 17 * s).setScale(s * 0.55).setAngle(0).setAlpha(1);
        sc.shadow.setPosition(L.bx, L.by + 2).setAlpha(0.28);
        sc.zones.forEach(z => { z.st = ''; });
      }
       
      recolor() {
        const sc = this, L = sc.sc, s = L.s;
        const t = api.turn();
        const sh = 150 * s;
        sc.striker.destroy(); sc.striker = A.doll(sc, L.bx - 60 * s, L.by + 26 * s, { h: sh, kit: kits[t], depth: 13 }).idle();
        sc.keeper.destroy(); sc.keeper = A.doll(sc, L.gx, L.gBot + 2, { h: L.gh * 0.66, kit: kits[sc.keeperKit == null ? (t + 1) % kits.length : sc.keeperKit], depth: 10 }).ready();
        sc.keeperX = L.gx;
        sc.badge.setPosition(L.bx - 60 * s, L.by + 26 * s - sh - 22 * s).setText(free ? '' : (labels[t] || ''));
      }

      update(t, dt) {
        const sc = this, L = sc.sc; if (!L.W) return;
        const d = dt * (sc.slow || 1);
        if (sc.state === 'aim' || sc.state === 'idle') {
          sc.kt += d;
          const amp = L.gw / 2 - L.gh * 0.66 * 0.3 - L.pad;
          const x = sc.frozen ? L.gx : L.gx + Math.sin(sc.kt / 1000 * Math.PI * 2 / sc.period) * amp;
          sc.keeperX = x; sc.keeper.c.x = x;
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
        sc.state = 'shot'; sc.hlG.clear(); F.timer.hidden = true;
        const q = free ? null : api.qs[sc.qi];
        const correct = free ? true : (k === q.c);
        const turn = api.turn();
         
        const kx = sc.keeperX, dx = z.cx - kx, reach = level.reach * L.gw;
        const reads = rnd() < level.react;
        const saved = correct && (Math.abs(dx) <= reach || (reads && Math.abs(dx) <= reach * 2.3));
        const dir = dx >= 0 ? 1 : -1;
        const flight = level.flight;

        api.sfx('turn');
        sc.striker.run();
        sc.tweens.add({ targets: sc.striker.c, x: L.bx - 22 * s, y: L.by + 10 * s, duration: 280, ease: 'Quad.easeIn', onComplete: () => {
          sc.striker.kick();
          api.sfx('pop');
           
          const x0 = sc.ball.x, y0 = sc.ball.y, x1 = z.cx, y1 = z.cy;
          const arc = 90 * s * (z.cy < L.gTop + L.gh / 2 ? 1.3 : 0.8);
          sc.tweens.addCounter({ from: 0, to: 1, duration: flight, ease: 'Sine.easeOut',
            onUpdate: tw => { const p = tw.getValue();
              sc.ball.x = x0 + (x1 - x0) * p; sc.ball.y = y0 + (y1 - y0) * p - Math.sin(Math.PI * p) * arc;
               
              const base = s * (0.55 - 0.22 * p), sq = Math.max(0, 1 - p * 5);
              sc.ball.setScale(base * (1 + 0.38 * sq), base * (1 - 0.34 * sq)); sc.ball.angle += 14;
              sc.shadow.x = sc.ball.x; sc.shadow.y = L.by + 2 + (L.gBot - L.by) * p; sc.shadow.setAlpha(0.28 * (1 - p * 0.7)); },
            onComplete: () => sc.land(z, correct, saved, turn) });
           
          const diveTo = saved ? (z.cx - kx) : (dir * reach * 0.8 * (reads ? -1 : 1));
          sc.time.delayedCall(flight * 0.25, () => { if (sc.keeper) sc.keeper.dive(diveTo >= 0 ? 1 : -1, diveTo, flight * 0.7); });
        } });
      }

      land(z, correct, saved, turn) {
        const sc = this, L = sc.sc, s = L.s;
        const kit = kits[turn].map(A.hex);
        if (!correct) {
           
          z.st = 'no'; const c = api.qs[sc.qi].c; if (sc.zones[c]) sc.zones[c].st = 'ok';
          sc.drawPlates();
          A.feel.hitstop(sc, 70); A.feel.shake(sc, 140, 0.004);
          api.sfx('soft');
          sc.tweens.add({ targets: sc.ball, x: z.cx + (rnd() - 0.5) * 120 * s, y: L.by - 90 * s, scale: s * 0.5, duration: 520, ease: 'Bounce.easeOut' });
          sc.tweens.add({ targets: sc.shadow, x: z.cx, y: L.by - 10 * s, alpha: 0.2, duration: 520 });
          A.feel.burst(sc, z.cx, z.cy, [PAL.bad, 0xffffff], 14, { tex: 'ar-dot', vmin: 120, vmax: 260, s: 0.7, g: 700 });
          A.feel.pop(sc, L.gx, L.gBot + 60 * s, 'خطأ', { color: '#ffd5d5', fontSize: Math.max(44, 58 * s) + 'px' });
          sc.striker.miss(); sc.keeper.joy();
          sc.streak[turn] = 0;
          api.judge(false, { text: 'الصحيح: ' + api.qs[sc.qi].a[c] });
          return sc.after(1800);
        }
        if (saved) {
           
          z.st = 'ok'; sc.drawPlates();
          sc.tweens.add({ targets: sc.ball, x: sc.keeper.c.x, y: sc.keeper.c.y - L.gh * 0.45, scale: s * 0.36, duration: 160 });
          sc.shadow.setAlpha(0);
          A.feel.hitstop(sc, 80); A.feel.shake(sc, 160, 0.005);
          A.feel.burst(sc, z.cx, z.cy, [0xffffff, PAL.sun], 12, { tex: 'ar-dot', vmin: 100, vmax: 240, s: 0.6, g: 600 });
          A.feel.pop(sc, L.gx, L.gBot + 60 * s, 'تصدّى الحارس', { color: '#fff3c4', fontSize: Math.max(40, 50 * s) + 'px' });    
          sc.keeper.joy(); sc.striker.miss();
          if (!free) { api.score(turn, 1); api.judge(true, { text: 'صحيح — نقطة' }); sc.streak[turn]++; }
          else api.sfx('good');
          return sc.after(1700);
        }
         
        z.st = 'ok'; sc.drawPlates();
        sc.tweens.add({ targets: sc.ball, y: z.cy + 14 * s, scale: s * 0.3, alpha: 0.85, duration: 180, ease: 'Sine.easeOut' });
        sc.shadow.setAlpha(0);
        sc.tweens.add({ targets: sc.netG, scaleX: 1.025, scaleY: 1.03, duration: 120, yoyo: true, repeat: 2, ease: 'Sine.easeInOut' });
        A.feel.hitstop(sc, 95); A.feel.flash(sc, 110); A.feel.shake(sc, 220, 0.008);
        api.sfx('good');
        sc.time.delayedCall(60, () => {
          A.feel.burst(sc, z.cx, z.cy, kit.concat([PAL.sun, 0xffffff]), 46);
          A.feel.burst(sc, L.gx, L.gTop, kit, 30, { a0: 20, a1: 160, vmin: 150, vmax: 380 });
        });
        sc.wave();
        sc.striker.joy(); sc.keeper.miss();
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
        sc.state = 'shot'; sc.hlG.clear(); F.timer.hidden = true;
        const c = api.qs[sc.qi].c; if (sc.zones[c]) sc.zones[c].st = 'ok'; sc.drawPlates();
        A.feel.pop(sc, L.gx, L.gBot + 60 * s, 'انتهى الوقت', { color: '#ffd5d5', fontSize: Math.max(40, 52 * s) + 'px' });
        sc.striker.miss(); sc.keeper.joy();
        sc.streak[api.turn()] = 0;
        api.judge(false, { text: 'الصحيح: ' + api.qs[sc.qi].a[c] });
        sc.after(1800);
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
