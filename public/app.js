// 方舟动物园小助手 · room UI. One host phone drives setup; everyone can open the break list and enter their own score.
import {participants,MAPS,scoreValue,standings,tiedPlayers,endReminder} from './logic.js';
import {setupList,breakList,SCORE_CHECKS,SOURCES} from './steps.js';
import {morph,esc} from './dom.js';

const $=s=>document.querySelector(s);
const params=new URLSearchParams(location.search);
const code=params.get('r');
// 定先手用总入口的手指轮盘 / 抽签，点「返回」回到这里
const orderUrl=n=>`https://boardgame.leisurecat.cloud/?order=${n}&back=${encodeURIComponent(location.href)}`;
const store={get(k){try{return localStorage.getItem(k);}catch{return null;}},set(k,v){try{localStorage.setItem(k,v);}catch{}}};
const actor=store.get('ark-actor')||crypto.randomUUID();store.set('ark-actor',actor);

let S=null,ws=null,online=false,pending=false,pendingScore=null;
let wantSolo=params.has('solo');
// UI state that morph() would otherwise wipe: open panels, local drafts, picks.
const ui={tab:'flow',rooms:[],error:'',mine:store.get('ark-player')||'p0',scores:{},players:{},busy:false,
 review:{stars:5,text:'',sent:false,name:null},endKind:'turn',trigger:'p0',quick:params.has('quick'),prepOpen:true};

const COLORS=['#2f7d57','#3a6ea5','#c47f2c','#8b4f99'];
const color=id=>COLORS[Number(String(id).slice(1))]||COLORS[0];
const dot=id=>`<span class="dot" style="--c:${color(id)}"></span>`;
const host=()=>S?.isHost;
const disabled=()=>!host()||!online||pending?'disabled':'';
const available=()=>!online||pending?'disabled':'';
const roomLink=code?'?r='+code:'';
const opts=(a,v)=>a.map(([k,t])=>`<option value="${esc(k)}" ${String(k)===String(v)?'selected':''}>${esc(t)}</option>`).join('');
export const meta=c=>`${c.n===1?'单人 · 初始魅力'+c.difficulty:c.n+'人'} · ${c.marine?'基础＋海洋':'基础'} · ${c.scoring==='new'?'新版':'旧版'}计分`;
const STAGE={setup:'准备中',play:'进行中',score:'计分中',over:'已结算'};

// Segmented control: one tap picks a value; act decides what the value means.
function seg(act,key,options,value,dis=''){
 return `<div class="seg" role="group">${options.map(([v,t])=>`<button type="button" data-act="${act}" data-key="${key}" data-val="${esc(v)}" aria-pressed="${String(v)===String(value)}" ${dis}>${t}</button>`).join('')}</div>`;
}
const tag=x=>`<a class="tag" href="${x.url}" target="_blank" rel="noopener">${esc(x.tag)} p${esc(x.page)}</a>`;
function checklist(items,kind){
 const state=kind==='setup'?S.checks:S.breakChecks,dis=kind==='setup'?disabled():available();
 return `<ul class="steps">${items.map(x=>{const on=!!state[x.id];return `<li class="${on?'done':''}"><label><input type="checkbox" data-check="${esc(x.id)}" data-kind="${kind}" ${on?'checked':''} ${dis}><span>${esc(x.text)}</span></label>${tag(x)}</li>`;}).join('')}</ul>`;
}

function notify(t){$('#notice').textContent=t;clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('#notice').textContent='',6500);}
function render(){const t=document.createElement('div');t.innerHTML=view();morph($('#app'),t);}
function send(action){
 if(!online||ws.readyState!==1)return notify('连接断了，这一步没发出去。恢复后再点一次。');
 if(pending)return notify('上一步还在保存，请稍等');
 pending=true;if(action.t==='score')pendingScore=action;
 ws.send(JSON.stringify({revision:S.revision,action}));
 if($('.conn'))$('.conn').textContent='保存中…';
}
function connect(){
 if(!navigator.onLine||ws&&ws.readyState<2)return;
 if(!/^[A-Z0-9]{4}$/.test(code||'')){ui.error='房间码是四位字母或数字';return render();}
 ws=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/api/room/${code}/ws?actor=${actor}`);
 ws.onopen=()=>{online=true;render();};
 ws.onmessage=e=>{
  if(e.data==='pong')return;
  const m=JSON.parse(e.data);pending=false;
  if(m.type!=='state'){ui.error=m.error;notify(m.error);return render();}
  const old=S;S=m.state;
  // Drop the local draft once the server has the same score.
  if(pendingScore&&JSON.stringify(S.players.find(p=>p.id===pendingScore.id)?.score)===JSON.stringify(pendingScore.score)){delete ui.scores[pendingScore.id];pendingScore=null;}
  if(old?.stage!==S.stage){ui.tab=S.stage==='score'?'score':S.stage==='over'?'result':'flow';if(S.stage==='score'&&old?.stage==='over')ui.scores={};}
  if(!S.hasHost)send({t:'claim'});
  else if(wantSolo&&host()&&S.stage==='setup'){wantSolo=false;send({t:'config',config:{...S.config,n:1,first:0}});}
  render();
 };
 ws.onclose=()=>{online=false;pending=false;render();setTimeout(connect,2500);};
 ws.onerror=()=>notify('连不上房间，请检查网络');
}
window.addEventListener('offline',()=>{ws?.close();online=false;pending=false;render();});
window.addEventListener('online',()=>{if(code)connect();});
setInterval(()=>{if(ws?.readyState===1)ws.send('ping');},25000);

// ---------- landing ----------
function landing(){
 const rooms=ui.rooms.map(r=>`<a class="room" href="/?r=${r.code}"><b class="rcode">${r.code}</b><span class="rinfo"><span>${esc(r.players.join('、'))}</span><small>${esc(meta(r.config))}</small></span><span class="chip ${r.stage==='over'?'':'live'}">${STAGE[r.stage]||'进行中'}</span></a>`).join('');
 return `<header class="hero"><a class="back-nav" href="https://boardgame.leisurecat.cloud">‹ 全部游戏</a><a class="back-nav rate-nav" href="https://boardgame.leisurecat.cloud/?rate=ark-nova&back=${encodeURIComponent(location.href)}">★ 写评价</a>
 <img class="cover" src="/img/ark-nova.jpg" width="140" height="171" alt="方舟动物园英文版官方封面">
 <h1>方舟动物园小助手</h1><p class="motto">开局不漏 · 计分不错</p></header>
 <main class="landing">
  <div class="card entry">
   <button class="primary big" data-act="create" ${ui.busy?'disabled':''}>创建新房间</button>
   <div class="or"><span>或输入房间码加入</span></div>
   <form id="join" class="join"><label class="sr-only" for="joinCode">房间码</label><input id="joinCode" placeholder="房间码" maxlength="4" required autocapitalize="characters" autocomplete="off"><button class="dark">加入</button></form>
   <button class="linkish" data-act="quick">熟手：跳过准备，直接计分 ›</button>
  </div>
  <a class="card teachgo" href="/teach"><span class="tg-i">讲</span><span><b>第一次玩？6 分钟讲规则</b>照着念就能开局，不懂的词点一下</span><i>›</i></a>
  <div class="tiles">
   <a class="tile" href="/guide.html"><span class="ico">教</span><span><b>新手教程</b><small>图文 + 常见问题</small></span></a>
   <a class="tile" href="/history.html"><span class="ico">录</span><span><b>往期对局</b><small>战绩与存档</small></span></a>
  </div>
  <nav class="mini"><a href="/guide.html#faq">规则速查</a><a href="/solo.html">官方单人</a></nav>
  <section class="rooms"><div class="rooms-head"><h2>房间</h2><small>${ui.rooms.length?ui.rooms.length+' 个':''}</small></div>
   ${rooms||'<p class="empty">还没有房间。建一个，把房间码告诉同桌。</p>'}</section>
  <footer>非官方线下辅助 · 需要实体游戏<br>封面与游戏版权归原出版方</footer>
 </main>`;
}

// ---------- room ----------
function view(){
 if(!code)return landing();
 if(!S)return `${bar()}<main><p class="empty">${esc(ui.error||'正在进入房间…')}</p></main>`;
 return `${bar()}<div class="subbar"><span>${esc(meta(S.config))}</span><button type="button" class="undo" data-act="undo" ${disabled()} ${S.prev?'':'disabled'}>↶ 撤销</button></div>
 <main>${S.stage==='setup'?setup():play()}
 <nav class="links"><a href="/guide.html${roomLink}">新手教程</a><a href="/guide.html${roomLink}#faq">规则速查</a><a href="/solo.html${roomLink}">官方单人</a><a href="/history.html${roomLink}">往期对局</a></nav></main>`;
}
function bar(){
 const state=!online?'off':pending?'busy':'on';
 const label=!online?'断线重连中':pending?'保存中…':'已连接';
 return `<header class="bar"><a class="back-nav" href="/">‹ 首页</a><b class="title">方舟动物园</b>${code?`<button type="button" class="code" data-act="share" aria-label="复制邀请链接">${code}<small>邀请</small></button>`:''}<span class="conn ${state}">${label}</span></header>`;
}

const mapName=k=>({A:'A 新手',0:'0 过渡',9:'9 地理动物园',10:'10 救助站',other:'其他（只记编号）'})[k]||k+' 进阶';
function seatRow(p,i){
 const c=S.config,d=ui.players[p.id]||p,dis=disabled();
 return `<div class="seat" data-k="${p.id}"><span class="seatno" style="--c:${color(p.id)}">${i+1}</span><div class="seat-fields">
  <input aria-label="座位${i+1}玩家名" data-player="${p.id}" data-field="name" maxlength="24" value="${esc(d.name)}" ${dis}>
  <div class="row"><select aria-label="座位${i+1}地图" data-player="${p.id}" data-field="map" ${dis}>${opts(MAPS.map(k=>[k,'地图 '+mapName(k)]),d.map)}</select>
  ${d.map==='other'?`<input aria-label="地图编号" data-player="${p.id}" data-field="mapNote" maxlength="60" placeholder="地图编号" value="${esc(d.mapNote)}" ${dis}>`:''}</div>
  ${c.marine?`<input aria-label="变体行动编号" data-player="${p.id}" data-field="variants" maxlength="80" placeholder="两张变体行动编号（可不填）" value="${esc(d.variants)}" ${dis}>`:''}
 </div></div>`;
}
function setup(){
 const c=S.config,ps=participants(S),dis=disabled(),items=setupList(c,ps);
 const done=items.filter(x=>S.checks[x.id]).length;
 const begin=`<button class="${ui.quick?'':'primary '}wide" data-act="begin" ${dis}>准备好了，开始对局</button>`;
 const direct=`<button class="${ui.quick?'primary ':''}wide" data-act="direct" ${dis}>跳过准备，直接计分</button>`;
 return `${host()?'':'<p class="hint">设置由主持人（建房的手机）来改。</p>'}
 ${ui.quick?'<p class="hint">熟手模式：选好人数和地图，就能直接去计分。</p>':''}
 <section class="card"><h2>人数</h2>${seg('config','n',[[1,'单人'],[2,'2 人'],[3,'3 人'],[4,'4 人']],c.n,dis)}
  ${c.n===1?`<h3>初始魅力（难度）</h3>${seg('config','difficulty',[[20,'20'],[10,'10'],[0,'0']],c.difficulty,dis)}<a class="more" href="/solo.html${roomLink}">单人怎么准备 ›</a>`:''}</section>
 <section class="card"><h2>扩展</h2><label class="toggle"><input type="checkbox" data-config="marine" ${c.marine?'checked':''} ${dis}><span class="tbox" aria-hidden="true"></span><span><b>海洋世界</b><small>换牌、大学、海洋馆、变体行动</small></span></label></section>
 <section class="card"><h2>计分</h2>${seg('config','scoring',[['new','新版（默认）'],['old','旧版']],c.scoring,dis)}<p class="note">新版 = 旧版 + 100。两种分数都会显示。</p></section>
 <section class="card"><h2>座位与地图</h2><p class="note">按顺时针填。每人可以用不同的地图。</p>${ps.map(seatRow).join('')}
  ${c.n>1?`<div class="first"><h3>先手</h3>${seg('config','first',ps.map((p,i)=>[i,esc(p.name)]),c.first,dis)}<button type="button" class="small" data-act="order" ${dis}>手指轮盘定先手 ›</button></div>`:''}</section>
 <section class="card" id="checklist"><button type="button" class="fold" data-act="fold" aria-expanded="${ui.prepOpen}"><span>准备清单</span><small>${done}/${items.length}</small></button>
  ${ui.prepOpen?`<p class="note">勾选会同步给全桌，不勾也能开始。</p>${checklist(items,'setup')}`:''}</section>
 <div class="cta">${ui.quick?direct+begin:begin+direct}</div>`;
}
function play(){
 return `<nav class="tabs">${[['flow','对局中'],['score','计分'],['result','结算']].map(([k,t])=>`<button type="button" data-act="tab" data-tab="${k}" aria-pressed="${ui.tab===k}">${t}</button>`).join('')}</nav>
 <div data-k="tab-${ui.tab}">${ui.tab==='flow'?flow():ui.tab==='score'?score():result()}</div>`;
}
function flow(){
 const ps=participants(S);
 if(!ps.some(p=>p.id===ui.trigger))ui.trigger=ps[0].id;
 const toScore=`<div class="cta"><button class="primary wide" data-act="toScore" ${disabled()}>最后的行动做完了，去计分</button></div>`;
 if(S.config.n===1)return `<section class="card"><h2>官方单人</h2><p>${esc(endReminder(S.config))}</p><a class="more" href="/solo.html${roomLink}">单人准备与结束说明 ›</a></section>${toScore}`;
 const items=breakList(S.config),done=items.filter(x=>S.breakChecks[x.id]).length;
 return `<p class="hint">普通行动在桌上进行就好，用到时再打开下面的清单。</p>
 <section class="card"><div class="card-head"><h2>休息</h2>${S.breakOpen?`<span class="chip live">进行中 ${done}/${items.length}</span>`:''}</div>
  ${S.breakOpen?`<div id="break-list"><p class="note">按顺序一项项做，全桌都能勾。</p>${checklist(items,'break')}<button class="wide" data-act="break" ${available()}>休息结束，收起</button></div>`
  :`<p class="note">有人触发休息时打开，按顺序核对。</p><button class="wide soft" data-act="break" ${available()}>打开休息清单</button>`}</section>
 <section class="card"><h2>终局提醒</h2><p class="note">两条轨道交汇时，告诉全桌谁还有最后一回合。</p>
  <h3>谁触发的</h3>${seg('trigger','trigger',ps.map(p=>[p.id,esc(p.name)]),ui.trigger)}
  <h3>什么时候</h3>${seg('endKind','endKind',[['turn','自己回合结束时'],['break','休息中']],ui.endKind)}
  <button class="wide" data-act="end" ${disabled()}>通知全桌</button>
  ${S.end?`<aside role="status">${esc(endReminder(S.config,S.end.kind,S.players.find(p=>p.id===S.end.trigger).name))}</aside>`:''}</section>
 ${toScore}`;
}

function stepper(name,label,value,max,req=true){
 return `<div class="stepper"><span class="label">${label}</span><div class="sbox">
  <button type="button" data-act="step" data-name="${name}" data-d="-1" aria-label="${label}减一">−</button>
  <input name="${name}" type="number" inputmode="numeric" min="0" max="${max}" step="1" ${req?'required':''} value="${value??''}" aria-label="${label}">
  <button type="button" data-act="step" data-name="${name}" data-d="1" aria-label="${label}加一">＋</button></div></div>`;
}
function preview(q){
 try{
  const v=scoreValue(q),main=S.config.scoring;
  return `<div class="preview"><div class="${main==='new'?'main':''}"><small>新版</small><strong>${v.new}</strong></div><div class="${main==='old'?'main':''}"><small>旧版</small><strong>${v.old}</strong></div></div>
  <p class="note center">魅力 ${v.appeal} · 保护点数 ${v.conservation}（白字 ${v.white}）· <a href="${SOURCES.v2}" target="_blank" rel="noopener">换算依据 V2 p19</a></p>`;
 }catch{return '<p class="note center preview-empty">填好魅力和保护点数，这里会算出分数。</p>';}
}
function shortScore(p){try{return scoreValue(p.score)[S.config.scoring];}catch{return '—';}}
function score(){
 if(!['score','over'].includes(S.stage))return `<section class="card"><h2>还没到计分</h2><p>在桌上做完最后的行动，再进入计分。休息清单不是必须的。</p><button class="primary wide" data-act="toScore" ${disabled()}>去计分</button></section>`;
 if(S.stage==='over')return result();
 const ps=participants(S);
 if(!ps.some(p=>p.id===ui.mine))ui.mine=ps[0].id;
 const p=ps.find(p=>p.id===ui.mine),q=ui.scores[p.id]||p.score,tied=tiedPlayers(S).includes(p.id),pre=q.path==='final'?'最终':'当前';
 return `<section class="card"><h2>终局计分</h2><p class="label">正在填写 <small>也可以替别人填</small></p>
 <div class="seg wrap" role="group">${ps.map(x=>`<button type="button" data-act="mine" data-id="${x.id}" aria-pressed="${x.id===p.id}">${dot(x.id)}${esc(x.name)}${x.score.confirmed?' ✓':''}</button>`).join('')}</div>
 <form id="score-form" data-k="score-${p.id}"><input type="hidden" name="path" value="${q.path}">
  <div class="choice">${[['final','终局效果已走轨','只填两条轨道的最终值'],['pending','还有效果没走轨','另外填增量']].map(([v,t,s])=>`<button type="button" data-act="path" data-val="${v}" aria-pressed="${q.path===v}"><b>${t}</b><small>${s}</small></button>`).join('')}</div>
  <div class="steppers">${stepper('appeal',pre+'魅力',q.appeal,114)}${stepper('conservation',pre+'保护点数',q.conservation,41)}</div>
  ${q.path==='pending'?`<p class="note">只填还没走轨的终局效果；已经走过轨的分不要再加。</p>
   <div class="steppers">${stepper('extraAppeal','魅力增量',q.extraAppeal,114)}${stepper('extraConservation','保护增量',q.extraConservation,41)}</div>
   <label class="field"><span class="label">这些增量来自</span><textarea name="note" maxlength="500" placeholder="如：终局卡 +2 保护，赞助商 +3 魅力">${esc(q.note)}</textarea></label>`:''}
  <div id="preview">${preview(q)}</div>
  <div class="checks"><p class="label">确认前再看一眼</p>${SCORE_CHECKS.map(x=>`<label class="check"><input name="${x.id}" type="checkbox" ${q[x.id]?'checked':''}><span>${x.text} ${tag(x)}</span></label>`).join('')}</div>
  ${tied?`<aside>有人同分：再填支持过的保护项目次数（0–7），还相同就并列。 <a class="tag" href="${SOURCES.base}" target="_blank" rel="noopener">基础 p19</a></aside>${stepper('projects','支持保护项目次数',q.projects,7)}`:''}
  <div class="cta"><button class="primary wide" value="confirm" ${available()}>确认分数</button><button class="linkish" value="draft" ${available()}>先存草稿，稍后确认</button></div>
 </form></section>
 <section class="card"><h2>全桌进度</h2>${ps.map(x=>`<div class="prow">${dot(x.id)}<span class="pname">${esc(x.name)}</span><span class="chip ${x.score.confirmed?'ok':''}">${x.score.confirmed?'已确认':'待确认'}</span><b>${x.score.appeal===null?'—':shortScore(x)}</b></div>`).join('')}
  <button class="primary wide" data-act="finish" ${disabled()}>全部确认，结算</button></section>`;
}

function mapText(p){
 const m=p.map==='other'?(p.mapNote||'其他地图'):'地图 '+p.map+(p.mapNote?' '+p.mapNote:'');
 return m+(S.config.marine&&p.variants?' · 变体 '+p.variants:'');
}
function result(){
 if(S.stage!=='over')return '<section class="card"><h2>等大家确认分数</h2><p>所有人确认后，主持人点结算，本局会自动存档。</p></section>';
 const rows=standings(S),main=S.config.scoring,stars=ui.review.stars,ps=participants(S);
 const reviewer=ps.some(p=>p.id===ui.review.name)?ui.review.name:(ps.some(p=>p.id===ui.mine)?ui.mine:ps[0].id);
 return `<section class="card result" id="shot"><div class="rhead"><img src="/img/ark-nova.jpg" alt=""><div><p class="kicker">ARK NOVA · 房间 ${code}</p><h2>本局结算</h2><p class="note">${esc(meta(S.config))}</p></div></div>
  ${rows.map(p=>`<div class="rank ${p.place===1?'first':''}"><span class="place">${p.place}</span><div class="who"><b>${dot(p.id)}${esc(p.name)}</b>
   <small>${esc(mapText(p))} · 魅力 ${p.value.appeal} · 保护点数 ${p.value.conservation}${p.score.projects===null?'':' · 支持项目 '+p.score.projects+' 次'}</small>
   ${p.score.path==='pending'?`<small>录入 ${p.score.appeal}/${p.score.conservation} ＋ 终局 ${p.score.extraAppeal}/${p.score.extraConservation}${p.score.note?' · '+esc(p.score.note):''}</small>`:''}</div>
   <div class="points"><strong>${p.value[main]}</strong><small>新 ${p.value.new} / 旧 ${p.value.old}</small></div></div>`).join('')}
  ${S.config.n===1?`<aside>${scoreValue(S.players[0].score).new>=100?'官方单人获胜':'官方单人未达成目标'}（目标：新版 100 / 旧版 0）</aside>`:''}
  ${rows.some((p,i,a)=>i&&p.place===a[i-1].place)?'<aside>分数和支持项目次数都相同，共享胜利。</aside>':''}
  <footer>方舟动物园小助手 · ark.leisurecat.cloud</footer></section>
 <div class="cta row"><button class="primary" data-act="image">保存长图</button><button data-act="reopen" ${disabled()}>修订本局</button><a class="button" href="/history.html${roomLink}">往期对局</a></div>
 <section class="card review"><h2>给方舟动物园打个分</h2>
  <p class="label">谁在评价</p>${seg('reviewer','reviewer',ps.map(p=>[p.id,esc(p.name)]),reviewer)}
  <div class="stars" role="group" aria-label="评分">${[1,2,3,4,5].map(n=>`<button type="button" data-act="star" data-v="${n}" aria-pressed="${n<=stars}" aria-label="${n} 星">★</button>`).join('')}</div>
  <textarea id="review-text" maxlength="500" placeholder="一句话说说这局（可不填）">${esc(ui.review.text)}</textarea>
  <button class="primary wide" data-act="review" ${ui.busy?'disabled':''}>${ui.review.sent?'已提交（再提交会覆盖）':'提交评价'}</button>
  <p class="note">评价显示在桌游小助手首页，不会进长图。</p></section>`;
}

// ---------- events ----------
function readScore(confirmed=false){
 const f=$('#score-form'),p=S.players.find(p=>p.id===ui.mine);
 const q={...p.score,...ui.scores[p.id],path:f.elements.path.value,confirmed};
 for(const k of ['appeal','conservation','extraAppeal','extraConservation','projects'])if(f.elements[k])q[k]=f.elements[k].value===''?null:Number(f.elements[k].value);
 for(const k of ['ten','sponsors','noDouble'])q[k]=f.elements[k].checked;
 if(f.elements.note)q.note=f.elements.note.value;
 if(q.path==='final'){q.extraAppeal=0;q.extraConservation=0;q.note='';}
 return q;
}
function setConfig(key,val){
 const c={...S.config,[key]:['n','difficulty','first'].includes(key)?Number(val):val};
 if(c.first>=c.n)c.first=0;
 send({t:'config',config:c});
}

$('#app').addEventListener('click',async e=>{
 const b=e.target.closest('[data-act]');if(!b||b.disabled)return;
 const a=b.dataset.act;
 try{
  if(a==='create'||a==='quick'){ui.busy=true;render();const r=await fetch('/api/room',{method:'POST'});if(!r.ok)throw Error('建房失败，请重试');location.href='/?r='+(await r.json()).code+(a==='quick'?'&quick=1':'')+(wantSolo?'&solo=1':'');}
  else if(a==='config')setConfig(b.dataset.key,b.dataset.val);
  else if(a==='tab')ui.tab=b.dataset.tab;
  else if(a==='fold')ui.prepOpen=!ui.prepOpen;
  else if(a==='order')location.href=orderUrl(S.config.n);
  else if(a==='break')send({t:'break',open:!S.breakOpen});
  else if(a==='trigger')ui.trigger=b.dataset.val;
  else if(a==='endKind')ui.endKind=b.dataset.val;
  else if(a==='end')send({t:'end',kind:ui.endKind,trigger:ui.trigger});
  else if(a==='mine'){ui.mine=b.dataset.id;store.set('ark-player',ui.mine);}
  else if(a==='path'){$('#score-form').elements.path.value=b.dataset.val;ui.scores[ui.mine]=readScore();}
  else if(a==='step'){const input=$('#score-form').elements[b.dataset.name],max=Number(input.max);input.value=Math.min(max,Math.max(0,(Number(input.value)||0)+Number(b.dataset.d)));ui.scores[ui.mine]=readScore();}
  else if(a==='reviewer')ui.review.name=b.dataset.val;
  else if(a==='star')ui.review.stars=Number(b.dataset.v);
  else if(['begin','direct','undo','toScore','finish','reopen'].includes(a)){if(a==='undo')ui.scores={};send({t:a});}
  else if(a==='share'){await navigator.clipboard.writeText(location.origin+'/?r='+code);notify('邀请链接已复制，发给同桌就能加入');}
  else if(a==='image'){
   const canvas=await html2canvas($('#shot'),{scale:2,backgroundColor:'#fbf8ef',useCORS:true}),src=canvas.toDataURL('image/png');
   $('#image-dialog').innerHTML=`<div class="overlay" role="dialog" aria-label="结算长图"><div><button id="close-image">关闭</button><p>长按图片保存，或下载到手机</p><img alt="本局结算长图" src="${src}"><a class="button primary" download="ark_${code}.png" href="${src}">下载长图</a></div></div>`;
   $('#close-image').onclick=()=>$('#image-dialog').innerHTML='';
  }
  else if(a==='review'){
   const ps=participants(S),id=ps.some(p=>p.id===ui.review.name)?ui.review.name:(ps.some(p=>p.id===ui.mine)?ui.mine:ps[0].id),p=S.players.find(p=>p.id===id);
   ui.busy=true;render();
   const r=await fetch('https://boardgame.leisurecat.cloud/api/reviews',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({game:'ark-nova',name:p.name,room:code,stars:ui.review.stars,text:ui.review.text})});
   if(!r.ok)throw Error('评价没提交上，请重试');ui.review.sent=true;notify('评价已提交，谢谢');
  }
 }catch(err){notify(err.message);}finally{ui.busy=false;render();}
});
$('#app').addEventListener('input',e=>{
 const x=e.target;
 if(x.id==='review-text')ui.review.text=x.value;
 if(x.dataset.player)ui.players[x.dataset.player]={...(ui.players[x.dataset.player]||S.players.find(p=>p.id===x.dataset.player)),[x.dataset.field]:x.value};
 if(x.closest('#score-form')){ui.scores[ui.mine]=readScore();$('#preview').innerHTML=preview(ui.scores[ui.mine]);}
});
$('#app').addEventListener('change',e=>{
 const x=e.target;
 if(x.dataset.config)setConfig(x.dataset.config,x.type==='checkbox'?x.checked:x.value);
 if(x.dataset.player){const p={...S.players.find(p=>p.id===x.dataset.player),...ui.players[x.dataset.player],[x.dataset.field]:x.value};send({t:'player',id:p.id,name:p.name,map:p.map,mapNote:p.mapNote,variants:p.variants});delete ui.players[p.id];}
 if(x.dataset.check)send({t:x.dataset.kind==='setup'?'check':'breakCheck',id:x.dataset.check,value:x.checked});
});
$('#app').addEventListener('submit',e=>{
 e.preventDefault();
 if(e.target.id==='join'){const v=$('#joinCode').value.trim().toUpperCase();if(!/^[A-Z0-9]{4}$/.test(v))return notify('请输入四位房间码');location.href='/?r='+v;}
 if(e.target.id==='score-form'){const q=readScore(e.submitter?.value==='confirm');ui.scores[ui.mine]=q;send({t:'score',id:ui.mine,score:q});}
});
async function loadRooms(){try{const r=await fetch('/api/rooms');if(!r.ok)throw Error('房间列表读取失败');ui.rooms=await r.json();render();}catch(e){notify(e.message);}}
render();
if(code)connect();else if(wantSolo)$('[data-act="create"]').click();else loadRooms();
