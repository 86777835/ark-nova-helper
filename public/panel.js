// Personal panel: one player's money, X-tokens, association workers and the order of the 5 Action cards, kept on this
// phone (localStorage, nothing goes to the server). Tapping an Action card opens what to check for that action: before,
// what it may trigger, and the end of the turn, each line with its page in the official rulebooks, in this site's words.
// "做完了" moves the card to slot 1 and shifts the cards left of it to the right (base rulebook p8), and records the
// money, X-tokens, workers and upgrades of that turn. Card tables (how many cards / animals per strength) are not
// copied: the player reads them off the real card.
import { breakList } from './steps.js';

const ACTS = {
  animals: { name: '动物', icon: 'aanimals' }, cards: { name: '卡牌', icon: 'acards' }, build: { name: '建造', icon: 'abuild' },
  assoc: { name: '协会', icon: 'aassoc' }, sponsors: { name: '赞助商', icon: 'asponsor' },
};
const KEY = 'ark-panel-v1';
const fresh = marine => ({ marine, order: null, side: { animals: 1, cards: 1, build: 1, assoc: 1, sponsors: 1 }, money: 25, x: 0, wk: { total: 1, free: 1 }, checks: {} });
let S;
try { S = JSON.parse(localStorage.getItem(KEY)); } catch {}
if (!S?.side) S = fresh(false);
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
const undo = [];
const change = f => { undo.push(JSON.stringify(S)); if (undo.length > 30) undo.shift(); f(); save(); render(); };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const icon = (a, cls = '') => `<span class="pn-ic ${cls}"><img src="/img/teach/${ACTS[a].icon}.webp" alt=""></span>`;
const room = new URLSearchParams(location.search).get('r');
if (/^[A-Z0-9]{4}$/.test(room || '')) document.querySelector('.back-nav').href = '/?r=' + room;

// ---------- what to check, from the rulebooks ----------
const R = (t, p, src = '规则书') => ({ t, p, src });
const TRACKS = [
  R('保护点数到达或越过 2：升级一张行动卡，或多叫醒一个事务员。', 'p18'),
  R('到达或越过 5、8：拿 5 钱，或拿旁边一块奖励板块马上执行。', 'p18'),
  R('第一次有人到 10 保护点数：全桌每人弃 1 张终局计分卡。', 'p18'),
  R('声望走到旁边有奖励的格：马上拿，只拿一次。升到 10 以上要先升级卡牌行动；到 15 封顶，之后每多 1 声望改拿 1 魅力。', 'p9'),
];
const BREAK = R('休息标记推到终点：你拿 1 个 X（多余步数作废），这回合做完后全体休息。', 'p7');
const AFTER = R('卡上写着「完成后」的效果：整个行动做完、行动卡挪回槽 1 之后再执行。', 'p8');
const END = m => [
  R('从展示区拿过牌：回合结束再补，剩下的往低编号挪、顺序不变，再补满。', 'p9'),
  ...(m ? [R('补进来的牌带海浪：逐个处理，弃最低位再补，可能连锁；开局铺牌和打出的牌不算。', 'p4–5', '海洋规则书')] : []),
  R('你的魅力和保护点数两个标记进了同一计分区或已交错：游戏结束触发，其他人各再走一回合。', 'p19'),
];
const TASKS = [[2, '声望 +2'], [3, '合作动物园'], [4, '大学'], [5, '保护项目']];

function rules(a, side, s) {
  const II = side === 2;
  if (a === 'animals') return {
    before: [
      II ? R(`II 面：手牌和声望范围内展示区的动物都能打，从展示区打要另付那格编号的钱；能打要求动物行动升级的动物。${s >= 5 ? '强度够 5：可以在行动一开始先 +1 声望，范围马上变大。' : ''}`, 'p13')
        : R('按行动卡上的表，强度越高能打越多只。', 'p11'),
      R('每只先看卡左侧条件；付左上角的钱，对应大洲的合作动物园每个大洲图标减 3。卡给的钱后到，得先付得起全价。', 'p11'),
      R('住进够大的空标准饲养区并翻面，邻水、邻岩也要满足；萌宠只进萌宠园；爬行馆、鸟禽馆用玩家标记占格。', 'p11–12'),
    ],
    trig: [
      R('魅力按卡加；有的还加保护点数、声望。', 'p11'),
      R('动物自己的能力马上执行；你已打出的牌被这只动物触发的效果也马上执行，同时有几个时顺序你定。', 'p11'),
      R('打 2 只时，第 1 只全部结算完（「完成后」除外）再打第 2 只。', 'p11'),
      ...TRACKS, BREAK,
    ],
  };
  if (a === 'cards') return {
    before: [
      R('先把休息标记推 2 格，不给钱——可能就此触发休息。', 'p9'),
      II ? R(`II 面：声望范围内的展示区和牌堆都能拿，顺序随意。${s >= 3 ? '强度够 3：也可以改为从展示区任拿 1 张（不看声望），拿了就不再拿别的。' : ''}`, 'p9')
        : R(`按行动卡上的表从牌堆抽（最多 3 张），可能要弃 1 张。${s >= 5 ? '强度够 5：也可以改为从展示区任拿 1 张（不看声望），拿了就不再抽。' : ''}`, 'p9'),
    ],
    trig: [BREAK, R('手牌这时不限张数，休息时才弃到上限（通常 3 张，有对应大学 5 张）。', 'p9'),
      ...(II ? [] : [R('卡牌行动还没升级：声望升不到 10 以上。', 'p9')])],
  };
  if (a === 'build') return {
    before: [
      R('每格 2 钱，先付再盖。', 'p10'),
      II ? R(`II 面：可以一次盖几个不同的建筑，总格数不超过 ${s}，逐个付钱逐个盖；多了爬行馆、鸟禽馆，带升级图标的格也能盖。`, 'p10')
        : R(`盖 1 个建筑，最多 ${s} 格：贩售亭、休憩亭、标准饲养区或萌宠园。带升级图标的格还不能盖。`, 'p10'),
      R('贴着已有建筑盖，第一个要有一格在边界；贩售亭之间至少隔 2 格；特殊饲养区每种只能有 1 个。', 'p10'),
    ],
    trig: [
      R('盖到奖励图标：马上拿那个放置奖励' + (II ? '，拿完再盖下一个。' : '。'), 'p10'),
      R('盖了休憩亭：马上 +1 魅力。', 'p10'),
      ...(II ? [R('盖了爬行馆或鸟禽馆：可以马上把合适的动物从标准饲养区搬进去，只有这一次机会。', 'p12')] : []),
      R('除水和岩石外整张地图盖满：马上 +7 魅力。', 'p10'),
      ...TRACKS.slice(3),
    ],
  };
  if (a === 'assoc') return {
    before: [
      R('每个任务放 1 个可用事务员；这个任务上已有你 1 个就要放 2 个，已有 3 个就暂时不能做。', 'p14'),
      { tasks: true },
      II ? R(`II 面：可以做几个不同的任务，数值加起来不超过 ${s}；做了任务还能捐 1 次，付露出的最小金额，得 1 保护点数。新项目牌也能从声望范围内的展示区打，另付格子编号的钱。`, 'p16')
        : R('I 面只能做 1 个任务。', 'p14'),
    ],
    trig: [
      R('合作动物园、大学放在地图最低的空位，格上印着奖励就马上拿。拿到第 2 个合作动物园、第 2 所大学会给升级。', 'p8、14'),
      ...(II ? [] : [R('第 3、4 个合作动物园要先升级协会行动。', 'p14')]),
      R('大学可能加声望；有一所大学让手牌上限变 5。', 'p14'),
      R('支持保护项目：从地图左边拿 1 个玩家标记，露出的奖励马上拿，有的以后每次休息再给。', 'p15'),
      R('新项目牌放协会板上方最左，超过人数上限就弃最右那张，上面的标记回各自备用区。', 'p15'),
      R('放归野外：魅力退回那只动物给的数，清出饲养区，再拿保护点数。', 'p15'),
      ...TRACKS,
    ],
  };
  return {
    before: [
      II ? R(`II 面：可以打几张，等级加起来不超过 ${s + 1}；声望范围内展示区的牌也能打，另付格子编号的钱；能打要求赞助商行动升级的牌。`, 'p17')
        : R(`打 1 张赞助商：等级不超过 ${s}，并满足卡左侧条件。`, 'p17'),
      R(`或者不打牌：休息标记推 ${s} 格，拿 ${II ? 2 * s : s} 钱，标记不用走满也拿全额。`, 'p17'),
    ],
    trig: [
      R('黄底效果打出时马上做；蓝底是持续效果，从现在起每次条件满足都触发，卡本身的图标也算；紫底收入每次休息拿；棕底终局再算。', 'p17'),
      R('要盖独有建筑的牌：必须能放进地图才能打，不花钱；盖到奖励图标照样拿。', 'p1、4', '术语表'),
      ...TRACKS, BREAK,
    ],
  };
}

// ---------- page ----------
const app = document.getElementById('panel');
const side = a => S.side[a] === 2 ? 'II' : 'I';
let edit = false;

function setupView() {
  const picked = S.pick || [];
  const left = Object.keys(ACTS).filter(a => a !== 'animals' && !picked.includes(a));
  app.innerHTML = `${modeBar()}
  <div class="pn-card"><h2>开局摆卡</h2><p class="pn-note">动物行动卡固定在槽 1，其余四张随机放在槽 2–5。看你地图下面，从左往右依次点槽 2、3、4、5 上的卡。</p>
    <div class="pn-slots">${[0, 1, 2, 3, 4].map(i => { const a = i ? picked[i - 1] : 'animals'; return `<div class="pn-slot${a ? '' : ' empty'}"><small>槽 ${i + 1}</small>${a ? icon(a) + `<b>${ACTS[a].name}</b>` : '<b>?</b>'}</div>`; }).join('')}</div>
    ${left.length ? `<p class="pn-ask">槽 ${picked.length + 2} 上是哪张？</p><div class="pn-pick">${left.map(a => `<button type="button" data-pick="${a}">${icon(a)}${ACTS[a].name}</button>`).join('')}</div>`
      : `<button type="button" class="primary wide" data-act="start">摆好了，开始（25 钱、1 个事务员）</button>`}
    ${picked.length ? '<button type="button" class="linkish" data-act="repick">重新点</button>' : ''}</div>`;
}
const modeBar = () => `<div class="tmode" role="group" aria-label="这局怎么玩"><span>这局</span>
  <button type="button" data-mode="b" aria-pressed="${!S.marine}">只玩基础</button><button type="button" data-mode="m" aria-pressed="${S.marine}">带海洋世界</button></div>`;
const step = (act, val, lo, hi, steps = [1]) => `<span class="pn-step">${steps.slice().reverse().map(d => `<button type="button" data-act="${act}" data-d="-${d}" ${val - d < lo ? 'disabled' : ''} aria-label="减 ${d}">−${d > 1 ? d : ''}</button>`).join('')}<output>${val}</output>${steps.map(d => `<button type="button" data-act="${act}" data-d="${d}" ${val + d > hi ? 'disabled' : ''} aria-label="加 ${d}">+${d > 1 ? d : ''}</button>`).join('')}</span>`;

function mainView() {
  app.innerHTML = `${modeBar()}
  <div class="pn-card pn-stats">
    <div class="pn-row"><span class="pn-lab"><img src="/img/teach/money.webp" alt="">钱</span>${step('money', S.money, 0, 999, [1, 5])}</div>
    <div class="pn-row"><span class="pn-lab"><img src="/img/teach/xtoken.webp" alt="">X 标记<small>最多 5</small></span>${step('x', S.x, 0, 5)}</div>
    <div class="pn-row"><span class="pn-lab"><img src="/img/teach/worker.webp" alt="">可用事务员<small>共 ${S.wk.total} 个</small></span>${step('free', S.wk.free, 0, S.wk.total)}</div>
  </div>
  <div class="pn-card"><div class="pn-head"><h2>行动卡</h2><button type="button" class="linkish" data-act="edit">${edit ? '调好了' : '和桌上对不上？调整'}</button></div>
    <p class="pn-note">${edit ? '点 ◀ ▶ 换位置，点 I / II 翻面。共有事务员数也在这里改。' : '这回合做哪张就点哪张，看完要注意的再点「做完了」。'}</p>
    <div class="pn-slots">${S.order.map((a, i) => `<div class="pn-slot"><small>强度 ${i + 1}</small>
      ${edit ? `${icon(a, S.side[a] === 2 ? 'ii' : '')}<b>${ACTS[a].name}</b><button type="button" class="pn-side" data-flip="${a}">${side(a)} 面</button>
        <span class="pn-mv"><button type="button" data-mv="${i}" data-d="-1" ${i ? '' : 'disabled'} aria-label="左移">◀</button><button type="button" data-mv="${i}" data-d="1" ${i < 4 ? '' : 'disabled'} aria-label="右移">▶</button></span>`
      : `<button type="button" class="pn-use" data-use="${a}">${icon(a, S.side[a] === 2 ? 'ii' : '')}<b>${ACTS[a].name}</b><em class="${S.side[a] === 2 ? 'ii' : ''}">${side(a)}</em></button>`}</div>`).join('')}</div>
    ${edit ? `<div class="pn-row"><span class="pn-lab">共有事务员<small>最多 4 个</small></span>${step('total', S.wk.total, 1, 4)}</div>
      <button type="button" class="linkish" data-act="reset">整局重来</button>` : ''}
  </div>
  <div class="pn-bar"><button type="button" class="soft" data-act="break">全体休息</button><button type="button" data-act="undo" ${undo.length ? '' : 'disabled'}>↶ 撤销</button></div>
  <p class="pn-foot">只存在这台手机上。依据 Capstone 英文版官方规则书和术语表，用本站的话转述；每张牌的具体效果以卡面和术语表为准${S.marine ? '，海洋世界变体行动卡的特殊文字查海洋术语表' : ''}。</p>`;
}
const render = () => S.order ? mainView() : setupView();

// ---------- action sheet ----------
const sheet = document.createElement('div');
sheet.className = 'tsheet hidden';
document.body.appendChild(sheet);
let T = null; // the turn being filled in: { a, k: X used, money, workers, ups: [cards to flip], wk: workers woken, brk, cash }
const close = () => { sheet.classList.add('hidden'); T = null; };
const li = r => `<li>${esc(r.t)}<small>${r.src} ${r.p}</small></li>`;

function actionSheet() {
  const { a } = T, sd = S.side[a], s = S.order.indexOf(a) + 1 + T.k, r = rules(a, sd, s);
  const before = r.before.map(x => x.tasks
    ? `<li class="pn-tasks">任务所需强度：${TASKS.map(([v, n]) => `<span class="${v <= s ? 'ok' : ''}"><b>${v}</b> ${n}</span>`).join('')}</li>` : li(x)).join('');
  const sideI = Object.keys(ACTS).filter(x => S.side[x] === 1);
  T.cashAmt = sd === 2 ? 2 * s : s;
  sheet.innerHTML = `<div class="tsbg"></div><div class="tsbox pn-sheet" role="dialog" aria-label="${ACTS[a].name}行动">
    <div class="tshd">${icon(a, (sd === 2 ? 'ii ' : '') + 'big')}<b>${ACTS[a].name}<small>${side(a)} 面 · 槽 ${S.order.indexOf(a) + 1}</small></b><button type="button" class="tsx" aria-label="关闭">×</button></div>
    <div class="pn-str">强度 <b>${s}</b>${S.x ? `<span>用 X ${step('k', T.k, 0, S.x)}</span>` : '<small>没有 X 标记可用</small>'}</div>
    <p class="pn-x">X 要在行动开始前定好；这次行动里拿到的 X 不能补用。<small>规则书 p8</small></p>
    ${S.marine ? '<p class="pn-x">用的是海洋世界变体行动卡时，卡上的特殊文字以海洋术语表为准，下面只列通用规则。</p>' : ''}
    <h3>做之前</h3><ul class="pn-list">${before}</ul>
    <h3 class="pn-hot">可能连带触发</h3><ul class="pn-list hot">${r.trig.map(li).join('')}</ul>
    <h3>做完、回合结束</h3><ul class="pn-list">${[AFTER, ...END(S.marine)].map(li).join('')}</ul>
    <div class="pn-rec"><h3>记到面板上</h3>
      ${a === 'sponsors' ? `<label class="pn-chk"><input type="checkbox" data-t="cash" ${T.cash ? 'checked' : ''}>这次不打牌，改拿 ${T.cashAmt} 钱（自动加上）</label>` : ''}
      <div class="pn-row"><span class="pn-lab">这次钱${T.cash ? '另外' : ''}增减</span>${step('dm', T.money, -S.money - (T.cash ? T.cashAmt : 0), 999, [1, 5])}</div>
      ${a === 'assoc' ? `<div class="pn-row"><span class="pn-lab">派出事务员<small>可用 ${S.wk.free} 个</small></span>${step('dw', T.workers, 0, S.wk.free)}</div>` : ''}
      <div class="pn-row"><span class="pn-lab">叫醒新事务员</span>${step('dt', T.wk, 0, 4 - S.wk.total)}</div>
      ${sideI.length ? `<div class="pn-ups"><span>拿到升级，翻到 II 面：</span>${sideI.map(x => `<button type="button" data-up="${x}" aria-pressed="${T.ups.includes(x)}">${ACTS[x].name}</button>`).join('')}<small>这次行动还按原来那面做（官方 FAQ p3）</small></div>` : ''}
      <label class="pn-chk"><input type="checkbox" data-t="brk" ${T.brk ? 'checked' : ''}>这回合休息标记推到了终点（+1 X，做完打开休息清单）</label>
    </div>
    <button type="button" class="tq pn-q" data-q="${esc(`我在做${ACTS[a].name}行动（${side(a)} 面，强度 ${s}），还有什么容易漏掉的连带效果？`)}">还有疑问？问规则助手</button>
    <div class="pn-btns"><button type="button" class="primary" data-act="done">做完了，卡放回槽 1</button>
      <button type="button" data-act="xact" ${S.x >= 5 ? 'disabled' : ''}>改做 X 标记行动：卡照样放回槽 1，只拿 1 个 X</button></div>
  </div>`;
  sheet.classList.remove('hidden');
}

function breakSheet() {
  const items = breakList({ n: 2, marine: S.marine });
  sheet.innerHTML = `<div class="tsbg"></div><div class="tsbox pn-sheet" role="dialog" aria-label="休息">
    <div class="tshd"><img class="tim big" src="/img/teach/breaktoken.webp" alt=""><b>全体休息<small>按顺序一项项做</small></b><button type="button" class="tsx" aria-label="关闭">×</button></div>
    <ul class="pn-list pn-break">${items.map(x => `<li><label class="pn-chk"><input type="checkbox" data-bk="${x.id}" ${S.checks[x.id] ? 'checked' : ''}><span>${esc(x.text)}<small>${x.tag === '海洋' ? '海洋规则书' : '规则书'} p${x.page}</small></span></label></li>`).join('')}</ul>
    <div class="pn-rec"><div class="pn-row"><span class="pn-lab">这次收入</span>${step('inc', T.income, 0, 999, [1, 5])}</div></div>
    <div class="pn-btns"><button type="button" class="primary" data-act="breakdone">休息做完了：收入加上，事务员全回来</button></div></div>`;
  sheet.classList.remove('hidden');
}

function finish(xAction) {
  const { a } = T;
  change(() => {
    S.order = [a, ...S.order.filter(x => x !== a)];
    if (xAction) { S.x = Math.min(5, S.x + 1); return; }
    S.x -= T.k;
    S.money = Math.max(0, S.money + T.money + (T.cash ? T.cashAmt : 0));
    S.wk.free -= T.workers;
    S.wk.total += T.wk; S.wk.free += T.wk;
    for (const x of T.ups) S.side[x] = 2;
    if (T.brk) S.x = Math.min(5, S.x + 1);
  });
  const brk = !xAction && T.brk;
  close();
  if (brk) { T = { income: 0 }; breakSheet(); }
}

// ---------- events ----------
document.addEventListener('click', e => {
  const b = e.target.closest('button,[data-t],[data-bk]');
  if (e.target.closest('.tsx,.tsbg')) return close();
  if (!b) return;
  const d = Number(b.dataset.d), act = b.dataset.act;
  if (b.dataset.mode) { if ((b.dataset.mode === 'm') !== S.marine) change(() => { S.marine = b.dataset.mode === 'm'; }); return; }
  if (b.dataset.pick) { S.pick = [...(S.pick || []), b.dataset.pick]; save(); return render(); }
  if (b.dataset.use) { T = { a: b.dataset.use, k: 0, money: 0, workers: 0, wk: 0, ups: [], brk: false, cash: false }; return actionSheet(); }
  if (b.dataset.flip) return change(() => { S.side[b.dataset.flip] = 3 - S.side[b.dataset.flip]; });
  if (b.dataset.mv) { const i = Number(b.dataset.mv); return change(() => { const o = S.order; [o[i], o[i + d]] = [o[i + d], o[i]]; }); }
  if (b.dataset.up) { const x = b.dataset.up; T.ups = T.ups.includes(x) ? T.ups.filter(y => y !== x) : [...T.ups, x]; return actionSheet(); }
  if (b.dataset.q) { const q = b.dataset.q; close(); return window.askRules?.(q); }
  if (b.dataset.t) { T[b.dataset.t] = b.checked; if (b.dataset.t === 'cash') T.money = 0; return actionSheet(); }
  if (b.dataset.bk) { S.checks[b.dataset.bk] = b.checked; return save(); }
  switch (act) {
    case 'repick': S.pick = []; save(); return render();
    case 'start': return change(() => { S.order = ['animals', ...S.pick]; delete S.pick; });
    case 'money': return change(() => { S.money = clamp(S.money + d, 0, 999); });
    case 'x': return change(() => { S.x = clamp(S.x + d, 0, 5); });
    case 'free': return change(() => { S.wk.free = clamp(S.wk.free + d, 0, S.wk.total); });
    case 'total': return change(() => { S.wk.total = clamp(S.wk.total + d, 1, 4); S.wk.free = clamp(S.wk.free + d, 0, S.wk.total); });
    case 'edit': edit = !edit; return render();
    case 'reset': if (confirm('清空这台手机上的面板，重新摆卡？')) change(() => { S = fresh(S.marine); edit = false; }); return;
    case 'undo': if (undo.length) { S = JSON.parse(undo.pop()); save(); render(); } return;
    case 'break': T = { income: 0 }; return breakSheet();
    case 'k': T.k = clamp(T.k + d, 0, S.x); return actionSheet();
    case 'dm': T.money += d; return actionSheet();
    case 'dw': T.workers = clamp(T.workers + d, 0, S.wk.free); return actionSheet();
    case 'dt': T.wk = clamp(T.wk + d, 0, 4 - S.wk.total); return actionSheet();
    case 'inc': T.income = clamp(T.income + d, 0, 999); return breakSheet();
    case 'done': return finish(false);
    case 'xact': return finish(true);
    case 'breakdone': { const inc = T.income; close(); return change(() => { S.money += inc; S.wk.free = S.wk.total; S.checks = {}; }); }
  }
});
addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
render();
