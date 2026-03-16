// ===== 全局状态管理 Store（云端数据库版）=====
// 数据存储于 MySQL 数据库，通过 PHP API 读写
// API 基础路径（相对于网站根目录）

const API_BASE = 'api';

// 通用请求函数
async function apiPost(endpoint, data) {
  try {
    const res = await fetch(`${API_BASE}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (e) {
    console.error(`[API] ${endpoint} 请求失败:`, e);
    return { success: false, msg: '网络请求失败，请检查网络连接' };
  }
}

async function apiGet(endpoint, params = {}) {
  try {
    const qs = new URLSearchParams(params).toString();
    const url = `${API_BASE}/${endpoint}${qs ? '?' + qs : ''}`;
    const res = await fetch(url);
    return await res.json();
  } catch (e) {
    console.error(`[API] ${endpoint} 请求失败:`, e);
    return { success: false, msg: '网络请求失败' };
  }
}

const Store = {
  // ---- 状态（用 Vue.reactive 包裹，让 Vue 能追踪所有属性变化）----
  state: Vue.reactive({
    currentUser: null,
    students: [],
    tasks: [],
    toasts: [],
    toastTimer: null,
    inviteCodes: [],
    _initialized: false,
    taskRev: 0,      // 每次 tasks 刷新后递增，驱动老师端 computed 重新计算
    studentRev: 0,   // 每次 students 刷新后递增
  }),

  // ---- 初始化：从服务器拉取数据 ----
  async init() {
    try {
      const [studentsRes, tasksRes] = await Promise.all([
        apiGet('students.php', { action: 'list' }),
        apiGet('tasks.php',    { action: 'list' }),
      ]);
      if (studentsRes.success) this.state.students = studentsRes.students;
      if (tasksRes.success)    this.state.tasks    = tasksRes.tasks;
      this.state._initialized = true;
    } catch (e) {
      console.error('[Store] 初始化失败:', e);
    }
  },

  // ---- 刷新任务列表（学生端轮询用） ----
  async refreshTasks() {
    const res = await apiGet('tasks.php', { action: 'list' });
    if (res.success) {
      this.state.tasks = res.tasks;
      this.state.taskRev++;   // 通知所有依赖 taskRev 的 computed 重新计算
    }
  },

  // ---- 刷新学生列表 ----
  async refreshStudents() {
    const res = await apiGet('students.php', { action: 'list' });
    if (res.success) {
      this.state.students = res.students;
      this.state.studentRev++;
    }
  },

  // ---- 刷新单个学生 ----
  async refreshStudent(studentId) {
    const res = await apiGet('students.php', { action: 'get', id: studentId });
    if (res.success && res.student) {
      const idx = this.state.students.findIndex(s => s.id === studentId);
      if (idx >= 0) {
        this.state.students[idx] = res.student;
        this.state.students = [...this.state.students]; // 触发 Vue 响应式
      }
    }
  },

  // ---- 已废弃的 save()，保留空实现避免报错 ----
  save() { /* 数据已由 API 持久化，无需 localStorage */ },

  // ---- 登录 ----
  async login(username, password) {
    const res = await apiPost('auth.php', { action: 'login', username, password });
    if (res.success) {
      this.state.currentUser = res.role === 'student'
        ? { id: res.user.id, role: 'student' }
        : { ...res.user };
      return { success: true, role: res.role, user: res.user };
    }
    return { success: false, msg: res.msg || '账号或密码错误' };
  },

  // ---- 注册 ----
  async register(name, username, password, className, role, inviteCode) {
    const res = await apiPost('auth.php', { action: 'register', name, username, password, class: className, role, inviteCode });
    if (res.success) {
      if (res.role === 'student') {
        this.state.students.push(res.user);
        this.state.currentUser = { id: res.user.id, role: 'student' };
      } else {
        this.state.currentUser = { ...res.user };
      }
      return { success: true, role: res.role, user: res.user };
    }
    return { success: false, msg: res.msg };
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

  // ---- 更新学生数据（通用） ----
  async updateStudent(id, updates) {
    // 先更新本地（即时响应）
    const idx = this.state.students.findIndex(s => s.id === id);
    if (idx >= 0) Object.assign(this.state.students[idx], updates);
    // 再同步到服务器
    await apiPost('students.php', { action: 'update', id, updates });
  },

  // ---- 领取宠物 ----
  async adoptPet(studentId, petTypeId, petName) {
    const petType = PET_TYPES.find(p => p.id === petTypeId);
    if (!petType) return false;
    const res = await apiPost('students.php', { action: 'adoptPet', id: studentId, petType: petTypeId, petName: petName || petType.name });
    if (res.success) {
      await this.refreshStudent(studentId);
      return true;
    }
    return false;
  },

  // ---- 内部：写积分日志（本地） ----
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

  // ---- 添加积分（积分与宠物经验完全解耦，积分不再转化为宠物经验）----
  addPoints(studentId, pts, reason, icon) {
    const student = this.state.students.find(s => s.id === studentId);
    if (!student) return { levelUp: false };
    student.points = (student.points || 0) + pts;
    this._logPoints(student, pts, reason, icon);
    // 积分不再给宠物加经验，经验只通过喂食/洗澡/玩耍等护理行为获得
    return { levelUp: false };
  },

  // ---- 消耗积分（本地更新） ----
  spendPoints(studentId, pts) {
    const student = this.state.students.find(s => s.id === studentId);
    if (!student || student.points < pts) return false;
    student.points -= pts;
    return true;
  },

  // ---- 使用道具 ----
  async useItem(studentId, itemId) {
    const student = this.state.students.find(s => s.id === studentId);
    if (!student) return { success: false, msg: '学生不存在' };
    if (!student.backpack[itemId] || student.backpack[itemId] <= 0)
      return { success: false, msg: '背包中没有该道具！' };
    const item = ITEMS.find(i => i.id === itemId);
    if (!item) return { success: false, msg: '道具不存在' };

    // ===== 新增：状态满值检查（达到100时禁止使用对应道具）=====
    if (!student.petDead) {
      const status = student.petStatus || {};
      if (item.type === 'food' && (status.hungry || 0) >= 100) {
        return { success: false, msg: '宠物已经吃饱了！饱食度满值时不能再喂食 🍗' };
      }
      if (item.type === 'clean' && (status.clean || 0) >= 100) {
        return { success: false, msg: '宠物已经很干净了！清洁度满值时不需要洗澡 🛁' };
      }
      if (item.type === 'toy' && (status.happy || 0) >= 100) {
        return { success: false, msg: '宠物心情满溢了！心情值满值时不需要再玩耍 😊' };
      }
      if (item.type === 'heal' && (status.health || 0) >= 100) {
        return { success: false, msg: '宠物身体很健康！生命值满值时不需要治疗 ❤️' };
      }
    }
    // ===== 结束状态满值检查 =====

    const res = await apiPost('students.php', {
      action:   'useItem',
      id:       studentId,
      itemId,
      itemType: item.type,
      effect:   item.effect,
    });
    if (res.success) {
      // 用服务器返回的最新状态更新本地
      if (res.backpack)   student.backpack   = res.backpack;
      if (res.petStatus)  student.petStatus  = res.petStatus;
      if (res.petExp !== undefined) student.petExp = res.petExp;
      if (res.petStage !== undefined) student.petStage = res.petStage;
      if (res.hatched)    { student.petDead = false; student.petHatchProgress = 0; }
      this.state.students = [...this.state.students];
      // 如果服务器返回今日经验已达上限，附加提示
      const expMsg = res.dailyExpFull ? '（今日经验已达上限，明天再来喂食吧！）' : '';
      return { success: true, levelUp: res.levelUp, newStage: res.newStage, hatched: res.hatched, hatchProgress: res.hatchProgress, item, expMsg };
    }
    return { success: false, msg: res.msg };
  },

  // ---- 购买道具 ----
  async buyItem(studentId, itemId) {
    const item = ITEMS.find(i => i.id === itemId);
    if (!item) return { success: false, msg: '道具不存在' };
    const student = this.state.students.find(s => s.id === studentId);
    if (!student) return { success: false, msg: '学生不存在' };
    if (student.points < item.cost) return { success: false, msg: `积分不足，需要${item.cost}积分` };

    const res = await apiPost('students.php', {
      action: 'buyItem',
      id:     studentId,
      itemId,
      cost:   item.cost,
      name:   item.name,
    });
    if (res.success) {
      student.points     = res.newPoints;
      student.backpack   = res.backpack;
      student._buyDeduct = res.buyDeduct;
      this.state.students = [...this.state.students];
      return { success: true, item };
    }
    return { success: false, msg: res.msg };
  },

  // ---- 提交任务 ----
  async submitTask(taskId, studentId, content) {
    const res = await apiPost('tasks.php', { action: 'submit', taskId, studentId, content });
    if (res.success) {
      // 本地更新
      const task = this.state.tasks.find(t => t.id === taskId);
      if (task) {
        const existing = task.submissions.find(s => s.studentId === studentId);
        if (existing) {
          existing.status      = 'submitted';
          existing.content     = content;
          existing.submittedAt = new Date().toLocaleString('zh-CN');
          existing.resubmitted = true;
          delete existing.reviewedAt;
        } else {
          task.submissions.push({ studentId, status: 'submitted', submittedAt: new Date().toLocaleString('zh-CN'), content });
        }
        this.state.tasks = [...this.state.tasks];
      }
      return { success: true };
    }
    return { success: false, msg: res.msg };
  },

  // ---- 重新提交任务 ----
  async resubmitTask(taskId, studentId, content) {
    return this.submitTask(taskId, studentId, content);
  },

  // ---- 教师审核任务 ----
  async reviewTask(taskId, studentId, approved) {
    const res = await apiPost('tasks.php', { action: 'review', taskId, studentId, approved });
    if (res.success) {
      // 本地同步任务状态
      const task = this.state.tasks.find(t => t.id === taskId);
      if (task) {
        const sub = task.submissions.find(s => s.studentId === studentId);
        if (sub) {
          sub.status     = approved ? 'completed' : 'rejected';
          sub.reviewedAt = new Date().toLocaleString('zh-CN');
        }
        this.state.tasks = [...this.state.tasks];
      }
      // 本地同步学生积分（任务审核只给积分，不给宠物经验）
      if (approved) {
        const student = this.state.students.find(s => s.id === studentId);
        if (student && res.newPoints !== undefined) {
          student.points   = res.newPoints;
          // 注意：宠物经验不再由任务积分驱动，服务器端也应保持一致
          student._lastGrantReason = `完成任务「${task?.title}」获得奖励`;
          this.state.students = [...this.state.students];
        }
        return { levelUp: false };
      }
      return true;
    }
    return false;
  },

  // ---- 发布任务 ----
  async createTask(taskData) {
    const res = await apiPost('tasks.php', { action: 'create', ...taskData });
    if (res.success && res.task) {
      this.state.tasks.push(res.task);
      return res.task;
    }
    return null;
  },

  // ---- 删除任务 ----
  async deleteTask(taskId) {
    await apiPost('tasks.php', { action: 'delete', taskId });
    this.state.tasks = this.state.tasks.filter(t => t.id !== taskId);
  },

  // ---- 添加学生（教师端） ----
  async addStudent(studentData) {
    const res = await apiPost('students.php', { action: 'add', ...studentData });
    if (res.success) {
      this.state.students.push(res.student);
      return { success: true, student: res.student };
    }
    return { success: false, msg: res.msg };
  },

  // ---- 删除学生 ----
  async deleteStudent(studentId) {
    await apiPost('students.php', { action: 'delete', id: studentId });
    this.state.students = this.state.students.filter(s => s.id !== studentId);
  },

  // ---- 手动发放积分 ----
  async grantPoints(studentId, pts, reason) {
    const reasonStr = reason || `老师奖励了 ${pts} 积分`;
    const student = this.state.students.find(s => s.id === studentId);
    if (student) student._lastGrantReason = reasonStr;
    const res = await apiPost('students.php', { action: 'grantPoints', id: studentId, points: pts, reason: reasonStr });
    if (res.success) {
      await this.refreshStudent(studentId);
      return { levelUp: false };
    }
    return { levelUp: false };
  },

  // ---- 扣除积分 ----
  async deductPoints(studentId, pts, reason) {
    const reasonStr = reason || `老师扣除了 ${pts} 积分`;
    const student = this.state.students.find(s => s.id === studentId);
    if (student) student._lastGrantReason = reasonStr;
    const res = await apiPost('students.php', { action: 'deductPoints', id: studentId, points: pts, reason: reasonStr });
    if (res.success) {
      await this.refreshStudent(studentId);
      return { success: true, deducted: res.deducted };
    }
    return { success: false, msg: res.msg };
  },

  // ---- 重置演示数据 ----
  async resetDemo() {
    await apiPost('admin.php', { action: 'resetDemo' });
    await this.init();
  },

  // ========= 管理员专用方法 =========

  async getTeachers() {
    const res = await apiGet('admin.php', { action: 'getTeachers' });
    return res.success ? res.teachers : [];
  },

  async deleteTeacher(teacherId) {
    const res = await apiPost('admin.php', { action: 'deleteTeacher', id: teacherId });
    return res.success ? { success: true } : { success: false, msg: res.msg };
  },

  async resetTeacherPassword(teacherId, newPassword) {
    const res = await apiPost('admin.php', { action: 'resetTeacherPassword', id: teacherId, password: newPassword });
    return res.success ? { success: true } : { success: false, msg: res.msg };
  },

  async getInviteCodes() {
    const res = await apiGet('admin.php', { action: 'getInviteCodes' });
    if (res.success) this.state.inviteCodes = res.inviteCodes;
    return res.success ? res.inviteCodes : [];
  },

  async addInviteCode(code, note) {
    const res = await apiPost('admin.php', { action: 'addInviteCode', code, note });
    if (res.success) await this.getInviteCodes();
    return res;
  },

  async removeInviteCode(code) {
    const res = await apiPost('admin.php', { action: 'removeInviteCode', code });
    if (res.success) this.state.inviteCodes = this.state.inviteCodes.filter(c => c.code !== code);
    return res;
  },

  async validateInviteCode(code) {
    const codes = await this.getInviteCodes();
    return codes.some(c => c.code === code.trim().toUpperCase());
  },

  async resetStudentPassword(studentId, newPassword) {
    const res = await apiPost('students.php', { action: 'resetPassword', id: studentId, password: newPassword });
    return res.success ? { success: true } : { success: false, msg: res.msg };
  },

  async nukeAll() {
    await apiPost('admin.php', { action: 'nukeAll' });
    await this.init();
  },

  async updateAdminAccount(username, password) {
    return await apiPost('auth.php', { action: 'updateAdmin', username, password });
  },

  // ---- Toast通知 ----
  toast(msg, type = 'info') {
    const id = Date.now();
    this.state.toasts.push({ id, msg, type });
    setTimeout(() => {
      this.state.toasts = this.state.toasts.filter(t => t.id !== id);
    }, 3000);
  },

  // ---- 宠物状态自然衰减（由前端随机间隔调用，45~90分钟一次）----
  // tick 规则（每次随机）：hungry -2~5/次, happy -1~3/次, clean -1~3/次
  // hungry<30 或 clean<30 时 health -2~4/次（最低1）
  async tickPetStatus(studentId) {
    const res = await apiPost('students.php', { action: 'tick', id: studentId });
    if (res.success && !res.skipped) {
      const student = this.state.students.find(s => s.id === studentId);
      if (student) {
        if (res.petStatus) student.petStatus = res.petStatus;
        // tick 不会致死，只在 checkPenalty（7天不喂）时死亡
        this.state.students = [...this.state.students];
      }
      // 状态较低时返回警告供 UI 展示
      return { sick: res.sick };
    }
    return null;
  },

  // ---- 离线惩罚检测（登录时触发）----
  // 阶梯积分扣减：24h→-10, 48h→-30, 72h→-60, 96h→-100, 120h→-150, 144h→-200, 168h(7天)→死亡+清零
  async checkDailyPenalty(studentId) {
    const res = await apiPost('students.php', { action: 'checkPenalty', id: studentId });
    if (!res.success || res.skipped) return null;

    // 无论有无惩罚都刷新本地学生数据（状态已在服务端更新）
    await this.refreshStudent(studentId);

    if (res.died) {
      return { died: true, hoursMissed: res.hoursMissed, pointLost: res.pointLost };
    }
    if (res.hoursMissed >= 24) {
      return {
        died:         false,
        hoursMissed:  res.hoursMissed,
        daysMissed:   res.daysMissed,
        pointPenalty: res.pointPenalty,
        newPoints:    res.newPoints,
      };
    }
    return null;
  },

  // ---- 喂食（已由 useItem 处理，保留兼容） ----
  async feedPet(studentId) {
    return { ok: true };
  },
};

// ===== 初始化（异步，会被 app.js 中的 mounted 等待） =====
Store.init();
