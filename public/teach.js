// N-minute teach: a script the teacher reads aloud to start a first game, written from the official rulebooks in this
// site's own words (same terms as tools/讲解稿.md). It names every important element in a sentence and leaves the fine
// rulings to the rules assistant. Terms in {text|id} open a note with a picture cropped from the official rulebooks
// (img/teach/<icon>.webp); the 「问」 buttons and each note's 「问规则助手」 ask the rules assistant (chat.js) straight away.
// Two modes, chosen at the top and remembered: base game (default) or with Marine Worlds. A line, question or note is for
// both, or {b} base only / {m} Marine Worlds only. After the script, 注意事项 (NOTES) lists the easy-to-get-wrong points.
// Scoring is explained the new (2023) way, the site's default; the old way is a note.
const ICON = (id, cls = '') => id ? `<img class="tim ${cls}" src="/img/teach/${id}.webp" alt="">` : '';

// id: name, where you see it on the table, what it means. icon: a picture in img/teach/ (defaults to the id).
const TERMS = {
  board: { name: '主版图', where: '桌子中间的长条版图：四周是魅力轨和保护点数轨，中间一排 6 个格子放展示区的牌。', what: '大家共用的版图。分数轨、声望轨、休息轨和展示区都在上面。' },
  appealtrack: { name: '魅力轨', where: '主版图边上一长条数字格，从 0 数到 113。', what: '动物园有多受欢迎。打动物、盖休憩亭等都会加魅力；每次休息按魅力拿收入；终局是主要分数来源。' },
  cp2: { name: '保护点数轨', where: '主版图上带绿色盾牌的那条轨，从魅力轨的另一头往回走。', what: '你为动物保护做了多少事，主要靠支持保护项目获得。到 2、5、8、10 点有奖励。' },
  meet: { name: '计分区', where: '两条轨上下对齐的一段：保护点数轨一格，加上旁边一段魅力格，算一个计分区。', what: '你的魅力标记和保护点数标记走进同一个计分区，或者已经交错，游戏就要结束。' },
  breaktrack: { name: '休息轨', where: '主版图上一条短轨，按人数放在不同的起点，终点印着 X 标记。', what: '卡牌行动、赞助商换钱和一些卡牌效果会把休息标记往终点推，推到头就全体休息。' },
  breaktoken: { name: '休息标记', where: '一个木制方块，放在休息轨上。', what: '推到休息轨终点就触发休息；推到头的人拿 1 个 X 标记。休息完放回本局人数的起点。' },
  zoomap: { name: '动物园地图', where: '每人面前那张大地图：中间是空地，下面放 5 张行动卡，左边放玩家标记，右边放合作动物园、大学和事务员。', what: '你的动物园。建筑都盖在中间的空地上，水和岩石格不能盖，有的动物要挨着它们住。' },
  slots: { name: '行动卡', where: '动物园地图下面一排 5 个卡槽，每槽一张行动卡，槽上印着 1 到 5。', what: '每回合挑一张做行动，槽位数字就是强度。做完这张卡挪到槽 1，其余右移。' },
  money: { name: '钱', where: '灰色硬币，面值 1、5、10、20，开局每人 25 钱。', what: '盖建筑、打动物、打赞助商、捐赠都要花钱。主要来源是休息时的收入和赞助商行动换钱。' },
  worker: { name: '事务员', where: '你颜色的小人，4 个：开局 1 个站在地图右上的记事本上能用，3 个躺在下面。', what: '做协会行动时派出去。保护轨 2 点等奖励能多叫醒一个；每次休息全部回来。' },
  ptoken: { name: '玩家标记', where: '你颜色的小方块：开局 7 个放在地图左边一列，其余放在旁边备用。', what: '支持保护项目时，从地图左边拿一个放到项目上，空出的格子给你奖励；住进特殊饲养区的动物也用它占格。' },
  final: { name: '终局计分卡', where: '红棕色卡背的卡，开局每人抽 2 张，自己看，不给别人看。', what: '终局时按卡上的条件再拿保护点数，每张最多 4 点。第一次有人到 10 保护点数时，全体各弃 1 张。' },
  xtoken: { name: 'X 标记', where: '黑色 X 形的小板块，放在地图右上的记事本上，最多 5 个。', what: '行动开始前每用 1 个，这次行动强度 +1。可以做「X 标记行动」专门拿，推到休息轨终点也给 1 个。' },
  upgrade: { name: '升级', where: '行动卡两面：蓝色 I 面和粉色 II 面。地图、保护轨、声望轨上的升级图标。', what: '拿到升级奖励就把一张行动卡翻到 II 面，下次行动起更强。全局最多升级 4 张，不可能 5 张全升。' },
  abuild: { name: '建造行动', where: '印着铲子的行动卡。', what: '在地图上盖建筑，每格付 2 钱。I 面一次盖 1 个、大小不超过强度；II 面可以一次盖多个不同的，还能盖爬行馆和鸟禽馆。' },
  enclosure: { name: '标准饲养区', where: '1 到 5 格大小的六边形板块，空的一面印着数字，另一面画着有动物。', what: '动物的家。盖好时空面朝上，住进动物后翻面；动物卡左上角写着至少要几格。' },
  kiosk: { name: '贩售亭', where: '1 格的灰色板块，另一面是休憩亭。', what: '休息时，每个贩售亭挨着几个建筑或有动物的饲养区，就多拿几块钱。贩售亭之间至少隔 2 格。' },
  pavilion: { name: '休憩亭', where: '1 格的粉色板块，是贩售亭的背面。', what: '盖好马上 +1 魅力，只在盖的时候给一次。' },
  petting: { name: '萌宠园', where: '3 格的特殊饲养区，每园只能有 1 个。', what: '萌宠动物只能住这里。动物不翻面，用玩家标记占格。' },
  reptile: { name: '爬行馆', where: '5 格的特殊饲养区，每园只能有 1 个，建造升级后才能盖。', what: '爬行动物可以住这里，用玩家标记占格；盖好时可以把标准饲养区里的爬行动物搬进来一次。' },
  aviary: { name: '鸟禽馆', where: '5 格的特殊饲养区，每园只能有 1 个，建造升级后才能盖。', what: '部分鸟类可以住这里，规则和爬行馆一样。' },
  unique: { name: '独有建筑', where: '形状各异的特殊建筑板块。', what: '不能用建造行动盖，只能靠对应的赞助商卡放进动物园；常给魅力、收入或其他效果。' },
  aanimals: { name: '动物行动', where: '印着大象的行动卡，开局放在槽 1。', what: '从手里打动物卡，强度越高一次能打越多只（强度 5 打 2 只）。II 面还能从展示区直接打。' },
  animal: { name: '动物卡', where: '动物园卡里画着动物照片的卡：左上角写大小和价钱，右上角是类别和大洲图标，右下角是加多少魅力。', what: '付钱、满足条件、住进够大的空饲养区，就能打出：加魅力，有的还加保护点数、声望或有特殊能力。' },
  acards: { name: '卡牌行动', where: '印着几张卡的行动卡。', what: '把休息标记推 2 格，然后从牌堆抽卡，强度越高抽得越多；强度够高也可以改从展示区直接拿 1 张。' },
  display: { name: '展示区', where: '主版图中间一排 6 张正面朝上的动物园卡，每格下面印着 1 到 6。', what: '大家都能从这里拿牌、打牌，但只能拿声望范围内的；被拿走的牌回合结束才往前挪、补新牌。' },
  reputation: { name: '声望', where: '主版图上的声望轨，图标是一顶学士帽。', what: '声望标记对着的展示区格子及编号更小的格子，是你的声望范围；声望轨上还有奖励，包括升级。' },
  aassoc: { name: '协会行动', where: '印着人像的行动卡。', what: '把事务员派到协会板上做任务：加声望、拿合作动物园、拿大学、支持保护项目。II 面还能捐赠。' },
  assoc: { name: '协会板', where: '主版图旁边的蓝色版图：左边粉色是捐赠区，右边蓝色是 4 种任务，上下两排放保护项目牌。', what: '做协会行动的地方，每种任务旁标着要多少强度：2、3、4、5。' },
  partner: { name: '合作动物园', where: '协会板上五个大洲各一块，拿到后放在地图右边。', what: '打这个大洲的动物，每个大洲图标便宜 3 钱，还给你 1 个该大洲图标。最多 4 个，大洲不能重复。' },
  university: { name: '大学', where: '协会板上的小房子形板块，三种各一块，拿到后放在地图右边。', what: '给研究图标和上面印的奖励，有的加声望；其中一所能把手牌上限提到 5。' },
  asponsor: { name: '赞助商行动', where: '印着 @ 的行动卡。', what: '打 1 张等级不超过强度的赞助商卡；或者不打牌，把休息标记往前推、按强度拿钱。' },
  sponsor: { name: '赞助商卡', where: '动物园卡里左上角写着等级数字、下面是人物或场景照片的卡。', what: '打出后给即时效果、持续效果、收入或终局分；有的让你在园里放一座独有建筑。' },
  project: { name: '保护项目卡', where: '动物园卡里绿色底、下面印着三档盾牌数字的卡。', what: '写着一个条件，比如园里有几个某类动物图标。满足一档就放一个玩家标记上去，拿对应的保护点数。' },
  basecp: { name: '基础保护项目', where: '绿色盾牌卡背的卡，开局翻几张放在协会板下方。', what: '开局就能支持的保护项目，整局都不会被换掉。' },
  categories: { name: '动物类别', where: '动物卡右上角的彩色圆形图标：鸟、食草、食肉、灵长、爬行，还有熊和萌宠两种黑白图标。', what: '保护项目、赞助商和终局计分卡常常按这些图标计数。' },
  cp58: { name: '保护轨 5、8 点', where: '保护点数轨第 5、8 格旁边放着奖励板块。', what: '走到时拿 5 钱，或者拿旁边一块奖励板块；板块拿完了还能拿 5 钱。' },
  cp10: { name: '保护轨 10 点', where: '保护点数轨第 10 格，印着弃终局计分卡的图标。', what: '第一次有人到 10 点，全体各弃 1 张终局计分卡。没人到过 10 的话，终局计分前每人弃 1 张。' },
  bonustile: { name: '奖励板块', where: '黄色五边形板块，开局随机放 4 块在主版图的黄色奖励格上。', what: '保护轨 5、8 点等处可以拿，拿到马上执行，比如拿声望、X 标记或钱。' },
  donation: { name: '捐赠区', where: '协会板左边粉色那一列，一格格印着钱数。', what: '协会行动升级后，每次可以多捐 1 次：付露出的最小金额，盖住那格，得 1 保护点数。' },
  axtoken: { name: 'X 标记行动', where: '行动卡上的 X 图标，两面都能做。', what: '挑任意一张行动卡照常挪到槽 1，不做它的行动，只拿 1 个 X 标记；已经有 5 个就不能做。' },
  // Marine Worlds
  seaanimal: { name: '海洋动物', where: '动物卡右上角深蓝色圆底的章鱼图标。', what: '《海洋世界》新增的动物类别。大多只能住海洋馆，少数也能住标准饲养区或爬行馆。' },
  aquarium: { name: '海洋馆', where: '《海洋世界》新增的特殊饲养区：大海洋馆 5 格、小海洋馆 2 格，每园各一座。', what: '建造 I 面就能盖，要挨着水。海洋动物住进去用玩家标记占格；馆上的水图标也算你园里的水图标。' },
  reef: { name: '珊瑚住客', where: '海洋动物卡右边多一个珊瑚图标，旁边是它的珊瑚效果。', what: '每打出一只珊瑚住客，园里所有珊瑚住客（包括它自己）的珊瑚效果都发动一次。' },
  wave: { name: '海浪', where: '海洋动物卡（和部分赞助商卡）名字下方右边的海浪图标。', what: '打出时没效果。补展示区时翻出带海浪的牌，就把展示区最低位那张弃掉，再补一张。' },
  newuni: { name: '新大学', where: '《海洋世界》的一排大学板块，每块对应一种动物图标；协会板上放一块通用大学。', what: '做拿大学的任务时可以改拿一所新大学：给 1 个动物图标、1 个研究图标，还能从牌堆翻出一张带该图标的牌。每人最多一所。' },
  altaction: { name: '变体行动卡', where: '《海洋世界》新增的 20 张行动卡，每种行动 4 个变体，左上角圆圈里写着特别之处。', what: '开局轮抽，把 2 张标准行动卡换成变体，规则基本相同，多一点小加成。' }
};

// The script: what to read aloud. Every important element gets one sentence; how it is ruled exactly is for the assistant.
const PARTS = [
  { title: '怎么赢', sec: 40, lines: [
    { b: '这局玩《方舟动物园》。我先讲一遍主流程，讲完再一条条过注意事项。', m: '这局玩《方舟动物园》，带《海洋世界》扩展。我先讲一遍主流程，讲完再一条条过注意事项。' },
    '每人经营一座现代动物园：盖饲养区、养动物、支持动物保护项目。',
    '{主版图|board}上有两条分数轨：{魅力|appealtrack}从 0 往上走，{保护点数|cp2}从另一头往回走，方向相反。',
    '两个标记走进同一个{计分区|meet}，或者已经交错，游戏就要结束；交错得越多，分越高。',
    '没有固定轮数，大家顺时针一人一回合；隔一阵全体{休息|breaktrack}一次，拿收入、补东西。'
  ], ask: ['游戏什么时候结束？', '新版与旧版计分有什么不同？'] },
  { title: '你面前有什么', sec: 40, msec: 50, lines: [
    '每人一张{动物园地图|zoomap}：建筑都盖在中间的空地上，水和岩石格不能盖。',
    '地图下面一排 5 张{行动卡|slots}：动物、建造、卡牌、协会、赞助商，开局都是 I 面。',
    { m: '《海洋世界》开局先轮抽，把其中 2 张换成{变体行动卡|altaction}，同样从 I 面开始。' },
    '开局 25 {钱|money}；4 个{事务员|worker}只有 1 个能用。',
    '地图左边一列 7 个{玩家标记|ptoken}：支持保护项目时拿出来，空出的格子给奖励。',
    '每人抽 2 张{终局计分卡|final}自己看；再摸 8 张动物园卡，留 4 张当手牌。'
  ], ask: ['开局每人拿什么？', '两人局有什么不同？', { m: '变体行动怎么轮抽？' }] },
  { title: '一回合：挑一张行动卡', sec: 45, lines: [
    '每回合只做一个行动：挑一张{行动卡|slots}，它所在槽位的数字就是这次的强度，最左 1、最右 5。',
    '做完把这张卡挪到最左边的槽 1，原来在它左边的卡各往右挪一格。刚用过的卡变弱，久不用的卡慢慢变强。',
    '行动前可以花{X 标记|xtoken}，每个让强度 +1；也可以挑任意一张卡挪到槽 1，什么都不做，只拿 1 个 X 标记。',
    '拿到{升级|upgrade}奖励，就把一张行动卡翻到 II 面，以后更强。5 张卡不可能全升级，要挑。'
  ], ask: ['行动卡的强度怎么算？', 'X 标记怎么拿、怎么用？', '怎么升级行动卡？'] },
  { title: '建造和动物', sec: 55, msec: 75, lines: [
    '{建造|abuild}：在地图上盖建筑，每格付 2 钱。I 面一次盖 1 个，大小不超过强度。',
    '能盖{标准饲养区|enclosure}（1 到 5 格）、{贩售亭|kiosk}（休息时收钱）、{休憩亭|pavilion}（马上 +1 魅力）和{萌宠园|petting}；升级后才能盖{爬行馆|reptile}和{鸟禽馆|aviary}。',
    '盖住地图上的黄色奖励图标，马上拿奖励。',
    '{动物|aanimals}：从手里打{动物卡|animal}。付左上角的钱，满足卡左边的条件，住进够大的空饲养区，再把饲养区翻成有动物的一面。',
    '每只动物马上加魅力，有的还加保护点数、声望，或者有特殊能力。',
    { m: '《海洋世界》加了{海洋动物|seaanimal}，大多只能住{海洋馆|aquarium}；海洋馆用建造 I 面就能盖，要挨着水。' },
    { m: '{珊瑚住客|reef}每打出一只，园里所有珊瑚住客的珊瑚效果都再发动一次。' }
  ], ask: ['建造怎么算费用？', '建筑能放在哪？', '打动物需要满足什么？', '一次能打几只动物？', { m: '珊瑚住客会重发动所有动物能力吗？' }] },
  { title: '卡牌、协会、赞助商', sec: 65, msec: 75, lines: [
    '{卡牌|acards}：先把{休息标记|breaktoken}往前推 2 格，再从牌堆抽卡；强度够高也能改从{展示区|display}直接拿 1 张。',
    '展示区是主版图上一排 6 张公开的牌，{声望|reputation}越高，能从里面拿、打的牌越多。',
    '{协会|aassoc}：把事务员派到{协会板|assoc}上做任务：强度 2 加声望，3 拿{合作动物园|partner}，4 拿{大学|university}，5 支持保护项目。',
    '合作动物园让那个大洲的动物便宜 3 钱；大学给研究图标和奖励，有一所能把手牌上限提到 5。',
    { m: '《海洋世界》还有{新大学|newuni}：每人最多一所，选一种动物图标。' },
    '{赞助商|asponsor}：打{赞助商卡|sponsor}，有的给持续效果或收入，有的让你盖一座{独有建筑|unique}；不打牌也行，把休息标记往前推，按强度拿钱。'
  ], ask: ['卡牌行动能从展示区拿哪几张？', '声望范围是什么？', '协会行动有哪些任务？', '赞助商行动不打牌能做什么？', '钱不够能做什么？'] },
  { title: '保护项目', sec: 45, lines: [
    '保护点数主要靠支持{保护项目|project}。开局协会板下方摆着几张{基础保护项目|basecp}，之后还能从手里打新的。',
    '项目上写着条件，比如园里有几个某类图标；满足一档，就从地图左边拿一个玩家标记放上去，加保护点数。',
    '数的是卡右上角的{动物类别|categories}和大洲图标，再加合作动物园和大学。每个项目每人只能支持一次。',
    '{保护点数轨|cp2}到 2 点可以升级一张行动卡或多叫醒一个事务员；5、8 点拿钱或{奖励板块|bonustile}。',
    '第一次有人到 {10 点|cp10}，全体各弃 1 张终局计分卡。'
  ], ask: ['怎么支持保护项目？', '保护项目的图标怎么数？', '保护轨上有哪些奖励？'] },
  { title: '休息', sec: 40, msec: 50, lines: [
    '{休息轨|breaktrack}上的标记被推到头，就触发全体休息；推到头的人拿 1 个 X 标记，先把这回合做完。',
    '休息主要做这几件事：手牌弃到上限 3 张；事务员全部回来；展示区 1、2 号格的牌弃掉、补新牌；然后拿收入。',
    '收入看魅力轨上你标记旁边印的钱，再加每个{贩售亭|kiosk}挨着的建筑数，以及卡上和地图上的收入图标。',
    { m: '补展示区时翻出带{海浪|wave}的牌，就再弃掉最低位那张、接着补。' },
    '休息的每一步，本站房间里的「休息清单」可以全桌一起核对。'
  ], ask: ['什么时候休息？', '休息要做哪些事？', '收入怎么算？', { m: '海浪什么时候发动？' }] },
  { title: '结束和计分', sec: 40, lines: [
    '你的回合结束时，或者休息中，两个标记进入同一计分区或交错，就触发终局：回合末触发，其他人各再走一回合；休息中触发，所有人各再走一回合。',
    '然后结算手里留下的终局计分卡和带终局效果的赞助商卡，再读两条轨。',
    '本站默认新版计分：最终魅力加上保护点数那格印的小白字。两轨刚走进同一计分区就是 100 分起，交错越多分越高。',
    '平分比支持保护项目的次数。本站「计分」页每人用自己的手机填，自动换算。流程就这些，接下来过一遍注意事项。'
  ], ask: ['休息中交汇和回合末交汇有区别吗？', '到10保护点数时谁弃终局卡？', '平分比较什么？'] }
];

// 注意事项: the easy-to-get-wrong points outside the main flow, gone through one by one after the script. Each is a title and
// a written answer (own words, from tools/faq.json, tools/讲解稿.md and docs/规则核验.md, which cite the rulebook pages);
// what isn't here goes to the rules assistant. An optional third item 'm' keeps a note to Marine Worlds games.
const NOTES = [
  ['「完成后」的效果什么时候算', '写着「完成后」的效果，要等整个行动做完、行动卡挪到槽 1 之后才执行。一次打 2 只动物时，先把第一只的其他效果都结算完再打第二只，两只的「完成后」效果都留到最后。'],
  ['X 标记的细节', '最多拿 5 个。必须在行动开始前决定用几个，行动中途拿到的 X 标记不能补加到这次行动上。有些行动强度超过 5 也没有额外好处。'],
  ['行动中途升级了怎么办', '这次行动仍按开始时那一面做，下次行动才用 II 面。不过检查打牌条件（比如要求某行动已升级）时，立刻算作已升级（游人码头官方 FAQ）。'],
  ['建筑放在哪儿', '第一个建筑至少有一格在地图边缘格上，之后每个建筑都要和已有建筑共一条边。不能出界、叠放，不能盖水和岩石；带建造升级图标的格，升级建造后才能盖。贩售亭之间至少隔 2 格。'],
  ['打动物的钱和住处', '先付得起全价：合作动物园每对应 1 个大洲图标减 3 钱，卡牌效果给的钱要后面才到账。萌宠只能住萌宠园；爬行动物和部分鸟也能住爬行馆、鸟禽馆，用玩家标记占格，不翻面。'],
  ['展示区怎么拿牌', '你的声望标记对着的那格和编号更小的格，是声望范围。卡牌行动 I 面强度至少 5 时，可以从展示区任拿 1 张，不看声望；从展示区直接打牌要加付那格编号的钱。被拿走的牌等回合结束才往低编号挪、补新牌。'],
  ['声望的上限', '卡牌行动升级到 II 面之前，声望升不到 10 以上。声望 15 封顶，之后每多得 1 声望改拿 1 魅力。'],
  ['协会任务和事务员', '每个任务放 1 个可用事务员；这个任务上已经有你 1 个，就要放 2 个；已经有 3 个就暂时不能做。I 面一次只做一个任务；II 面可以做多个不同任务，数值加起来不超过强度，同一次行动不能重复同一个任务。'],
  ['合作动物园和大学的上限', '合作动物园最多 4 个、大洲不能重复，第 3、4 个要先升级协会行动。大学每种只能拿一所。协会板上拿完了，要等下次休息才补。'],
  ['怎么捐赠', '协会行动升级后，同一次行动里至少做了 1 个任务，就可以额外捐 1 次：付捐赠区露出的最小金额，用玩家标记盖住那格，得 1 保护点数，不用事务员。只剩最后一格后，每次都付 12 钱。'],
  ['打新的保护项目牌', '只有马上要支持它时才能打。新牌放在协会板上方最左边，原有的往右挪；超过本局人数的上限，就把最右边那张弃掉，上面的玩家标记回各自备用区，不回地图。协会板下方的基础保护项目永远不动。'],
  ['保护项目怎么数图标', '数你所有动物卡、赞助商卡右上角的图标（左上角的水、岩要求也算），再加上合作动物园和大学。卡左侧的条件不算，保护项目牌上的图标不算，育儿袋下面的牌也不算。'],
  ['放归野外的项目', '这类项目要你弃掉园里 1 张动物，动物要求的标准饲养区大小要和条件一致。先扣掉这只动物给的魅力，再加保护点数；它住的地方要清出来，标准饲养区翻回空面（翻哪块按官方 FAQ）。'],
  ['两人局要封住哪些格', '用 6 个没人用的颜色标记封住：左边项目的左档、中间项目的中档、右边项目的右档，以及捐赠区左列 3 格。被封住的格谁都不能用。'],
  ['手牌上限', '平时 3 张，拿到对应的大学可以变成 5 张，这是唯一的办法。只在休息时检查，平时手里有多少都行。'],
  ['贩售亭收入怎么数', '每个贩售亭单独算。和它共一条边的每个独有建筑、特殊饲养区、有动物的标准饲养区、休憩亭各给 1 钱，同一个建筑不按接触边数重复算。空的标准饲养区不算，特殊饲养区空着也算。'],
  ['赞助商的细节', 'I 面只打 1 张，强度不低于卡左上角的等级，还要满足卡左侧的条件。II 面可以打多张，等级总和不超过强度 +1。改成推休息标记拿钱时，标记推不满也拿全额：I 面 X 钱，II 面 2X 钱。'],
  ['终局时谁还能走', '你自己回合结束时触发：其他人各再走一回合，你不再走。休息中触发：休息做完，包括你在内所有人各再走一回合。别人回合里你因为卡牌效果加了魅力，不在那时触发（官方 FAQ 卡 251）。'],
  ['终局计分别重复算', '先结算终局计分卡（每张最多 4 保护点数）和带终局效果的赞助商，再读两条轨。支持保护项目拿到的分早已在轨上，不要再加一遍。如果从没人到过 10 保护点数，计分前每人先弃 1 张终局计分卡。'],
  ['新版和旧版计分', '新版（2023）：最终魅力加上保护点数那格印的小白字。旧版：魅力减去保护点数所在计分区的最低魅力。新版分数等于旧版加 100，排名不变。本站默认新版，不用《海洋世界》也能用新版。'],
  ['海浪什么时候发动', '只有补展示区时新翻出的牌上有海浪才发动：弃掉展示区最低位那张，再补一张。多个海浪逐个处理，补上的牌还可能再触发。开局铺牌时忽略海浪，打出动物也不会因为海浪发动。', 'm'],
  ['海洋馆怎么住', '小海洋馆 2 格、大海洋馆 5 格，每园各最多一座，建造 I 面就能盖，要挨着水。海洋动物卡上写着要放几个玩家标记，可以分放在两座海洋馆里；少数也能住标准饲养区或爬行馆的，不能和海洋馆混住。', 'm'],
  ['珊瑚住客', '每打出一只珊瑚住客，园里所有珊瑚住客（包括刚打出的这只）的珊瑚效果都发动一次，顺序自己定。其他普通动物的能力不会因此再发动。', 'm'],
  ['新大学', '每人最多拿一所新大学。拿走时把协会板上的通用大学也移开，这样到下次休息前别人不能再拿新大学；休息时放回。拿到时还可以从牌堆往下翻，翻到第一张带该动物图标的牌（动物或赞助商都行）收进手里。', 'm'],
  ['变体行动卡怎么轮抽', '每人发 3 张变体行动卡：留 1 张传左边 2 张，再留 1 张传左边 1 张。最后从手上 3 张里选两张不同类型的，替换掉对应的标准行动卡，都从 I 面开始。三张同类型时，从没参加轮抽的牌里补一张别的类型。', 'm'],
  ['要换掉的旧牌', '《海洋世界》带了 18 张替换用的动物园卡、20 张新版标准行动卡和 1 块替换的奖励板块。开局前把基础游戏里对应的旧牌、旧板块取出来，不能混在一起洗。替换牌的卡号见本站常见问题。', 'm'],
  ['声望轨尽头的奖励板块', '《海洋世界》在声望轨第 15 格旁多放一块奖励板块。声望已经到 15 之后再得声望、板块还在时，可以选拿这块板块，或者拿 1 魅力。', 'm']
];

// Icon guide, grouped the way things sit on the table.
const GROUPS = [
  ['主版图', ['board', 'appealtrack', 'cp2', 'meet', 'cp58', 'cp10', 'display', 'reputation', 'breaktrack', 'breaktoken', 'bonustile']],
  ['你的东西', ['zoomap', 'money', 'xtoken', 'worker', 'ptoken', 'final']],
  ['行动卡', ['slots', 'upgrade', 'aanimals', 'abuild', 'acards', 'aassoc', 'asponsor', 'axtoken']],
  ['建筑', ['enclosure', 'kiosk', 'pavilion', 'petting', 'reptile', 'aviary', 'unique']],
  ['动物园卡', ['animal', 'sponsor', 'project', 'basecp', 'categories']],
  ['协会', ['assoc', 'partner', 'university', 'donation']],
  ['海洋世界', ['seaanimal', 'aquarium', 'reef', 'wave', 'newuni', 'altaction'], 'm']
];

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pic = id => TERMS[id].icon || id;
const term = (text, id) => `<button type="button" class="term" data-t="${id}">${ICON(pic(id))}${esc(text)}</button>`;
const line = s => esc(s).replace(/\{([^|}]+)\|(\w+)\}/g, (_, t, id) => term(t, id));
// inside a button the terms show their icon but are not buttons themselves
const label = s => esc(s).replace(/\{([^|}]+)\|(\w+)\}/g, (_, t, id) => `<span class="tlab">${ICON(pic(id))}${esc(t)}</span>`);
const askBtn = q => `<button type="button" class="tq" data-q="${esc(q)}">问 <span>${label(q)}</span></button>`;

// mode: 'b' base game (default), 'm' with Marine Worlds; remembered in this browser
let mode = 'b';
try { if (localStorage.getItem('ark-teach-mode') === 'm') mode = 'm'; } catch {}
const pick = x => typeof x === 'string' ? x : x[mode];          // a line or question for both modes, or {b, m}
const only = list => list.map(pick).filter(Boolean);
const notes = () => NOTES.filter(n => !n[2] || n[2] === mode);
const secs = p => mode === 'm' && p.msec ? p.msec : p.sec;

function render() {
  const total = PARTS.reduce((t, p) => t + secs(p), 0) / 60;
  document.getElementById('teach').innerHTML = `
  <div class="tmode" role="group" aria-label="这局怎么玩"><span>这局</span>
    <button type="button" data-mode="b" aria-pressed="${mode === 'b'}">只玩基础</button><button type="button" data-mode="m" aria-pressed="${mode === 'm'}">带海洋世界</button></div>
  <p class="tlead">讲的人照着念，约 ${Math.round(total)} 分钟就能开局。<b>带下划线的词</b>点一下看图和解释；有疑问点「问」，规则助手马上回答。</p>
  <nav class="tnav">${PARTS.map((p, i) => `<a href="#p${i + 1}"><i>${i + 1}</i>${p.title}</a>`).join('')}<a href="#later">注意事项</a><a href="#icons">图标速查</a></nav>
  ${PARTS.map((p, i) => `<section class="tpart" id="p${i + 1}">
    <h2><span><i>${i + 1}</i>${p.title}</span><small>约 ${secs(p)} 秒</small></h2>
    ${only(p.lines).map(s => `<p class="tline">${line(s)}</p>`).join('')}
    <div class="tasks"><em>桌上常见疑问</em>${only(p.ask).map(askBtn).join('')}</div>
  </section>`).join('')}
  <section class="tpart" id="later">
    <h2><span><i>!</i>注意事项</span><small>${notes().length} 条</small></h2>
    <p class="tnote">流程讲完后，一条一条过一遍。这些是主流程之外容易出错、容易争的地方，点开念答案。</p>
    ${notes().map(([t, a, m], i) => `<details class="tnotei"><summary><i>${i + 1}</i>${esc(t)}${m === 'm' ? '<em class="tnw">海洋</em>' : ''}</summary><p>${esc(a)}</p>
      <button type="button" class="tq tmore" data-q="${esc(`「${t}」这一条我还有疑问，请再讲讲。`)}">还有疑问？问规则助手</button></details>`).join('')}
    <p class="tnote">注意事项里没有的，点右下角「规则」问 AI，本站资料查不到会联网找。</p>
  </section>
  <a class="button primary tgo" href="/">讲完了，去建房间</a>
  <h2 class="ticons" id="icons">图标速查<small>点图标看解释</small></h2>
  ${GROUPS.filter(g => !g[2] || g[2] === mode).map(([g, ids]) => `<div class="tgrid"><h3>${g}</h3><div>${ids.map(id => `<button type="button" class="tic" data-t="${id}">${ICON(pic(id))}<span>${TERMS[id].name}</span></button>`).join('')}</div></div>`).join('')}
  <footer>依据官方规则书 · 图片截自 Capstone Games 英文版官方规则书（<a href="https://capstone-games.com/cdn/shop/files/Ark-Nova-Rulebook.pdf" target="_blank" rel="noopener">基础</a>、<a href="https://capstone-games.com/cdn/shop/files/AN_Exp1_Rules_EN_0-7_low.pdf" target="_blank" rel="noopener">海洋世界</a>），版权归 Feuerland Spiele / Capstone Games 所有 · 非官方玩家工具</footer>`;
}
render();

// The note for a term: a sheet from the bottom with the picture, where it is and what it means.
const sheet = document.createElement('div');
sheet.className = 'tsheet hidden';
document.body.appendChild(sheet);
const close = () => sheet.classList.add('hidden');
function show(id) {
  const t = TERMS[id];
  sheet.innerHTML = `<div class="tsbg"></div><div class="tsbox" role="dialog" aria-label="${esc(t.name)}">
    <div class="tshd">${ICON(pic(id), 'big')}<b>${esc(t.name)}</b><button type="button" class="tsx" aria-label="关闭">×</button></div>
    <p><em>在哪儿看到</em>${esc(t.where)}</p><p><em>什么意思</em>${esc(t.what)}</p>
    <button type="button" class="button primary tsask" data-q="${esc(`「${t.name}」是什么，怎么用？`)}">还不懂？问规则助手</button></div>`;
  sheet.classList.remove('hidden');
}
const ask = q => { close(); window.askRules?.(q); };
document.addEventListener('click', e => {
  const m = e.target.closest('[data-mode]');
  if (m) {
    if (m.dataset.mode === mode) return;
    mode = m.dataset.mode;
    try { localStorage.setItem('ark-teach-mode', mode); } catch {}
    return render();
  }
  const t = e.target.closest('[data-t]');
  if (t) return show(t.dataset.t);
  const q = e.target.closest('[data-q]');
  if (q) return ask(q.dataset.q);
  if (e.target.closest('.tsx,.tsbg')) close();
});
addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
