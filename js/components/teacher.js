// ===== 教师端 完整组件 =====

// ---------- 教师主页（概览） ----------
const TeacherDashboard = {
  name: 'TeacherDashboard',
  props: ['teacher'],
  data() {
    return {
      _rev: 0,            // 版本计数器，审核后强制刷新
      reviewItem: null,   // 当前审核中的 { task, sub, student }
      pointsStudent: null, // 当前查看积分记录的学生
    };
  },
  computed: {
    students() { void this._rev; return Store.state.students; },
    tasks()    { void this._rev; return Store.state.tasks; },
    totalStudents() { return this.students.length; },
    totalTasks()    { return this.tasks.length; },
    pendingReviewsCount() {
      let count = 0;
      this.tasks.forEach(task => {
        task.submissions.forEach(sub => { if (sub.status === 'submitted') count++; });
      });
      return count;
    },
    topStudent() {
      return [...this.students].sort((a,b) => (b.points||0) - (a.points||0))[0] || null;
    },
    recentSubmissions() {
      const list = [];
      this.tasks.forEach(task => {
        task.submissions.forEach(sub => {
          if (sub.status === 'submitted') {
            const student = this.students.find(s => s.id === sub.studentId);
            if (student) list.push({ task, sub, student });
          }
        });
      });
      return list;
    },
    classStats() {
      const total = this.students.length;
      const withPet = this.students.filter(s => s.petType).length;
      const avgPoints = total > 0
        ? Math.round(this.students.reduce((sum, s) => sum + (s.points||0), 0) / total)
        : 0;
      return { total, withPet, avgPoints };
    },
    pointsHistory() {
      if (!this.pointsStudent) return [];
      const s = Store.state.students.find(st => st.id === this.pointsStudent.id);
      if (!s) return [];
      if (s.pointsLog && s.pointsLog.length) return [...s.pointsLog].reverse();
      // 兜底：从任务提交记录构建
      const log = [];
      Store.state.tasks.forEach(task => {
        task.submissions.forEach(sub => {
          if (sub.studentId === s.id && sub.status === 'completed') {
            log.push({ icon: task.icon||'📝', label:`完成任务「${task.title}」`, delta: task.points, time: sub.reviewedAt||sub.submittedAt, total: '-' });
          }
        });
      });
      return log.reverse();
    },
  },
  methods: {
    getStudentPetEmoji,
    openReview(item) {
      // 取实时数据避免浅拷贝问题
      const task = Store.state.tasks.find(t => t.id === item.task.id);
      const sub  = task?.submissions.find(s => s.studentId === item.student.id);
      const student = Store.state.students.find(s => s.id === item.student.id);
      if (task && sub && student) this.reviewItem = { task, sub, student };
    },
    approve() {
      const { task, student } = this.reviewItem;
      Store.reviewTask(task.id, student.id, true);
      Store.toast(`✅ 已批准 ${student.name} 的「${task.title}」，发放 ${task.points} 积分`, 'success');
      this.reviewItem = null;
      this._rev++;
    },
    reject() {
      const { task, student } = this.reviewItem;
      Store.reviewTask(task.id, student.id, false);
      Store.toast(`❌ 已拒绝 ${student.name} 的提交`, 'warning');
      this.reviewItem = null;
      this._rev++;
    },
    openPointsDetail(student) {
      this.pointsStudent = student;
    },
  },
  template: `
    <div class="animate-pageIn">
      <div class="teacher-header">
        <div class="teacher-page-title">📊 班级总览</div>
        <div style="font-size:13px;color:var(--text-light);">{{ teacher.class }} · {{ teacher.name }}</div>
      </div>

      <!-- 统计卡片 -->
      <div class="stat-cards">
        <div class="stat-card">
          <div class="stat-icon-box" style="background:#FFF0F8;">👨‍🎓</div>
          <div>
            <div class="stat-label">学生总数</div>
            <div class="stat-value">{{ totalStudents }}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-box" style="background:#F0FFF4;">📋</div>
          <div>
            <div class="stat-label">任务总数</div>
            <div class="stat-value">{{ totalTasks }}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-box" style="background:#FFFDE7;">⏳</div>
          <div>
            <div class="stat-label">待审核</div>
            <div class="stat-value" :style="{color: pendingReviewsCount>0 ? '#FF9800' : 'inherit'}">{{ pendingReviewsCount }}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-box" style="background:#EDE7F6;">⭐</div>
          <div>
            <div class="stat-label">平均积分</div>
            <div class="stat-value">{{ classStats.avgPoints }}</div>
          </div>
        </div>
      </div>

      <div class="dashboard-panels">
        <!-- 积分排行 -->
        <div class="card" style="padding:20px;">
          <div style="font-weight:800;font-size:16px;margin-bottom:14px;">🏆 积分排行
            <span style="font-size:12px;color:var(--text-light);font-weight:400;margin-left:6px;">点击查看积分记录</span>
          </div>
          <div style="overflow-y:auto;max-height:260px;scrollbar-width:thin;scrollbar-color:var(--primary) #F0E8FF;">
            <div v-for="(s, i) in [...students].sort((a,b)=>(b.points||0)-(a.points||0))" :key="s.id"
                 @click="openPointsDetail(s)"
                 style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);cursor:pointer;border-radius:8px;transition:background 0.15s;"
                 onmouseover="this.style.background='#F8F0FF'" onmouseout="this.style.background='transparent'">
              <div style="width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;flex-shrink:0;"
                   :style="i===0?'background:#FFD700;color:white':i===1?'background:#C0C0C0;color:white':i===2?'background:#CD7F32;color:white':'background:#F5F5F5;color:#888'">
                {{ i+1 }}
              </div>
              <span style="font-size:22px;flex-shrink:0;">{{ getStudentPetEmoji(s) }}</span>
              <div style="flex:1;font-weight:700;font-size:14px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ s.name }}</div>
              <div style="font-weight:800;color:var(--warning);flex-shrink:0;">⭐{{ s.points||0 }}</div>
              <span style="font-size:12px;color:var(--primary);opacity:0.6;flex-shrink:0;">›</span>
            </div>
          </div>
        </div>

        <!-- 待审核任务 -->
        <div class="card" style="padding:20px;">
          <div style="font-weight:800;font-size:16px;margin-bottom:14px;">
            📬 待审核提交
            <span v-if="pendingReviewsCount>0" class="badge badge-warning" style="margin-left:8px;">{{ pendingReviewsCount }}</span>
            <span style="font-size:12px;color:var(--text-light);font-weight:400;margin-left:6px;">点击审核</span>
          </div>
          <div style="overflow-y:auto;max-height:260px;scrollbar-width:thin;scrollbar-color:var(--primary) #F0E8FF;">
            <div v-if="recentSubmissions.length === 0" style="color:var(--text-light);font-size:14px;text-align:center;padding:20px;">
              🎉 暂无待审核任务
            </div>
            <div v-for="item in recentSubmissions" :key="item.sub.studentId + item.task.id"
                 @click="openReview(item)"
                 style="padding:8px 6px;border-bottom:1px solid var(--border);cursor:pointer;border-radius:8px;transition:background 0.15s;"
                 onmouseover="this.style.background='#FFFDE7'" onmouseout="this.style.background='transparent'">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                <div style="min-width:0;flex:1;">
                  <div style="font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ item.student.name }} · {{ item.task.icon }}{{ item.task.title }}</div>
                  <div style="font-size:12px;color:var(--text-light);">{{ item.sub.submittedAt }}</div>
                </div>
                <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
                  <span class="badge badge-warning">待审核</span>
                  <span style="font-size:16px;color:var(--primary);">›</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 审核弹窗 -->
      <div v-if="reviewItem" class="modal-overlay" @click.self="reviewItem=null">
        <div class="modal-box" style="max-width:460px;">
          <!-- 头部 -->
          <div style="background:linear-gradient(135deg,#7C3AED,#A78BFA);border-radius:16px 16px 0 0;margin:-20px -20px 20px;padding:20px;color:white;">
            <div style="font-size:36px;margin-bottom:6px;">{{ reviewItem.task.icon }}</div>
            <div style="font-size:18px;font-weight:800;">{{ reviewItem.task.title }}</div>
            <div style="font-size:13px;opacity:0.85;margin-top:2px;">{{ reviewItem.student.name }} · 待审核</div>
          </div>

          <!-- 任务描述 -->
          <div style="background:#F8F0FF;border-radius:10px;padding:12px;margin-bottom:14px;">
            <div style="font-size:12px;color:var(--text-light);margin-bottom:4px;">任务要求</div>
            <div style="font-size:13px;color:var(--text-mid);line-height:1.6;">{{ reviewItem.task.desc }}</div>
          </div>

          <!-- 提交内容 -->
          <div style="background:#FFFDE7;border-radius:10px;padding:12px;margin-bottom:14px;border-left:3px solid #FF9800;">
            <div style="font-size:12px;color:#FF9800;font-weight:700;margin-bottom:6px;">📝 学生提交内容</div>
            <div style="font-size:14px;color:var(--text-dark);line-height:1.7;">"{{ reviewItem.sub.content }}"</div>
            <div style="font-size:11px;color:var(--text-light);margin-top:6px;">提交时间：{{ reviewItem.sub.submittedAt }}</div>
          </div>

          <!-- 积分提示 -->
          <div style="background:#F0FFF4;border-radius:10px;padding:10px 14px;margin-bottom:18px;display:flex;align-items:center;gap:8px;">
            <span style="font-size:20px;">⭐</span>
            <div>
              <span style="font-size:13px;color:#2E7D32;font-weight:700;">通过将发放 {{ reviewItem.task.points }} 积分</span>
              <span style="font-size:12px;color:var(--text-light);margin-left:6px;">+ {{ Math.floor(reviewItem.task.points * 0.5) }} 宠物经验</span>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div style="display:flex;gap:10px;">
            <button class="btn btn-ghost" style="flex:1;" @click="reviewItem=null">稍后再审</button>
            <button class="btn btn-danger" style="flex:1;" @click="reject">❌ 拒绝</button>
            <button class="btn btn-success" style="flex:2;" @click="approve">✅ 通过并发分</button>
          </div>
        </div>
      </div>

      <!-- 积分记录弹窗 -->
      <div v-if="pointsStudent" class="modal-overlay" @click.self="pointsStudent=null">
        <div class="modal-box" style="max-width:420px;max-height:80vh;display:flex;flex-direction:column;">
          <!-- 头部 -->
          <div style="background:linear-gradient(135deg,#FF9800,#FFB74D);border-radius:16px 16px 0 0;margin:-20px -20px 0;padding:20px;color:white;flex-shrink:0;">
            <div style="font-size:32px;margin-bottom:4px;">{{ getStudentPetEmoji(pointsStudent) }}</div>
            <div style="font-size:18px;font-weight:800;">{{ pointsStudent.name }} 的积分记录</div>
            <div style="font-size:13px;opacity:0.9;margin-top:4px;">当前积分：⭐ {{ pointsStudent.points || 0 }}</div>
          </div>

          <!-- 记录列表 -->
          <div style="overflow-y:auto;flex:1;padding-top:16px;margin-top:4px;">
            <div v-if="pointsHistory.length===0"
                 style="text-align:center;color:var(--text-light);font-size:14px;padding:30px 0;">
              暂无积分记录
            </div>
            <div v-for="(log, idx) in pointsHistory" :key="idx"
                 style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #F5F0FF;">
              <div style="width:36px;height:36px;border-radius:50%;background:#F8F0FF;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">
                {{ log.icon }}
              </div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ log.label }}</div>
                <div style="font-size:11px;color:var(--text-light);">{{ log.time }}</div>
              </div>
              <div style="text-align:right;flex-shrink:0;">
                <div style="font-size:15px;font-weight:800;" :style="{color: log.delta>0 ? '#4CAF50' : '#F44336'}">
                  {{ log.delta > 0 ? '+' : '' }}{{ log.delta }}
                </div>
                <div v-if="log.total !== '-'" style="font-size:11px;color:var(--text-light);">共{{ log.total }}分</div>
              </div>
            </div>
          </div>

          <!-- 底部关闭 -->
          <div style="padding-top:14px;flex-shrink:0;">
            <button class="btn btn-ghost" style="width:100%;" @click="pointsStudent=null">关闭</button>
          </div>
        </div>
      </div>
    </div>
  `
};

// ---------- 学生管理 ----------
const TeacherStudents = {
  name: 'TeacherStudents',
  emits: ['toast'],
  data() {
    return {
      _rev: 0,                  // 版本计数器，增删改后强制 computed 重算
      searchText: '',
      showAddModal: false,
      showGrantModal: false,
      showDeductModal: false,   // 扣分弹窗
      grantStudent: null,
      grantPoints: 20,
      grantReason: '',
      deductStudent: null,      // 扣分对象
      deductPoints: 10,         // 默认扣10分
      deductReason: '',
      newStudent: { name:'', username:'', password:'123456', class:'' },
      showConfirmDelete: false,
      deleteStudentId: null,
    };
  },
  computed: {
    students() {
      void this._rev;  // 依赖追踪，_rev 变化时强制重算
      const q = this.searchText.toLowerCase();
      return Store.state.students.filter(s =>
        s.name.includes(q) || s.username.toLowerCase().includes(q) || (s.class||'').includes(q)
      ).map(s => ({
        ...s,
        petEmoji: getStudentPetEmoji(s),
        levelInfo: getLevelInfo(s.petExp||0),
      }));
    },
  },
  methods: {
    addStudent() {
      const { name, username, password, class: cls } = this.newStudent;
      if (!name || !username || !password) {
        this.$emit('toast', '请填写完整信息', 'warning'); return;
      }
      const result = Store.addStudent({ name, username, password, class: cls });
      if (result.success) {
        this.$emit('toast', `✅ 学生 ${name} 添加成功`, 'success');
        this.showAddModal = false;
        this.newStudent = { name:'', username:'', password:'123456', class:'三年一班' };
        this._rev++;
      } else {
        this.$emit('toast', result.msg, 'error');
      }
    },
    openGrant(student) {
      this.grantStudent = student;
      this.grantPoints = 20;
      this.grantReason = '';
      this.showGrantModal = true;
    },
    doGrant() {
      if (!this.grantPoints || this.grantPoints <= 0) {
        this.$emit('toast', '请输入有效积分数', 'warning'); return;
      }
      Store.grantPoints(this.grantStudent.id, Number(this.grantPoints), this.grantReason || `老师奖励了 ${this.grantPoints} 积分`);
      this.$emit('toast', `✅ 已给 ${this.grantStudent.name} 发放 ${this.grantPoints} 积分`, 'success');
      this.showGrantModal = false;
      this._rev++;
    },
    openDeduct(student) {
      this.deductStudent = student;
      this.deductPoints = 10;
      this.deductReason = '';
      this.showDeductModal = true;
    },
    doDeduct() {
      if (!this.deductPoints || this.deductPoints <= 0) {
        this.$emit('toast', '请输入有效扣分数', 'warning'); return;
      }
      const result = Store.deductPoints(
        this.deductStudent.id,
        Number(this.deductPoints),
        this.deductReason || `课堂违规扣除 ${this.deductPoints} 积分`
      );
      if (result.success) {
        this.$emit('toast', `⚠️ 已扣除 ${this.deductStudent.name} ${result.deducted} 积分`, 'warning');
        this.showDeductModal = false;
        this._rev++;
      } else {
        this.$emit('toast', result.msg, 'error');
      }
    },
    confirmDelete(id) {
      this.deleteStudentId = id;
      this.showConfirmDelete = true;
    },
    doDelete() {
      Store.deleteStudent(this.deleteStudentId);
      this.$emit('toast', '已删除该学生', 'success');
      this.showConfirmDelete = false;
      this._rev++;
    },
    exportCSV() {
      const headers = ['姓名','账号','班级','积分','宠物','等级','加入日期'];
      const rows = Store.state.students.map(s => [
        s.name, s.username, s.class||'', s.points||0,
        s.petName||'-', getLevelInfo(s.petExp||0).name, s.joinDate||'-'
      ]);
      const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
      const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '班级学生名单.csv';
      a.click();
      this.$emit('toast', '📥 导出成功！', 'success');
    },
  },
  template: `
    <div class="animate-pageIn">
      <div class="teacher-header">
        <div class="teacher-page-title">👨‍🎓 学生管理</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" @click="exportCSV">📥 导出</button>
          <button class="btn btn-primary btn-sm" @click="showAddModal=true">➕ 添加</button>
        </div>
      </div>

      <!-- 搜索 -->
      <div style="position:relative;margin-bottom:16px;">
        <input class="input-field" v-model="searchText" placeholder="🔍 搜索姓名/账号/班级..." style="padding-left:40px;" />
        <span style="position:absolute;left:14px;top:12px;font-size:16px;">🔍</span>
      </div>

      <!-- 学生卡片列表（手机友好，取代 table） -->
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div v-for="s in students" :key="s.id" class="card" style="padding:14px 16px;">
          <!-- 第一行：头像+姓名+积分 -->
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
            <span style="font-size:36px;flex-shrink:0;">{{ s.petEmoji }}</span>
            <div style="flex:1;min-width:0;">
              <div style="font-size:15px;font-weight:800;">{{ s.name }}</div>
              <div style="font-size:12px;color:var(--text-light);">{{ s.class }} · {{ s.username }} · 加入 {{ s.joinDate }}</div>
            </div>
            <div style="text-align:right;flex-shrink:0;">
              <div style="color:var(--warning);font-weight:800;font-size:16px;">⭐{{ s.points||0 }}</div>
              <span v-if="s.petType" class="badge badge-success" style="font-size:11px;">Lv.{{ s.levelInfo.level }} {{ s.levelInfo.name }}</span>
              <span v-else class="badge badge-warning" style="font-size:11px;">未领宠物</span>
            </div>
          </div>
          <!-- 第二行：宠物名 + 操作按钮 -->
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <div style="font-size:12px;color:var(--text-mid);">🐾 {{ s.petName || '未领取宠物' }}</div>
            <div style="display:flex;gap:6px;">
              <button class="btn btn-warning btn-sm" @click="openGrant(s)">⭐ 奖励</button>
              <button class="btn btn-sm" style="background:#FF9800;color:white;border:none;" @click="openDeduct(s)">⬇️ 扣分</button>
              <button class="btn btn-danger btn-sm" @click="confirmDelete(s.id)">🗑️</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 添加学生弹窗 -->
      <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal=false">
        <div class="modal-box">
          <h3 style="font-size:18px;font-weight:800;margin-bottom:16px;">➕ 添加学生</h3>
          <div class="input-group">
            <label>姓名</label>
            <input class="input-field" v-model="newStudent.name" placeholder="学生真实姓名" />
          </div>
          <div class="input-group">
            <label>账号</label>
            <input class="input-field" v-model="newStudent.username" placeholder="登录账号" />
          </div>
          <div class="input-group">
            <label>初始密码</label>
            <input class="input-field" v-model="newStudent.password" placeholder="初始密码" />
          </div>
          <div class="input-group">
            <label>班级</label>
            <input class="input-field" v-model="newStudent.class" placeholder="例如：三年二班" />
          </div>
          <div style="display:flex;gap:10px;">
            <button class="btn btn-ghost" style="flex:1" @click="showAddModal=false">取消</button>
            <button class="btn btn-primary" style="flex:2" @click="addStudent">✅ 添加</button>
          </div>
        </div>
      </div>

      <!-- 发分弹窗 -->
      <div v-if="showGrantModal && grantStudent" class="modal-overlay" @click.self="showGrantModal=false">
        <div class="modal-box">
          <h3 style="font-size:18px;font-weight:800;margin-bottom:6px;">⭐ 发放积分</h3>
          <p style="color:var(--text-light);font-size:13px;margin-bottom:16px;">给 {{ grantStudent.name }} 发放积分奖励</p>
          <div class="input-group">
            <label>积分数量</label>
            <input class="input-field" type="number" v-model="grantPoints" min="1" max="500" />
          </div>
          <div class="input-group">
            <label>发放理由（可选）</label>
            <input class="input-field" v-model="grantReason" placeholder="例如：课堂表现优秀" />
          </div>
          <!-- 快捷积分 -->
          <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
            <button v-for="pts in [10,20,30,50,100]" :key="pts" class="btn btn-ghost btn-sm" @click="grantPoints=pts">+{{ pts }}</button>
          </div>
          <div style="display:flex;gap:10px;">
            <button class="btn btn-ghost" style="flex:1" @click="showGrantModal=false">取消</button>
            <button class="btn btn-success" style="flex:2" @click="doGrant">✅ 发放 {{ grantPoints }} 积分</button>
          </div>
        </div>
      </div>

      <!-- 扣分弹窗 -->
      <div v-if="showDeductModal && deductStudent" class="modal-overlay" @click.self="showDeductModal=false">
        <div class="modal-box">
          <h3 style="font-size:18px;font-weight:800;margin-bottom:6px;color:#FF9800;">⬇️ 扣除积分</h3>
          <p style="color:var(--text-light);font-size:13px;margin-bottom:16px;">
            对 <strong>{{ deductStudent.name }}</strong> 扣除积分（当前：⭐{{ deductStudent.points||0 }}）
          </p>
          <div class="input-group">
            <label>扣除数量</label>
            <input class="input-field" type="number" v-model="deductPoints" min="1" :max="deductStudent.points||0" />
          </div>
          <div class="input-group">
            <label>扣分原因（将通知学生）</label>
            <input class="input-field" v-model="deductReason" placeholder="例如：课堂违纪、作业未完成" />
          </div>
          <!-- 快捷扣分 -->
          <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
            <button v-for="pts in [5,10,20,30,50]" :key="pts" class="btn btn-ghost btn-sm" @click="deductPoints=pts"
                    style="color:#FF9800;border-color:#FF9800;">-{{ pts }}</button>
          </div>
          <div style="display:flex;gap:10px;">
            <button class="btn btn-ghost" style="flex:1" @click="showDeductModal=false">取消</button>
            <button class="btn btn-danger" style="flex:2;background:#FF9800;border-color:#FF9800;" @click="doDeduct">
              ⬇️ 确认扣除 {{ deductPoints }} 积分
            </button>
          </div>
        </div>
      </div>

      <!-- 删除确认 -->
      <div v-if="showConfirmDelete" class="modal-overlay" @click.self="showConfirmDelete=false">
        <div class="modal-box" style="text-align:center;">
          <div style="font-size:48px;margin-bottom:12px;">⚠️</div>
          <h3 style="font-size:18px;font-weight:800;margin-bottom:8px;">确认删除？</h3>
          <p style="color:var(--text-light);font-size:14px;margin-bottom:20px;">删除后无法恢复，该学生的所有数据将被清除。</p>
          <div style="display:flex;gap:10px;">
            <button class="btn btn-ghost" style="flex:1" @click="showConfirmDelete=false">取消</button>
            <button class="btn btn-danger" style="flex:1" @click="doDelete">确认删除</button>
          </div>
        </div>
      </div>
    </div>
  `
};

// ---------- 任务管理 ----------
const TeacherTasks = {
  name: 'TeacherTasks',
  emits: ['toast'],
  data() {
    return {
      activeTab: 'list',  // list / review / create
      showCreateModal: false,
      newTask: {
        title: '', desc: '', points: 30, icon: '📝', subject: '语文', deadline: '',
      },
      subjects: ['语文','数学','英语','科学','体育','美术','音乐','综合'],
      icons: ['📐','📚','📝','🔬','🙋','🎨','🏃','📖','🎵','🖊️','🌍','🧮'],
      expandedTaskId: null,
      _rev: 0,  // 版本计数器，每次审核后 +1 强制 computed 重算
    };
  },
  computed: {
    // 依赖 _rev，每次递增时 Vue 会重新求值
    tasks() {
      void this._rev;  // 依赖追踪
      // 深拷贝，确保 Vue 能检测到引用变更
      return Store.state.tasks.map(t => ({
        ...t,
        submissions: t.submissions.map(s => ({ ...s })),
      }));
    },
    students() {
      return Store.state.students;
    },
    pendingReviews() {
      void this._rev;  // 依赖追踪
      const list = [];
      Store.state.tasks.forEach(task => {
        task.submissions.forEach(sub => {
          if (sub.status === 'submitted') {
            const student = Store.state.students.find(s => s.id === sub.studentId);
            if (student) list.push({ task: { ...task }, sub: { ...sub }, student });
          }
        });
      });
      return list;
    },
  },
  methods: {
    // 强制刷新：递增版本号
    forceRefresh() {
      this._rev++;
    },
    createTask() {
      const { title, desc, points, icon, subject, deadline } = this.newTask;
      if (!title || !desc) {
        this.$emit('toast', '请填写任务标题和描述', 'warning'); return;
      }
      Store.createTask({ title, desc, points: Number(points), icon, subject, deadline, createdBy: 100 });
      this.$emit('toast', `✅ 任务「${title}」发布成功！`, 'success');
      this.showCreateModal = false;
      this.newTask = { title:'', desc:'', points:30, icon:'📝', subject:'语文', deadline:'' };
      this.forceRefresh();
    },
    deleteTask(id) {
      Store.deleteTask(id);
      this.$emit('toast', '任务已删除', 'success');
      this.forceRefresh();
    },
    approve(taskId, studentId) {
      // 先从 Store 查好名字（审核后 pending 列表里会消失）
      const task = Store.state.tasks.find(t => t.id === taskId);
      const student = Store.state.students.find(s => s.id === studentId);
      Store.reviewTask(taskId, studentId, true);
      this.$emit('toast', `✅ 已批准 ${student?.name} 的「${task?.title}」，发放 ${task?.points} 积分`, 'success');
      this.forceRefresh();  // 强制刷新视图
    },
    reject(taskId, studentId) {
      const student = Store.state.students.find(s => s.id === studentId);
      Store.reviewTask(taskId, studentId, false);
      this.$emit('toast', `❌ 已拒绝 ${student?.name} 的提交`, 'warning');
      this.forceRefresh();  // 强制刷新视图
    },
    getStudentName(id) {
      return (Store.state.students.find(s => s.id === id) || {}).name || '-';
    },
    subStatusLabel(status) {
      return { submitted:'待审核', completed:'已通过', rejected:'未通过', pending:'未提交' }[status] || '-';
    },
    subStatusBadge(status) {
      return { submitted:'badge-warning', completed:'badge-success', rejected:'badge-danger', pending:'badge-purple' }[status] || '';
    },
    toggleExpand(id) {
      this.expandedTaskId = this.expandedTaskId === id ? null : id;
    },
  },
  template: `
    <div class="animate-pageIn">
      <div class="teacher-header">
        <div class="teacher-page-title">📋 任务管理</div>
        <button class="btn btn-primary btn-sm" @click="showCreateModal=true">➕ 发布任务</button>
      </div>

      <!-- Tab -->
      <div style="display:flex;gap:8px;margin-bottom:20px;">
        <button class="btn btn-sm" :class="activeTab==='list'?'btn-primary':'btn-ghost'" @click="activeTab='list'">📋 任务列表</button>
        <button class="btn btn-sm" :class="activeTab==='review'?'btn-primary':'btn-ghost'" @click="activeTab='review'">
          📬 待审核
          <span v-if="pendingReviews.length>0" class="badge badge-warning" style="margin-left:4px;">{{ pendingReviews.length }}</span>
        </button>
      </div>

      <!-- 任务列表 -->
      <div v-if="activeTab==='list'">
        <div v-for="task in tasks" :key="task.id" class="card" style="padding:16px;margin-bottom:12px;">
          <div style="display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap;">
            <span style="font-size:30px;flex-shrink:0;">{{ task.icon }}</span>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;">
                <span style="font-size:16px;font-weight:800;">{{ task.title }}</span>
                <span class="badge badge-primary">{{ task.subject }}</span>
                <span class="badge badge-success">⭐{{ task.points }}分</span>
              </div>
              <div style="font-size:13px;color:var(--text-mid);margin-bottom:8px;">{{ task.desc }}</div>
              <div style="font-size:12px;color:var(--text-light);">⏰ {{ task.deadline }} · 提交: {{ task.submissions.length }}人</div>
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0;">
              <button class="btn btn-ghost btn-sm" @click="toggleExpand(task.id)">
                {{ expandedTaskId===task.id ? '收起' : '详情' }}
              </button>
              <button class="btn btn-danger btn-sm" @click="deleteTask(task.id)">🗑️</button>
            </div>
          </div>

          <!-- 展开：提交详情 -->
          <div v-if="expandedTaskId===task.id" style="margin-top:14px;border-top:1px solid var(--border);padding-top:14px;">
            <div v-if="task.submissions.length===0" style="color:var(--text-light);font-size:13px;text-align:center;padding:10px;">
              暂无学生提交
            </div>
            <div v-for="sub in task.submissions" :key="sub.studentId"
                 style="padding:8px 0;border-bottom:1px solid #F5F0FF;">
              <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                <div style="flex:1;min-width:120px;">
                  <div style="font-size:14px;font-weight:700;">{{ getStudentName(sub.studentId) }}</div>
                  <div style="font-size:12px;color:var(--text-light);white-space:pre-wrap;word-break:break-all;">{{ sub.content }}</div>
                  <div style="font-size:11px;color:var(--text-light);">{{ sub.submittedAt }}</div>
                </div>
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                  <span :class="'badge ' + subStatusBadge(sub.status)">{{ subStatusLabel(sub.status) }}</span>
                  <template v-if="sub.status==='submitted'">
                    <button class="btn btn-success btn-sm" @click="approve(task.id, sub.studentId)">✅ 通过</button>
                    <button class="btn btn-danger btn-sm"  @click="reject(task.id, sub.studentId)">❌ 拒</button>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 待审核列表 -->
      <div v-if="activeTab==='review'">
        <div v-if="pendingReviews.length===0" class="empty-state">
          <div class="empty-icon">🎉</div>
          <p>所有任务都已审核完毕！</p>
        </div>
        <div v-for="item in pendingReviews" :key="item.sub.studentId+'_'+item.task.id"
             class="card" style="padding:16px;margin-bottom:12px;">
          <div style="display:flex;align-items:flex-start;gap:12px;">
            <span style="font-size:36px;">{{ item.task.icon }}</span>
            <div style="flex:1;">
              <div style="font-size:16px;font-weight:800;margin-bottom:4px;">
                {{ item.student.name }} · {{ item.task.title }}
              </div>
              <div style="font-size:13px;color:var(--text-mid);margin-bottom:6px;background:#F8F0FF;padding:8px;border-radius:8px;">
                "{{ item.sub.content }}"
              </div>
              <div style="font-size:12px;color:var(--text-light);">提交时间: {{ item.sub.submittedAt }}</div>
              <div style="font-size:12px;color:var(--warning);font-weight:700;">通过将发放 ⭐{{ item.task.points }} 积分</div>
            </div>
          </div>
          <div style="display:flex;gap:10px;margin-top:12px;">
            <button class="btn btn-ghost" style="flex:1" @click="reject(item.task.id, item.student.id)">❌ 拒绝</button>
            <button class="btn btn-success" style="flex:2" @click="approve(item.task.id, item.student.id)">✅ 通过并发分</button>
          </div>
        </div>
      </div>

      <!-- 创建任务弹窗 -->
      <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal=false">
        <div class="modal-box" style="max-height:85vh;overflow-y:auto;">
          <h3 style="font-size:18px;font-weight:800;margin-bottom:16px;">➕ 发布新任务</h3>

          <!-- 图标选择 -->
          <div class="input-group">
            <label>选择图标</label>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button v-for="icon in icons" :key="icon" class="btn btn-sm"
                      :style="newTask.icon===icon ? 'background:var(--primary);color:white;' : 'background:#F8F0FF;'"
                      @click="newTask.icon=icon">{{ icon }}</button>
            </div>
          </div>

          <div class="input-group">
            <label>任务标题</label>
            <input class="input-field" v-model="newTask.title" placeholder="例如：完成数学作业" />
          </div>
          <div class="input-group">
            <label>任务描述</label>
            <textarea class="input-field" v-model="newTask.desc" rows="3" placeholder="详细说明任务要求..."></textarea>
          </div>
          <div class="form-grid-2">
            <div class="input-group">
              <label>学科</label>
              <select class="input-field" v-model="newTask.subject">
                <option v-for="s in subjects" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
            <div class="input-group">
              <label>积分奖励</label>
              <input class="input-field" type="number" v-model="newTask.points" min="5" max="200" />
            </div>
          </div>
          <div class="input-group">
            <label>截止时间</label>
            <input class="input-field" type="datetime-local" v-model="newTask.deadline" />
          </div>

          <!-- 预览 -->
          <div style="background:#F8F0FF;border-radius:14px;padding:14px;margin-bottom:16px;">
            <div style="font-size:12px;color:var(--text-light);margin-bottom:6px;">预览</div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:24px;">{{ newTask.icon }}</span>
              <div>
                <div style="font-weight:700;">{{ newTask.title || '任务标题' }}</div>
                <div style="font-size:12px;color:var(--warning);">⭐ +{{ newTask.points }}积分</div>
              </div>
            </div>
          </div>

          <div style="display:flex;gap:10px;">
            <button class="btn btn-ghost" style="flex:1" @click="showCreateModal=false">取消</button>
            <button class="btn btn-primary" style="flex:2" @click="createTask">🚀 发布任务</button>
          </div>
        </div>
      </div>
    </div>
  `
};

// ---------- 排行榜（教师视角） ----------
const TeacherRank = {
  name: 'TeacherRank',
  computed: {
    rankList() {
      return [...Store.state.students]
        .sort((a, b) => (b.points||0) - (a.points||0))
        .map((s, i) => ({
          ...s,
          rank: i + 1,
          petEmoji: getStudentPetEmoji(s),
          levelInfo: getLevelInfo(s.petExp||0),
          mood: getStudentMood(s.petStatus),
        }));
    }
  },
  template: `
    <div class="animate-pageIn">
      <div class="teacher-page-title" style="margin-bottom:20px;">🏆 班级排行榜</div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div v-for="s in rankList" :key="s.id" class="card" style="padding:14px 16px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <!-- 排名徽章 -->
            <div style="width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;flex-shrink:0;"
                 :style="s.rank===1?'background:#FFD700;color:white':s.rank===2?'background:#C0C0C0;color:white':s.rank===3?'background:#CD7F32;color:white':'background:#F5F5F5;color:#666'">
              {{ s.rank <= 3 ? ['👑','🥈','🥉'][s.rank-1] : s.rank }}
            </div>
            <!-- 宠物头像 -->
            <span style="font-size:34px;flex-shrink:0;">{{ s.petEmoji }}</span>
            <!-- 信息区 -->
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <span style="font-size:15px;font-weight:800;">{{ s.name }}</span>
                <span style="font-size:12px;color:var(--text-light);">{{ s.class }}</span>
                <span class="badge badge-success" style="font-size:11px;">Lv.{{ s.levelInfo.level }} {{ s.levelInfo.name }}</span>
              </div>
              <div style="display:flex;align-items:center;gap:10px;margin-top:4px;flex-wrap:wrap;">
                <span style="font-size:13px;" :style="{color: s.petStatus?.health>=70?'#4CAF50':s.petStatus?.health>=40?'#FF9800':'#F44336'}">❤️ {{ s.petStatus?.health||0 }}</span>
                <span style="font-size:13px;color:#FF9800;">🍗 {{ s.petStatus?.hungry||0 }}</span>
                <span style="font-size:13px;">{{ s.mood.emoji }} {{ s.mood.label }}</span>
              </div>
            </div>
            <!-- 积分 -->
            <div style="font-size:18px;font-weight:800;color:var(--warning);flex-shrink:0;">⭐{{ s.points||0 }}</div>
          </div>
        </div>
      </div>
    </div>
  `
};

// ---------- 系统设置 ----------
const TeacherSettings = {
  name: 'TeacherSettings',
  emits: ['toast'],
  data() {
    return {
      confirmReset: false,
    };
  },
  methods: {
    resetDemo() {
      Store.resetDemo();
      this.$emit('toast', '✅ 演示数据已重置！', 'success');
      this.confirmReset = false;
    },
  },
  template: `
    <div class="animate-pageIn">
      <div class="teacher-page-title" style="margin-bottom:20px;">⚙️ 系统设置</div>

      <div class="settings-grid">
        <!-- 积分规则 -->
        <div class="card" style="padding:20px;">
          <h3 style="font-size:16px;font-weight:800;margin-bottom:14px;">⭐ 积分规则说明</h3>
          <div style="font-size:13px;color:var(--text-mid);line-height:2;">
            <div>📐 完成作业 → 30~60 积分</div>
            <div>🙋 课堂回答 → 10~30 积分</div>
            <div>📖 阅读打卡 → 20~40 积分</div>
            <div>🎨 创意作品 → 40~60 积分</div>
            <div>✨ 额外奖励 → 教师手动发放</div>
          </div>
        </div>

        <!-- 宠物成长规则 -->
        <div class="card" style="padding:20px;">
          <h3 style="font-size:16px;font-weight:800;margin-bottom:14px;">🐾 宠物成长规则</h3>
          <div style="font-size:13px;color:var(--text-mid);line-height:2;">
            <div>🥚 蛋：0~50 经验</div>
            <div>🐣 幼宠：50~200 经验</div>
            <div>🦎 成长：200~500 经验</div>
            <div>🐲 成熟：500~1000 经验</div>
            <div>🐉 传说：1000+ 经验</div>
            <div style="margin-top:6px;color:var(--primary);">完成任务积分 × 0.5 = 经验值</div>
          </div>
        </div>

        <!-- 关于系统 -->
        <div class="card" style="padding:20px;">
          <h3 style="font-size:16px;font-weight:800;margin-bottom:14px;">ℹ️ 关于系统</h3>
          <div style="font-size:13px;color:var(--text-mid);line-height:2;">
            <div>系统名称：课堂电子宠物</div>
            <div>版本：v1.0.0</div>
            <div>适用：中小学课堂游戏化</div>
            <div>支持：PC + 手机</div>
          </div>
        </div>

        <!-- 演示数据重置 -->
        <div class="card" style="padding:20px;">
          <h3 style="font-size:16px;font-weight:800;margin-bottom:14px;">🔄 演示管理</h3>
          <p style="font-size:13px;color:var(--text-light);margin-bottom:14px;">重置所有学生数据到初始演示状态</p>
          <button class="btn btn-danger" @click="confirmReset=true">🔄 重置演示数据</button>
        </div>
      </div>

      <!-- 确认重置 -->
      <div v-if="confirmReset" class="modal-overlay" @click.self="confirmReset=false">
        <div class="modal-box" style="text-align:center;">
          <div style="font-size:48px;margin-bottom:12px;">⚠️</div>
          <h3 style="font-size:18px;font-weight:800;margin-bottom:8px;">确认重置？</h3>
          <p style="color:var(--text-light);font-size:14px;margin-bottom:20px;">这将把所有学生数据恢复到演示初始状态。</p>
          <div style="display:flex;gap:10px;">
            <button class="btn btn-ghost" style="flex:1" @click="confirmReset=false">取消</button>
            <button class="btn btn-danger" style="flex:1" @click="resetDemo">确认重置</button>
          </div>
        </div>
      </div>
    </div>
  `
};

// ---------- 教师总容器 ----------
const TeacherApp = {
  name: 'TeacherApp',
  props: ['user'],
  emits: ['logout'],
  data() {
    return {
      currentSection: 'dashboard',
      showAvatarMenu: false,
    };
  },
  computed: {
    navItems() {
      return [
        { key: 'dashboard', icon: '📊', label: '总览'   },
        { key: 'students',  icon: '👨‍🎓', label: '学生管理' },
        { key: 'tasks',     icon: '📋', label: '任务管理' },
        { key: 'rank',      icon: '🏆', label: '排行榜' },
        { key: 'settings',  icon: '⚙️', label: '系统设置' },
      ];
    },
    teacherAvatar() {
      return (this.user && this.user.name && this.user.name[0]) || '👩‍🏫';
    },
  },
  methods: {
    onToast(msg, type) { Store.toast(msg, type); },
    doLogout() { Store.logout(); this.$emit('logout'); },
    navTo(key) { this.currentSection = key; this.showAvatarMenu = false; },
  },
  template: `
    <div style="min-height:100vh;background:#F8F0FF;" @click="showAvatarMenu=false">

      <!-- 顶部导航栏（与学生端同款） -->
      <div class="topbar">
        <div class="topbar-logo">
          <span class="logo-icon">🐾</span>
          <span>课堂宠物</span>
        </div>
        <div class="topbar-right">
          <!-- 班级标签 -->
          <div class="topbar-points" style="background:rgba(255,255,255,0.2);">
            <span>🏫</span>
            <span>{{ user && user.class ? user.class : '教师端' }}</span>
          </div>
          <!-- 头像 + 下拉菜单 -->
          <div style="position:relative;" @click.stop="showAvatarMenu=false">
            <div class="topbar-avatar" @click.stop="showAvatarMenu=true"
                 :style="showAvatarMenu ? 'box-shadow:0 0 0 3px var(--primary);' : ''">
              {{ teacherAvatar }}
            </div>
            <transition name="fade">
              <div v-if="showAvatarMenu" class="avatar-dropdown">
                <div class="avatar-menu-header">
                  <div style="font-size:28px;font-weight:900;color:var(--secondary);">
                    {{ teacherAvatar }}
                  </div>
                  <div>
                    <div style="font-size:14px;font-weight:800;color:var(--text-dark);">{{ user && user.name }}</div>
                    <div style="font-size:12px;color:var(--text-light);">{{ user && user.class }} · 教师</div>
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

      <!-- 主内容 -->
      <div class="main-content">
        <teacher-dashboard v-if="currentSection==='dashboard'" :teacher="user" @toast="onToast"></teacher-dashboard>
        <teacher-students  v-if="currentSection==='students'"  @toast="onToast"></teacher-students>
        <teacher-tasks     v-if="currentSection==='tasks'"     @toast="onToast"></teacher-tasks>
        <teacher-rank      v-if="currentSection==='rank'"></teacher-rank>
        <teacher-settings  v-if="currentSection==='settings'"  @toast="onToast"></teacher-settings>
      </div>

      <!-- 底部导航栏（与学生端同款） -->
      <div class="bottom-nav">
        <div v-for="item in navItems" :key="item.key" class="nav-item"
             :class="{active: currentSection===item.key}"
             @click="navTo(item.key)">
          <span class="nav-icon">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </div>
      </div>

    </div>
  `,
  components: {
    TeacherDashboard, TeacherStudents, TeacherTasks, TeacherRank, TeacherSettings,
    'teacher-dashboard': TeacherDashboard,
    'teacher-students':  TeacherStudents,
    'teacher-tasks':     TeacherTasks,
    'teacher-rank':      TeacherRank,
    'teacher-settings':  TeacherSettings,
  }
};
