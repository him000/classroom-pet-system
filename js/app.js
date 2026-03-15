// ===== 主应用入口 =====

const { createApp, reactive, ref, computed, onMounted, onBeforeUnmount } = Vue;

const App = {
  name: 'App',
  components: {
    LoginPage,
    StudentApp,
    TeacherApp,
    AdminApp,
    'login-page':   LoginPage,
    'student-app':  StudentApp,
    'teacher-app':  TeacherApp,
    'admin-app':    AdminApp,
  },
  data() {
    return {
      authState: 'loading',  // loading / login / student / teacher / admin
      currentUser: null,
    };
  },
  computed: {
    toasts() { return Store.state.toasts; },
  },
  methods: {
    onLoggedIn(result) {
      this.currentUser = result.user;
      this.authState   = result.role; // 'student' | 'teacher' | 'admin'
    },
    onLogout() {
      this.currentUser = null;
      this.authState   = 'login';
    },
    spawnCoinFly(x, y) {
      const el = document.createElement('div');
      el.className = 'coin-fly';
      el.textContent = '⭐';
      const tx = (Math.random() - 0.5) * 200;
      const ty = -(Math.random() * 150 + 80);
      el.style.setProperty('--tx', tx + 'px');
      el.style.setProperty('--ty', ty + 'px');
      el.style.left = x + 'px';
      el.style.top  = y + 'px';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1500);
    },
  },
  async mounted() {
    // 等待 Store 从服务器加载数据完成
    // Store.init() 是异步的，等它跑完再显示登录页
    let waited = 0;
    while (!Store.state._initialized && waited < 8000) {
      await new Promise(r => setTimeout(r, 100));
      waited += 100;
    }
    this.authState = 'login';

    // 全局点击金币飞行效果
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-primary') || e.target.classList.contains('action-btn')) {
        this.spawnCoinFly(e.clientX, e.clientY);
      }
    });
  },
  template: `
    <div id="root">
      <!-- 加载中 -->
      <div v-if="authState==='loading'" style="display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column;gap:16px;">
        <div style="font-size:64px;animation:wobble 1s infinite;">🐾</div>
        <div class="loading-spinner"></div>
        <div style="color:var(--text-light);font-size:14px;">正在连接服务器...</div>
      </div>

      <!-- 登录页 -->
      <login-page v-else-if="authState==='login'" @logged-in="onLoggedIn"></login-page>

      <!-- 学生端 -->
      <student-app v-else-if="authState==='student'" :user="currentUser" @logout="onLogout"></student-app>

      <!-- 教师端 -->
      <teacher-app v-else-if="authState==='teacher'" :user="currentUser" @logout="onLogout"></teacher-app>

      <!-- 管理员端 -->
      <admin-app v-else-if="authState==='admin'" :user="currentUser" @logout="onLogout"></admin-app>

      <!-- Toast 通知 -->
      <div class="toast-container">
        <div v-for="toast in toasts" :key="toast.id" class="toast" :class="'toast-'+toast.type">
          <span>{{ {success:'✅', error:'❌', warning:'⚠️', info:'💬'}[toast.type] || '💬' }}</span>
          <span>{{ toast.msg }}</span>
        </div>
      </div>
    </div>
  `
};

// 挂载应用
const app = createApp(App);
app.mount('#app');
