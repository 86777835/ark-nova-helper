// Shared by browser and authoritative Room. Track areas: official EN p4–5,19; DE V2 p19.
export const TARGETS = [114,112,110,108,106,104,102,100,98,96,94,91,88,85,82,79,76,73,70,67,64,61,58,55,52,49,46,43,40,37,34,31,28,25,22,19,16,13,10,7,4,1];
export const MAPS = ['A','0','1','2','3','4','5','6','7','8','9','10','other'];
export const participants = s => s.players.slice(0,s.config.n);
export const gameKey = () => 'ark-nova';
const integer=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
export function convert(appeal,conservation){
 if(!integer(appeal,0,114)||!integer(conservation,0,41))throw Error('请填写实物轨道范围内整数：魅力 0–114，保护点数 0–41；超轨情形请查规则书');
 const target=TARGETS[conservation];return {appeal,conservation,target,white:100-target,old:appeal-target,new:appeal-target+100};
}
export function scoreValue(q){return convert(q.appeal+(q.path==='pending'?q.extraAppeal:0),q.conservation+(q.path==='pending'?q.extraConservation:0));}
export function configError(c){
 if(!c||!integer(c.n,1,4)||typeof c.marine!=='boolean'||!['new','old'].includes(c.scoring)||![0,10,20].includes(c.difficulty)||!integer(c.first,0,c.n-1))return '人数、扩展、计分口径或先手无效';
 return '';
}
export const emptyScore=()=>({path:'final',appeal:null,conservation:null,extraAppeal:0,extraConservation:0,note:'',projects:null,ten:false,sponsors:false,noDouble:false,confirmed:false});
export function initialState(){return {revision:0,host:null,stage:'setup',config:{n:2,marine:false,scoring:'new',difficulty:20,first:0},players:Array.from({length:4},(_,i)=>({id:'p'+i,name:'玩家'+(i+1),map:'A',mapNote:'',variants:'',score:emptyScore()})),checks:{},breakOpen:false,breakChecks:{},end:null,gid:null,prev:null};}
export function standings(s){
 const rows=participants(s).map(p=>({...p,value:scoreValue(p.score)}));
 const compare=(a,b)=>b.value.new-a.value.new || ((a.score.projects===null||b.score.projects===null)?0:b.score.projects-a.score.projects);
 rows.sort(compare);rows.forEach((p,i)=>p.place=i&&compare(p,rows[i-1])===0?rows[i-1].place:i+1);return rows;
}
export function tiedPlayers(s){const ps=participants(s).filter(p=>p.score.appeal!==null&&p.score.conservation!==null);return ps.filter(p=>ps.some(o=>o.id!==p.id&&scoreValue(o.score).new===scoreValue(p.score).new)).map(p=>p.id);}
export function endReminder(c,kind,trigger){
 if(c.n===1)return '官方单人：第六轮结束直接终局，不再休息或收入；两轨交汇也不提前结束。〔基础 p20〕';
 return kind==='break'?'休息中触发：完成休息后，所有人各有最后一回合。〔基础 p19〕':`${trigger}在自己回合末触发：其他人各有最后一回合，触发者不再行动。〔基础 p19〕`;
}
export function reduce(s,a,actor){
 if(!a||typeof a.t!=='string')throw Error('无效操作');
 if(a.t==='claim'){if(s.host&&s.host!==actor)throw Error('已有主持人');return {...s,host:actor,revision:s.revision+1};}
 if(!['score','break','breakCheck'].includes(a.t)&&s.host!==actor)throw Error('只有主持人可以执行此操作');
 const n=structuredClone(s);n.prev={...s,prev:null};n.revision++;
 switch(a.t){
 case 'config': {if(s.stage!=='setup')throw Error('开局后不能改配置');const e=configError(a.config);if(e)throw Error(e);n.config={...a.config};n.checks={};break;}
 case 'player':{if(s.stage!=='setup')throw Error('请在开局前记录地图和玩家');const p=n.players.find(p=>p.id===a.id);if(!p)throw Error('玩家不存在');if(typeof a.name!=='string'||!a.name.trim()||a.name.length>24||!MAPS.includes(a.map)||typeof a.mapNote!=='string'||a.mapNote.length>60||typeof a.variants!=='string'||a.variants.length>80)throw Error('玩家资料格式无效');Object.assign(p,{name:a.name.trim(),map:a.map,mapNote:a.mapNote,variants:a.variants});n.checks={};break;}
 case 'check':if(s.stage!=='setup'||typeof a.id!=='string'||a.id.length>80||typeof a.value!=='boolean')throw Error('无效准备清单');n.checks[a.id]=a.value;break;
 case 'begin':case 'direct':if(s.stage!=='setup')throw Error('已经开局');if(configError(s.config))throw Error(configError(s.config));n.stage=a.t==='direct'?'score':'play';n.gid=Date.now()+'-'+crypto.randomUUID();break;
 case 'break':if(s.stage!=='play'||s.config.n===1||typeof a.open!=='boolean')throw Error('多人对局中才能打开休息清单');n.breakOpen=a.open;if(a.open&&!s.breakOpen)n.breakChecks={};break;
 case 'breakCheck':if(!s.breakOpen||s.stage!=='play'||typeof a.id!=='string'||a.id.length>80||typeof a.value!=='boolean')throw Error('休息清单未打开');n.breakChecks[a.id]=a.value;break;
 case 'end':if(s.stage!=='play'||!['turn','break'].includes(a.kind)||!participants(s).some(p=>p.id===a.trigger))throw Error('请确认终局触发时机和玩家');n.end={kind:a.kind,trigger:a.trigger};break;
 case 'toScore':if(s.stage!=='play')throw Error('不在游戏中');n.stage='score';n.breakOpen=false;break;
 case 'score':{
  if(s.stage!=='score')throw Error('请先进入计分或修订');const p=n.players.find(p=>p.id===a.id);if(!p||!participants(s).some(x=>x.id===a.id))throw Error('玩家不在本局');const q=a.score;
  if(!q||!['final','pending'].includes(q.path)||!integer(q.appeal,0,114)||!integer(q.conservation,0,41)||!integer(q.extraAppeal,0,114)||!integer(q.extraConservation,0,41)||!(q.projects===null||integer(q.projects,0,7))||typeof q.note!=='string'||q.note.length>500||['ten','sponsors','noDouble','confirmed'].some(k=>typeof q[k]!=='boolean'))throw Error('请填有效整数和核对项；支持项目次数为 0–7');
  if(q.path==='final'&&(q.extraAppeal||q.extraConservation))throw Error('已走轨不能再填增量');
  if(q.path==='pending'&&(q.extraAppeal||q.extraConservation)&&!q.note.trim())throw Error('请注明尚未计入的终局效果来源');
  if(q.confirmed&&(!q.ten||!q.sponsors||!q.noDouble))throw Error('请核对首次10保护点、赞助商终局效果与项目分不重复');
  scoreValue(q);p.score={...q};break;
 }
 case 'finish':if(s.stage!=='score'||participants(s).some(p=>!p.score.confirmed))throw Error('请等待所有玩家确认');if(tiedPlayers(s).some(id=>s.players.find(p=>p.id===id).score.projects===null))throw Error('平分玩家请补填支持保护项目次数');n.stage='over';break;
 case 'reopen':if(s.stage!=='over')throw Error('尚未结算');n.stage='score';break;
 case 'undo':if(!s.prev)throw Error('没有可撤销操作');return {...s.prev,host:s.host,revision:s.revision+1,prev:null};
 default:throw Error('未知操作');
 }return n;
}
export function gameRecord(s){return {gid:s.gid,config:s.config,players:participants(s),results:standings(s),ended:Date.now(),mode:s.config.n===1?'solo':'multi'};}
