// Teach page: entry on the landing page, both modes (base / Marine Worlds), every term opens its note, the 「问」 buttons
// ask the rules assistant that exact question, 注意事项, the icon guide, phone width. /api/chat is mocked, so this never
// asks a real model. Usage: node tests/test_teach.mjs <base-url> <shots-dir>   (safe against the live site: it writes nothing)
import { chromium } from 'playwright-core';
const [base, out] = process.argv.slice(2);
let fails = 0;
const eq = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fails++; console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); };

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 375, height: 667 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.route('https://boardgame.leisurecat.cloud/**', r => r.fulfill({ json: { ok: true } }));
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
const asked = [];
await page.route('**/api/chat', async r => {
  const q = JSON.parse(r.request().postData()).messages.at(-1).content; asked.push(q);
  await r.fulfill({ contentType: 'text/event-stream', body: `data: ${JSON.stringify({ choices: [{ delta: { content: `答：${q}` } }] })}\n\ndata: [DONE]\n\n` });
});
const answered = n => page.waitForFunction(n => document.querySelectorAll('.cm.a').length >= n && !document.querySelector('.cm.a:last-child .cdots'), n);

await page.goto(base); await page.waitForSelector('.teachgo');
eq('landing shows the teach entry', await page.textContent('.teachgo b'), '第一次玩？6 分钟讲规则');
await page.click('.teachgo'); await page.waitForSelector('.tpart');
eq('teach page opened', new URL(page.url()).pathname, '/teach');
eq('eight parts plus 注意事项', await page.$$eval('.tpart h2 span', l => l.map(h => h.lastChild.textContent)),
  ['怎么赢', '你面前有什么', '一回合：挑一张行动卡', '建造和动物', '卡牌、协会、赞助商', '保护项目', '休息', '结束和计分', '注意事项']);
const modeOn = () => page.$eval('.tmode [aria-pressed="true"]', b => b.textContent);
const script = () => page.$$eval('.tline', l => l.map(p => p.textContent).join(''));
const noteCount = () => page.$$eval('#later details', l => l.length);
const lead = () => page.textContent('.tlead');
eq('base game by default', await modeOn(), '只玩基础');
// every important element is at least named
const BASE_WORDS = ['魅力', '保护点数', '计分区', '交错', '休息', '动物园地图', '行动卡', '强度', '槽 1', 'X 标记', '升级', 'II 面', '事务员', '玩家标记', '终局计分卡',
  '建造', '标准饲养区', '贩售亭', '休憩亭', '萌宠园', '爬行馆', '鸟禽馆', '动物卡', '卡牌', '展示区', '声望', '协会板', '合作动物园', '大学', '赞助商', '独有建筑',
  '保护项目', '基础保护项目', '动物类别', '奖励板块', '收入', '新版计分', '小白字', '平分'];
const MARINE_WORDS = ['海洋世界', '变体行动卡', '海洋动物', '海洋馆', '珊瑚住客', '新大学', '海浪'];
const read = await script(), baseNotes = await noteCount();
console.log(`  base game: ${read.length} characters, ${baseNotes} notes; ${await lead()}`);
eq('base script about six minutes (under 1650 characters)', read.length < 1650, true);
eq('lead says about 6 minutes', (await lead()).includes('约 6 分钟'), true);
for (const w of BASE_WORDS) if (!read.includes(w)) { fails++; console.log('FAIL base script mentions', w); }
eq('base script has nothing from Marine Worlds', MARINE_WORDS.filter(w => read.includes(w)), []);
eq('base: 20 notes, none tagged, no Marine icons', [baseNotes, await page.$$eval('#later .tnw', l => l.length), await page.$$eval('.tic[data-t="wave"]', l => l.length)], [20, 0, 0]);
await page.screenshot({ path: out + '/ark_teach_top.png' });
await page.click('.tmode [data-mode="m"]');
const mRead = await script(), mNotes = await noteCount();
console.log(`  Marine Worlds: ${mRead.length} characters, ${mNotes} notes; ${await lead()}`);
eq('Marine script about seven minutes (under 1800 characters)', [mRead.length < 1800, (await lead()).includes('约 7 分钟')], [true, true]);
for (const w of [...BASE_WORDS, ...MARINE_WORDS]) if (!mRead.includes(w)) { fails++; console.log('FAIL Marine script mentions', w); }
eq('Marine notes: base ones plus 7 tagged', [mNotes, await page.$$eval('#later .tnw', l => l.length)], [27, 7]);

// every term in the script and every icon in the guide opens a note with a name, a picture and both texts
const ids = await page.$$eval('[data-t]', l => [...new Set(l.map(x => x.dataset.t))]);
const bad = [];
for (const id of ids) {
  await page.evaluate(id => document.querySelector(`[data-t="${id}"]`).click(), id);
  const img = page.locator('.tshd img');
  await img.evaluate(i => i.complete || new Promise(r => { i.onload = i.onerror = r; }));
  const n = await page.$eval('.tsheet', s => ({ open: !s.classList.contains('hidden'), name: s.querySelector('.tshd b')?.textContent, icon: s.querySelector('.tshd img')?.naturalWidth > 0, ps: [...s.querySelectorAll('p')].map(p => p.textContent.length) }));
  if (!n.open || !n.name || !n.icon || n.ps.length !== 2 || n.ps.some(x => x < 8)) bad.push([id, n]);
  await page.click('.tsx');
}
console.log(`  ${ids.length} terms checked`);
eq('every term opens a note with its picture and text', bad, []);
eq('the note closes', await page.$eval('.tsheet', s => s.classList.contains('hidden')), true);
const term = page.locator('#p4 .term').first();
await term.scrollIntoViewIfNeeded(); await term.click();
await page.screenshot({ path: out + '/ark_teach_note.png' });

// asking from a note: closes the note, opens the assistant, sends the question
const nm = await page.textContent('.tshd b');
await page.click('.tsask'); await answered(1);
eq('note → assistant asked about that term', [asked.at(-1), await page.isVisible('.cpanel'), await page.$eval('.tsheet', s => s.classList.contains('hidden'))],
  [`「${nm}」是什么，怎么用？`, true, true]);
await page.click('.cx');
// a 「问」 button sends exactly its question and the answer shows
const q = await page.$eval('#p3 .tq', x => x.dataset.q);
await page.locator('#p3 .tq').first().click(); await answered(2);
eq('「问」 sends its question', [asked.at(-1), await page.$$eval('.cm.a', l => l.at(-1).textContent)], [q, `答：${q}`]);
await page.click('.cx');
// every 「问」 question is one the site's FAQ answers (the assistant answers it from the notes, without searching)
const faq = await (await fetch(new URL('/faq.json', base))).json();
const qs = await page.$$eval('.tasks .tq', l => l.map(x => x.dataset.q));
await page.click('.tmode [data-mode="b"]');
qs.push(...await page.$$eval('.tasks .tq', l => l.map(x => x.dataset.q)));
eq('every 「问」 question is in the FAQ', [...new Set(qs)].filter(q => !faq.some(f => f.q === q)), []);
await page.click('.tmode [data-mode="m"]');
// 注意事项: each a title and a written answer, closed until tapped; 「还有疑问？」 asks about that item
const notes = await page.$$eval('#later details', l => l.map(d => ({ open: d.open, t: d.querySelector('summary i').nextSibling.textContent, a: d.querySelector('p').textContent.length, q: d.querySelector('.tmore')?.dataset.q })));
eq('every note has a title and a 2–4 sentence answer, closed at first', notes.filter(n => n.open || n.t.length < 2 || n.a < 40 || n.a > 260), []);
eq('every note asks about its own title', notes.filter(n => n.q !== `「${n.t}」这一条我还有疑问，请再讲讲。`), []);
eq('注意事项 comes after the script and ends with the AI hint', await page.$eval('#later', s => [!!s.previousElementSibling?.matches('#p8'), s.lastElementChild.textContent]),
  [true, '注意事项里没有的，点右下角「规则」问 AI，本站资料查不到会联网找。']);
const n3 = page.locator('#later details').nth(2);
await n3.locator('summary').click();
eq('tapping a note opens it', [await n3.evaluate(d => d.open), await n3.locator('p').isVisible(), await n3.locator('.tmore').isVisible()], [true, true, true]);
await n3.scrollIntoViewIfNeeded(); await page.screenshot({ path: out + '/ark_teach_notes.png' });
await n3.locator('.tmore').click(); await answered(3);
eq('「还有疑问？」 sends that note\'s question', asked.at(-1), notes[2].q);
await page.click('.cx');
eq('no button inside a button', await page.$$eval('button button', l => l.length), 0);

// icon guide: every picture loads and has a name
await page.evaluate(() => Promise.all([...document.querySelectorAll('.tic img')].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))));
const tiles = await page.$$eval('.tic', l => l.map(t => [t.dataset.t, t.querySelector('img')?.naturalWidth > 0, t.textContent.trim().length > 0]));
eq('icon guide: every picture loads', tiles.filter(t => !t[1] || !t[2]), []);
console.log(`  icon guide: ${tiles.length} icons`);
await page.locator('#icons').scrollIntoViewIfNeeded(); await page.screenshot({ path: out + '/ark_teach_icons.png' });
eq('no sideways scrolling at 375 px', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
eq('「去建房间」 goes to the landing page', await page.getAttribute('.tgo', 'href'), '/');
// the choice is remembered in this browser
await page.reload(); await page.waitForSelector('.tpart');
eq('Marine Worlds remembered after reload', [await modeOn(), await noteCount()], ['带海洋世界', 27]);
eq('no page errors', errs, []);
await b.close();
console.log(fails ? `${fails} FAILED` : 'ALL PASS'); process.exit(fails ? 1 : 0);
