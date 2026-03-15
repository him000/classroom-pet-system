// ===== 管理员端 完整组件 =====

// ---------- 管理员总览 ----------
const AdminDashboard = {
  name: 'AdminDashboard',
  data() {
    return {
      teacherList: [],
      inviteCodeList: [],
    };
  },
  async mounted() {
    this.teacherList     = await Store.getTeachers();
    this.inviteCodeList  = await Store.getInviteCodes();
  },
  computed: {
    stats() {
      const students  = Store.state.students;
      const totalPts  = students.reduce((s, u) => s + (u.points || 0), 0);
      return {
        teacherCount:  this.teacherList.length,
        studentCount:  students.length,
        codeCount:     this.inviteCodeList.length,
        unusedCodes:   this.inviteCodeList.filter(c => !c.used).length,
        totalPoints:   totalPts,
        avgPoints:     students.length ? Math.round(totalPts / students.length) : 0,
      };
    },
    topStudents() {
      return [...Store.state.students]
        .sort((a, b) => (b.points || 0) - (a.points || 0))
        .slice(0, 5)
        .map(s => ({ ...s, petEmoji: getStudentPetEmoji(s) }));
    },
  },
  template: `
    <div class="animate-pageIn">
      <div class="teacher-header">
        <div class="teacher-page-title">🛡️ 系统总览</div>
        <div style="font-size:13px;color:var(--text-light);">管理员控制台</div>
      </div>

      <!-- 统计卡片 -->
      <div class="stat-cards">
        <div class="stat-card">
          <div class="stat-icon-box" style="background:#EDE7F6;">👩‍🏫</div>
          <div>
            <div class="stat-label">教师总数</div>
            <div class="stat-value">{{ stats.teacherCount }}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-box" style="background:#FFF0F8;">👨‍🎓</div>
          <div>
            <div class="stat-label">学生总数</div>
            <div class="stat-value">{{ stats.studentCount }}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-box" style="background:#F0FFF4;">🔑</div>
          <div>
            <div class="stat-label">邀请码（剩余）</div>
            <div class="stat-value">{{ stats.unusedCodes }}/{{ stats.codeCount }}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-box" style="background:#FFFDE7;">⭐</div>
          <div>
            <div class="stat-label">全站积分均值</div>
            <div class="stat-value">{{ stats.avgPoints }}</div>
          </div>
        </div>
      </div>

      <!-- 积分 Top5 -->
      <div class="card" style="padding:20px;margin-top:8px;">
        <div style="font-weight:800;font-size:16px;margin-bottom:14px;">🏆 积分 Top 5</div>
        <div v-if="topStudents.length === 0" style="color:var(--text-light);font-size:14px;text-align:center;padding:20px;">
          暂无学生数据
        </div>
        <div v-for="(s, i) in topStudents" :key="s.id"
             style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--border);">
          <div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;flex-shrink:0;"
               :style="i===0?'background:#FFD700;color:white':i===1?'background:#C0C0C0;color:white':i===2?'background:#CD7F32;color:white':'background:#F5F5F5;color:#888'">
            {{ i < 3 ? ['👑','🥈','🥉'][i] : i+1 }}
          </div>
          <span style="font-size:22px;">{{ s.petEmoji }}</span>
          <div style="flex:1;font-weight:700;">{{ s.name }}</div>
          <div style="font-size:12px;color:var(--text-light);">{{ s.class }}</div>
          <div style="font-weight:800;color:var(--warning);">⭐{{ s.points||0 }}</div>
        </div>
      </div>
    </div>
  `
};

// ---------- 教师管理 ----------
const AdminTeachers = {
  name: 'AdminTeachers',
  data() {
    return {
      _rev: 0,
      searchText: '',
      resetModal: false,
      resetTarget: null,
      newPassword: '',
      confirmDeleteId: null,
      showDeleteModal: false,
      allTeachers: [],
    };
  },
  async mounted() {
    this.allTeachers = await Store.getTeachers();
  },
  computed: {
    teachers() {
      void this._rev;
      const q = this.searchText.toLowerCase();
      return this.allTeachers.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.username.toLowerCase().includes(q) ||
        (t.class || '').includes(q)
      );
    },
  },
  methods: {
    openReset(teacher) {
      this.resetTarget = teacher;
      this.newPassword = '';
      this.resetModal = true;
    },
    async doReset() {
      if (!this.newPassword || this.newPassword.length < 6) {
        Store.toast('密码至少6位', 'warning'); return;
      }
      await Store.resetTeacherPassword(this.resetTarget.id, this.newPassword);
      Store.toast(`✅ 已重置 ${this.resetTarget.name} 的密码`, 'success');
      this.resetModal = false;
      this._rev++;
    },
    openDelete(id) {
      this.confirmDeleteId = id;
      this.showDeleteModal = true;
    },
    async doDelete() {
      const result = await Store.deleteTeacher(this.confirmDeleteId);
      if (result.success) {
        Store.toast('教师已删除', 'success');
        this.allTeachers = this.allTeachers.filter(t => t.id !== this.confirmDeleteId);
      } else {
        Store.toast(result.msg, 'error');
      }
      this.showDeleteModal = false;
      this._rev++;
    },
  },
  template: `
    <div class="animate-pageIn">
      <div class="teacher-header">
        <div class="teacher-page-title">👩‍🏫 教师管理</div>
      </div>

      <!-- 搜索 -->
      <div style="position:relative;margin-bottom:16px;">
        <input class="input-field" v-model="searchText" placeholder="🔍 搜索教师姓名/账号/班级..." style="padding-left:40px;" />
        <span style="position:absolute;left:14px;top:12px;font-size:16px;">🔍</span>
      </div>

      <!-- 教师卡片列表 -->
      <div v-if="teachers.length === 0" style="text-align:center;color:var(--text-light);padding:40px 20px;">
        暂无教师数据
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div v-for="t in teachers" :key="t.id" class="card" style="padding:14px 16px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <span style="font-size:36px;flex-shrink:0;">{{ t.avatar || '👩‍🏫' }}</span>
            <div style="flex:1;min-width:0;">
              <div style="font-size:15px;font-weight:800;">{{ t.name }}</div>
              <div style="font-size:12px;color:var(--text-light);margin-top:2px;">
                <span class="badge badge-purple" style="font-size:11px;">{{ t.username }}</span>
                <span style="margin-left:8px;">🏫 {{ t.class || '未设置班级' }}</span>
              </div>
              <div style="font-size:11px;color:var(--text-light);margin-top:4px;">加入：{{ t.joinDate || '-' }}</div>
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0;">
              <button class="btn btn-ghost btn-sm" @click="openReset(t)">🔑 重置</button>
              <button class="btn btn-danger btn-sm" @click="openDelete(t.id)">🗑️</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 重置密码弹窗 -->
      <div v-if="resetModal && resetTarget" class="modal-overlay" @click.self="resetModal=false">
        <div class="modal-box">
          <h3 style="font-size:18px;font-weight:800;margin-bottom:6px;">🔑 重置密码</h3>
          <p style="color:var(--text-light);font-size:13px;margin-bottom:16px;">为 <strong>{{ resetTarget.name }}</strong> 设置新密码</p>
          <div class="input-group">
            <label>新密码（至少6位）</label>
            <input class="input-field" v-model="newPassword" type="password" placeholder="请输入新密码" />
          </div>
          <div style="display:flex;gap:10px;">
            <button class="btn btn-ghost" style="flex:1" @click="resetModal=false">取消</button>
            <button class="btn btn-primary" style="flex:2" @click="doReset">✅ 确认重置</button>
          </div>
        </div>
      </div>

      <!-- 删除确认 -->
      <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal=false">
        <div class="modal-box" style="text-align:center;">
          <div style="font-size:48px;margin-bottom:12px;">⚠️</div>
          <h3 style="font-size:18px;font-weight:800;margin-bottom:8px;">确认删除教师？</h3>
          <p style="color:var(--text-light);font-size:14px;margin-bottom:20px;">删除后该教师将无法登录，操作不可撤销。</p>
          <div style="display:flex;gap:10px;">
            <button class="btn btn-ghost" style="flex:1" @click="showDeleteModal=false">取消</button>
            <button class="btn btn-danger" style="flex:1" @click="doDelete">确认删除</button>
          </div>
        </div>
      </div>
    </div>
  `
};

// ---------- 邀请码管理 ----------
const AdminInviteCodes = {
  name: 'AdminInviteCodes',
  data() {
    return {
      _rev: 0,
      newCode: '',
      newNote: '',
      showAddModal: false,
    };
  },
  async mounted() {
    await Store.getInviteCodes();
  },
  computed: {
    codes() {
      void this._rev;
      return Store.state.inviteCodes;
    },
  },
  methods: {
    async doAdd() {
      if (!this.newCode.trim()) {
        Store.toast('邀请码不能为空', 'warning'); return;
      }
      const result = await Store.addInviteCode(this.newCode, this.newNote);
      if (result.success) {
        Store.toast(`✅ 邀请码 ${this.newCode.toUpperCase()} 添加成功`, 'success');
        this.newCode = '';
        this.newNote = '';
        this.showAddModal = false;
        this._rev++;
      } else {
        Store.toast(result.msg, 'error');
      }
    },
    async doRemove(code) {
      await Store.removeInviteCode(code);
      Store.toast(`邀请码 ${code} 已删除`, 'success');
      this._rev++;
    },
    copyCode(code) {
      navigator.clipboard?.writeText(code).then(() => {
        Store.toast(`已复制：${code}`, 'success');
      }).catch(() => {
        Store.toast(`邀请码：${code}`, 'info');
      });
    },
    generateCode() {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      this.newCode = seg() + '-' + seg();
    },
  },
  template: `
    <div class="animate-pageIn">
      <div class="teacher-header">
        <div class="teacher-page-title">🔑 邀请码管理</div>
        <button class="btn btn-primary btn-sm" @click="showAddModal=true">➕ 新增邀请码</button>
      </div>

      <div v-if="codes.length === 0" style="text-align:center;color:var(--text-light);padding:40px 20px;">
        暂无邀请码
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div v-for="c in codes" :key="c.code" class="card" style="padding:14px 16px;">
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            <!-- 邀请码 -->
            <div style="flex:1;min-width:0;">
              <div style="font-family:monospace;font-size:18px;font-weight:800;letter-spacing:2px;color:#5B30CC;word-break:break-all;">
                {{ c.code }}
              </div>
              <div style="display:flex;align-items:center;gap:8px;margin-top:4px;flex-wrap:wrap;">
                <span :class="c.used ? 'badge badge-danger' : 'badge badge-success'" style="font-size:11px;">
                  {{ c.used ? '已使用' : '未使用' }}
                </span>
                <span v-if="c.note" style="font-size:12px;color:var(--text-mid);">{{ c.note }}</span>
                <span style="font-size:11px;color:var(--text-light);">{{ c.createdAt }}</span>
              </div>
            </div>
            <!-- 操作 -->
            <div style="display:flex;gap:6px;flex-shrink:0;">
              <button class="btn btn-ghost btn-sm" @click="copyCode(c.code)">📋 复制</button>
              <button class="btn btn-danger btn-sm" @click="doRemove(c.code)">🗑️</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 新增弹窗 -->
      <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal=false">
        <div class="modal-box">
          <h3 style="font-size:18px;font-weight:800;margin-bottom:16px;">➕ 新增邀请码</h3>
          <div class="input-group">
            <label>邀请码（自动转大写）</label>
            <div style="display:flex;gap:8px;align-items:center;">
              <input class="input-field" v-model="newCode" placeholder="例如：TEACHER2026B"
                     style="font-family:monospace;letter-spacing:1px;flex:1;" />
              <button class="btn btn-ghost btn-sm" style="flex-shrink:0;white-space:nowrap;border-color:#7C4DFF;color:#7C4DFF;"
                      @click="generateCode" title="随机生成邀请码">
                🎲 随机生成
              </button>
            </div>
          </div>
          <div class="input-group">
            <label>备注（可选）</label>
            <input class="input-field" v-model="newNote" placeholder="例如：三年二班专属" />
          </div>
          <div style="display:flex;gap:10px;margin-top:4px;">
            <button class="btn btn-ghost" style="flex:1" @click="showAddModal=false">取消</button>
            <button class="btn btn-primary" style="flex:2" @click="doAdd">✅ 添加</button>
          </div>
        </div>
      </div>
    </div>
  `
};

// ---------- 学生总览（管理员只读视图） ----------
const AdminStudents = {
  name: 'AdminStudents',
  data() {
    return {
      searchText: '',
      resetModal: false,
      resetTarget: null,
      newPassword: '',
    };
  },
  computed: {
    students() {
      const q = this.searchText.toLowerCase();
      return Store.state.students
        .filter(s =>
          s.name.toLowerCase().includes(q) ||
          s.username.toLowerCase().includes(q) ||
          (s.class || '').includes(q)
        )
        .map(s => ({ ...s, petEmoji: getStudentPetEmoji(s), levelInfo: getLevelInfo(s.petExp || 0) }));
    },
  },
  methods: {
    openReset(student) {
      this.resetTarget = student;
      this.newPassword = '';
      this.resetModal = true;
    },
    async doReset() {
      if (!this.newPassword || this.newPassword.length < 6) {
        Store.toast('密码至少6位', 'warning'); return;
      }
      await Store.resetStudentPassword(this.resetTarget.id, this.newPassword);
      Store.toast(`✅ 已重置 ${this.resetTarget.name} 的密码`, 'success');
      this.resetModal = false;
    },
  },
  template: `
    <div class="animate-pageIn">
      <div class="teacher-header">
        <div class="teacher-page-title">👨‍🎓 学生总览</div>
        <div style="font-size:13px;color:var(--text-light);">共 {{ students.length }} 名学生</div>
      </div>

      <div style="position:relative;margin-bottom:16px;">
        <input class="input-field" v-model="searchText" placeholder="🔍 搜索学生姓名/账号/班级..." style="padding-left:40px;" />
        <span style="position:absolute;left:14px;top:12px;font-size:16px;">🔍</span>
      </div>

      <div style="display:flex;flex-direction:column;gap:12px;">
        <div v-for="s in students" :key="s.id" class="card" style="padding:14px 16px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <span style="font-size:36px;flex-shrink:0;">{{ s.petEmoji }}</span>
            <div style="flex:1;min-width:0;">
              <div style="font-size:15px;font-weight:800;">{{ s.name }}</div>
              <div style="font-size:12px;color:var(--text-light);margin-top:2px;">
                <span class="badge badge-purple" style="font-size:11px;">{{ s.username }}</span>
                <span style="margin-left:6px;">{{ s.class }}</span>
              </div>
              <div style="display:flex;align-items:center;gap:8px;margin-top:6px;flex-wrap:wrap;">
                <span style="color:var(--warning);font-weight:800;font-size:14px;">⭐{{ s.points||0 }}</span>
                <span v-if="s.petType" class="badge badge-success" style="font-size:11px;">Lv.{{ s.levelInfo.level }} {{ s.levelInfo.name }}</span>
                <span v-else class="badge badge-warning" style="font-size:11px;">未领宠物</span>
                <span style="font-size:12px;color:var(--text-mid);">🐾 {{ s.petName || '未领取' }}</span>
              </div>
            </div>
            <button class="btn btn-ghost btn-sm" style="flex-shrink:0;" @click="openReset(s)">🔑 重置</button>
          </div>
        </div>
      </div>

      <!-- 重置密码弹窗 -->
      <div v-if="resetModal && resetTarget" class="modal-overlay" @click.self="resetModal=false">
        <div class="modal-box">
          <h3 style="font-size:18px;font-weight:800;margin-bottom:6px;">🔑 重置学生密码</h3>
          <p style="color:var(--text-light);font-size:13px;margin-bottom:16px;">为 <strong>{{ resetTarget.name }}</strong> 设置新密码</p>
          <div class="input-group">
            <label>新密码（至少6位）</label>
            <input class="input-field" v-model="newPassword" type="password" placeholder="请输入新密码" />
          </div>
          <div style="display:flex;gap:10px;">
            <button class="btn btn-ghost" style="flex:1" @click="resetModal=false">取消</button>
            <button class="btn btn-primary" style="flex:2" @click="doReset">✅ 确认重置</button>
          </div>
        </div>
      </div>
    </div>
  `
};

// ---------- 系统设置（管理员） ----------
const AdminSettings = {
  name: 'AdminSettings',
  data() {
    return {
      confirmNuke: false,
      // 修改账号弹窗
      showEditAdmin: false,
      editUsername: '',
      editOldPassword: '',
      editNewPassword: '',
      editConfirmPassword: '',
      showEditPwd: false,
      editError: '',
    };
  },
  computed: {
    adminUsername() {
      return Store.state.currentUser?.username || 'admin';
    },
  },
  methods: {
    async doNuke() {
      await Store.nukeAll();
      Store.toast('✅ 全部数据已重置为初始状态', 'success');
      this.confirmNuke = false;
    },
    openEditAdmin() {
      this.editUsername     = this.adminUsername;
      this.editOldPassword  = '';
      this.editNewPassword  = '';
      this.editConfirmPassword = '';
      this.editError        = '';
      this.showEditPwd      = false;
      this.showEditAdmin    = true;
    },
    async doEditAdmin() {
      this.editError = '';
      if (!this.editUsername.trim()) {
        this.editError = '账号不能为空'; return;
      }
      if (!this.editOldPassword) {
        this.editError = '请输入当前密码验证身份'; return;
      }
      if (this.editNewPassword) {
        if (this.editNewPassword.length < 6) {
          this.editError = '新密码至少6位'; return;
        }
        if (this.editNewPassword !== this.editConfirmPassword) {
          this.editError = '两次新密码不一致'; return;
        }
      }
      // 先用旧密码验证登录
      const verify = await Store.login(this.adminUsername, this.editOldPassword);
      if (!verify.success || verify.role !== 'admin') {
        this.editError = '旧密码不正确'; return;
      }
      const newData = {
        username: this.editUsername.trim(),
        password: this.editNewPassword || this.editOldPassword,
      };
      const res = await Store.updateAdminAccount(newData.username, newData.password);
      if (res.success) {
        // 更新当前用户状态
        if (Store.state.currentUser) Store.state.currentUser.username = newData.username;
        Store.toast('✅ 管理员账号信息已更新', 'success');
        this.showEditAdmin = false;
      } else {
        this.editError = res.msg || '更新失败';
      }
    },
  },
  mounted() {},
  template: `
    <div class="animate-pageIn">
      <div class="teacher-page-title" style="margin-bottom:20px;">⚙️ 系统设置</div>

      <div class="settings-grid">
        <!-- 账号信息 -->
        <div class="card" style="padding:20px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
            <h3 style="font-size:16px;font-weight:800;margin:0;">🛡️ 管理员账号</h3>
            <button class="btn btn-ghost btn-sm" style="color:#7C4DFF;border-color:#7C4DFF;" @click="openEditAdmin">
              ✏️ 修改
            </button>
          </div>
          <div style="font-size:13px;color:var(--text-mid);line-height:2.4;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="color:var(--text-light);width:36px;">账号</span>
              <span style="font-family:monospace;font-weight:800;font-size:14px;color:#5B30CC;">{{ adminUsername }}</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="color:var(--text-light);width:36px;">密码</span>
              <span style="font-family:monospace;font-weight:700;letter-spacing:2px;">••••••••</span>
            </div>
            <div style="color:var(--text-light);font-size:12px;margin-top:4px;">⚠️ 请妥善保管，勿对外泄露</div>
          </div>
        </div>

        <!-- 权限说明 -->
        <div class="card" style="padding:20px;">
          <h3 style="font-size:16px;font-weight:800;margin-bottom:14px;">🔐 管理员权限</h3>
          <div style="font-size:13px;color:var(--text-mid);line-height:2;">
            <div>✅ 查看/删除教师账号</div>
            <div>✅ 重置任意账号密码</div>
            <div>✅ 管理教师邀请码</div>
            <div>✅ 查看全站学生数据</div>
            <div>✅ 初始化/清空全部数据</div>
          </div>
        </div>

        <!-- 关于系统 -->
        <div class="card" style="padding:20px;">
          <h3 style="font-size:16px;font-weight:800;margin-bottom:14px;">ℹ️ 关于系统</h3>
          <div style="font-size:13px;color:var(--text-mid);line-height:2;">
            <div>系统名称：课堂电子宠物</div>
            <div>版本：v1.0.0</div>
            <div>适用：中小学课堂游戏化</div>
            <div>存储：本地 localStorage</div>
          </div>
        </div>

        <!-- 危险操作 -->
        <div class="card" style="padding:20px;border:2px solid #FFCDD2;">
          <h3 style="font-size:16px;font-weight:800;margin-bottom:8px;color:#C62828;">⚠️ 危险操作</h3>
          <p style="font-size:13px;color:var(--text-light);margin-bottom:14px;">清空全部数据，恢复到系统初始状态，包括所有教师、学生、任务和邀请码。</p>
          <button class="btn btn-danger" @click="confirmNuke=true">🔥 清空全部数据</button>
        </div>
      </div>

      <!-- 修改管理员账号弹窗 -->
      <div v-if="showEditAdmin" class="modal-overlay" @click.self="showEditAdmin=false">
        <div class="modal-box" style="max-width:420px;">
          <div style="background:linear-gradient(135deg,#3F1D8A,#7C4DFF);border-radius:16px 16px 0 0;margin:-20px -20px 20px;padding:20px;color:white;">
            <div style="font-size:32px;margin-bottom:4px;">🛡️</div>
            <div style="font-size:18px;font-weight:800;">修改管理员账号</div>
            <div style="font-size:13px;opacity:0.85;margin-top:2px;">需要验证当前密码</div>
          </div>

          <div class="input-group">
            <label>新账号</label>
            <input class="input-field" v-model="editUsername" placeholder="请输入新账号" />
            <span class="input-icon">👤</span>
          </div>
          <div class="input-group">
            <label>当前密码 <span style="color:#F44336;font-size:11px;">* 必填验证</span></label>
            <input class="input-field" v-model="editOldPassword"
                   :type="showEditPwd ? 'text' : 'password'" placeholder="请输入当前密码" />
            <span class="input-icon" style="cursor:pointer;" @click="showEditPwd=!showEditPwd">
              {{ showEditPwd ? '🙈' : '👁️' }}
            </span>
          </div>
          <div style="background:#F8F0FF;border-radius:10px;padding:12px;margin-bottom:14px;">
            <div style="font-size:12px;color:#7C4DFF;font-weight:700;margin-bottom:8px;">🔒 修改密码（不填则保持不变）</div>
            <div class="input-group" style="margin-bottom:10px;">
              <label style="font-size:12px;">新密码（至少6位）</label>
              <input class="input-field" v-model="editNewPassword" type="password" placeholder="留空则不修改密码" />
            </div>
            <div class="input-group" style="margin-bottom:0;">
              <label style="font-size:12px;">确认新密码</label>
              <input class="input-field" v-model="editConfirmPassword" type="password" placeholder="再次输入新密码" />
            </div>
          </div>

          <div v-if="editError" class="login-error" style="margin-bottom:12px;">⚠️ {{ editError }}</div>

          <div style="display:flex;gap:10px;">
            <button class="btn btn-ghost" style="flex:1" @click="showEditAdmin=false">取消</button>
            <button class="btn btn-primary" style="flex:2;background:linear-gradient(135deg,#5B30CC,#7C4DFF);" @click="doEditAdmin">
              ✅ 保存修改
            </button>
          </div>
        </div>
      </div>

      <!-- 清空确认弹窗 -->
      <div v-if="confirmNuke" class="modal-overlay" @click.self="confirmNuke=false">
        <div class="modal-box" style="text-align:center;">
          <div style="font-size:56px;margin-bottom:12px;">🔥</div>
          <h3 style="font-size:20px;font-weight:800;margin-bottom:8px;color:#C62828;">危险！确认清空全部数据？</h3>
          <p style="color:var(--text-light);font-size:14px;margin-bottom:24px;line-height:1.7;">
            此操作将清除所有教师账号（保留预设）、学生数据、任务记录和邀请码，恢复到系统初始演示状态。<br>
            <strong style="color:#C62828;">操作不可撤销！</strong>
          </p>
          <div style="display:flex;gap:10px;">
            <button class="btn btn-ghost" style="flex:1" @click="confirmNuke=false">取消</button>
            <button class="btn btn-danger" style="flex:2" @click="doNuke">🔥 确认清空</button>
          </div>
        </div>
      </div>
    </div>
  `
};

// ---------- 管理员总容器 ----------
const AdminApp = {
  name: 'AdminApp',
  props: ['user'],
  emits: ['logout'],
  data() {
    return {
      currentSection: 'dashboard',
      showAvatarMenu: false,
    };
  },
  computed: {
    menuItems() {
      return [
        { key: 'dashboard', icon: '🛡️', label: '总览' },
        { key: 'teachers',  icon: '👩‍🏫', label: '教师管理' },
        { key: 'codes',     icon: '🔑', label: '邀请码' },
        { key: 'students',  icon: '👨‍🎓', label: '学生' },
        { key: 'settings',  icon: '⚙️', label: '设置' },
      ];
    },
  },
  methods: {
    doLogout() {
      Store.logout();
      this.$emit('logout');
    },
    switchSection(key) {
      this.currentSection = key;
      this.showAvatarMenu = false;
    },
  },
  template: `
    <div style="min-height:100vh;background:#F3EEFF;" @click="showAvatarMenu=false">

      <!-- 顶部导航栏（管理员深紫色主题） -->
      <div class="topbar admin-topbar">
        <div class="topbar-logo">
          <span class="logo-icon">🛡️</span>
          <span>管理控制台</span>
        </div>
        <div class="topbar-right">
          <!-- 身份标签 -->
          <div class="topbar-points" style="background:rgba(255,255,255,0.15);">
            <span>🛡️</span>
            <span>{{ user && user.name ? user.name : '系统管理员' }}</span>
          </div>
          <!-- 头像 + 下拉菜单 -->
          <div style="position:relative;" @click.stop="showAvatarMenu=false">
            <div class="topbar-avatar" @click.stop="showAvatarMenu=true"
                 :style="showAvatarMenu ? 'box-shadow:0 0 0 3px rgba(255,255,255,0.6);' : ''">
              🛡️
            </div>
            <transition name="fade">
              <div v-if="showAvatarMenu" class="avatar-dropdown">
                <div class="avatar-menu-header">
                  <div style="font-size:28px;color:#7C4DFF;">🛡️</div>
                  <div>
                    <div style="font-size:14px;font-weight:800;color:var(--text-dark);">{{ user && user.name ? user.name : '系统管理员' }}</div>
                    <div style="font-size:12px;color:var(--text-light);">管理员</div>
                  </div>
                </div>
                <div class="avatar-menu-item avatar-menu-logout" @click="doLogout">
                  <span>🚪</span>
                  <span>退出登录</span>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>

      <!-- 主内容区 -->
      <div class="main-content">
        <admin-dashboard    v-if="currentSection==='dashboard'"></admin-dashboard>
        <admin-teachers     v-if="currentSection==='teachers'"></admin-teachers>
        <admin-invite-codes v-if="currentSection==='codes'"></admin-invite-codes>
        <admin-students     v-if="currentSection==='students'"></admin-students>
        <admin-settings     v-if="currentSection==='settings'"></admin-settings>
      </div>

      <!-- 底部导航栏 -->
      <div class="bottom-nav">
        <div v-for="item in menuItems" :key="item.key" class="nav-item"
             :class="{active: currentSection===item.key}"
             @click="switchSection(item.key)">
          <span class="nav-icon">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </div>
      </div>

    </div>
  `,
  components: {
    AdminDashboard,
    AdminTeachers,
    AdminInviteCodes,
    AdminStudents,
    AdminSettings,
    'admin-dashboard':    AdminDashboard,
    'admin-teachers':     AdminTeachers,
    'admin-invite-codes': AdminInviteCodes,
    'admin-students':     AdminStudents,
    'admin-settings':     AdminSettings,
  },
};
