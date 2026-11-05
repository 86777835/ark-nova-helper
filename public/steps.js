export const SOURCES={glossary:'https://cdn.shopify.com/s/files/1/0947/3907/1278/files/Ark-Nova-Glossary.pdf?v=1754428544',base:'https://capstone-games.com/cdn/shop/files/Ark-Nova-Rulebook.pdf',marine:'https://capstone-games.com/cdn/shop/files/AN_Exp1_Rules_EN_0-7_low.pdf',v2:'https://www.feuerland-spiele.de/fileadmin/game/Arche_Nova/AN_Rules_DE_V2_0_Web.pdf',faq:'https://www.gameharbor.com.cn/uploads/GameDownloads/1689920075_28b06eb8fb67fd7182dc.pdf',map:'https://www.gameharbor.com.cn/uploads/GameDownloads/1689920115_7da42e45518f662e2cf9.pdf'};
export const REPLACEMENTS=['001','003','005','008','009','010','011','101','102','131','207','208','225','226','227','250','261','262'];
const item=(id,text,key='base',page='4–5',tag='基础')=>({id,text,url:SOURCES[key],page,tag});
export function mapList(map){
 if(map==='9')return [item('map9-setup','9 · 地理动物园：在五个大洲区域旁的小方格各放一枚玩家标记。','map','1','地图包 1'),item('map9-rule','动物安置区至少一格位于匹配大洲区域时，可移除该洲标记并任选一项奖励。每洲一次，奖励可重复选；移除最后一枚再得1保护点数。群集动物不触发；建特殊饲养区时转移动物可触发。','map','1','地图包 1')];
 if(map==='10')return [item('map10-setup','10 · 救助站：保留地图顶部三个槽位，开局不预放动物。','map','2','地图包 1'),item('map10-rule','只有地图的刨挖奖励才能把弃掉的非萌宠动物插入空槽。图标及大小视为在园，能触发其他牌，但不执行该动物自身效果；不需支付或满足条件，不能放归。最多三张，不能替换；其他牌的刨挖不能收留。','map','2','地图包 1')];
 const advanced={
 '1':'1 · 饲养区必须紧邻塔所在格，其他岩石格不算。特殊饲养区不享受能力；标准区翻空后再次安置动物仍可获得2魅力。塔本身不算贩售亭邻接建筑。',
 '2':'2 · 紧邻户外营地所在格的标准饲养区视为大2格，其他水域不算；特殊饲养区不受影响，营地本身不算建筑。',
 '4':'4 · 在港口相邻建筑格建造后启用能力；每个自己的回合至多弃1张牌，不能在休息或他人回合使用，港口本身不算建筑。',
 '5':'5 · 休息时，餐厅相邻的每个已建造六角格各收入1钱。按格数而非建筑数算，标准饲养区是否空置不影响；餐厅本身不算建筑。',
 '6':'6 · 在研究所相邻建筑格建造后，打动物可少满足一个条件，但不能忽略水域或岩石需求；研究所本身不算建筑。',
 '7':'7 · 覆盖地图所有指定奖励格后，每个贩售亭在休息时额外收入1钱，即使它原本不产生收入也算。请在实物图上核对所需格位。',
 '8':'8 · 覆盖指定图标格时翻牌至第一张赞助商并收入手牌，其余弃除；这不算放置奖励（221不能重复）。三格全覆盖后，打赞助商的等级减1。'
 };
 if(advanced[map])return [item('map-'+map,advanced[map],'glossary','8','基础地图')];
 if(map==='other')return [item('map-other','其他地图只记录编号，本站没有专门提示；请查相应地图规则书。')];
 return [item('map-'+map,map==='A'?'A · 新手地图：使用印制的起始建筑和奖励。':map==='0'?'0 · 过渡地图：按地图奖励设置，不套用 A 的起始建筑。':`${map} · 进阶地图：按实物地图能力与放置要求准备；细节请查基础术语表的动物园地图章节。`)];
}
export function setupList(c,players=[]){
 const out=[item('map-order','先选地图，再完成个人准备。地图能力不随是否加入海洋而消失。')];
 if(c.marine)out.push(item('replace','换出旧牌：'+REPLACEMENTS.join('、')+'；另换20张标准行动卡及指定奖励板块，旧新替换牌不要共存。','marine','2','海洋'),item('mix','新动物园卡、终局卡、基础保护项目分别混入对应牌堆，新增建筑、海洋馆及奖励板块加入供应堆。','marine','1–2','海洋'),item('university','使用新协会板，摆泛用大学，物种大学放旁边；声望15旁额外放一个随机奖励。','marine','2、6、8','海洋'),item('draft',c.n===1?'地图选好后随机抽3张变体行动，选两种不同类型。如果三张同类，补另一类且必须用补牌和原来的一张。':'地图选好后每人发3张变体行动：留1传左2，再留1传左1，最终3选2且类型不同。三张同类则从未参加轮抽的牌中补另一类型，必须使用补牌和原来的一张。','marine','8','海洋'));
 out.push(item('projects',`翻开 ${c.n===4?4:3} 张基础保护项目；每类合作动物园、大学各摆一个。`));
 if(c.n===2)out.push(item('block','双人用六枚闲置颜色标记：封锁左项目左档、中项目中档、右项目右档，以及捐赠区左列三个位置。'));
 if(c.n===1)out.push(item('solo','官方单人：三张基础项目不封锁；不用休息标记，在单人板左列放7枚闲置颜色标记；依实物板进行7/6/5/4/3/2个常规回合。','base','20'),item('solo-start',`初始魅力 ${c.difficulty}，保护点数0、声望1。最多25魅力的赞助商条件按本难度改为 ${25+c.difficulty}。这项2023更新同样适用于基础版。`,'marine','8','基础 / 海洋（2023 更新）'));
 else out.push(item('start',`先手为座位 ${c.first+1}；从先手顺时针，初始魅力依次 ${Array.from({length:c.n},(_,i)=>i).join(' / ')}；保护点数0、声望1。休息标记放人数对应格。`));
 out.push(item('personal','每人25钱、1名可用事务员，其余3名卧放；地图左侧放7枚项目标记。抽8张动物园卡留4张，另抽2张隐藏终局卡。'),item('actions','行动卡均从 I 面开始；动物放槽1，其余四张随机放槽2–5。'+(c.marine?'选出的两张变体替换同类型标准行动。':''),c.marine?'marine':'base',c.marine?'2、8':'4–5',c.marine?'海洋':'基础'),item('display','在四个空白黄色奖励格随机放奖励；准备展示区6张牌，选完起始手牌后翻开。'+(c.marine?'初始展示忽略海浪。':''),c.marine?'marine':'base',c.marine?'2、4':'4–5',c.marine?'基础 / 海洋':'基础'),item('scoring',`本局显示${c.scoring==='new'?'新版':'旧版'}计分，同时保留对照。新分＝旧分＋100；保护点数不能直接和魅力相加。`,'v2','19','基础 / 海洋（2023 更新）'));
 for(const p of players.slice(0,c.n))for(const x of mapList(p.map))out.push({...x,id:p.id+'-'+x.id,text:p.name+'：'+x.text});return out;
}
export function breakList(c){
 if(c.n===1)return [item('solo-break','官方单人按照实物计步板处理；普通休息轨不推进，触发休息不拿X；第六轮结束不再收入，直接终局。','base','20')];
 const a=[item('hand','完成触发休息的回合后，弃手牌至上限（通常3张，有对应大学为5张）。','base','18'),item('tokens','移除行动卡上的双重、毒液和缠绕标记。','base','18'),item('workers','召回事务员，补合作动物园与大学；所有人均已有的合作动物园不必补。','base','18')];
 if(c.marine)a.push(item('generic','补回泛用大学；每人至多一个新类型大学。','marine','6','海洋'));
 a.push(item('display','弃展示区最低两张，依序下移并补足。','base','18'));
 if(c.marine)a.push(item('waves','新补入的海浪逐个处理：弃最低位再补，可能连锁；打出海浪牌本身不触发。','marine','4–5','海洋'));
 a.push(item('income','领取魅力收入、贩售亭收入、赞助商及已解锁持续奖励。空标准饲养区不产贩售亭收入，特殊饲养区不要求有动物。需抢展示牌的收入从触发者起顺时针处理。','base','18–19'),item('reset','休息标记回人数起点，由触发者下一位继续。若休息中交汇，完成休息后所有人各有最后一回合。','base','19'));return a;
}
export const SCORE_CHECKS=[item('ten','首次有人到 10 保护点数时，全体弃 1 张终局卡；还没弃的现在弃。因特殊效果多拿的终局卡照常保留。','base','18–19'),item('sponsors','留下的终局卡、赞助商等带终局图标的效果都结算了，再读两条轨道。','base','19'),item('noDouble','保护项目、动物等已经走过轨的分不要再加；还没走轨的只填增量。','base','19')];
