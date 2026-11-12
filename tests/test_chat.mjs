// Rules assistant. Usage: node tests/test_chat.mjs <base-url> <shots-dir> --no-key | --mock-upstream | --mock-web | --live
//   --no-key        local `wrangler dev` without DEEPSEEK_API_KEY: explicit error, no model label
//   --mock-upstream local `wrangler dev --var DEEPSEEK_API_KEY:fake --var DEEPSEEK_BASE:http://127.0.0.1:8790 --var CHAT_CF_MODEL:@cf/none/missing`: backup models
//   --mock-web      same wrangler dev flags: web search when the notes don't cover a question (run 1 min apart from --mock-upstream: 8 questions a minute)
//   --live          the deployed site with a real key: one question the notes cover, one that needs the web (not via helpers: BASE must be local there)
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const [base, out, mode] = process.argv.slice(2);
assert(['--no-key', '--mock-upstream', '--mock-web', '--live'].includes(mode), 'mode: --no-key | --mock-upstream | --mock-web | --live');
let fails = 0;
const eq = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fails++; console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); };
const wait = ms => new Promise(r => setTimeout(r, ms));
const sse = text => `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\ndata: [DONE]\n\n`;

if (mode === '--no-key') {
  const {BASE, browser, phone, shot} = await import('./helpers.mjs');
  const b = await browser(); try { const c = await phone(b), p = await c.newPage(); await p.goto(BASE); await p.click('.cfab'); await p.fill('.cin textarea', '海浪什么时候触发？'); await p.click('.cin button'); await p.waitForFunction(() => document.querySelector('.clog').textContent.includes('还没有配置好')); assert.doesNotMatch(await p.locator('.clog').textContent(), /DeepSeek|Qwen|Flash|Pro/); await shot(p, 'chat_no_key'); await p.click('.cx'); assert(await p.locator('.cfab').isVisible()); console.log('PASS chat --no-key, explicit error, no model label'); } finally { await b.close(); }
  process.exit(0);
}

const b = await chromium.launch({ channel: 'chrome' });
const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
page.on('pageerror', e => { fails++; console.log('FAIL page error', e.message); });
const bodies = []; page.on('request', r => r.url().endsWith('/api/chat') && bodies.push(JSON.parse(r.postData())));
const readLast = () => page.$$eval('.cm.a', l => { const a = l.at(-1); return { err: a.className.includes('err'), label: !!a.querySelector('.cweb'),
  text: [...a.childNodes].filter(n => !n.classList?.contains('cweb') && !n.classList?.contains('csrc')).map(n => n.textContent).join(''),
  src: [...a.querySelectorAll('.csrc a')].map(x => [x.textContent, x.getAttribute('href'), x.target]) }; });
const send = async q => { await page.fill('.cin textarea', q); await page.press('.cin textarea', 'Enter'); await page.waitForFunction(() => !document.querySelector('.cin button').disabled, null, { timeout: 60000 }); };
await page.goto(base); await page.click('.cfab');

if (mode === '--live') {
  for (const q of ['休息时要做哪些事？', '海洋世界里 Cleaner Wrasse 这张卡的效果什么时候触发？']) {
    const t0 = Date.now(); await send(q); const a = await readLast();
    console.log(`\nQ: ${q}\n(${((Date.now() - t0) / 1000).toFixed(1)} s, web label: ${a.label})\nA: ${a.text}\n${a.src.map(s => '  ' + s[0] + ' ' + s[1]).join('\n')}`);
    eq('no error: ' + q, a.err, false);
    await page.screenshot({ path: `${out}/ark_chat_live_${a.label ? 'web' : 'notes'}.png` });
  }
}

if (mode === '--mock-upstream') {
  const { createServer } = await import('node:http');
  let reply = {}, seen = [];   // reply: model → status | 'queue' | 'stall'; seen: models asked, in order
  const srv = createServer((req, res) => {
    let body = ''; req.on('data', c => body += c);
    req.on('end', () => {
      const { model } = JSON.parse(body); seen.push(model);
      const st = reply[model] ?? 200;
      if (st === 'queue' || st === 'stall') {   // like an overloaded DeepSeek: only keep-alive comments, before or mid-answer
        res.writeHead(200, { 'content-type': 'text/event-stream' });
        if (st === 'stall') res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: `${model} 答了一半` } }] })}\n\n`);
        const t = setInterval(() => res.write(': keep-alive\n\n'), 1000);
        return res.on('close', () => clearInterval(t));
      }
      if (st !== 200) { res.writeHead(st, { 'content-type': 'application/json' }); return res.end('{"error":{"message":"mock"}}'); }
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      res.end(sse(`${model} 的回答`));
    });
  }).listen(8790);
  const askOnce = async (q, r) => { reply = r; seen = []; await send(q); const a = await readLast(); return [a.err, a.text]; };
  eq('flash answers', [await askOnce('一', {}), seen], [[false, 'deepseek-flash 的回答'], ['deepseek-flash']]);
  eq('flash busy, cloudflare fails → v4-pro answers, no model named', [await askOnce('二', { 'deepseek-flash': 503 }), seen],
    [[false, 'deepseek-v4-pro 的回答'], ['deepseek-flash', 'deepseek-v4-pro']]);
  eq('both busy → busy message', [await askOnce('三', { 'deepseek-flash': 503, 'deepseek-v4-pro': 503 }), seen],
    [[true, 'AI 服务器都在忙，请过一两分钟再问'], ['deepseek-flash', 'deepseek-v4-pro']]);
  let t = Date.now();
  eq('flash queueing → v4-pro answers after 9 s', [(await askOnce('四', { 'deepseek-flash': 'queue' }))[0], seen], [false, ['deepseek-flash', 'deepseek-v4-pro']]);
  console.log('  took', Date.now() - t, 'ms'); t = Date.now();
  eq('flash stalls mid-answer → partial dropped, v4-pro answers from the start', [await askOnce('五', { 'deepseek-flash': 'stall' }), seen],
    [[false, 'deepseek-v4-pro 的回答'], ['deepseek-flash', 'deepseek-v4-pro']]);
  console.log('  took', Date.now() - t, 'ms');
  eq('stalled partial not kept as history', bodies.at(-1).messages.slice(-1).map(m => m.content), ['五']);
  const [err6, text6] = await askOnce('六', { 'deepseek-flash': 'stall', 'deepseek-v4-pro': 'stall' });
  eq('every model stalls → partial kept, busy message', [err6, text6, seen], [true, 'deepseek-v4-pro 答了一半AI 服务器都在忙，请过一两分钟再问', ['deepseek-flash', 'deepseek-v4-pro']]);
  eq('no model name shown', /DeepSeek|Qwen|Flash/.test(await page.textContent('.clog')), false);
  srv.close();
}

if (mode === '--mock-web') {
  // The mock model asks to search for questions containing 「网上」; the mock search API answers per `search`.
  const { createServer } = await import('node:http');
  let search = 'ok', asked = [];   // search: 'ok' | 'empty' | 'fail'; asked: search queries received
  const srv = createServer((req, res) => {
    let body = ''; req.on('data', c => body += c);
    req.on('end', () => {
      const j = JSON.parse(body);
      if (req.url === '/v1/tools/search') {
        asked.push(j.query);
        if (search === 'fail') { res.writeHead(500); return res.end('{}'); }
        res.writeHead(200, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ results: search === 'empty' ? [] : [
          { title: 'Wave icon timing <b>', url: 'https://boardgamegeek.com/thread/1', site_name: 'BoardGameGeek', summary: 'Designer: after the action.' },
          { title: '海浪讨论', url: 'https://example.cn/a', site_name: null, snippet: '网友说行动后触发。' }] }));
      }
      const sys = j.messages[0].content, q = j.messages.at(-1).content;
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      if (sys.includes('联网搜索到的网页摘要')) return res.end(sse(`依据网上说法：行动后触发 [1]（摘要条数 ${(sys.match(/^\[\d\] /gm) || []).length}，${sys.includes('新旧两版计分口径') ? '要求标口径' : '没要求标口径'}）`));
      if (q.includes('先解释')) {   // the model explains first and asks to search at the end
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: '资料里没有提到这一点。' } }] })}\n\n`);
        return setTimeout(() => res.end(sse('\n\n【需联网】Ark Nova Marine Worlds reef')), 300);
      }
      if (q.includes('网上')) {   // the marker arrives split over two chunks, like a real stream
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: '【需' } }] })}\n\n`);
        return setTimeout(() => res.end(sse('联网】Ark Nova Marine Worlds wave icon')), 200);
      }
      res.end(sse(q.includes('无关') ? '我只解答方舟动物园规则。' : '资料里的回答'));
    });
  }).listen(8790);
  const askOnce = async (q, s) => { search = s; asked = []; await send(q); return readLast(); };
  const SRC = [['[1] Wave icon timing <b>BoardGameGeek', 'https://boardgamegeek.com/thread/1', '_blank'], ['[2] 海浪讨论example.cn', 'https://example.cn/a', '_blank']];
  eq('covered by the notes: answered directly, no search', [await askOnce('休息做什么？', 'ok'), asked],
    [{ err: false, label: false, text: '资料里的回答', src: [] }, []]);
  eq('not covered (marker split over chunks): searched BGG then the web, labelled, sources listed', [await askOnce('网上怎么说海浪？', 'ok'), asked],
    [{ err: false, label: true, text: '依据网上说法：行动后触发 [1]（摘要条数 2，要求标口径）', src: SRC },
     ['Ark Nova Marine Worlds wave icon site:boardgamegeek.com', 'Ark Nova Marine Worlds wave icon']]);
  await page.screenshot({ path: `${out}/ark_chat_web.png` });
  eq('the search request never reaches the page as text', (await page.$$eval('.cm.a', l => l.map(x => x.textContent).join(''))).includes('需联网'), false);
  eq('nothing found: says so, no label, nothing made up', [await askOnce('网上还有啥？', 'empty'), asked.length],
    [{ err: false, label: false, text: '本站资料里没有这一条，网上也没找到可靠的说法。建议翻一下规则书，或者问问桌上的老玩家。', src: [] }, 2]);
  eq('web answer goes back as plain history (no label, no sources)', bodies.at(-1).messages.slice(-3).map(m => m.content),
    ['网上怎么说海浪？', '依据网上说法：行动后触发 [1]（摘要条数 2，要求标口径）', '网上还有啥？']);
  eq('search API down: says so', (await askOnce('网上第三问？', 'fail')).text, '本站资料里没有这一条，联网查找也失败了，请过一会儿再问，或者翻一下规则书。');
  eq('off-topic: no search', [(await askOnce('无关的问题', 'ok')).text, asked], ['我只解答方舟动物园规则。', []]);
  eq('search asked for at the end of an explanation: explanation dropped, searched', [await askOnce('先解释再查', 'ok'), asked],
    [{ err: false, label: true, text: '依据网上说法：行动后触发 [1]（摘要条数 2，要求标口径）', src: SRC },
     ['Ark Nova Marine Worlds reef site:boardgamegeek.com', 'Ark Nova Marine Worlds reef']]);
  srv.close();
}

await b.close();
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
process.exit(fails ? 1 : 0);
