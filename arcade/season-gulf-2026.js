(function () {
  const G = (typeof window !== 'undefined' ? window : globalThis);
  const S = G.SHIFT = G.SHIFT || {};
  const A = S.arcade = S.arcade || {};
  A.season = {
    id: 'gulf-2026',
    name: 'دوري الفصل — موسم الخليج',
    from: '2026-09-23',
    to: '2026-10-06',
    teams: [
      { name: 'الكويت',   kit: ['#1e63c9', '#ffffff'] },
      { name: 'السعودية', kit: ['#1a8f3c', '#ffffff'] },
      { name: 'العراق',   kit: ['#ffffff', '#1a8f3c'] },
      { name: 'عُمان',    kit: ['#e2231a', '#ffffff'] },
      { name: 'قطر',      kit: ['#8a1538', '#ffffff'] },
      { name: 'الإمارات', kit: ['#f2f2f2', '#d7262e'] },
      { name: 'البحرين',  kit: ['#b3121e', '#ffffff'] },
      { name: 'اليمن',    kit: ['#2b2b2b', '#e2231a'] },
    ],
  };
})();
