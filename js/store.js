// ===== 全局状态管理 Store =====

const Store = {
  // ---- 状态 ----
  state: {
    currentUser: null,
    students: [],
    tasks: [],
    toasts: [],
    toastTimer: null,
    inviteCodes: [],   // 教师邀请码列表
  },

  // ---- 初始化 ----
  init() {
    // 从localStorage加载数据
    const savedStudents    = localStorage.getItem('pet_students');
    const savedTasks       = localStorage.getItem('pet_tasks');
    const savedInviteCodes = localStorage.getItem('pet_invite_codes');

    this.state.students    = savedStudents    ? JSON.parse(savedStudents)    : JSON.parse(JSON.stringify(INITIAL_STUDENTS));
    this.state.tasks       = savedTasks       ? JSON.parse(savedTasks)       : JSON.parse(JSON.stringify(INITIAL_TASKS));
    this.state.inviteCodes = savedInviteCodes ? JSON.parse(savedInviteCodes) : JSON.parse(JSON.stringify(INITIAL_INVITE_CODES));

    // 恢复管理员账号覆盖
    const savedAdmin = localStorage.getItem('pet_admin_override');
    if (savedAdmin) {
      try {
        const d = JSON.parse(savedAdmin);
        if (d.username) ADMIN_ACCOUNT.username = d.username;
        if (d.password) ADMIN_ACCOUNT.password = d.password;
      } catch(e) {}
    }

    // 不自动登录，每次打开页面都需要重新输入账号密码
  },

  // ---- 持久化 ----
  save() {
    localStorage.setItem('pet_students',     JSON.stringify(this.state.students));
    localStorage.setItem('pet_tasks',        JSON.stringify(this.state.tasks));
    localStorage.setItem('pet_invite_codes', JSON.stringify(this.state.inviteCodes));
  },

  // ---- 登录 ----
  login(username, password) {
    // 最先查管理员
    if (username === ADMIN_ACCOUNT.username && password === ADMIN_ACCOUNT.password) {
      this.state.currentUser = { ...ADMIN_ACCOUNT };
      return { success: true, role: 'admin', user: ADMIN_ACCOUNT };
    }
    // 再查教师
    const teacher = TEACHER_ACCOUNTS.find(t => t.username === username && t.password === password);
    if (teacher) {
      this.state.currentUser = { ...teacher };
      return { success: true, role: 'teacher', user: teacher };
    }
    // 再查学生
    const student = this.state.students.find(s => s.username === username && s.password === password);
    if (student) {
      this.state.currentUser = { id: student.id, role: 'student' };
      return { success: true, role: 'student', user: student };
    }
    return { success: false, msg: '账号或密码错误，请重试 🙁' };
  },

  // ---- 注册 ----
  register(name, username, password, className, role) {
    role = role || 'student';
    // 教师注册：存入TEACHER_ACCOUNTS动态列表
    if (role === 'teacher') {
      const existT = TEACHER_ACCOUNTS.find(t => t.username === username);
      if (existT) return { success: false, msg: '该教师账号已存在' };
      const existS = this.state.students.find(s => s.username === username);
      if (existS) return { success: false, msg: '该账号已被学生注册' };
      const newTeacher = {
        id: Date.now(),
        name, username, password,
        role: 'teacher',
        class: className || '未分班',
        avatar: '👩‍🏫',
        joinDate: new Date().toISOString().split('T')[0],
      };
      TEACHER_ACCOUNTS.push(newTeacher);
      this.state.currentUser = { ...newTeacher };
      return { success: true, role: 'teacher', user: newTeacher };
    }
    // 学生注册
    if (this.state.students.find(s => s.username === username)) {
      return { success: false, msg: '该账号已被注册' };
    }
    const newStudent = {
      id: Date.now(),
      name, username, password,
      role: 'student',
      class: className || '未分班',
      points: 0,
      pointsLog: [],   // 积分明细日志
      petType: null,
      petName: null,
      petExp: 0,
      petStage: 0,
      petStatus: { health: 100, hungry: 100, happy: 100, clean: 100 },
      backpack: { apple: 3, soap: 2, ball: 1 },
      joinDate: new Date().toISOString().split('T')[0],
    };
    this.state.students.push(newStudent);
    this.state.currentUser = { id: newStudent.id, role: 'student' };
    this.save();
    return { success: true, role: 'student', user: newStudent };
  },

  // ---- 退出 ----
  logout() {
    this.state.currentUser = null;
  },

  // ---- 获取当前学生 ----
  getCurrentStudent() {
    if (!this.state.currentUser || this.state.currentUser.role !== 'student') return null;
    return this.state.students.find(s => s.id === this.state.currentUser.id);
  },

  // ---- 更新学生数据 ----
  updateStudent(id, updates) {
    const idx = this.state.students.findIndex(s => s.id === id);
    if (idx === -1) return;
    Object.assign(this.state.students[idx], updates);
    this.save();
  },

  // ---- 领取宠物 ----
  adoptPet(studentId, petTypeId, petName) {
    const petType = PET_TYPES.find(p => p.id === petTypeId);
    if (!petType) return false;
    this.updateStudent(studentId, {
      petType: petTypeId,
      petName: petName || petType.name,
      petExp: 0,
      petStage: 0,
      petStatus: { health: 100, hungry: 80, happy: 80, clean: 100 },
    });
    return true;
  },

  // ---- 内部：写积分日志 ----
  _logPoints(student, delta, reason, icon) {
    if (!student.pointsLog) student.pointsLog = [];
    student.pointsLog.push({
      icon: icon || (delta > 0 ? '⭐' : '📉'),
      label: reason || (delta > 0 ? '获得积分' : '扣除积分'),
      delta,
      time: new Date().toLocaleString('zh-CN'),
      total: student.points,
    });
  },

  // ---- 添加积分并同步宠物经验 ----
  addPoints(studentId, pts, reason, icon) {
    const student = this.state.students.find(s => s.id === studentId);
    if (!student) return;
    student.points = (student.points || 0) + pts;
    this._logPoints(student, pts, reason, icon);
    if (student.petType) {
      const oldStage = student.petStage;
      student.petExp = (student.petExp || 0) + Math.round(pts * 0.5);
      student.petStage = getLevelInfo(student.petExp).level;
      if (student.petStage > oldStage) {
        this.save();
        return { levelUp: true, newStage: student.petStage };
      }
    }
    this.save();
    return { levelUp: false };
  },

  // ---- 消耗积分 ----
  spendPoints(studentId, pts) {
    const student = this.state.students.find(s => s.id === studentId);
    if (!student || student.points < pts) return false;
    student.points -= pts;
    this.save();
    return true;
  },

  // ---- 使用道具 ----
  useItem(studentId, itemId) {
    const student = this.state.students.find(s => s.id === studentId);
    if (!student) return { success: false, msg: '学生不存在' };
    if (!student.backpack[itemId] || student.backpack[itemId] <= 0) {
      return { success: false, msg: '背包中没有该道具！' };
    }
    const item = ITEMS.find(i => i.id === itemId);
    if (!item) return { success: false, msg: '道具不存在' };

    // 食物道具：更新最后喂食时间 + 处理蛋孵化
    if (item.type === 'food') {
      student._lastFedAt = Date.now();
      if (student.petDead) {
        // 蛋态：只推进孵化进度，不应用其他效果
        student.backpack[itemId]--;
        student.petHatchProgress = (student.petHatchProgress || 0) + 1;
        if (student.petHatchProgress >= 3) {
          student.petDead = false;
          student.petExp = 0;
          student.petStage = 0;
          student.petHatchProgress = 0;
          student.petStatus = { health: 100, hungry: 80, happy: 80, clean: 100 };
          this._logPoints(student, 0, `🎉 宠物 ${student.petName || '宠物'} 重新孵化啦！`, '🥚');
          this.save();
          return { success: true, hatched: true, levelUp: false, item };
        }
        this.save();
        return { success: true, hatchProgress: student.petHatchProgress, levelUp: false, item };
      }
    }

    // 死亡状态下非食物道具无法使用
    if (student.petDead) {
      return { success: false, msg: '宠物还是一颗蛋，请先用食物喂食孵化它！' };
    }

    // 应用效果
    const effect = item.effect;
    const status = student.petStatus;
    if (effect.hungry)  status.hungry  = Math.min(100, Math.max(0, (status.hungry  || 0) + effect.hungry));
    if (effect.health)  status.health  = Math.min(100, Math.max(0, (status.health  || 0) + effect.health));
    if (effect.happy)   status.happy   = Math.min(100, Math.max(0, (status.happy   || 0) + effect.happy));
    if (effect.clean)   status.clean   = Math.min(100, Math.max(0, (status.clean   || 0) + effect.clean));
    if (effect.exp) {
      const oldStage = student.petStage;
      student.petExp = (student.petExp || 0) + effect.exp;
      student.petStage = getLevelInfo(student.petExp).level;
      if (student.petStage > oldStage) {
        student.backpack[itemId]--;
        this.save();
        return { success: true, levelUp: true, newStage: student.petStage, item };
      }
    }
    student.backpack[itemId]--;
    this.save();
    return { success: true, levelUp: false, item };
  },

  // ---- 购买道具 ----
  buyItem(studentId, itemId) {
    const item = ITEMS.find(i => i.id === itemId);
    if (!item) return { success: false, msg: '道具不存在' };
    const student = this.state.students.find(s => s.id === studentId);
    if (!student) return { success: false, msg: '学生不存在' };
    if (student.points < item.cost) return { success: false, msg: `积分不足，需要${item.cost}积分` };
    student.points -= item.cost;
    student.backpack[itemId] = (student.backpack[itemId] || 0) + 1;
    student._buyDeduct = (student._buyDeduct || 0) + item.cost; // 标记本次购买扣除量，供学生端跳过全屏通知
    this._logPoints(student, -item.cost, `购买道具「${item.name}」`, '🛒');
    this.save();
    return { success: true, item };
  },

  // ---- 提交任务 ----
  submitTask(taskId, studentId, content) {
    const task = this.state.tasks.find(t => t.id === taskId);
    if (!task) return { success: false, msg: '任务不存在' };
    const existSub = task.submissions.find(s => s.studentId === studentId);
    if (existSub) return { success: false, msg: '已提交过该任务' };
    task.submissions.push({
      studentId,
      status: 'submitted',
      submittedAt: new Date().toLocaleString('zh-CN'),
      content,
    });
    this.save();
    return { success: true };
  },

  // ---- 重新提交任务（驳回后可再次提交） ----
  resubmitTask(taskId, studentId, content) {
    const task = this.state.tasks.find(t => t.id === taskId);
    if (!task) return { success: false, msg: '任务不存在' };
    const sub = task.submissions.find(s => s.studentId === studentId);
    if (!sub) {
      // 没有记录则正常新建
      task.submissions.push({
        studentId,
        status: 'submitted',
        submittedAt: new Date().toLocaleString('zh-CN'),
        content,
        resubmitted: true,
      });
    } else if (sub.status === 'rejected') {
      // 驳回状态：重置为 submitted
      sub.status = 'submitted';
      sub.submittedAt = new Date().toLocaleString('zh-CN');
      sub.content = content;
      sub.resubmitted = true;
      delete sub.reviewedAt;
    } else {
      return { success: false, msg: '该任务当前状态不允许重新提交' };
    }
    this.state.tasks = [...this.state.tasks];  // 触发响应式
    this.save();
    return { success: true };
  },

  // ---- 教师审核任务 ----
  reviewTask(taskId, studentId, approved) {
    const task = this.state.tasks.find(t => t.id === taskId);
    if (!task) return false;
    const sub = task.submissions.find(s => s.studentId === studentId);
    if (!sub) return false;
    if (approved) {
      sub.status = 'completed';
      sub.reviewedAt = new Date().toLocaleString('zh-CN');
      // 记录积分变动原因，供学生端弹窗使用
      const student = this.state.students.find(s => s.id === studentId);
      if (student) student._lastGrantReason = `完成任务「${task.title}」获得奖励`;
      // 强制替换数组引用，触发 Vue 响应式
      this.state.tasks = [...this.state.tasks];
      return this.addPoints(studentId, task.points, `完成任务「${task.title}」`, task.icon || '📝');
    } else {
      sub.status = 'rejected';
      // 强制替换数组引用，触发 Vue 响应式
      this.state.tasks = [...this.state.tasks];
      this.save();
      return true;
    }
  },

  // ---- 发布任务 ----
  createTask(taskData) {
    const newTask = {
      id: Date.now(),
      ...taskData,
      status: 'active',
      submissions: [],
      createdAt: new Date().toLocaleString('zh-CN'),
    };
    this.state.tasks.push(newTask);
    this.save();
    return newTask;
  },

  // ---- 删除任务 ----
  deleteTask(taskId) {
    this.state.tasks = this.state.tasks.filter(t => t.id !== taskId);
    this.save();
  },

  // ---- 添加学生（教师端） ----
  addStudent(studentData) {
    if (this.state.students.find(s => s.username === studentData.username)) {
      return { success: false, msg: '账号已存在' };
    }
    const newStudent = {
      id: Date.now(),
      role: 'student',
      points: 0,
      petType: null, petName: null, petExp: 0, petStage: 0,
      petStatus: { health: 100, hungry: 100, happy: 100, clean: 100 },
      backpack: { apple: 3, soap: 2, ball: 1 },
      joinDate: new Date().toISOString().split('T')[0],
      ...studentData,
    };
    this.state.students.push(newStudent);
    this.save();
    return { success: true, student: newStudent };
  },

  // ---- 删除学生 ----
  deleteStudent(studentId) {
    this.state.students = this.state.students.filter(s => s.id !== studentId);
    this.save();
  },

  // ---- 手动发放积分 ----
  grantPoints(studentId, pts, reason) {
    const student = this.state.students.find(s => s.id === studentId);
    if (student) student._lastGrantReason = reason || `老师奖励了 ${pts} 积分`;
    return this.addPoints(studentId, pts, reason || `老师奖励了 ${pts} 积分`, '🎁');
  },

  // ---- 扣除积分 ----
  deductPoints(studentId, pts, reason) {
    const student = this.state.students.find(s => s.id === studentId);
    if (!student) return { success: false, msg: '学生不存在' };
    const deduct = Math.min(pts, student.points || 0);  // 最多扣到0
    student.points = Math.max(0, (student.points || 0) - pts);
    student._lastGrantReason = reason || `老师扣除了 ${deduct} 积分`;
    this._logPoints(student, -deduct, reason || `老师扣除了 ${deduct} 积分`, '📉');
    this.save();
    return { success: true, deducted: deduct };
  },

  // ---- 重置演示数据 ----
  resetDemo() {
    this.state.students = JSON.parse(JSON.stringify(INITIAL_STUDENTS));
    this.state.tasks    = JSON.parse(JSON.stringify(INITIAL_TASKS));
    this.save();
  },

  // ======== 管理员专用方法 ========

  // 获取所有教师列表（含动态注册的）
  getTeachers() {
    return TEACHER_ACCOUNTS.map(t => ({ ...t }));
  },

  // 删除教师
  deleteTeacher(teacherId) {
    const idx = TEACHER_ACCOUNTS.findIndex(t => t.id === teacherId);
    if (idx === -1) return { success: false, msg: '教师不存在' };
    TEACHER_ACCOUNTS.splice(idx, 1);
    return { success: true };
  },

  // 重置教师密码
  resetTeacherPassword(teacherId, newPassword) {
    const t = TEACHER_ACCOUNTS.find(t => t.id === teacherId);
    if (!t) return { success: false, msg: '教师不存在' };
    t.password = newPassword;
    return { success: true };
  },

  // 获取邀请码列表
  getInviteCodes() {
    return [...this.state.inviteCodes];
  },

  // 新增邀请码
  addInviteCode(code, note) {
    code = code.trim().toUpperCase();
    if (!code) return { success: false, msg: '邀请码不能为空' };
    if (this.state.inviteCodes.find(c => c.code === code)) {
      return { success: false, msg: '该邀请码已存在' };
    }
    this.state.inviteCodes.push({
      code,
      note: note || '',
      used: false,
      createdAt: new Date().toISOString().split('T')[0],
    });
    this.save();
    return { success: true };
  },

  // 删除邀请码
  removeInviteCode(code) {
    this.state.inviteCodes = this.state.inviteCodes.filter(c => c.code !== code);
    this.save();
    return { success: true };
  },

  // 验证邀请码（注册时调用）
  validateInviteCode(code) {
    return this.state.inviteCodes.some(c => c.code === code.trim().toUpperCase());
  },

  // 管理员强制重置任意学生密码
  resetStudentPassword(studentId, newPassword) {
    const s = this.state.students.find(s => s.id === studentId);
    if (!s) return { success: false, msg: '学生不存在' };
    s.password = newPassword;
    this.save();
    return { success: true };
  },

  // 管理员清空全部数据（慎用）
  nukeAll() {
    this.state.students    = JSON.parse(JSON.stringify(INITIAL_STUDENTS));
    this.state.tasks       = JSON.parse(JSON.stringify(INITIAL_TASKS));
    this.state.inviteCodes = JSON.parse(JSON.stringify(INITIAL_INVITE_CODES));
    TEACHER_ACCOUNTS.length = 0;
    TEACHER_ACCOUNTS.push(
      { id: 100, name: '王老师', username: 'teacher',  password: 'teacher123', role: 'teacher', class: '三年一班', avatar: '👩‍🏫' },
      { id: 101, name: '李老师', username: 'teacher2', password: 'teacher123', role: 'teacher', class: '三年二班', avatar: '👨‍🏫' }
    );
    this.save();
  },

  // ---- Toast通知 ----
  toast(msg, type = 'info') {
    const id = Date.now();
    this.state.toasts.push({ id, msg, type });
    setTimeout(() => {
      this.state.toasts = this.state.toasts.filter(t => t.id !== id);
    }, 3000);
  },

  // ---- 宠物状态自然衰减（模拟时间流逝） ----
  tickPetStatus(studentId) {
    const student = this.state.students.find(s => s.id === studentId);
    if (!student || !student.petType || !student.petStatus) return;
    // 死亡状态不再衰减
    if (student.petDead) return;
    const s = student.petStatus;
    s.hungry = Math.max(0, (s.hungry || 100) - 2);
    s.happy  = Math.max(0, (s.happy  || 100) - 1);
    s.clean  = Math.max(0, (s.clean  || 100) - 1);
    if (s.hungry < 20 || s.clean < 20) {
      s.health = Math.max(0, (s.health || 100) - 3);
    }
    // 生命归零 → 触发死亡
    if (s.health <= 0) {
      this._killPet(student);
    }
    this.save();
  },

  // ---- 每日离线惩罚检测（学生登录时调用） ----
  // 规则：上次喂食距今超过1天，则每过1天扣经验-5、生命-10
  checkDailyPenalty(studentId) {
    const student = this.state.students.find(s => s.id === studentId);
    if (!student || !student.petType || student.petDead) return null;

    const now = Date.now();
    const lastFed = student._lastFedAt || now; // 首次默认今天
    if (!student._lastFedAt) {
      student._lastFedAt = now;
      this.save();
      return null;
    }

    const msPerDay = 24 * 60 * 60 * 1000;
    const daysMissed = Math.floor((now - lastFed) / msPerDay);
    if (daysMissed <= 0) return null;

    // 每天扣减
    const expPenalty  = daysMissed * 5;
    const hpPenalty   = daysMissed * 10;
    const s = student.petStatus;

    student.petExp = Math.max(0, (student.petExp || 0) - expPenalty);
    student.petStage = getLevelInfo(student.petExp).level;
    s.health = Math.max(0, (s.health || 100) - hpPenalty);
    s.hungry = Math.max(0, (s.hungry || 0) - daysMissed * 15);

    // 写日志
    this._logPoints(student, 0,
      `宠物因 ${daysMissed} 天未喂食，经验 -${expPenalty}，生命 -${hpPenalty}`,
      '⚠️'
    );

    // 判断是否死亡
    let died = false;
    if (s.health <= 0) {
      this._killPet(student);
      died = true;
    }

    // 更新最后喂食时间为现在（重置计时器）
    student._lastFedAt = now;
    this.save();

    return { daysMissed, expPenalty, hpPenalty, died };
  },

  // ---- 内部：宠物死亡处理 ----
  _killPet(student) {
    student.petDead = true;
    student.petStatus = { health: 0, hungry: 0, happy: 0, clean: 0 };
    student.petHatchProgress = 0; // 重置孵化进度
    // 积分清零
    const lostPoints = student.points || 0;
    student.points = 0;
    this._logPoints(student, -lostPoints,
      `💔 宠物 ${student.petName || '宠物'} 因为太久没有照顾而离开了...积分全部清零`,
      '💔'
    );
  },

  // ---- 喂食（同时更新最后喂食时间 + 蛋孵化进度） ----
  feedPet(studentId) {
    const student = this.state.students.find(s => s.id === studentId);
    if (!student) return;
    student._lastFedAt = Date.now();

    // 蛋孵化逻辑：死亡后变成蛋，每次喂食+1进度，满3次孵化
    if (student.petDead) {
      student.petHatchProgress = (student.petHatchProgress || 0) + 1;
      if (student.petHatchProgress >= 3) {
        // 孵化！
        student.petDead = false;
        student.petExp = 0;
        student.petStage = 0;
        student.petHatchProgress = 0;
        student.petStatus = { health: 100, hungry: 80, happy: 80, clean: 100 };
        this._logPoints(student, 0, `🎉 宠物 ${student.petName || '宠物'} 重新孵化啦！`, '🥚');
        this.save();
        return { hatched: true };
      }
      this.save();
      return { hatchProgress: student.petHatchProgress };
    }
    // 正常活着：只更新时间，不做额外操作（道具使用由 useItem 处理）
    this.save();
    return { ok: true };
  },
};

// 初始化
Store.init();
