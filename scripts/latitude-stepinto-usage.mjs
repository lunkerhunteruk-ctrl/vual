// LATITUDE「Step into this look」の利用の数（2026-10-22）。日ごとに：画面を開いた回数・人数／作った回数・人数。
// 使い方：node scripts/latitude-stepinto-usage.mjs [日数=14]
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', quiet: true });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const days = Number(process.argv[2] || 14);
const rows = [];
for (let i = 0; i < days; i++) {
  const d = new Date(Date.now() - i * 864e5).toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
  const count = async (kind) => {
    const { data } = await s.storage.from('latitude-logs').list(`${kind}/${d}`, { limit: 1000 });
    const names = (data || []).map((o) => o.name);
    return [names.length, new Set(names.map((n) => n.split('__')[0])).size];
  };
  const [o, ou] = await count('open'); const [g, gu] = await count('stepinto');
  if (o || g) rows.push({ date: d, opened: o, openedPeople: ou, made: g, madePeople: gu });
}
console.table(rows.length ? rows : [{ note: 'no use yet' }]);
