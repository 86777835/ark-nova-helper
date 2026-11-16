// Personal panel (panel.html): setting up the card order, an action moves its card to slot 1 and shifts the cards left of
// it (base rulebook p8), X-tokens spent and gained (max 5), the Sponsors money option (strength, ×2 on side II),
// workers sent and recalled at the break, upgrades, undo, the Marine Worlds lines, reload keeps everything, phone width.
// Only localStorage is used and /api/chat is not called, so it writes nothing anywhere.
// Usage: node tests/test_panel.mjs <base-url> <shots-dir>
import { chromium } from 'playwright-core';
const [base, out] = process.argv.slice(2);
let fails = 0;
const eq = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fails++; console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); };

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 375, height: 760 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.route('https://boardgame.leisurecat.cloud/**', r => r.fulfill({ json: { ok: true } }));
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
const chats = []; await page.route('**/api/chat', r => { chats.push(r.request().postData()); r.fulfill({ contentType: 'text/event-stream', body: 'data: [DONE]\n\n' }); });
const order = () => page.$$eval('[data-use]', l => l.map(x => x.dataset.use));
const num = act => page.$eval(`.pn-stats [data-act="${act}"] ~ output, .pn-stats .pn-step:has([data-act="${act}"]) output`, o => Number(o.textContent));
const open = async a => { await page.click(`[data-use="${a}"]`); await page.waitForSelector('.pn-sheet'); };
const lines = () => page.$$eval('.pn-sheet .pn-list li', l => l.map(x => x.textContent).join('\n'));

await page.goto(base); await page.waitForSelector('.pngo');
eq('landing shows the panel entry', await page.textContent('.pngo b'), '我的面板');
await page.click('.pngo'); await page.waitForSelector('[data-pick]');
eq('panel page opened', new URL(page.url()).pathname, '/panel');
eq('animals fixed in slot 1 at setup', await page.$$eval('[data-pick]', l => l.map(x => x.dataset.pick)), ['cards', 'build', 'assoc', 'sponsors']);
for (const a of ['build', 'cards', 'assoc', 'sponsors']) await page.click(`[data-pick="${a}"]`);
await page.click('[data-act="start"]'); await page.waitForSelector('[data-use]');
eq('order as tapped', await order(), ['animals', 'build', 'cards', 'assoc', 'sponsors']);
eq('starts with 25 money, 0 X, 1 worker', [await num('money'), await num('x'), await num('free')], [25, 0, 1]);

// Build from slot 2: it goes to slot 1, animals shifts right; the cards right of it stay.
await open('build');
eq('build: strength 2 limits the size', (await lines()).includes('最多 2 格'), true);
eq('build: placement bonus and +7 for a full map are listed', /奖励图标[\s\S]*\+7 魅力/.test(await lines()), true);
await page.click('[data-act="dm"][data-d="-5"]'); await page.click('[data-act="dm"][data-d="-1"]');
await page.click('[data-act="done"]'); await page.waitForTimeout(250);
eq('build moved to slot 1, animals shifted', await order(), ['build', 'animals', 'cards', 'assoc', 'sponsors']);
eq('money spent on building', await num('money'), 19);

// X-tokens: spend 2 on the Association action in slot 4 → strength 6, all four tasks reachable.
for (let i = 0; i < 3; i++) await page.click('.pn-stats [data-act="x"][data-d="1"]');
await open('assoc');
eq('assoc at strength 4: protection project (5) not reachable', await page.$$eval('.pn-tasks span.ok', l => l.length), 3);
await page.click('[data-act="k"][data-d="1"]');
eq('one X → strength 5', await page.textContent('.pn-str>b'), '5');
eq('assoc at strength 5: all four tasks', await page.$$eval('.pn-tasks span.ok', l => l.length), 4);
await page.click('[data-act="dw"][data-d="1"]');
eq('cannot send more workers than are free', await page.$eval('[data-act="dw"][data-d="1"]', x => x.disabled), true);
await page.click('[data-up="cards"]'); await page.click('[data-act="dt"][data-d="1"]');
await page.click('[data-act="done"]'); await page.waitForTimeout(250);
eq('assoc to slot 1', await order(), ['assoc', 'build', 'animals', 'cards', 'sponsors']);
eq('X: 3 − 1 used', await num('x'), 2);
eq('workers: 1 sent, 1 woken → 1 of 2 free', [await num('free'), await page.textContent('.pn-stats .pn-row:nth-child(3) small')], [1, '共 2 个']);
eq('cards flipped to side II', await page.textContent('[data-use="cards"] em'), 'II');

// Cards on side II: snap from strength 3 (slot 4 here); the break track is pushed 2.
await open('cards');
eq('cards II at strength 4 can snap', (await lines()).includes('强度够 3'), true);
eq('cards: break token 2 first', (await lines()).includes('先把休息标记推 2 格'), true);
await page.click('.tsx');

// Sponsors from slot 5 for money with 2 X → strength 7 → 7 money; the break token reaches the end: +1 X, break list opens.
await open('sponsors');
await page.click('[data-act="k"][data-d="1"]'); await page.click('[data-act="k"][data-d="1"]');
eq('sponsors money option at strength 7', (await lines()).includes('拿 7 钱'), true);
await page.click('[data-t="cash"]'); await page.click('[data-t="brk"]');
await page.click('[data-act="done"]'); await page.waitForSelector('.pn-break');
eq('break list (base: 6 steps) opens after reaching the end', await page.$$eval('.pn-break li', l => l.length), 6);
await page.click('[data-act="inc"][data-d="5"]'); await page.click('[data-act="inc"][data-d="5"]'); await page.click('[data-act="inc"][data-d="1"]');
if (out) await page.screenshot({ path: `${out}/ark_panel_break.png` });
await page.click('[data-act="breakdone"]'); await page.waitForTimeout(250);
eq('money: 19 + 7 + income 11', await num('money'), 37);
eq('X: 2 − 2 used + 1 for the break', await num('x'), 1);
eq('all workers back after the break', await num('free'), 2);
eq('sponsors to slot 1', await order(), ['sponsors', 'assoc', 'build', 'animals', 'cards']);

// X-token action with any card: card to slot 1, +1 X, nothing else; not allowed at 5 X.
await open('animals'); await page.click('[data-act="xact"]'); await page.waitForTimeout(250);
eq('X-token action: animals to slot 1, +1 X', [await order(), await num('x')], [['animals', 'sponsors', 'assoc', 'build', 'cards'], 2]);
for (let i = 0; i < 3; i++) await page.click('.pn-stats [data-act="x"][data-d="1"]');
await open('cards');
eq('no X-token action at 5 X', await page.$eval('[data-act="xact"]', x => x.disabled), true);
await page.click('.pn-q'); await page.waitForTimeout(300);
eq('「问规则助手」 asks about this action', chats.length === 1 && JSON.parse(chats[0]).messages.at(-1).content.includes('卡牌行动（II 面，强度 5）'), true);
await page.goto(base + 'panel'); await page.waitForSelector('[data-use]');

// Undo, reload, Marine Worlds.
await page.click('.pn-stats [data-act="money"][data-d="5"]'); await page.click('[data-act="undo"]');
eq('undo', await num('money'), 37);
await page.reload(); await page.waitForSelector('[data-use]');
eq('reload keeps the order and counts', [await order(), await num('money'), await num('x')], [['animals', 'sponsors', 'assoc', 'build', 'cards'], 37, 5]);
await open('build');
eq('base game: no waves', (await lines()).includes('海浪'), false);
await page.click('.tsx'); await page.click('[data-mode="m"]');
await open('build');
eq('Marine Worlds: waves when the display refills, variant cards note', [(await lines()).includes('海浪'), (await page.textContent('.pn-sheet')).includes('变体行动卡')], [true, true]);
await page.click('.tsx');
await page.click('[data-act="break"]');
eq('Marine Worlds break list: 8 steps with waves', [await page.$$eval('.pn-break li', l => l.length), (await page.textContent('.pn-break')).includes('海浪')], [8, true]);
await page.click('.tsx');
await page.click('[data-act="edit"]'); await page.click('[data-mv="0"][data-d="1"]'); await page.click('[data-flip="build"]');
eq('adjust: swap and flip', [await page.$$eval('.pn-slot b', l => l.map(x => x.textContent)), await page.textContent('[data-flip="build"]')], [['赞助商', '动物', '协会', '建造', '卡牌'], 'II 面']);
eq('no sideways scrolling at 375 px', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
if (out) { await page.click('[data-act="edit"]'); await page.screenshot({ path: `${out}/ark_panel.png`, fullPage: true }); }
await page.goto(base + 'panel?r=AB12'); await page.waitForSelector('[data-use]');
eq('opened from a room, 返回 goes back to it', await page.getAttribute('.back-nav', 'href'), '/?r=AB12');
eq('no page errors', errs, []);
await b.close();
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
process.exitCode = fails ? 1 : 0;
