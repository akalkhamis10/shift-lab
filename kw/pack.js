(function () {
  const G = (typeof window !== 'undefined' ? window : globalThis);
  const S = G.SHIFT = G.SHIFT || {};

  const BASE = 'kw/';

  const CAST = {
    student: {
       
      happy:    ['girl-happy', 'boy-happy'],
      thinking: ['girl-thinking'],
    },
    teacher: {
      main: ['teacher-main'],
    },
  };
   
  const FALLBACK = { student: 'happy', teacher: 'main' };

  const BACKGROUNDS = { classroom: 'bg-classroom' };

  const CORNERS = ['البحر', 'البرّ', 'السوق', 'الديوانية'];

  const CALLS = [
    { call: 'اربطوا الشراع', act: 'ارفعوا أيديكم عالياً' },
    { call: 'جدّفوا', act: 'حرّكوا أذرعكم إلى الأمام' },
    { call: 'انحنوا للموج', act: 'ميلوا يميناً ثم يساراً' },
    { call: 'ارفعوا المرساة', act: 'اسحبوا الحبل بأيديكم' },
    { call: 'راقبوا الأفق', act: 'ضعوا أيديكم فوق أعينكم' },
    { call: 'أنزلوا الشراع', act: 'اخفضوا أيديكم ببطء' },
  ];

  const T = {
    id: 'kw',
     
    figure(role, state, opts) {
      opts = opts || {};
      const r = CAST[role]; if (!r) return null;
      const pool = r[state] || r[FALLBACK[role]];
      if (!pool || !pool.length) return null;
      const n = Math.abs(opts.n | 0) % pool.length;
      const size = opts.size === 'lg' ? 'lg' : 'sm';
      return BASE + pool[n] + '-' + size + '.webp';
    },
     
    background(name) {
      const f = BACKGROUNDS[name];
      return f ? BASE + f + '.webp' : null;
    },
     
    corners(n) { return CORNERS.slice(0, Math.max(2, Math.min(CORNERS.length, n | 0 || 4))); },

    calls(n) {
      const k = Math.max(1, n | 0 || CALLS.length), out = [];
      for (let i = 0; i < k; i++) out.push(CALLS[i % CALLS.length]);
      return out;
    },

    manifest() {
      const out = [];
      for (const role in CAST) for (const st in CAST[role]) for (const f of CAST[role][st])
        for (const sz of ['lg', 'sm']) { const u = BASE + f + '-' + sz + '.webp'; if (out.indexOf(u) < 0) out.push(u); }
      for (const b in BACKGROUNDS) out.push(BASE + BACKGROUNDS[b] + '.webp');
      return out;
    },
  };

  S.theme = T;
  if (typeof module !== 'undefined' && module.exports) module.exports = T;
})();
