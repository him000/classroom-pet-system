// ===== 登录/注册 组件 =====

const LoginPage = {
  name: 'LoginPage',
  data() {
    return {
      mode: 'login',   // 'login' | 'register'
      username: '',
      password: '',
      regName: '',
      regUsername: '',
      regPassword: '',
      regClass: '',
      regConfirm: '',
      regRole: 'student',   // 'student' | 'teacher'
      regInviteCode: '',    // 教师注册邀请码
      loading: false,
      showPassword: false,
      loginError: '',
    };
  },
  methods: {
    async doLogin() {
      if (!this.username || !this.password) {
        this.loginError = '请填写账号和密码';
        return;
      }
      this.loading = true;
      this.loginError = '';
      const result = await Store.login(this.username, this.password);
      this.loading = false;
      if (result.success) {
        this.$emit('logged-in', result);
      } else {
        this.loginError = result.msg;
      }
    },
    async doRegister() {
      if (!this.regName || !this.regUsername || !this.regPassword) {
        this.loginError = '请完整填写注册信息';
        return;
      }
      if (this.regPassword !== this.regConfirm) {
        this.loginError = '两次密码不一致';
        return;
      }
      if (this.regPassword.length < 6) {
        this.loginError = '密码至少6位';
        return;
      }
      // 教师注册需要邀请码
      if (this.regRole === 'teacher') {
        if (!this.regClass.trim()) {
          this.loginError = '请填写所在班级';
          return;
        }
      }
      this.loading = true;
      this.loginError = '';
      const result = await Store.register(
        this.regName, this.regUsername, this.regPassword,
        this.regClass.trim() || '未分班',
        this.regRole,
        this.regInviteCode
      );
      this.loading = false;
      if (result.success) {
        this.$emit('logged-in', { success: true, role: result.role, user: result.user });
      } else {
        this.loginError = result.msg;
      }
    },
    toggleMode() {
      this.mode = this.mode === 'login' ? 'register' : 'login';
      this.loginError = '';
    },
  },
  template: `
    <div class="login-page">
      <!-- 背景装饰 -->
      <div class="login-bg-deco">
        <div class="deco-circle deco-1"></div>
        <div class="deco-circle deco-2"></div>
        <div class="deco-circle deco-3"></div>
        <div class="deco-float">🐾</div>
        <div class="deco-float deco-f2">⭐</div>
        <div class="deco-float deco-f3">🎀</div>
        <div class="deco-float deco-f4">✨</div>
      </div>

      <div class="login-container">
        <!-- Logo区 -->
        <div class="login-header">
          <div class="login-logo animate-wobble">🐾</div>
          <h1 class="login-title">课堂电子宠物</h1>
          <p class="login-subtitle">学习让宠物成长，快乐伴我左右～</p>
        </div>

        <!-- 卡片 -->
        <div class="login-card card">
          <!-- Tab切换 -->
          <div class="login-tabs">
            <button class="login-tab" :class="{active: mode==='login'}" @click="mode='login'; loginError=''">🔑 登录</button>
            <button class="login-tab" :class="{active: mode==='register'}" @click="mode='register'; loginError=''">📝 注册</button>
          </div>

          <!-- 登录表单 -->
          <div v-if="mode==='login'" class="animate-fadeInUp">
            <div class="input-group">
              <label>账号</label>
              <input class="input-field" v-model="username" placeholder="请输入账号" @keyup.enter="doLogin" />
              <span class="input-icon">👤</span>
            </div>
            <div class="input-group">
              <label>密码</label>
              <input class="input-field" v-model="password" :type="showPassword?'text':'password'"
                     placeholder="请输入密码" @keyup.enter="doLogin" />
              <span class="input-icon" style="cursor:pointer" @click="showPassword=!showPassword">
                {{ showPassword ? '🙈' : '👁️' }}
              </span>
            </div>
            <div v-if="loginError" class="login-error">⚠️ {{ loginError }}</div>
            <button class="btn btn-primary btn-lg login-submit-btn" @click="doLogin" :disabled="loading">
              <span v-if="loading" class="animate-spin" style="display:inline-block">⏳</span>
              <span v-else>🚀 登录</span>
            </button>


          </div>

          <!-- 注册表单 -->
          <div v-if="mode==='register'" class="animate-fadeInUp">
            <!-- 角色选择 -->
            <div style="margin-bottom:18px;">
              <div style="font-size:13px;font-weight:600;color:var(--text-mid);margin-bottom:8px;">注册身份</div>
              <div style="display:flex;gap:10px;">
                <div class="role-select-btn" :class="{active: regRole==='student'}" @click="regRole='student'">
                  <span style="font-size:22px;">🎒</span>
                  <span>学生</span>
                </div>
                <div class="role-select-btn" :class="{active: regRole==='teacher'}" @click="regRole='teacher'">
                  <span style="font-size:22px;">👩‍🏫</span>
                  <span>教师</span>
                </div>
              </div>
            </div>

            <div class="input-group">
              <label>真实姓名</label>
              <input class="input-field" v-model="regName" placeholder="请输入您的真实姓名" />
              <span class="input-icon">📛</span>
            </div>
            <div class="input-group">
              <label>账号</label>
              <input class="input-field" v-model="regUsername" placeholder="设置登录账号（字母数字）" />
              <span class="input-icon">👤</span>
            </div>
            <div class="input-group">
              <label>{{ regRole === 'teacher' ? '任教班级' : '所在班级' }}</label>
              <input class="input-field" v-model="regClass"
                     :placeholder="regRole === 'teacher' ? '例如：三年一班' : '例如：三年二班'" />
              <span class="input-icon">🏫</span>
            </div>
            <div v-if="regRole === 'teacher'" class="input-group">
              <label>教师邀请码 <span style="color:#F44336;font-size:11px;">*由管理员提供</span></label>
              <input class="input-field" v-model="regInviteCode" placeholder="请输入教师专属邀请码" />
              <span class="input-icon">🔑</span>
            </div>
            <div class="input-group">
              <label>密码</label>
              <input class="input-field" v-model="regPassword" type="password" placeholder="至少6位密码" />
              <span class="input-icon">🔒</span>
            </div>
            <div class="input-group">
              <label>确认密码</label>
              <input class="input-field" v-model="regConfirm" type="password" placeholder="再次输入密码" />
              <span class="input-icon">✅</span>
            </div>
            <div v-if="loginError" class="login-error">⚠️ {{ loginError }}</div>
            <button class="btn btn-primary btn-lg login-submit-btn" @click="doRegister" :disabled="loading">
              <span v-if="loading" style="display:inline-block" class="animate-spin">⏳</span>
              <span v-else>{{ regRole === 'teacher' ? '👩‍🏫 注册教师账号' : '🌟 注册并领取宠物蛋' }}</span>
            </button>
            <div v-if="regRole === 'teacher'" style="margin-top:10px;font-size:12px;color:var(--text-light);text-align:center;">
              💡 请联系管理员获取教师邀请码
            </div>
          </div>
        </div>

        <!-- 底部宠物展示 -->
        <div class="login-pets">
          <span v-for="pet in petTypes" :key="pet.id" class="login-pet-icon animate-wobble"
                :style="{'animation-delay': pet.delay}">{{ pet.emoji }}</span>
        </div>
      </div>
    </div>
  `,
  computed: {
    petTypes() {
      return PET_TYPES.map((p, i) => ({
        ...p,
        delay: (i * 0.3) + 's'
      }));
    }
  }
};

// 登录页样式（注入）
const loginStyle = document.createElement('style');
loginStyle.textContent = `
.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #FFE8F5 0%, #E8D5FF 50%, #D5E8FF 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
  overflow: hidden;
}
.login-bg-deco { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.deco-circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.15;
}
.deco-1 { width: 400px; height: 400px; background: #FF6B9D; top: -100px; left: -100px; }
.deco-2 { width: 300px; height: 300px; background: #7C4DFF; bottom: -80px; right: -60px; }
.deco-3 { width: 200px; height: 200px; background: #FFD600; top: 40%; left: 60%; }
.deco-float {
  position: absolute;
  font-size: 40px;
  opacity: 0.3;
  animation: petFloat 4s ease-in-out infinite;
}
.deco-f2 { top: 15%; right: 12%; font-size: 30px; animation-delay: 1s; }
.deco-f3 { bottom: 20%; left: 8%; font-size: 35px; animation-delay: 0.5s; }
.deco-f4 { top: 60%; right: 5%; font-size: 25px; animation-delay: 1.5s; }
.login-container {
  width: 100%;
  max-width: 420px;
  position: relative;
  z-index: 1;
}
.login-header { text-align: center; margin-bottom: 24px; }
.login-logo { font-size: 64px; display: block; margin-bottom: 8px; }
.login-title {
  font-size: 28px;
  font-weight: 900;
  background: linear-gradient(135deg, #FF6B9D, #7C4DFF);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 6px;
}
.login-subtitle { color: #9B7DB5; font-size: 14px; }
.login-card { padding: 28px 28px 20px; }
.login-tabs {
  display: flex;
  background: #F0E6FF;
  border-radius: 50px;
  padding: 4px;
  margin-bottom: 24px;
}
.login-tab {
  flex: 1;
  padding: 10px;
  border: none;
  background: transparent;
  border-radius: 50px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-light);
  transition: all 0.3s;
}
.login-tab.active {
  background: linear-gradient(135deg, #FF6B9D, #7C4DFF);
  color: white;
  box-shadow: 0 4px 15px rgba(124, 77, 255, 0.3);
}
.login-error {
  background: #FFEBEE;
  color: #C62828;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  margin-bottom: 14px;
  border: 1px solid #FFCDD2;
}
.login-submit-btn {
  width: 100%;
  margin-top: 6px;
  font-size: 16px;
  padding: 14px;
}
.login-submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }

.login-pets {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 24px;
}
.login-pet-icon { font-size: 32px; cursor: default; }
.role-select-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border: 2px solid var(--border);
  border-radius: 14px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-light);
  background: #FAFAFA;
  transition: all 0.25s;
}
.role-select-btn:hover { border-color: var(--primary); color: var(--primary); background: #FFF0F8; }
.role-select-btn.active {
  border-color: var(--primary);
  background: linear-gradient(135deg, #FFF0F8, #F0E8FF);
  color: var(--primary);
  box-shadow: 0 4px 12px rgba(255,107,157,0.2);
}

`;
document.head.appendChild(loginStyle);
