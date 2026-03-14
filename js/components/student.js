// ===== 学生端 完整组件 =====

// ---------- 宠物页面 ----------
const PetPage = {
  name: 'PetPage',
  props: ['student'],
  emits: ['update', 'toast', 'level-up'],
  data() {
    return {
      petAction: 'idle',    // idle / eating / bathing / playing / healing
      showItemModal: false,
      currentActionType: null,
      showBubble: false,
      bubbleText: '',
      bubbleTimer: null,
      showShopModal: false,
      actionLoading: false,
      showPointsDetail: false,  // 积分明细弹窗
    };
  },
  computed: {
    petType() {
      return PET_TYPES.find(p => p.id === this.student.petType) || null;
    },
    petEmoji() {
      if (!this.petType) return '🥚';
      if (this.student.petDead) return '🥚';
      return getStudentPetEmoji(this.student);
    },
    mood() {
      return getStudentMood(this.student.petStatus);
    },
    levelInfo() {
      return getLevelInfo(this.student.petExp || 0);
    },
    expPercent() {
      return getExpPercent(this.student.petExp || 0);
    },
    statusBars() {
      const s = this.student.petStatus || {};
      return [
        { key: 'health', icon: '❤️',  label: '生命', value: s.health || 0, cls: 'progress-health' },
        { key: 'hungry', icon: '🍗',  label: '饱食', value: s.hungry || 0, cls: 'progress-hungry' },
        { key: 'happy',  icon: '😊',  label: '心情', value: s.happy  || 0, cls: 'progress-happy'  },
        { key: 'clean',  icon: '🛁',  label: '清洁', value: s.clean  || 0, cls: 'progress-clean'  },
      ];
    },
    backpackItems() {
      const bp = this.student.backpack || {};
      return ITEMS.filter(item => bp[item.id] > 0).map(item => ({
        ...item,
        count: bp[item.id]
      }));
    },
    feedItems()  { return this.backpackItems.filter(i => i.type === 'food'); },
    cleanItems() { return this.backpackItems.filter(i => i.type === 'clean'); },
    toyItems()   { return this.backpackItems.filter(i => i.type === 'toy'); },
    healItems()  { return this.backpackItems.filter(i => i.type === 'heal' || i.type === 'special'); },
    shopItems() { return ITEMS; },
    // 积分明细：优先读 pointsLog，兜底从任务记录构建
    pointsHistory() {
      const student = Store.state.students.find(s => s.id === this.student.id);
      if (student && student.pointsLog && student.pointsLog.length > 0) {
        // 倒序，最新在前
        return [...student.pointsLog].reverse();
      }
      // 兜底：从任务提交记录中汇总（旧数据兼容）
      const list = [];
      Store.state.tasks.forEach(task => {
        const sub = task.submissions.find(s => s.studentId === this.student.id);
        if (sub && sub.status === 'completed') {
          list.push({
            icon: task.icon,
            label: `完成任务「${task.title}」`,
            delta: task.points,
            time: sub.reviewedAt || sub.submittedAt || '',
          });
        }
      });
      return list.reverse();
    },
  },
  methods: {
    triggerAction(actionType) {
      if (this.actionLoading) return;
      this.currentActionType = actionType;
      const items = {
        feed: this.feedItems,
        bath: this.cleanItems,
        play: this.toyItems,
        heal: this.healItems,
      }[actionType];
      if (!items || items.length === 0) {
        this.$emit('toast', `背包中没有${this.actionLabel(actionType)}道具！去商店购买吧 🛒`, 'warning');
        return;
      }
      this.showItemModal = true;
    },
    actionLabel(type) {
      return { feed: '食物', bath: '清洁', play: '玩具', heal: '医疗' }[type] || '';
    },
    actionEmoji(type) {
      return { feed: '🍎', bath: '🛁', play: '⚽', heal: '💊' }[type] || '✨';
    },
    currentItems() {
      return {
        feed: this.feedItems,
        bath: this.cleanItems,
        play: this.toyItems,
        heal: this.healItems,
      }[this.currentActionType] || [];
    },
    async useItem(item) {
      this.showItemModal = false;
      this.actionLoading = true;
      const animMap = { food: 'eating', clean: 'bathing', toy: 'playing', heal: 'healing', special: 'healing' };
      this.petAction = animMap[item.type] || 'eating';

      const result = Store.useItem(this.student.id, item.id);
      await new Promise(r => setTimeout(r, 1500));
      this.petAction = 'idle';
      this.actionLoading = false;

      if (result.success) {
        // 孵化完成！
        if (result.hatched) {
          this.$emit('update');
          this.$emit('toast', `🎉 宠物孵化成功！${this.student.petName} 重新回来啦！`, 'success');
          return;
        }
        // 孵化进度推进
        if (result.hatchProgress !== undefined) {
          this.$emit('update');
          const remain = 3 - result.hatchProgress;
          this.$emit('toast', `🥚 喂食了！还需再喂 ${remain} 次才能孵化`, 'info');
          return;
        }
        const effectTexts = [];
        if (item.effect.hungry)  effectTexts.push(`饱食+${item.effect.hungry}`);
        if (item.effect.health)  effectTexts.push(`生命+${item.effect.health}`);
        if (item.effect.happy)   effectTexts.push(`心情+${item.effect.happy}`);
        if (item.effect.clean)   effectTexts.push(`清洁+${item.effect.clean}`);
        if (item.effect.exp)     effectTexts.push(`经验+${item.effect.exp}`);
        this.showBubbleMsg(`${item.emoji} ${effectTexts.join(' ')} ！`);
        this.$emit('update');
        if (result.levelUp) {
          this.$emit('level-up', result.newStage);
        } else {
          this.$emit('toast', `使用了 ${item.emoji}${item.name}，${effectTexts.join(' ')}！`, 'success');
        }
      } else {
        this.$emit('toast', result.msg, 'error');
      }
    },
    buyItem(item) {
      const result = Store.buyItem(this.student.id, item.id);
      if (result.success) {
        this.$emit('toast', `${item.emoji} ${item.name} 已加入背包  -${item.cost} 积分`, 'success');
        this.$emit('update');
      } else {
        this.$emit('toast', result.msg, 'error');
      }
    },
    showBubbleMsg(text) {
      if (this.bubbleTimer) clearTimeout(this.bubbleTimer);
      this.bubbleText = text;
      this.showBubble = true;
      this.bubbleTimer = setTimeout(() => { this.showBubble = false; }, 2500);
    },
    clickPet() {
      const msgs = ['汪汪！玩我嘛~', '我要吃东西！', '今天学了什么呀？', '你是最棒的主人！', '陪我玩！', '喜欢你哟 ❤️'];
      this.showBubbleMsg(msgs[Math.floor(Math.random() * msgs.length)]);
    },
    getStatusColor(value) {
      if (value >= 70) return '#4CAF50';
      if (value >= 40) return '#FF9800';
      return '#F44336';
    },
  },
  template: `
    <div class="pet-page animate-pageIn">
      <!-- 宠物展示区 -->
      <div class="pet-container">
        <div class="pet-scene" @click="clickPet">
          <div class="pet-bg"></div>
          <!-- 气泡 -->
          <div v-if="showBubble" class="pet-status-bubble" style="max-width:180px;font-size:11px;">{{ bubbleText }}</div>
          <!-- 宠物 -->
          <div class="pet-emoji" :class="petAction" :style="{fontSize: '90px'}">{{ petEmoji }}</div>
          <!-- 等级徽章 -->
          <div class="pet-level-badge">Lv.{{ levelInfo.level }} {{ levelInfo.name }}</div>
        </div>

        <div class="pet-name">{{ student.petName || '我的宠物' }} {{ student.petDead ? '💔' : mood.emoji }}</div>
        <div style="color:var(--text-light);font-size:13px;margin-bottom:8px;">
          {{ student.petDead ? '宠物变成了一颗蛋，用食物喂它重新孵化吧！' : mood.label }}
        </div>

        <!-- 积分入口（可点击查明细） -->
        <div @click="showPointsDetail=true"
             style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#FFF8E1,#FFF3CD);
                    border:1.5px solid #FFD54F;border-radius:50px;padding:6px 18px;cursor:pointer;margin-bottom:12px;
                    transition:all 0.2s;" title="点击查看积分明细">
          <span style="font-size:20px;">⭐</span>
          <span style="font-size:18px;font-weight:900;color:#E65100;">{{ student.points || 0 }}</span>
          <span style="font-size:12px;color:#FF9800;font-weight:600;">积分</span>
          <span style="font-size:11px;color:#FFB300;margin-left:2px;">明细 ›</span>
        </div>

        <!-- 蛋态：孵化进度 -->
        <div v-if="student.petDead"
             style="width:100%;max-width:280px;margin-bottom:16px;background:#FFF3E0;border-radius:16px;padding:14px;text-align:center;">
          <div style="font-size:13px;font-weight:700;color:#E65100;margin-bottom:8px;">🥚 孵化进度</div>
          <div style="display:flex;justify-content:center;gap:10px;margin-bottom:8px;">
            <span v-for="i in 3" :key="i"
                  style="font-size:24px;"
                  :style="{opacity: i <= (student.petHatchProgress||0) ? 1 : 0.25}">🥚</span>
          </div>
          <div style="font-size:12px;color:#FF9800;">
            已喂食 {{ student.petHatchProgress || 0 }} / 3 次
          </div>
          <div style="font-size:11px;color:var(--text-light);margin-top:4px;">用食物道具喂食即可推进孵化</div>
        </div>

        <!-- 经验条（活着时显示） -->
        <div v-if="!student.petDead" style="width:100%;max-width:280px;margin-bottom:16px;">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-light);margin-bottom:4px;">
            <span>✨ 经验值</span>
            <span>{{ student.petExp || 0 }} / {{ levelInfo.maxExp }}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill progress-exp" :style="{width: expPercent + '%'}"></div>
          </div>
        </div>

        <!-- 状态条（活着时显示） -->
        <div v-if="!student.petDead" class="status-bars">
          <div v-for="bar in statusBars" :key="bar.key" class="status-bar-item">
            <span class="icon">{{ bar.icon }}</span>
            <span class="label">{{ bar.label }}</span>
            <div class="progress-bar" style="flex:1">
              <div class="progress-fill" :class="bar.cls" :style="{width: bar.value + '%'}"></div>
            </div>
            <span class="value" :style="{color: getStatusColor(bar.value)}">{{ bar.value }}</span>
          </div>
        </div>

        <!-- 操作按钮（死亡时只显示喂食） -->
        <div class="action-buttons">
          <button class="action-btn action-feed" @click="triggerAction('feed')" :disabled="actionLoading">
            <span class="action-icon">🍎</span>
            <span>喂食</span>
            <span class="action-cost">{{ student.petDead ? '孵化' : '道具' }}</span>
          </button>
          <template v-if="!student.petDead">
          <button class="action-btn action-bath" @click="triggerAction('bath')" :disabled="actionLoading">
            <span class="action-icon">🛁</span>
            <span>洗澡</span>
            <span class="action-cost">道具</span>
          </button>
          <button class="action-btn action-play" @click="triggerAction('play')" :disabled="actionLoading">
            <span class="action-icon">⚽</span>
            <span>玩耍</span>
            <span class="action-cost">道具</span>
          </button>
          <button class="action-btn action-heal" @click="triggerAction('heal')" :disabled="actionLoading">
            <span class="action-icon">💊</span>
            <span>治疗</span>
            <span class="action-cost">道具</span>
          </button>
          </template>
        </div>

        <!-- 去商店 -->
        <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;justify-content:center;">
          <button class="btn btn-ghost btn-sm" @click="showShopModal=true">
            🛒 去商店购买道具
          </button>
        </div>
      </div>

      <!-- 道具选择弹窗 -->
      <div v-if="showItemModal" class="modal-overlay" @click.self="showItemModal=false">
        <div class="modal-box" style="max-width:400px;">
          <h3 style="font-size:18px;font-weight:800;margin-bottom:16px;color:var(--text-dark);">
            {{ actionEmoji(currentActionType) }} 选择道具
          </h3>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <div v-for="item in currentItems()" :key="item.id"
                 @click="useItem(item)"
                 style="display:flex;align-items:center;gap:14px;padding:14px 16px;
                        background:linear-gradient(135deg,#FFF8FF,#F8F0FF);
                        border:2px solid var(--border);border-radius:16px;cursor:pointer;
                        transition:all 0.2s;"
                 @mouseenter="e => { e.currentTarget.style.borderColor='var(--primary)'; e.currentTarget.style.transform='translateX(4px)'; }"
                 @mouseleave="e => { e.currentTarget.style.borderColor='var(--border)';   e.currentTarget.style.transform='translateX(0)';  }">
              <span style="font-size:36px;flex-shrink:0;">{{ item.emoji }}</span>
              <div style="flex:1;min-width:0;">
                <div style="font-size:15px;font-weight:800;color:var(--text-dark);">{{ item.name }}</div>
                <div style="font-size:12px;color:var(--text-light);margin-top:2px;">{{ item.desc }}</div>
              </div>
              <div style="background:var(--primary);color:white;border-radius:50px;padding:4px 10px;
                          font-size:13px;font-weight:800;flex-shrink:0;">×{{ item.count }}</div>
            </div>
          </div>
          <button class="btn btn-ghost btn-sm" style="width:100%;margin-top:14px;" @click="showItemModal=false">取消</button>
        </div>
      </div>

      <!-- 商店弹窗 -->
      <div v-if="showShopModal" class="modal-overlay" @click.self="showShopModal=false">
        <div class="modal-box" style="width:100%;max-width:600px;max-height:88vh;overflow-y:auto;padding:0;border-radius:24px;">
          <!-- 商店顶部 Header -->
          <div style="position:sticky;top:0;z-index:10;background:linear-gradient(135deg,#FF6B9D,#7C4DFF);
                      padding:16px 20px;border-radius:24px 24px 0 0;display:flex;align-items:center;justify-content:space-between;">
            <h3 style="font-size:18px;font-weight:900;color:white;display:flex;align-items:center;gap:8px;">
              🛒 道具商店
            </h3>
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="display:flex;align-items:center;gap:4px;background:rgba(255,255,255,0.2);
                          border-radius:50px;padding:5px 14px;">
                <span style="font-size:16px;">⭐</span>
                <span style="font-size:18px;font-weight:900;color:white;line-height:1;">{{ student.points }}</span>
                <span style="font-size:11px;color:rgba(255,255,255,0.85);font-weight:600;">积分</span>
              </div>
              <div @click="showShopModal=false"
                   style="width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,0.25);
                          display:flex;align-items:center;justify-content:center;cursor:pointer;
                          font-size:15px;font-weight:700;color:white;flex-shrink:0;">✕</div>
            </div>
          </div>
          <!-- 商品列表 -->
          <div class="shop-grid" style="padding:16px;display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">
            <div v-for="item in shopItems" :key="item.id"
                 style="background:white;border:2px solid var(--border);border-radius:16px;
                        padding:14px;display:flex;flex-direction:row;align-items:center;gap:12px;
                        transition:all 0.2s;box-shadow:0 2px 8px rgba(0,0,0,0.05);"
                 :style="student.points < item.cost ? 'opacity:0.6;' : 'cursor:pointer;'"
                 @mouseenter="e => e.currentTarget.style.boxShadow='0 4px 16px rgba(255,107,157,0.2)'"
                 @mouseleave="e => e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.05)'">
              <!-- 图标 -->
              <div style="width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,#FFF0F8,#F8F0FF);
                          display:flex;align-items:center;justify-content:center;font-size:30px;flex-shrink:0;">
                {{ item.emoji }}
              </div>
              <!-- 信息 -->
              <div style="flex:1;min-width:0;">
                <div style="font-weight:800;font-size:14px;color:var(--text-dark);margin-bottom:2px;
                            white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ item.name }}</div>
                <div style="font-size:11px;color:var(--text-light);margin-bottom:8px;line-height:1.4;
                            display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">{{ item.desc }}</div>
                <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
                  <span style="font-size:13px;color:var(--warning);font-weight:800;white-space:nowrap;">⭐ {{ item.cost }}</span>
                  <button class="btn btn-primary btn-sm" @click="buyItem(item)"
                          :disabled="student.points < item.cost"
                          style="font-size:12px;padding:5px 12px;flex-shrink:0;">购买</button>
                </div>
              </div>
            </div>
          </div>
          <div style="padding:0 16px 16px;">
            <button class="btn btn-ghost btn-sm" style="width:100%;" @click="showShopModal=false">关闭商店</button>
          </div>
        </div>
      </div>

      <!-- 积分明细弹窗 -->
      <div v-if="showPointsDetail" class="modal-overlay" @click.self="showPointsDetail=false">
        <div class="modal-box" style="max-height:80vh;overflow-y:auto;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <h3 style="font-size:18px;font-weight:800;color:var(--text-dark);">⭐ 积分明细</h3>
            <div style="font-size:22px;font-weight:900;color:#E65100;">{{ student.points || 0 }} 分</div>
          </div>

          <!-- 无记录 -->
          <div v-if="pointsHistory.length === 0" style="text-align:center;padding:30px 0;color:var(--text-light);">
            <div style="font-size:40px;margin-bottom:8px;">📋</div>
            <div style="font-size:14px;">暂无积分记录，完成任务可获得积分哦！</div>
          </div>

          <!-- 记录列表 -->
          <div v-for="(record, idx) in pointsHistory" :key="idx"
               style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);">
            <div style="width:36px;height:36px;border-radius:50%;background:#FFF8E1;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">
              {{ record.icon }}
            </div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:14px;font-weight:700;color:var(--text-dark);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                {{ record.label }}
              </div>
              <div style="font-size:11px;color:var(--text-light);margin-top:2px;">
                {{ record.time }}
                <span v-if="record.total !== undefined" style="margin-left:6px;color:var(--text-light);">总计: {{ record.total }}</span>
              </div>
            </div>
            <div style="font-size:16px;font-weight:900;flex-shrink:0;"
                 :style="{color: record.delta > 0 ? '#4CAF50' : '#F44336'}">
              {{ record.delta > 0 ? '+' : '' }}{{ record.delta }}
            </div>
          </div>

          <button class="btn btn-ghost btn-sm" style="width:100%;margin-top:14px;" @click="showPointsDetail=false">关闭</button>
        </div>
      </div>
    </div>
  `
};

// ---------- 任务页面 ----------
const TaskPage = {
  name: 'TaskPage',
  props: ['student'],
  emits: ['update', 'toast'],
  data() {
    return {
      showSubmitModal: false,
      selectedTask: null,
      submitContent: '',
      filterTab: 'all', // all / pending / completed
      isResubmit: false,  // 是否是重新提交
      detailTask: null,   // 当前查看详情的任务
    };
  },
  computed: {
    tasks() {
      const subs = {};
      Store.state.tasks.forEach(task => {
        const sub = task.submissions.find(s => s.studentId === this.student.id);
        subs[task.id] = sub || null;
      });
      return Store.state.tasks
        .filter(t => t.status === 'active')
        .map(task => ({
          ...task,
          mySubmission: subs[task.id],
          myStatus: subs[task.id] ? subs[task.id].status : 'pending',
        }));
    },
    filteredTasks() {
      if (this.filterTab === 'pending')   return this.tasks.filter(t => t.myStatus === 'pending');
      if (this.filterTab === 'submitted') return this.tasks.filter(t => t.myStatus === 'submitted' || t.myStatus === 'completed');
      return this.tasks;
    },
    stats() {
      const total     = this.tasks.length;
      const done      = this.tasks.filter(t => t.myStatus === 'completed').length;
      const submitted = this.tasks.filter(t => t.myStatus === 'submitted').length;
      const pending   = this.tasks.filter(t => t.myStatus === 'pending').length;
      return { total, done, submitted, pending };
    }
  },
  methods: {
    openSubmit(task) {
      this.selectedTask = task;
      this.submitContent = '';
      this.isResubmit = false;
      this.showSubmitModal = true;
      this.detailTask = null;  // 关闭详情弹窗
    },
    openResubmit(task) {
      this.selectedTask = task;
      this.submitContent = task.mySubmission ? (task.mySubmission.content || '') : '';
      this.isResubmit = true;
      this.showSubmitModal = true;
      this.detailTask = null;  // 关闭详情弹窗
    },
    openDetail(task) {
      this.detailTask = task;
    },
    doSubmit() {
      const content = this.submitContent.trim() || '（已完成）';
      let result;
      if (this.isResubmit) {
        result = Store.resubmitTask(this.selectedTask.id, this.student.id, content);
        if (result.success) {
          this.$emit('toast', `📤 已重新提交，等待老师重新审核！`, 'success');
          this.showSubmitModal = false;
          this.$emit('update');
        } else {
          this.$emit('toast', result.msg, 'error');
        }
      } else {
        result = Store.submitTask(this.selectedTask.id, this.student.id, content);
        if (result.success) {
          this.$emit('toast', `📝 任务已提交，等待老师审核！`, 'success');
          this.showSubmitModal = false;
          this.$emit('update');
        } else {
          this.$emit('toast', result.msg, 'error');
        }
      }
    },
    statusLabel(status) {
      return { pending: '未完成', submitted: '待审核', completed: '已完成', rejected: '未通过' }[status] || '-';
    },
    statusBadge(status) {
      return { pending: 'badge-warning', submitted: 'badge-purple', completed: 'badge-success', rejected: 'badge-danger' }[status] || 'badge-primary';
    },
    statusIcon(status) {
      return { pending: '⏳', submitted: '👁️', completed: '✅', rejected: '❌' }[status] || '📝';
    },
  },
  template: `
    <div class="animate-pageIn">
      <div class="page-title">📋 我的任务</div>

      <!-- Tab筛选 -->
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
        <button v-for="tab in [{k:'all',l:'全部'},{k:'pending',l:'未完成'},{k:'submitted',l:'已提交'}]"
                :key="tab.k" class="btn btn-sm"
                :class="filterTab===tab.k ? 'btn-primary' : 'btn-ghost'"
                @click="filterTab=tab.k">{{ tab.l }}</button>
      </div>

      <!-- 任务列表 -->
      <div v-if="filteredTasks.length === 0" class="empty-state">
        <div class="empty-icon">🎉</div>
        <p>所有任务都完成啦！</p>
      </div>

      <div v-for="task in filteredTasks" :key="task.id" class="task-card" :class="task.myStatus"
           style="cursor:pointer;" @click="openDetail(task)">
        <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;">
          <span style="font-size:28px">{{ task.icon }}</span>
          <div style="flex:1">
            <div class="task-title">{{ task.title }}</div>
            <div class="task-desc">{{ task.desc }}</div>
          </div>
          <span :class="'badge ' + statusBadge(task.myStatus)">
            {{ statusIcon(task.myStatus) }} {{ statusLabel(task.myStatus) }}
          </span>
        </div>
        <div class="task-meta">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <span class="badge badge-primary">{{ task.subject }}</span>
            <span class="task-points">⭐ +{{ task.points }}积分</span>
            <span style="font-size:12px;color:var(--text-light)">⏰ {{ task.deadline }}</span>
          </div>
          <button v-if="task.myStatus === 'pending'" class="btn btn-primary btn-sm"
                  @click.stop="openSubmit(task)">
            📤 提交任务
          </button>
          <!-- 重新提交按钮：仅驳回状态显示 -->
          <button v-if="task.myStatus === 'rejected'" class="btn btn-sm"
                  style="background:linear-gradient(135deg,#FF6B9D,#FF4081);color:white;border:none;"
                  @click.stop="openResubmit(task)">
            🔄 重新提交
          </button>
          <div v-if="task.myStatus === 'submitted'" style="font-size:12px;color:#7C4DFF;font-weight:700;">
            🕐 {{ task.mySubmission.submittedAt }}
          </div>
          <div v-if="task.myStatus === 'completed'" style="font-size:13px;color:#4CAF50;font-weight:700;">
            🎉 获得 +{{ task.points }} 积分！
          </div>
        </div>
      </div>

      <!-- 提交弹窗 -->
      <div v-if="showSubmitModal && selectedTask" class="modal-overlay" @click.self="showSubmitModal=false">
        <div class="modal-box">
          <h3 style="font-size:18px;font-weight:800;margin-bottom:6px;">
            {{ selectedTask.icon }} {{ selectedTask.title }}
          </h3>
          <!-- 重新提交时的提示 -->
          <div v-if="isResubmit" style="background:#FFF3E0;border-radius:10px;padding:10px 12px;margin-bottom:10px;
                font-size:13px;color:#E65100;display:flex;align-items:center;gap:8px;">
            <span style="font-size:18px;">🔄</span>
            <span>老师已驳回上一次提交，请修改后重新提交给老师审核</span>
          </div>
          <p style="font-size:13px;color:var(--text-light);margin-bottom:16px;">{{ selectedTask.desc }}</p>
          <div class="input-group">
            <label>提交内容/说明 <span style="font-size:11px;color:var(--text-light);font-weight:400;">（选填）</span></label>
            <textarea class="input-field" v-model="submitContent" rows="4"
                      :placeholder="isResubmit ? '请说明修改了什么，或重新描述完成情况...' : '可描述完成情况，或粘贴作品链接，也可直接提交...'"></textarea>
          </div>
          <div style="display:flex;gap:10px;">
            <button class="btn btn-ghost" style="flex:1" @click="showSubmitModal=false">取消</button>
            <button class="btn btn-primary" style="flex:2" @click="doSubmit">
              {{ isResubmit ? '🔄 重新提交' : '📤 提交任务' }}
            </button>
          </div>
          <div style="margin-top:10px;font-size:12px;color:var(--text-light);text-align:center;">
            完成后获得 ⭐ {{ selectedTask.points }} 积分 → 宠物成长加速！
          </div>
        </div>
      </div>

      <!-- 任务详情弹窗 -->
      <div v-if="detailTask" class="modal-overlay" @click.self="detailTask=null">
        <div class="modal-box" style="max-height:85vh;overflow-y:auto;padding:0;border-radius:20px;">

          <!-- 顶部彩色Header -->
          <div :style="{
            background: detailTask.myStatus==='completed' ? 'linear-gradient(135deg,#43A047,#66BB6A)'
                      : detailTask.myStatus==='submitted' ? 'linear-gradient(135deg,#5E35B1,#7C4DFF)'
                      : detailTask.myStatus==='rejected'  ? 'linear-gradient(135deg,#E53935,#FF5252)'
                      : 'linear-gradient(135deg,#FF6B9D,#7C4DFF)',
            padding: '24px 20px 20px',
            borderRadius: '20px 20px 0 0',
            color: 'white',
            position: 'relative'
          }">
            <!-- 关闭按钮 -->
            <div @click="detailTask=null"
                 style="position:absolute;top:14px;right:14px;width:28px;height:28px;border-radius:50%;
                        background:rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;
                        cursor:pointer;font-size:16px;font-weight:700;">✕</div>
            <!-- 图标 + 标题 -->
            <div style="display:flex;align-items:center;gap:14px;margin-bottom:10px;">
              <div style="font-size:48px;line-height:1;">{{ detailTask.icon }}</div>
              <div>
                <div style="font-size:20px;font-weight:900;line-height:1.3;">{{ detailTask.title }}</div>
                <div style="font-size:13px;opacity:0.85;margin-top:4px;">
                  <span style="background:rgba(255,255,255,0.2);padding:3px 10px;border-radius:50px;margin-right:6px;">{{ detailTask.subject }}</span>
                  <span :class="'badge ' + statusBadge(detailTask.myStatus)" style="font-size:12px;">
                    {{ statusIcon(detailTask.myStatus) }} {{ statusLabel(detailTask.myStatus) }}
                  </span>
                </div>
              </div>
            </div>
            <!-- 积分 + 截止 -->
            <div style="display:flex;gap:12px;margin-top:6px;">
              <div style="background:rgba(255,255,255,0.18);border-radius:50px;padding:5px 14px;font-size:14px;font-weight:800;">
                ⭐ +{{ detailTask.points }} 积分
              </div>
              <div style="background:rgba(255,255,255,0.18);border-radius:50px;padding:5px 14px;font-size:13px;" v-if="detailTask.deadline">
                ⏰ {{ detailTask.deadline }}
              </div>
            </div>
          </div>

          <!-- 主体内容 -->
          <div style="padding:20px;">

            <!-- 任务描述 -->
            <div style="margin-bottom:16px;">
              <div style="font-size:13px;font-weight:800;color:var(--text-mid);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">📋 任务描述</div>
              <div style="font-size:14px;color:var(--text-dark);line-height:1.7;background:var(--bg-card);
                          border-radius:12px;padding:14px;border:1px solid var(--border);">
                {{ detailTask.desc }}
              </div>
            </div>

            <!-- 我的提交记录（已提交/已完成/被驳回时显示） -->
            <div v-if="detailTask.mySubmission && detailTask.myStatus !== 'pending'" style="margin-bottom:16px;">
              <div style="font-size:13px;font-weight:800;color:var(--text-mid);margin-bottom:6px;">📤 我的提交记录</div>
              <div style="background:var(--bg-card);border-radius:12px;padding:14px;border:1px solid var(--border);">
                <div style="font-size:13px;color:var(--text-dark);line-height:1.6;white-space:pre-wrap;word-break:break-all;">
                  {{ detailTask.mySubmission.content || '（无提交内容）' }}
                </div>
                <div style="margin-top:8px;font-size:11px;color:var(--text-light);display:flex;gap:14px;flex-wrap:wrap;">
                  <span>🕐 提交时间：{{ detailTask.mySubmission.submittedAt }}</span>
                  <span v-if="detailTask.mySubmission.reviewedAt">✅ 审核时间：{{ detailTask.mySubmission.reviewedAt }}</span>
                  <span v-if="detailTask.mySubmission.resubmitted" style="color:#FF9800;">🔄 曾重新提交</span>
                </div>
              </div>
            </div>

            <!-- 状态提示卡 -->
            <div v-if="detailTask.myStatus==='completed'"
                 style="background:linear-gradient(135deg,#E8F5E9,#F1F8E9);border:1.5px solid #A5D6A7;
                        border-radius:14px;padding:14px;margin-bottom:16px;display:flex;align-items:center;gap:12px;">
              <span style="font-size:32px;">🎉</span>
              <div>
                <div style="font-weight:800;color:#2E7D32;font-size:15px;">任务已通过！</div>
                <div style="font-size:13px;color:#388E3C;margin-top:2px;">获得 +{{ detailTask.points }} 积分，宠物经验 +{{ Math.round(detailTask.points * 0.5) }}</div>
              </div>
            </div>

            <div v-if="detailTask.myStatus==='submitted'"
                 style="background:linear-gradient(135deg,#EDE7F6,#F3E5F5);border:1.5px solid #CE93D8;
                        border-radius:14px;padding:14px;margin-bottom:16px;display:flex;align-items:center;gap:12px;">
              <span style="font-size:32px;">👁️</span>
              <div>
                <div style="font-weight:800;color:#4527A0;font-size:15px;">等待老师审核中</div>
                <div style="font-size:13px;color:#6A1B9A;margin-top:2px;">老师审核通过后积分将立即到账</div>
              </div>
            </div>

            <div v-if="detailTask.myStatus==='rejected'"
                 style="background:linear-gradient(135deg,#FFEBEE,#FFF3E0);border:1.5px solid #FFAB91;
                        border-radius:14px;padding:14px;margin-bottom:16px;display:flex;align-items:center;gap:12px;">
              <span style="font-size:32px;">❌</span>
              <div>
                <div style="font-weight:800;color:#B71C1C;font-size:15px;">提交未通过</div>
                <div style="font-size:13px;color:#C62828;margin-top:2px;">请修改后重新提交，继续加油！</div>
              </div>
            </div>

            <!-- 底部操作按钮 -->
            <div style="display:flex;gap:10px;margin-top:4px;">
              <button class="btn btn-ghost" style="flex:1;" @click="detailTask=null">关闭</button>
              <button v-if="detailTask.myStatus==='pending'" class="btn btn-primary" style="flex:2;"
                      @click="openSubmit(detailTask)">
                📤 提交任务
              </button>
              <button v-if="detailTask.myStatus==='rejected'" class="btn btn-sm" style="flex:2;
                      background:linear-gradient(135deg,#FF6B9D,#FF4081);color:white;border:none;border-radius:12px;font-size:14px;"
                      @click="openResubmit(detailTask)">
                🔄 重新提交
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  `
};

// ---------- 排行榜页面 ----------
const RankPage = {
  name: 'RankPage',
  props: ['student'],
  computed: {
    rankList() {
      return [...Store.state.students]
        .sort((a, b) => (b.points || 0) - (a.points || 0))
        .map((s, i) => ({
          ...s,
          rank: i + 1,
          petEmoji: getStudentPetEmoji(s),
          levelInfo: getLevelInfo(s.petExp || 0),
        }));
    },
    myRank() {
      return this.rankList.findIndex(s => s.id === this.student.id) + 1;
    }
  },
  template: `
    <div class="animate-pageIn">
      <div class="page-title">🏆 班级排行榜</div>

      <!-- 我的排名 -->
      <div class="card" style="padding:16px;margin-bottom:20px;background:linear-gradient(135deg,#FF6B9D,#7C4DFF);color:white;border:none;">
        <div style="display:flex;align-items:center;gap:14px;">
          <div style="font-size:40px;">{{ getStudentPetEmoji(student) }}</div>
          <div style="flex:1">
            <div style="font-size:18px;font-weight:800;">{{ student.name }} 的排名</div>
            <div style="font-size:14px;opacity:0.85;">⭐ {{ student.points }} 积分</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:40px;font-weight:900;line-height:1;">#{{ myRank }}</div>
            <div style="font-size:12px;opacity:0.8;">当前排名</div>
          </div>
        </div>
      </div>

      <!-- 前三名特殊展示 -->
      <div style="display:flex;gap:10px;margin-bottom:20px;align-items:flex-end;">
        <div v-if="rankList[1]" class="rank-podium rank-2nd" style="flex:1;order:1">
          <div style="font-size:40px;text-align:center">{{ rankList[1].petEmoji }}</div>
          <div style="text-align:center;font-weight:800;font-size:13px;">{{ rankList[1].name }}</div>
          <div style="background:linear-gradient(135deg,#B0BEC5,#78909C);color:white;padding:10px;border-radius:10px 10px 0 0;text-align:center;">
            <div style="font-size:20px;font-weight:900;">🥈 #2</div>
            <div style="font-size:12px;">{{ rankList[1].points }}分</div>
          </div>
        </div>
        <div v-if="rankList[0]" class="rank-podium rank-1st" style="flex:1;order:2">
          <div style="font-size:50px;text-align:center">{{ rankList[0].petEmoji }}</div>
          <div style="text-align:center;font-weight:800;font-size:14px;">{{ rankList[0].name }}</div>
          <div style="background:linear-gradient(135deg,#FFD700,#FFA000);color:white;padding:14px;border-radius:10px 10px 0 0;text-align:center;">
            <div style="font-size:24px;font-weight:900;">👑 #1</div>
            <div style="font-size:13px;">{{ rankList[0].points }}分</div>
          </div>
        </div>
        <div v-if="rankList[2]" class="rank-podium rank-3rd" style="flex:1;order:3">
          <div style="font-size:36px;text-align:center">{{ rankList[2].petEmoji }}</div>
          <div style="text-align:center;font-weight:800;font-size:12px;">{{ rankList[2].name }}</div>
          <div style="background:linear-gradient(135deg,#FFAB76,#E64A19);color:white;padding:8px;border-radius:10px 10px 0 0;text-align:center;">
            <div style="font-size:18px;font-weight:900;">🥉 #3</div>
            <div style="font-size:12px;">{{ rankList[2].points }}分</div>
          </div>
        </div>
      </div>

      <!-- 完整排名 -->
      <div v-for="s in rankList" :key="s.id" class="rank-item"
           :style="s.id === student.id ? 'border-color:var(--primary);background:#FFF0F8;' : ''">
        <div class="rank-num" :class="s.rank<=3 ? 'rank-'+s.rank : 'rank-other'">
          {{ s.rank <= 3 ? ['👑','🥈','🥉'][s.rank-1] : s.rank }}
        </div>
        <div class="rank-pet">{{ s.petEmoji }}</div>
        <div class="rank-info">
          <div class="rank-name">
            {{ s.name }}
            <span v-if="s.id === student.id" style="font-size:11px;color:var(--primary);"> (我)</span>
          </div>
          <div class="rank-detail">Lv.{{ s.levelInfo.level }} {{ s.levelInfo.name }} · {{ s.class }}</div>
        </div>
        <div class="rank-points">⭐{{ s.points }}</div>
      </div>
    </div>
  `,
  methods: { getStudentPetEmoji }
};

// ---------- 背包页面 ----------
const BackpackPage = {
  name: 'BackpackPage',
  props: ['student'],
  emits: ['update', 'toast'],
  data() {
    return {
      filterType: 'all',
      showItemInfo: null,
    };
  },
  computed: {
    allItems() {
      const bp = this.student.backpack || {};
      return ITEMS.map(item => ({
        ...item,
        count: bp[item.id] || 0,
        owned: (bp[item.id] || 0) > 0,
      }));
    },
    filteredItems() {
      if (this.filterType === 'all') return this.allItems;
      return this.allItems.filter(i => i.type === this.filterType);
    },
    tabs() {
      return [
        { k: 'all',     l: '全部', icon: '🎒' },
        { k: 'food',    l: '食物', icon: '🍎' },
        { k: 'clean',   l: '清洁', icon: '🛁' },
        { k: 'toy',     l: '玩具', icon: '⚽' },
        { k: 'heal',    l: '医疗', icon: '💊' },
        { k: 'special', l: '特殊', icon: '⭐' },
      ];
    },
  },
  methods: {
    useItemDirect(item) {
      if (!item.owned) return;
      const result = Store.useItem(this.student.id, item.id);
      if (result.success) {
        this.$emit('toast', `使用了 ${item.emoji}${item.name}！`, 'success');
        this.$emit('update');
        if (result.levelUp) {
          this.$emit('toast', `🎉 宠物升级了！Lv.${result.newStage}`, 'success');
        }
      } else {
        this.$emit('toast', result.msg, 'error');
      }
      this.showItemInfo = null;
    },
  },
  template: `
    <div class="animate-pageIn">
      <div class="page-title">🎒 我的背包</div>

      <!-- 道具类型筛选 -->
      <div style="display:flex;gap:6px;margin-bottom:16px;overflow-x:auto;padding-bottom:4px;">
        <button v-for="tab in tabs" :key="tab.k" class="btn btn-sm"
                :class="filterType===tab.k ? 'btn-primary' : 'btn-ghost'"
                @click="filterType=tab.k" style="white-space:nowrap;">
          {{ tab.icon }} {{ tab.l }}
        </button>
      </div>

      <!-- 背包格子 -->
      <div class="backpack-grid">
        <div v-for="item in filteredItems" :key="item.id"
             class="backpack-item" :class="{empty: !item.owned}"
             @click="item.owned && (showItemInfo = item)">
          <span class="item-icon">{{ item.emoji }}</span>
          <span class="item-name">{{ item.name }}</span>
          <span v-if="item.owned" class="item-count">{{ item.count }}</span>
          <div v-if="!item.owned" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(240,230,255,0.6);border-radius:12px;">
            <span style="font-size:20px;opacity:0.4;">🔒</span>
          </div>
        </div>
      </div>

      <!-- 道具详情弹窗 -->
      <div v-if="showItemInfo" class="modal-overlay" @click.self="showItemInfo=null">
        <div class="modal-box" style="text-align:center;">
          <div style="font-size:72px;margin-bottom:8px;">{{ showItemInfo.emoji }}</div>
          <h3 style="font-size:22px;font-weight:800;color:var(--text-dark);margin-bottom:6px;">{{ showItemInfo.name }}</h3>
          <p style="font-size:14px;color:var(--text-mid);margin-bottom:16px;">{{ showItemInfo.desc }}</p>
          <div style="background:#F8F0FF;border-radius:14px;padding:14px;margin-bottom:16px;text-align:left;">
            <div style="font-size:13px;font-weight:700;color:var(--text-mid);margin-bottom:8px;">📊 使用效果</div>
            <div v-for="(v, k) in showItemInfo.effect" :key="k" style="font-size:13px;color:var(--text-dark);margin-bottom:4px;">
              {{ {hungry:'🍗 饱食度',health:'❤️ 生命值',happy:'😊 心情值',clean:'🛁 清洁度',exp:'✨ 经验值'}[k] || k }}
              <span :style="{color: v>0 ? '#4CAF50' : '#F44336'}">{{ v > 0 ? '+' : '' }}{{ v }}</span>
            </div>
          </div>
          <div style="display:flex;gap:10px;">
            <button class="btn btn-ghost" style="flex:1" @click="showItemInfo=null">关闭</button>
            <button class="btn btn-primary" style="flex:2" @click="useItemDirect(showItemInfo)">
              🎯 使用 (剩余×{{ showItemInfo.count }})
            </button>
          </div>
        </div>
      </div>
    </div>
  `
};

// ---------- 孵化页面（新用户） ----------
const HatchPage = {
  name: 'HatchPage',
  props: ['student'],
  emits: ['update', 'toast', 'hatch-done'],
  data() {
    return {
      step: 1,          // 1:选宠物 2:命名 3:孵化动画 4:完成
      selectedType: null,
      petName: '',
      hatching: false,
    };
  },
  computed: {
    petTypes() { return PET_TYPES; },
    selectedPetType() {
      return PET_TYPES.find(p => p.id === this.selectedType);
    }
  },
  methods: {
    selectPet(typeId) {
      this.selectedType = typeId;
    },
    async startHatch() {
      if (!this.selectedType) { this.$emit('toast','请先选择一个宠物！','warning'); return; }
      const name = this.petName.trim() || this.selectedPetType.name;
      this.step = 3;
      this.hatching = true;
      await new Promise(r => setTimeout(r, 2500));
      Store.adoptPet(this.student.id, this.selectedType, name);
      this.hatching = false;
      this.step = 4;
    },
    finish() {
      // 先刷新数据，再通知父组件孵化完成跳转
      this.$emit('update');
      this.$emit('hatch-done');
    }
  },
  template: `
    <div class="animate-pageIn" style="padding:20px;text-align:center;">
      <!-- 步骤1：选宠物 -->
      <div v-if="step===1">
        <div style="font-size:56px;margin-bottom:12px;">🥚</div>
        <h2 style="font-size:22px;font-weight:900;color:var(--text-dark);margin-bottom:6px;">领取你的宠物蛋</h2>
        <p style="color:var(--text-light);font-size:14px;margin-bottom:24px;">选择你最喜欢的宠物吧！完成学习任务帮助它成长～</p>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px;">
          <div v-for="pet in petTypes" :key="pet.id"
               class="card" style="padding:16px;cursor:pointer;transition:all 0.3s;"
               :style="selectedType===pet.id ? 'border-color:var(--primary);background:#FFF0F8;transform:scale(1.05)' : ''"
               @click="selectPet(pet.id)">
            <div style="font-size:40px;margin-bottom:6px;">{{ pet.stages[2] }}</div>
            <div style="font-size:13px;font-weight:700;color:var(--text-dark);">{{ pet.name }}</div>
            <div v-if="selectedType===pet.id" style="color:var(--primary);font-size:16px;margin-top:4px;">✓</div>
          </div>
        </div>
        <button class="btn btn-primary btn-lg" style="width:100%;max-width:300px" @click="step=2" :disabled="!selectedType">
          下一步：给宠物起名 →
        </button>
      </div>

      <!-- 步骤2：命名 -->
      <div v-if="step===2">
        <div style="font-size:72px;margin-bottom:12px;animation:petFloat 3s ease-in-out infinite;">
          {{ selectedPetType && selectedPetType.stages[2] }}
        </div>
        <h2 style="font-size:22px;font-weight:900;color:var(--text-dark);margin-bottom:6px;">给你的宠物起个名字</h2>
        <p style="color:var(--text-light);font-size:14px;margin-bottom:20px;">一个好名字会让它更有活力！</p>
        <div class="input-group" style="max-width:300px;margin:0 auto 20px;">
          <input class="input-field" v-model="petName" :placeholder="selectedPetType && selectedPetType.name"
                 maxlength="10" style="text-align:center;font-size:18px;font-weight:700;" />
        </div>
        <div style="display:flex;gap:10px;justify-content:center;">
          <button class="btn btn-ghost" @click="step=1">← 重新选择</button>
          <button class="btn btn-primary btn-lg" @click="startHatch">🥚 开始孵化！</button>
        </div>
      </div>

      <!-- 步骤3：孵化动画 -->
      <div v-if="step===3">
        <div style="padding:40px 0">
          <div style="font-size:120px;animation:hatch 2.5s ease-in-out infinite;display:block;margin:0 auto;">🥚</div>
          <div style="font-size:18px;font-weight:700;color:var(--primary);margin-top:20px;" class="animate-blink">✨ 正在孵化中... ✨</div>
          <p style="color:var(--text-light);font-size:14px;margin-top:8px;">宠物即将破壳而出！</p>
        </div>
      </div>

      <!-- 步骤4：孵化完成 -->
      <div v-if="step===4">
        <div style="font-size:100px;margin-bottom:12px;animation:levelUp 1s ease;">
          {{ selectedPetType && selectedPetType.stages[1] }}
        </div>
        <div style="background:linear-gradient(135deg,#FF6B9D,#7C4DFF);color:white;border-radius:20px;padding:20px;margin-bottom:20px;">
          <div style="font-size:24px;font-weight:900;margin-bottom:6px;">🎉 孵化成功！</div>
          <div style="font-size:16px;opacity:0.9;">「{{ petName || selectedPetType.name }}」已经破壳而出</div>
          <div style="font-size:13px;opacity:0.75;margin-top:6px;">完成学习任务，帮助它快速成长吧！</div>
        </div>
        <button class="btn btn-primary btn-lg" style="width:100%;max-width:300px" @click="finish">
          🌟 开始冒险！→
        </button>
      </div>
    </div>
  `
};

// ---------- 学生主页 ----------
const StudentHomePage = {
  name: 'StudentHomePage',
  props: ['student'],
  computed: {
    todayTasks() {
      return Store.state.tasks
        .filter(t => t.status === 'active')
        .map(task => ({
          ...task,
          myStatus: (task.submissions.find(s => s.studentId === this.student.id) || {}).status || 'pending',
        }))
        .slice(0, 3);
    },
    completedCount() {
      return this.todayTasks.filter(t => t.myStatus === 'completed').length;
    },
    petEmoji() { return getStudentPetEmoji(this.student); },
    levelInfo() { return getLevelInfo(this.student.petExp || 0); },
    expPercent() { return getExpPercent(this.student.petExp || 0); },
    rankIndex() {
      const sorted = [...Store.state.students].sort((a,b) => (b.points||0) - (a.points||0));
      return sorted.findIndex(s => s.id === this.student.id) + 1;
    },
    greeting() {
      const h = new Date().getHours();
      if (h < 6)  return '夜猫子！';
      if (h < 12) return '早上好！';
      if (h < 14) return '中午好！';
      if (h < 18) return '下午好！';
      return '晚上好！';
    },
  },
  template: `
    <div class="animate-pageIn">
      <!-- 欢迎横幅 -->
      <div class="card" style="padding:20px;margin-bottom:16px;background:linear-gradient(135deg,#FF6B9D,#7C4DFF);color:white;border:none;">
        <div style="display:flex;align-items:center;gap:16px;">
          <div style="font-size:56px;animation:petFloat 3s ease-in-out infinite;">{{ petEmoji }}</div>
          <div style="flex:1">
            <div style="font-size:20px;font-weight:900;">{{ greeting }} {{ student.name }}！</div>
            <div style="font-size:13px;opacity:0.85;margin-top:3px;">{{ student.petName }} 在等你回来玩～</div>
            <div style="display:flex;align-items:center;gap:8px;margin-top:8px;">
              <div style="background:rgba(255,255,255,0.2);padding:4px 12px;border-radius:50px;font-size:13px;font-weight:700;">
                ⭐ {{ student.points }} 积分
              </div>
              <div style="background:rgba(255,255,255,0.2);padding:4px 12px;border-radius:50px;font-size:13px;font-weight:700;">
                🏆 第 {{ rankIndex }} 名
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 宠物状态快览 -->
      <div class="card" style="padding:16px;margin-bottom:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <div style="font-weight:800;font-size:16px;">🐾 宠物状态</div>
          <span class="badge badge-primary">Lv.{{ levelInfo.level }} {{ levelInfo.name }}</span>
        </div>
        <div class="progress-bar" style="margin-bottom:8px;">
          <div class="progress-fill progress-exp" :style="{width:expPercent+'%'}"></div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px;">
          <div v-for="bar in statusBars" :key="bar.key" style="text-align:center;">
            <div style="font-size:18px;">{{ bar.icon }}</div>
            <div style="font-size:11px;font-weight:700;margin-top:2px;" :style="{color:getStatusColor(bar.value)}">{{ bar.value }}</div>
            <div style="font-size:10px;color:var(--text-light)">{{ bar.label }}</div>
          </div>
        </div>
      </div>

      <!-- 今日任务 -->
      <div class="card" style="padding:16px;margin-bottom:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <div style="font-weight:800;font-size:16px;">📋 今日任务</div>
          <span class="badge badge-success">{{ completedCount }}/{{ todayTasks.length }} 完成</span>
        </div>
        <div v-if="todayTasks.length === 0" style="text-align:center;color:var(--text-light);padding:20px;font-size:14px;">
          🎉 暂无任务，好好休息吧！
        </div>
        <div v-for="task in todayTasks" :key="task.id"
             style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);">
          <span style="font-size:22px">{{ task.icon }}</span>
          <div style="flex:1;">
            <div style="font-size:14px;font-weight:700;color:var(--text-dark);">{{ task.title }}</div>
            <div style="font-size:11px;color:var(--warning);font-weight:600;">⭐ +{{ task.points }}积分</div>
          </div>
          <span :class="'badge ' + {pending:'badge-warning',submitted:'badge-purple',completed:'badge-success'}[task.myStatus]">
            {{ {pending:'未完成',submitted:'审核中',completed:'✅'}[task.myStatus] }}
          </span>
        </div>
      </div>

      <!-- 快捷操作 -->
      <div style="font-weight:800;font-size:16px;margin-bottom:10px;">⚡ 快捷功能</div>
      <div class="grid-2" style="gap:10px;">
        <div class="card" style="padding:16px;cursor:pointer;text-align:center;" @click="$emit('nav','task')">
          <div style="font-size:36px;">📋</div>
          <div style="font-weight:700;margin-top:6px;">完成任务</div>
          <div style="font-size:12px;color:var(--text-light)">获取积分让宠物成长</div>
        </div>
        <div class="card" style="padding:16px;cursor:pointer;text-align:center;" @click="$emit('nav','rank')">
          <div style="font-size:36px;">🏆</div>
          <div style="font-weight:700;margin-top:6px;">查看排行</div>
          <div style="font-size:12px;color:var(--text-light)">看看你在第几名</div>
        </div>
        <div class="card" style="padding:16px;cursor:pointer;text-align:center;grid-column:span 2;"
             @click="$emit('nav','pet'); $emit('open-points-detail')">
          <div style="font-size:36px;">⭐</div>
          <div style="font-weight:700;margin-top:6px;">积分明细</div>
          <div style="font-size:12px;color:var(--text-light)">查看积分获取/扣分记录</div>
        </div>
      </div>
    </div>
  `,
  emits: ['nav', 'open-points-detail'],
  computed: {
    todayTasks() {
      return Store.state.tasks
        .filter(t => t.status === 'active')
        .map(task => ({
          ...task,
          myStatus: (task.submissions.find(s => s.studentId === this.student.id) || {}).status || 'pending',
        }))
        .slice(0, 3);
    },
    completedCount() {
      return this.todayTasks.filter(t => t.myStatus === 'completed').length;
    },
    petEmoji() { return getStudentPetEmoji(this.student); },
    levelInfo() { return getLevelInfo(this.student.petExp || 0); },
    expPercent() { return getExpPercent(this.student.petExp || 0); },
    rankIndex() {
      const sorted = [...Store.state.students].sort((a,b) => (b.points||0) - (a.points||0));
      return sorted.findIndex(s => s.id === this.student.id) + 1;
    },
    greeting() {
      const h = new Date().getHours();
      if (h < 6)  return '夜猫子！';
      if (h < 12) return '早上好！';
      if (h < 14) return '中午好！';
      if (h < 18) return '下午好！';
      return '晚上好！';
    },
    statusBars() {
      const s = this.student.petStatus || {};
      return [
        { key:'health', icon:'❤️',  label:'生命', value: s.health||0 },
        { key:'hungry', icon:'🍗',  label:'饱食', value: s.hungry||0 },
        { key:'happy',  icon:'😊',  label:'心情', value: s.happy||0  },
        { key:'clean',  icon:'🛁',  label:'清洁', value: s.clean||0  },
      ];
    },
  },
  methods: {
    getStatusColor(value) {
      if (value >= 70) return '#4CAF50';
      if (value >= 40) return '#FF9800';
      return '#F44336';
    },
  }
};

// ---------- 学生端总容器 ----------
const StudentApp = {
  name: 'StudentApp',
  props: ['user'],
  emits: ['logout'],
  data() {
    return {
      currentTab: 'home',
      showLevelUp: false,
      levelUpStage: 0,
      studentData: null,   // 本地副本，驱动响应式
      tickInterval: null,
      showAvatarMenu: false,      // 头像弹出菜单
      showPointsNotify: false,    // 积分到账弹窗
      pointsNotifyData: null,     // { delta, reason, total }
      showGlobalPointsDetail: false,  // 全局积分明细弹窗（从主页快捷入口打开）
      showPetDeadNotify: false,       // 宠物死亡通知弹窗
      petDeadInfo: null,              // { daysMissed, lostPoints }
      showPenaltyNotify: false,       // 离线惩罚通知弹窗
      penaltyInfo: null,              // { daysMissed, expPenalty, hpPenalty }
    };
  },
  computed: {
    // 优先用本地副本（响应式），兜底 Store
    student() {
      return this.studentData || Store.state.students.find(s => s.id === this.user.id);
    },
    hasPet() {
      // 用 studentData 驱动，确保 adoptPet 后立即响应
      return !!(this.studentData && this.studentData.petType);
    },
    navItems() {
      return [
        { key: 'home',    icon: '🏠', label: '主页'  },
        { key: 'pet',     icon: '🐾', label: '宠物'  },
        { key: 'task',    icon: '📋', label: '任务'  },
        { key: 'rank',    icon: '🏆', label: '排行'  },
        { key: 'backpack',icon: '🎒', label: '背包'  },
      ];
    },
    globalPointsHistory() {
      const s = this.student;
      if (!s) return [];
      const raw = Store.state.students.find(st => st.id === s.id);
      if (raw && raw.pointsLog && raw.pointsLog.length > 0) {
        return [...raw.pointsLog].reverse();
      }
      // 兜底
      const list = [];
      Store.state.tasks.forEach(task => {
        const sub = task.submissions.find(su => su.studentId === s.id);
        if (sub && sub.status === 'completed') {
          list.push({
            icon: task.icon,
            label: `完成任务「${task.title}」`,
            delta: task.points,
            time: sub.reviewedAt || sub.submittedAt || '',
          });
        }
      });
      return list.reverse();
    },
  },
  mounted() {
    this.refreshStudent();
    this.startTick();
    this.startPointsWatch();  // 监听积分变化
    // 登录后检测离线惩罚（延迟500ms等数据就绪）
    setTimeout(() => this.runDailyPenaltyCheck(), 500);
  },
  beforeUnmount() {
    if (this.tickInterval) clearInterval(this.tickInterval);
    if (this.pointsWatchTimer) clearInterval(this.pointsWatchTimer);
  },
  template: `
    <div style="min-height:100vh;background:var(--bg-main);" @click="showAvatarMenu=false">
      <!-- 顶部导航 -->
      <div class="topbar">
        <div class="topbar-logo">
          <span class="logo-icon">🐾</span>
          <span>课堂宠物</span>
        </div>
        <div class="topbar-right">
          <!-- 头像 + 下拉菜单 -->
          <div style="position:relative;" @click.stop>
            <div class="topbar-avatar" @click="showAvatarMenu=!showAvatarMenu" title="账户菜单"
                 :style="showAvatarMenu ? 'box-shadow:0 0 0 3px var(--primary);' : ''">
              {{ (student && student.name && student.name[0]) || '👤' }}
            </div>
            <!-- 下拉菜单 -->
            <transition name="fade">
              <div v-if="showAvatarMenu" class="avatar-dropdown">
                <div class="avatar-menu-header">
                  <div style="font-size:28px;font-weight:900;color:var(--primary);">
                    {{ (student && student.name && student.name[0]) || '👤' }}
                  </div>
                  <div>
                    <div style="font-size:14px;font-weight:800;color:var(--text-dark);">{{ student && student.name }}</div>
                    <div style="font-size:12px;color:var(--text-light);">{{ student && student.class }}</div>
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
        <!-- 未领宠物时 -->
        <template v-if="!hasPet">
          <hatch-page :student="student" @update="onUpdate" @toast="onToast" @hatch-done="onHatchDone"></hatch-page>
        </template>
        <!-- 已领宠物 -->
        <template v-else>
          <student-home-page v-if="currentTab==='home'" :student="student" @nav="navTo" @open-points-detail="showGlobalPointsDetail=true"></student-home-page>
          <pet-page         v-if="currentTab==='pet'"     :student="student" @update="onUpdate" @toast="onToast" @level-up="onLevelUp"></pet-page>
          <task-page        v-if="currentTab==='task'"    :student="student" @update="onUpdate" @toast="onToast"></task-page>
          <rank-page        v-if="currentTab==='rank'"    :student="student"></rank-page>
          <backpack-page    v-if="currentTab==='backpack'" :student="student" @update="onUpdate" @toast="onToast"></backpack-page>
        </template>
      </div>

      <!-- 底部导航 -->
      <div class="bottom-nav" v-if="hasPet">
        <div v-for="item in navItems" :key="item.key" class="nav-item"
             :class="{active: currentTab===item.key}" @click="navTo(item.key)">
          <span class="nav-icon">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </div>
      </div>

      <!-- 等级提升横幅 -->
      <div v-if="showLevelUp" class="level-up-banner">
        <div class="level-up-title">🎉 宠物升级！</div>
        <div class="level-up-sub">{{ student && student.petName }} 已成长到 Lv.{{ levelUpStage }}！</div>
        <div style="font-size:60px;margin-top:10px;">{{ student && getStudentPetEmoji(student) }}</div>
      </div>

      <!-- 💔 宠物死亡弹窗 -->
      <div v-if="showPetDeadNotify" class="modal-overlay" style="z-index:9999;background:rgba(0,0,0,0.75);"
           @click.self="showPetDeadNotify=false">
        <div class="modal-box" style="text-align:center;max-width:320px;padding:32px 24px;">
          <div style="font-size:64px;margin-bottom:8px;animation:petFloat 2s ease-in-out infinite;">🥚</div>
          <div style="font-size:20px;font-weight:900;color:#E53935;margin-bottom:8px;">宠物离开了...</div>
          <div style="font-size:14px;color:var(--text-mid);line-height:1.6;margin-bottom:12px;">
            已经 <strong>{{ petDeadInfo && petDeadInfo.daysMissed }} 天</strong> 没有喂食了<br>
            宠物回归成了一颗蛋 😢<br>
            <span style="color:#F44336;">你的积分全部清零了</span>
          </div>
          <div style="background:#FFF3E0;border-radius:12px;padding:12px;margin-bottom:16px;font-size:13px;color:#E65100;">
            💡 每天用食物道具喂食它，累计喂 <strong>3 次</strong>就能重新孵化！
          </div>
          <button class="btn btn-primary" style="width:100%;" @click="showPetDeadNotify=false;navTo('pet')">
            去喂食孵化宠物 🥚
          </button>
        </div>
      </div>

      <!-- ⚠️ 离线惩罚通知（未死亡） -->
      <transition name="slide-up">
        <div v-if="showPenaltyNotify && penaltyInfo" class="points-notify-popup"
             style="background:linear-gradient(135deg,#FF6F00,#E65100);"
             @click="showPenaltyNotify=false">
          <div class="points-notify-inner">
            <div style="font-size:36px;margin-bottom:4px;">⚠️</div>
            <div style="font-size:16px;font-weight:900;color:white;margin-bottom:4px;">
              宠物饿了 {{ penaltyInfo.daysMissed }} 天
            </div>
            <div style="font-size:13px;color:rgba(255,255,255,0.9);line-height:1.6;">
              经验 -{{ penaltyInfo.expPenalty }}  生命 -{{ penaltyInfo.hpPenalty }}<br>
              快去喂食，别让它饿坏了！
            </div>
            <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:8px;">点击关闭</div>
          </div>
        </div>
      </transition>

      <!-- 积分到账弹窗 -->
      <transition name="slide-up">
        <div v-if="showPointsNotify && pointsNotifyData" class="points-notify-popup" @click="showPointsNotify=false">
          <div class="points-notify-inner">
            <div style="font-size:36px;margin-bottom:4px;">
              {{ pointsNotifyData.delta > 0 ? '🎉' : '😢' }}
            </div>
            <div style="font-size:18px;font-weight:900;color:var(--text-dark);margin-bottom:4px;">
              {{ pointsNotifyData.delta > 0 ? '积分到账！' : '积分扣除！' }}
            </div>
            <div style="font-size:28px;font-weight:900;"
                 :style="{color: pointsNotifyData.delta > 0 ? '#FF9800' : '#F44336'}">
              {{ pointsNotifyData.delta > 0 ? '+' : '' }}{{ pointsNotifyData.delta }} 积分
            </div>
            <div style="font-size:13px;color:var(--text-mid);margin-top:6px;">
              {{ pointsNotifyData.reason }}
            </div>
            <div style="font-size:12px;color:var(--text-light);margin-top:4px;">
              当前总积分：⭐ {{ pointsNotifyData.total }}
            </div>
            <div style="font-size:11px;color:var(--text-light);margin-top:8px;">点击关闭</div>
          </div>
        </div>
      </transition>

      <!-- 全局积分明细弹窗（从主页快捷功能入口打开） -->
      <div v-if="showGlobalPointsDetail" class="modal-overlay" @click.self="showGlobalPointsDetail=false"
           style="z-index:3000;">
        <div class="modal-box" style="max-height:80vh;overflow-y:auto;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <h3 style="font-size:18px;font-weight:800;color:var(--text-dark);">⭐ 积分明细</h3>
            <div style="font-size:22px;font-weight:900;color:#E65100;">{{ student && (student.points || 0) }} 分</div>
          </div>

          <div v-if="!globalPointsHistory || globalPointsHistory.length === 0"
               style="text-align:center;padding:30px 0;color:var(--text-light);">
            <div style="font-size:40px;margin-bottom:8px;">📋</div>
            <div style="font-size:14px;">暂无积分记录，完成任务可获得积分哦！</div>
          </div>

          <div v-for="(record, idx) in globalPointsHistory" :key="idx"
               style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);">
            <div style="width:36px;height:36px;border-radius:50%;background:#FFF8E1;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">
              {{ record.icon }}
            </div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:14px;font-weight:700;color:var(--text-dark);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                {{ record.label }}
              </div>
              <div style="font-size:11px;color:var(--text-light);margin-top:2px;">
                {{ record.time }}
                <span v-if="record.total !== undefined" style="margin-left:6px;">总计: {{ record.total }}</span>
              </div>
            </div>
            <div style="font-size:16px;font-weight:900;flex-shrink:0;"
                 :style="{color: record.delta > 0 ? '#4CAF50' : '#F44336'}">
              {{ record.delta > 0 ? '+' : '' }}{{ record.delta }}
            </div>
          </div>

          <button class="btn btn-ghost btn-sm" style="width:100%;margin-top:14px;" @click="showGlobalPointsDetail=false">关闭</button>
        </div>
      </div>
    </div>
  `,
  components: {
    HatchPage, PetPage, TaskPage, RankPage, BackpackPage, StudentHomePage,
    'hatch-page': HatchPage,
    'pet-page': PetPage,
    'task-page': TaskPage,
    'rank-page': RankPage,
    'backpack-page': BackpackPage,
    'student-home-page': StudentHomePage,
  },
  methods: {
    getStudentPetEmoji,
    refreshStudent() {
      // 用新对象替换 studentData，确保 Vue 检测到变更
      const raw = Store.state.students.find(s => s.id === this.user.id);
      this.studentData = raw ? { ...raw } : null;
    },
    onHatchDone() {
      // 强制刷新 studentData（新对象），确保 hasPet 响应式更新
      const raw = Store.state.students.find(s => s.id === this.user.id);
      this.studentData = raw ? { ...raw } : null;
      this.$nextTick(() => {
        if (this.hasPet) {
          this.currentTab = 'home';
        }
      });
    },
    onLevelUp(newStage) {
      this.levelUpStage = newStage;
      this.showLevelUp = true;
      setTimeout(() => { this.showLevelUp = false; }, 3000);
      this.refreshStudent();
    },
    onUpdate() { this.refreshStudent(); },
    onToast(msg, type) { Store.toast(msg, type); },
    navTo(tab) { this.currentTab = tab; },
    doLogout() {
      this.showAvatarMenu = false;
      Store.logout();
      this.$emit('logout');
    },
    startTick() {
      this.tickInterval = setInterval(() => {
        if (this.student && this.student.petType) {
          Store.tickPetStatus(this.student.id);
          this.refreshStudent();
        }
      }, 30000);
    },
    // 每次登录检测离线惩罚
    runDailyPenaltyCheck() {
      if (!this.student || !this.student.petType) return;
      const result = Store.checkDailyPenalty(this.student.id);
      this.refreshStudent();
      if (!result) return;
      if (result.died) {
        // 宠物死亡弹窗
        this.petDeadInfo = {
          daysMissed: result.daysMissed,
          expPenalty: result.expPenalty,
          hpPenalty: result.hpPenalty,
        };
        this.showPetDeadNotify = true;
      } else if (result.daysMissed > 0) {
        // 只是惩罚但没死
        this.penaltyInfo = {
          daysMissed: result.daysMissed,
          expPenalty: result.expPenalty,
          hpPenalty: result.hpPenalty,
        };
        this.showPenaltyNotify = true;
        setTimeout(() => { this.showPenaltyNotify = false; }, 6000);
      }
    },
    // 监听积分变化（教师发分/扣分触发弹窗，购买扣分只显示轻提示）
    startPointsWatch() {
      this._lastPoints = this.student ? (this.student.points || 0) : 0;
      this._lastPointsReason = null;
      this.pointsWatchTimer = setInterval(() => {
        const raw = Store.state.students.find(s => s.id === this.user.id);
        if (!raw) return;
        const newPts = raw.points || 0;
        const delta = newPts - this._lastPoints;
        if (delta !== 0) {
          // 检查是否是购买道具引起的扣分
          const buyDeduct = raw._buyDeduct || 0;
          if (buyDeduct > 0 && delta < 0) {
            // 购买扣分：只更新本地积分，不弹全屏通知
            raw._buyDeduct = 0;
            this._lastPoints = newPts;
            this.refreshStudent();
          } else {
            // 教师操作：弹全屏通知
            const reason = raw._lastGrantReason || (delta > 0 ? '老师给你发放了积分奖励！' : '老师扣除了你的积分');
            this.pointsNotifyData = { delta, reason, total: newPts };
            this.showPointsNotify = true;
            this._lastPoints = newPts;
            this.refreshStudent();
            setTimeout(() => { this.showPointsNotify = false; }, 5000);
          }
        }
      }, 3000);
    },
  },
};
