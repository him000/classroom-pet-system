// ===== 游戏数据配置 =====

// 宠物种类
// stages对应外观阶段：[蛋, 刚出壳, 幼宠, 成长, 成熟, 进化, 传说]
// 等级0→外观0, 1-3→外观1, 4-7→外观2, 8-11→外观3, 12-15→外观4, 16-18→外观5, 19-20→外观6
const PET_TYPES = [
  { id: 'dragon', name: '小火龙', emoji: '🐲', egg: '🥚', stages: ['🥚','🐣','🦎','🐲','🐉','🔥','⚡'] },
  { id: 'cat',    name: '星星猫', emoji: '🐱', egg: '🥚', stages: ['🥚','🐣','🐱','😸','🦁','🌟','✨'] },
  { id: 'bunny',  name: '棉花兔', emoji: '🐰', egg: '🥚', stages: ['🥚','🐣','🐰','🐇','🦊','🌸','💫'] },
  { id: 'bird',   name: '彩翼鸟', emoji: '🐦', egg: '🥚', stages: ['🥚','🐣','🐦','🦜','🦅','🌈','🪄'] },
  { id: 'dog',    name: '旺财狗', emoji: '🐶', egg: '🥚', stages: ['🥚','🐣','🐶','🐕','🦴','🎖️','👑'] },
  { id: 'fairy',  name: '梦精灵', emoji: '🧚', egg: '🥚', stages: ['🥚','🐣','🧚','✨','🌟','🎇','🌠'] },
];

// 宠物成长阶段（共20级，设计为小学6年可持续成长）
// 经验需求说明：
//   任务每次约+15~30 exp（积分*0.5）
//   每天完成2~3个任务 ≈ +40 exp/天
//   每级所需天数约 3~14 天，全程约 6 年
const GROWTH_STAGES = [
  { level:  0, name: '蛋',      minExp: 0,     maxExp: 100   },
  { level:  1, name: '刚出壳',  minExp: 100,   maxExp: 300   },
  { level:  2, name: '小幼宠',  minExp: 300,   maxExp: 600   },
  { level:  3, name: '幼宠',    minExp: 600,   maxExp: 1000  },
  { level:  4, name: '活泼期',  minExp: 1000,  maxExp: 1500  },
  { level:  5, name: '成长期',  minExp: 1500,  maxExp: 2200  },
  { level:  6, name: '少年宠',  minExp: 2200,  maxExp: 3100  },
  { level:  7, name: '青春期',  minExp: 3100,  maxExp: 4200  },
  { level:  8, name: '亚成体',  minExp: 4200,  maxExp: 5600  },
  { level:  9, name: '成长宠',  minExp: 5600,  maxExp: 7200  },
  { level: 10, name: '壮年宠',  minExp: 7200,  maxExp: 9000  },
  { level: 11, name: '熟练宠',  minExp: 9000,  maxExp: 11200 },
  { level: 12, name: '精英宠',  minExp: 11200, maxExp: 13700 },
  { level: 13, name: '强化宠',  minExp: 13700, maxExp: 16500 },
  { level: 14, name: '进化宠',  minExp: 16500, maxExp: 20000 },
  { level: 15, name: '超进化',  minExp: 20000, maxExp: 24000 },
  { level: 16, name: '稀有宠',  minExp: 24000, maxExp: 28500 },
  { level: 17, name: '史诗宠',  minExp: 28500, maxExp: 33500 },
  { level: 18, name: '传奇宠',  minExp: 33500, maxExp: 39000 },
  { level: 19, name: '神话宠',  minExp: 39000, maxExp: 45000 },
  { level: 20, name: '✨传说✨', minExp: 45000, maxExp: 99999 },
];

// 宠物状态表情
const PET_MOODS = {
  happy:   { emoji: '😄', label: '开心' },
  normal:  { emoji: '😊', label: '平静' },
  hungry:  { emoji: '😋', label: '饿了' },
  sad:     { emoji: '😢', label: '难过' },
  sick:    { emoji: '🤒', label: '生病' },
  sleepy:  { emoji: '😴', label: '困了' },
  excited: { emoji: '🤩', label: '兴奋' },
};

// 背包道具
const ITEMS = [
  { id: 'apple',     name: '苹果',   emoji: '🍎', type: 'food',    effect: { hungry: 20, happy: 5  }, cost: 10, desc: '补充饱食度+20' },
  { id: 'cake',      name: '蛋糕',   emoji: '🎂', type: 'food',    effect: { hungry: 50, happy: 15 }, cost: 30, desc: '美味蛋糕，大幅补充饱食度' },
  { id: 'milk',      name: '牛奶',   emoji: '🥛', type: 'food',    effect: { hungry: 30, health: 10 }, cost: 15, desc: '增强体质+10' },
  { id: 'fish',      name: '小鱼',   emoji: '🐟', type: 'food',    effect: { hungry: 40, happy: 20 }, cost: 25, desc: '宠物最爱的食物！' },
  { id: 'soap',      name: '沐浴露', emoji: '🧴', type: 'clean',   effect: { clean: 30 },             cost: 10, desc: '清洁度+30' },
  { id: 'shampoo',   name: '香波',   emoji: '🫧', type: 'clean',   effect: { clean: 50, happy: 10 }, cost: 20, desc: '让宠物香喷喷的！' },
  { id: 'ball',      name: '皮球',   emoji: '⚽', type: 'toy',     effect: { happy: 25 },             cost: 15, desc: '趣味玩耍，心情+25' },
  { id: 'yarn',      name: '毛线团', emoji: '🧶', type: 'toy',     effect: { happy: 35, hungry: -5 }, cost: 20, desc: '超级好玩的玩具！' },
  { id: 'medicine',  name: '急救药', emoji: '💊', type: 'heal',    effect: { health: 30 },            cost: 20, desc: '恢复健康度+30' },
  { id: 'potion',    name: '魔法药水',emoji: '🧪', type: 'heal',   effect: { health: 60, happy: 10 }, cost: 50, desc: '快速恢复所有状态' },
  { id: 'star',      name: '星星糖', emoji: '⭐', type: 'special', effect: { exp: 30 },               cost: 40, desc: '直接获得经验值+30' },
  { id: 'rainbow',   name: '彩虹糖', emoji: '🌈', type: 'special', effect: { exp: 80, happy: 30 },    cost: 100,desc: '超级成长，经验+80！' },
];

// 任务模板
const TASK_TEMPLATES = [
  { title: '完成数学作业', desc: '完成今日数学练习题并提交', points: 50, icon: '📐', subject: '数学' },
  { title: '朗读英语课文', desc: '朗读并录音上传课文第5章', points: 40, icon: '📚', subject: '英语' },
  { title: '语文背诵', desc: '背诵古诗《静夜思》', points: 35, icon: '📝', subject: '语文' },
  { title: '科学实验报告', desc: '完成本周科学实验观察记录', points: 60, icon: '🔬', subject: '科学' },
  { title: '课堂积极回答', desc: '在课堂上积极举手回答3个问题', points: 20, icon: '🙋', subject: '综合' },
  { title: '艺术创作', desc: '完成一幅关于春天的绘画作品', points: 45, icon: '🎨', subject: '美术' },
  { title: '体育达标', desc: '完成体能测试并达到合格标准', points: 30, icon: '🏃', subject: '体育' },
  { title: '阅读打卡', desc: '阅读课外书籍30分钟并做笔记', points: 25, icon: '📖', subject: '语文' },
];

// 初始学生数据
const INITIAL_STUDENTS = [
  { id: 1, name: '小明', username: 'xiaoming', password: '123456', role: 'student', class: '三年一班', points: 320, petType: 'dragon', petName: '小火龙', petExp: 220, petStage: 2, petStatus: { health: 75, hungry: 60, happy: 80, clean: 70 }, backpack: { apple:3, cake:1, soap:2, ball:1, medicine:1, star:2 }, joinDate: '2026-02-01' },
  { id: 2, name: '小红', username: 'xiaohong', password: '123456', role: 'student', class: '三年一班', points: 580, petType: 'cat',    petName: '星星猫', petExp: 530, petStage: 3, petStatus: { health: 90, hungry: 70, happy: 95, clean: 85 }, backpack: { apple:5, cake:2, soap:3, ball:2, medicine:0, star:3, rainbow:1 }, joinDate: '2026-02-01' },
  { id: 3, name: '小刚', username: 'xiaogang', password: '123456', role: 'student', class: '三年一班', points: 180, petType: 'bunny',  petName: '棉花兔', petExp: 150, petStage: 1, petStatus: { health: 55, hungry: 30, happy: 40, clean: 50 }, backpack: { apple:1, soap:1, medicine:2 }, joinDate: '2026-02-01' },
  { id: 4, name: '小美', username: 'xiaomei', password: '123456', role: 'student', class: '三年一班', points: 440, petType: 'fairy',  petName: '梦精灵', petExp: 420, petStage: 2, petStatus: { health: 85, hungry: 65, happy: 88, clean: 92 }, backpack: { apple:4, cake:1, soap:2, yarn:2, star:1 }, joinDate: '2026-02-01' },
  { id: 5, name: '小强', username: 'xiaoqiang', password: '123456', role: 'student', class: '三年一班', points: 260, petType: 'bird',   petName: '彩翼鸟', petExp: 250, petStage: 2, petStatus: { health: 70, hungry: 55, happy: 65, clean: 75 }, backpack: { apple:2, soap:1, ball:3, medicine:1 }, joinDate: '2026-02-01' },
  { id: 6, name: '小丽', username: 'xiaoli', password: '123456', role: 'student', class: '三年一班', points: 150, petType: 'dog',    petName: '旺财狗', petExp: 100, petStage: 1, petStatus: { health: 60, hungry: 40, happy: 55, clean: 45 }, backpack: { apple:2, medicine:1 }, joinDate: '2026-02-01' },
];

// 管理员账号（硬编码，最高权限）
const ADMIN_ACCOUNT = {
  id: 0,
  name: '系统管理员',
  username: 'admin',
  password: 'admin888',
  role: 'admin',
  avatar: '🛡️',
};

// 教师账号
const TEACHER_ACCOUNTS = [
  { id: 100, name: '王老师', username: 'teacher', password: 'teacher123', role: 'teacher', class: '三年一班', avatar: '👩‍🏫' },
  { id: 101, name: '李老师', username: 'teacher2', password: 'teacher123', role: 'teacher', class: '三年二班', avatar: '👨‍🏫' },
];

// 初始邀请码池（管理员可增删）
const INITIAL_INVITE_CODES = [
  { code: 'TEACHER2026', note: '默认通用邀请码', used: false, createdAt: '2026-01-01' },
  { code: 'CLASS2026A',  note: '三年一班专属',  used: false, createdAt: '2026-01-01' },
];

// 初始任务数据
const INITIAL_TASKS = [
  { id: 1, title: '完成数学作业', desc: '完成今日数学练习题（P45-P47）并提交照片', points: 50, icon: '📐', subject: '数学', deadline: '2026-03-14 18:00', status: 'active', createdBy: 100, submissions: [
    { studentId: 1, status: 'completed', submittedAt: '2026-03-14 15:30', content: '已完成所有题目' },
    { studentId: 2, status: 'completed', submittedAt: '2026-03-14 14:20', content: '完成并检查了两遍' },
    { studentId: 3, status: 'pending', submittedAt: null, content: null },
  ]},
  { id: 2, title: '背诵古诗《静夜思》', desc: '背诵全文，明日课堂当场检查', points: 35, icon: '📝', subject: '语文', deadline: '2026-03-15 08:00', status: 'active', createdBy: 100, submissions: [
    { studentId: 2, status: 'completed', submittedAt: '2026-03-14 16:00', content: '已背熟' },
    { studentId: 4, status: 'submitted', submittedAt: '2026-03-14 17:00', content: '背了好多遍了' },
  ]},
  { id: 3, title: '课堂积极回答问题', desc: '在今日课堂上积极举手回答3个问题', points: 20, icon: '🙋', subject: '综合', deadline: '2026-03-14 16:00', status: 'active', createdBy: 100, submissions: [
    { studentId: 1, status: 'completed', submittedAt: '2026-03-14 14:00', content: '回答了5个问题！' },
    { studentId: 4, status: 'completed', submittedAt: '2026-03-14 15:00', content: '认真参与了' },
    { studentId: 5, status: 'completed', submittedAt: '2026-03-14 15:30', content: '举手3次' },
  ]},
  { id: 4, title: '阅读打卡', desc: '阅读课外书籍30分钟并做简单笔记上传', points: 25, icon: '📖', subject: '语文', deadline: '2026-03-16 20:00', status: 'active', createdBy: 100, submissions: [] },
];

// 积分兑换商店
const SHOP_ITEMS = ITEMS.map(item => ({ ...item }));

// 工具函数
function getStudentPetEmoji(student) {
  const petType = PET_TYPES.find(p => p.id === student.petType);
  if (!petType) return '🥚';
  // 死亡状态显示蛋
  if (student.petDead) return '🥚';
  const level = getLevelInfo(student.petExp || 0).level;
  // 20级 → 7个外观阶段映射
  let stageIdx;
  if (level === 0)       stageIdx = 0;
  else if (level <= 3)   stageIdx = 1;
  else if (level <= 7)   stageIdx = 2;
  else if (level <= 11)  stageIdx = 3;
  else if (level <= 15)  stageIdx = 4;
  else if (level <= 18)  stageIdx = 5;
  else                   stageIdx = 6;
  return petType.stages[Math.min(stageIdx, petType.stages.length - 1)];
}

function getStudentMood(status) {
  if (!status) return PET_MOODS.normal;
  const { health, hungry, happy, clean } = status;
  if (health < 30) return PET_MOODS.sick;
  if (hungry < 20) return PET_MOODS.hungry;
  if (happy > 85) return PET_MOODS.excited;
  if (happy > 70) return PET_MOODS.happy;
  if (happy < 40) return PET_MOODS.sad;
  return PET_MOODS.normal;
}

function getLevelInfo(exp) {
  for (let i = GROWTH_STAGES.length - 1; i >= 0; i--) {
    if (exp >= GROWTH_STAGES[i].minExp) {
      return GROWTH_STAGES[i];
    }
  }
  return GROWTH_STAGES[0];
}

function getExpPercent(exp) {
  const stage = getLevelInfo(exp);
  const range = stage.maxExp - stage.minExp;
  const current = exp - stage.minExp;
  return Math.min(100, Math.round((current / range) * 100));
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
