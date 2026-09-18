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
