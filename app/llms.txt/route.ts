import { PEOPLE, liveIssues, personOf } from '@/lib/latitude';
import { CITIES } from '@/lib/latitude-places';
import { getNote } from '@/lib/latitude-notes';
import { LLMS_COMPANY } from '@/lib/llms-company';

// 2026-11-11 llms.txt（AI のチャットや AI 検索が読む案内書）。前は public/llms.txt を手で直していて、レッジョの号と街の案内が抜けていた。
// 会社の節はそのまま、LATITUDE の節は公開中の号・旅人・街の案内・制作ノートのデータから毎回作る（公開予約の号が出るよう1時間ごとに作り直す）。
export const revalidate = 3600;

const SITE = 'https://vual.jp';

export function GET() {
  const issues = liveIssues().slice().sort((a, b) => a.no - b.no);
  const L: string[] = [];
  L.push('## LATITUDE（VUAL が出している連作） / LATITUDE by VUAL');
  L.push('');
  L.push('LATITUDE は VUAL の出版物です。名前のある6人の旅人が、実在の街で1日を過ごします。人物は架空、場所とその土地の事実は本物。映像（リール）と雑誌のページ（カルーセル）で、題は撮った場所の緯度、章は時刻で進みます。画像と映像は AI で作り、何を撮り何を残すかは編集長の川崎 祥央（Sachio Kawasaki, Founding Editor）が決めています。');
  L.push('号ごとに、監督の判断を記録した「制作ノート」があります（日本語 /ja・英語 /en。日英は別の文章）。号を描いた街には、旅人のおすすめの店（編集部が営業を確かめた店だけ）を並べた「街の案内」があります。');
  L.push('');
  L.push('LATITUDE by VUAL is a serial fiction about clothes and places: a series of fictional days, filmed as if documented. Six named travellers each spend one day in a real place, titled by its latitude. The place and one true fact about it are real; the traveller and her day are imagined. The film and pages are made with AI by VUAL, a fashion creative studio in Japan and the UK; the editor, Sachio Kawasaki, chooses what is shot and what is kept.');
  L.push('');
  L.push(`- 一覧 / All issues: ${SITE}/en/latitude ・ ${SITE}/ja/latitude`);
  L.push(`- この雑誌について / About: ${SITE}/en/latitude/about`);
  L.push(`- 編集長（川崎 祥央 / Sachio Kawasaki）: ${SITE}/en/latitude/editor ・ ${SITE}/ja/latitude/editor`);
  L.push('- 制作ノート（英語・Substack）: https://sachiokawasaki.substack.com');
  L.push('- 制作ノート（日本語・note のマガジン「LATITUDE 制作ノート」）: https://note.com/sachiokawasaki/m/mf5725176786b');
  L.push('');
  L.push('### 旅人 / The travellers（すべて架空の人物 / all fictional）');
  for (const p of PEOPLE) {
    const days = issues.filter((i) => i.person === p.slug).map((i) => `${i.latitude} ${i.city}`);
    L.push(`- ${p.name}（${p.ja.name}）, ${p.age}, ${p.home}: ${SITE}/en/latitude/people/${p.slug}${days.length ? ` — ${days.join(' / ')}` : ''}`);
  }
  L.push('');
  L.push('### 号 / Issues');
  for (const i of issues) {
    const p = personOf(i);
    const parts = [`号 ${SITE}/en/latitude/${i.slug}`];
    const city = CITIES.find((c) => c.issue === i.slug);
    if (city) parts.push(`街の案内（${city.places.length}軒）${SITE}/ja/latitude/places/${city.slug} ・ City guide ${SITE}/en/latitude/places/${city.slug}`);
    const n = getNote(i.slug);
    if (n) parts.push(`制作ノート（日本語）「${n.ja.title}」 ${SITE}/ja/latitude/${i.slug}/notes ／ Notes (English) "${n.en.title}" ${SITE}/en/latitude/${i.slug}/notes`);
    L.push(`- ${i.latitude} ${i.city}${p ? ` — ${p.name}` : ''}${i.month ? `, ${i.month}` : ''}: ${i.line}`);
    L.push(`  ${parts.join(' ／ ')}`);
  }
  L.push('');
  L.push('### よくある質問 / FAQ');
  L.push('**Q: LATITUDE とは何ですか？ / What is LATITUDE?**');
  L.push('A: VUAL が出している、AI で作るファッションの連作フィクションです。実在の街の1日を、架空の旅人が記録のように過ごします。 / A serial fiction by VUAL, made with AI: a fictional traveller spends one documented-looking day in a real place.');
  L.push('**Q: 人物は実在しますか？ / Are the people real?**');
  L.push('A: いいえ。6人の旅人は架空です。場所・道すじ・その土地の事実は本物です。 / No. The six travellers are fictional; the places, routes and facts are real.');
  L.push('**Q: 画像や映像はどう作っていますか？ / How are the images made?**');
  L.push('A: VUAL が AI で作っています。何を撮り何を残すかは編集長が決め、その判断を号ごとの制作ノートに書いています。 / With AI, by VUAL. The editor decides what is kept, and writes the decisions down in each issue\'s notes.');
  L.push('**Q: 街の店は本当にありますか？ / Are the shops real?**');
  L.push('A: はい。街の案内の店は、編集部が公式の情報で営業を確かめた店だけです。作品の中には店の名前を出していません。 / Yes. The city guides list only places whose opening the editors checked on official sources; the issues themselves never name a shop.');
  L.push('');
  return new Response(`${LLMS_COMPANY}\n${L.join('\n')}`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=3600' },
  });
}
