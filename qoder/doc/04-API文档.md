# API 文档

## 概述

本系统采用纯前端架构，没有传统意义上的后端 API。数据操作通过 `store.js` 中的 Store 对象直接操作 localStorage 完成。

本文档描述 Store 提供的所有数据操作方法。

---

## Store 架构

### 状态定义

```javascript
Store.state = Vue.reactive({
  currentUser: null,      // 当前登录用户
  students: [],           // 学生列表
  tasks: [],              // 任务列表
  toasts: [],             // 通知消息队列
  inviteCodes: [],        // 邀请码列表
  _initialized: false,    // 初始化标记
});
```

### 初始化流程

```javascript
// 应用启动时自动调用
Store.init();

// 内部流程：
// 1. 从 localStorage 读取数据
// 2. 如果没有数据，写入初始演示数据
// 3. 设置 _initialized = true
```

---

## 认证相关

### login(username, password)

**描述**：用户登录

**参数**：
| 参数 | 类型 | 说明 |
|------|------|------|
| username | string | 登录账号 |
| password | string | 登录密码 |

**返回值**：
```javascript
{
  success: boolean,       // 登录是否成功
  role: 'student'|'teacher'|'admin',  // 用户角色
  user: Object            // 用户信息
}
```

**示例**：
```javascript
const result = await Store.login('xiaoming', '123456');
if (result.success) {
  console.log('登录成功，角色：', result.role);
}
```

---

### register(name, username, password, className, role, inviteCode)

**描述**：用户注册

**参数**：
| 参数 | 类型 | 说明 |
|------|------|------|
| name | string | 真实姓名 |
| username | string | 登录账号 |
| password | string | 登录密码 |
| className | string | 班级名称 |
| role | string | 'student' 或 'teacher' |
| inviteCode | string | 教师注册必填 |

**返回值**：
```javascript
{
  success: boolean,
  role: string,
  user: Object
}
```

---

### logout()

**描述**：退出登录

**示例**：
```javascript
Store.logout();
// 清除 currentUser，返回登录页
```

---

## 学生数据操作

### getCurrentStudent()

**描述**：获取当前登录学生的完整数据

**返回值**：学生对象 或 null

**示例**：
```javascript
const student = Store.getCurrentStudent();
console.log(student.name, student.points);
```

---

### updateStudent(id, updates)

**描述**：更新学生数据

**参数**：
| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 学生ID |
| updates | Object | 要更新的字段 |

**示例**：
```javascript
Store.updateStudent(1, {
  points: 500,
  petExp: 200
});
```

---

### adoptPet(studentId, petTypeId, petName)

**描述**：学生领取宠物

**参数**：
| 参数 | 类型 | 说明 |
|------|------|------|
| studentId | number | 学生ID |
| petTypeId | string | 宠物类型ID |
| petName | string | 宠物名字 |

**示例**：
```javascript
Store.adoptPet(1, 'dragon', '我的小青龙');
```

---

## 积分操作

### addPoints(studentId, points, reason, icon)

**描述**：给学生增加积分

**参数**：
| 参数 | 类型 | 说明 |
|------|------|------|
| studentId | number | 学生ID |
| points | number | 积分数量 |
| reason | string | 获得原因 |
| icon | string | 日志图标（可选） |

**返回值**：
```javascript
{
  levelUp: boolean  // 是否升级（积分不影响等级，始终返回false）
}
```

**示例**：
```javascript
Store.addPoints(1, 50, '完成数学作业', '📐');
```

---

### spendPoints(studentId, points)

**描述**：扣除学生积分

**参数**：
| 参数 | 类型 | 说明 |
|------|------|------|
| studentId | number | 学生ID |
| points | number | 扣除数量 |

**返回值**：boolean（是否扣除成功）

**示例**：
```javascript
const success = Store.spendPoints(1, 20);
if (success) {
  console.log('积分扣除成功');
}
```

---

### grantPoints(studentId, points, reason)

**描述**：教师手动发放积分

**参数**：
| 参数 | 类型 | 说明 |
|------|------|------|
| studentId | number | 学生ID |
| points | number | 积分数量 |
| reason | string | 发放原因 |

**返回值**：
```javascript
{
  levelUp: boolean
}
```

---

### deductPoints(studentId, points, reason)

**描述**：教师手动扣除积分

**参数**：
| 参数 | 类型 | 说明 |
|------|------|------|
| studentId | number | 学生ID |
| points | number | 扣除数量 |
| reason | string | 扣除原因 |

**返回值**：
```javascript
{
  success: boolean,
  deducted: number  // 实际扣除数量（不会超过现有积分）
}
```

---

## 道具操作

### buyItem(studentId, itemId)

**描述**：购买道具

**参数**：
| 参数 | 类型 | 说明 |
|------|------|------|
| studentId | number | 学生ID |
| itemId | string | 道具ID |

**返回值**：
```javascript
{
  success: boolean,
  item: Object,      // 道具信息
  msg: string        // 错误信息（失败时）
}
```

**示例**：
```javascript
const result = await Store.buyItem(1, 'apple');
if (result.success) {
  Store.toast('购买成功！', 'success');
}
```

---

### useItem(studentId, itemId)

**描述**：使用道具

**参数**：
| 参数 | 类型 | 说明 |
|------|------|------|
| studentId | number | 学生ID |
| itemId | string | 道具ID |

**返回值**：
```javascript
{
  success: boolean,
  levelUp: boolean,      // 是否升级
  newStage: number,      // 新阶段
  hatched: boolean,      // 是否孵化完成
  hatchProgress: number, // 孵化进度
  item: Object,          // 使用的道具
  expMsg: string         // 经验提示
}
```

**示例**：
```javascript
const result = await Store.useItem(1, 'cake');
if (result.success) {
  if (result.levelUp) {
    Store.toast('恭喜升级！', 'success');
  }
}
```

---

## 任务操作

### submitTask(taskId, studentId, content)

**描述**：学生提交任务

**参数**：
| 参数 | 类型 | 说明 |
|------|------|------|
| taskId | number | 任务ID |
| studentId | number | 学生ID |
| content | string | 提交内容 |

**返回值**：
```javascript
{
  success: boolean,
  msg: string
}
```

---

### resubmitTask(taskId, studentId, content)

**描述**：重新提交被驳回的任务

**参数**：同 submitTask

---

### reviewTask(taskId, studentId, approved)

**描述**：教师审核任务

**参数**：
| 参数 | 类型 | 说明 |
|------|------|------|
| taskId | number | 任务ID |
| studentId | number | 学生ID |
| approved | boolean | 是否通过 |

**返回值**：
```javascript
{
  levelUp: boolean  // 积分是否触发升级（始终false）
}
```

---

### createTask(taskData)

**描述**：创建新任务

**参数**：
| 参数 | 类型 | 说明 |
|------|------|------|
| taskData.title | string | 任务标题 |
| taskData.desc | string | 任务描述 |
| taskData.points | number | 积分奖励 |
| taskData.icon | string | 任务图标 |
| taskData.subject | string | 学科 |
| taskData.deadline | string | 截止时间 |
| taskData.createdBy | number | 创建者ID |

**返回值**：任务对象 或 null

---

### deleteTask(taskId)

**描述**：删除任务

**参数**：
| 参数 | 类型 | 说明 |
|------|------|------|
| taskId | number | 任务ID |

---

## 学生管理（教师端）

### addStudent(studentData)

**描述**：添加学生

**参数**：
| 参数 | 类型 | 说明 |
|------|------|------|
| studentData.name | string | 姓名 |
| studentData.username | string | 账号 |
| studentData.password | string | 密码 |
| studentData.class | string | 班级 |

**返回值**：
```javascript
{
  success: boolean,
  student: Object,
  msg: string
}
```

---

### deleteStudent(studentId)

**描述**：删除学生

**参数**：
| 参数 | 类型 | 说明 |
|------|------|------|
| studentId | number | 学生ID |

---

### resetStudentPassword(studentId, newPassword)

**描述**：重置学生密码

**参数**：
| 参数 | 类型 | 说明 |
|------|------|------|
| studentId | number | 学生ID |
| newPassword | string | 新密码 |

**返回值**：
```javascript
{
  success: boolean,
  msg: string
}
```

---

## 教师管理（管理员）

### getTeachers()

**描述**：获取所有教师列表

**返回值**：教师对象数组

---

### deleteTeacher(teacherId)

**描述**：删除教师

**参数**：
| 参数 | 类型 | 说明 |
|------|------|------|
| teacherId | number | 教师ID |

**返回值**：
```javascript
{
  success: boolean,
  msg: string
}
```

---

### resetTeacherPassword(teacherId, newPassword)

**描述**：重置教师密码

**参数**：
| 参数 | 类型 | 说明 |
|------|------|------|
| teacherId | number | 教师ID |
| newPassword | string | 新密码 |

---

## 邀请码管理

### getInviteCodes()

**描述**：获取所有邀请码

**返回值**：邀请码数组

---

### addInviteCode(code, note)

**描述**：添加邀请码

**参数**：
| 参数 | 类型 | 说明 |
|------|------|------|
| code | string | 邀请码 |
| note | string | 备注 |

**返回值**：
```javascript
{
  success: boolean,
  msg: string
}
```

---

### removeInviteCode(code)

**描述**：删除邀请码

**参数**：
| 参数 | 类型 | 说明 |
|------|------|------|
| code | string | 邀请码 |

---

### validateInviteCode(code)

**描述**：验证邀请码是否有效

**参数**：
| 参数 | 类型 | 说明 |
|------|------|------|
| code | string | 邀请码 |

**返回值**：boolean

---

## 宠物状态维护

### tickPetStatus(studentId)

**描述**：宠物状态自然衰减

**说明**：
- 由前端随机间隔调用（45-90分钟）
- 自动减少饱食/心情/清洁度
- 状态过低时减少生命值

**参数**：
| 参数 | 类型 | 说明 |
|------|------|------|
| studentId | number | 学生ID |

**返回值**：
```javascript
{
  sick: boolean  // 是否需要提醒（健康值低）
}
```

---

### checkDailyPenalty(studentId)

**描述**：检查离线惩罚

**说明**：
- 登录时自动调用
- 根据离线时长计算惩罚
- 7天未登录宠物死亡

**参数**：
| 参数 | 类型 | 说明 |
|------|------|------|
| studentId | number | 学生ID |

**返回值**：
```javascript
{
  died: boolean,           // 是否死亡
  hoursMissed: number,     // 离线小时数
  daysMissed: number,      // 离线天数
  pointPenalty: number,    // 积分惩罚
  newPoints: number        // 惩罚后积分
}
```

---

## 系统操作

### resetDemo()

**描述**：重置演示数据

**说明**：
- 清除所有学生数据
- 恢复初始演示学生
- 清除所有任务和提交记录
- 恢复初始任务

---

### nukeAll()

**描述**：清空全部数据（危险操作）

**说明**：
- 清除所有数据
- 恢复默认教师和邀请码
- 需要二次确认

---

### updateAdminAccount(username, password)

**描述**：更新管理员账号

**参数**：
| 参数 | 类型 | 说明 |
|------|------|------|
| username | string | 新账号 |
| password | string | 新密码 |

---

## 通知系统

### toast(msg, type)

**描述**：显示 Toast 通知

**参数**：
| 参数 | 类型 | 说明 |
|------|------|------|
| msg | string | 消息内容 |
| type | string | 'success'/'error'/'warning'/'info' |

**示例**：
```javascript
Store.toast('操作成功！', 'success');
Store.toast('出错了', 'error');
Store.toast('请注意', 'warning');
Store.toast('提示信息', 'info');
```

---

## 数据持久化

### save()

**描述**：保存数据到 localStorage

**说明**：
- 大部分操作会自动调用
- 手动调用可确保数据立即保存

---

## 工具函数（data.js）

### getStudentPetEmoji(student)

**描述**：获取学生宠物的当前表情

**参数**：学生对象

**返回值**：Emoji 字符串

---

### getStudentMood(status)

**描述**：根据状态获取心情

**参数**：状态对象 {health, hungry, happy, clean}

**返回值**：
```javascript
{
  emoji: string,  // 表情符号
  label: string   // 文字描述
}
```

---

### getLevelInfo(exp)

**描述**：根据经验值获取等级信息

**参数**：经验值

**返回值**：
```javascript
{
  level: number,   // 等级
  name: string,    // 阶段名称
  minExp: number,  // 最小经验
  maxExp: number   // 最大经验
}
```

---

### getExpPercent(exp)

**描述**：获取当前等级进度百分比

**参数**：经验值

**返回值**：0-100 的数字

---

### formatDate(dateStr)

**描述**：格式化日期字符串

**参数**：日期字符串

**返回值**：格式化后的字符串（如 "3/14 15:30"）
