<?php
// ===== 学生数据 API =====
// GET  /api/students.php?action=list|get&id=xxx
// POST /api/students.php  action=update|addPoints|deductPoints|grantPoints|buyItem|useItem|adoptPet|tick|checkPenalty|add|delete|resetPassword

require_once 'config.php';

$input  = getInput();
$action = $input['action'] ?? ($_GET['action'] ?? '');
$pdo    = getDB();

// ===== 自动迁移：确保新字段存在（兼容旧数据库）=====
try {
    // 检测 daily_exp_date 字段是否存在，不存在则添加
    $cols = $pdo->query("SHOW COLUMNS FROM students LIKE 'daily_exp_date'")->fetchAll();
    if (empty($cols)) {
        $pdo->exec("ALTER TABLE students ADD COLUMN `daily_exp_date` VARCHAR(20) DEFAULT NULL COMMENT '当日日期 Y-m-d'");
        $pdo->exec("ALTER TABLE students ADD COLUMN `daily_exp_earned` INT NOT NULL DEFAULT 0 COMMENT '当日已获经验'");
    }
} catch (Exception $e) {
    // 迁移失败不影响主流程
}
// ===== 结束自动迁移 =====

// ===== 获取所有学生 =====
if ($action === 'list') {
    $rows = $pdo->query("SELECT * FROM students")->fetchAll();
    respOk(['students' => array_map('decodeStudent', $rows)]);
}

// ===== 获取单个学生 =====
if ($action === 'get') {
    $id = (int)($input['id'] ?? $_GET['id'] ?? 0);
    $row = $pdo->prepare("SELECT * FROM students WHERE id=?");
    $row->execute([$id]);
    $s = $row->fetch();
    if (!$s) respErr('学生不存在');
    respOk(['student' => decodeStudent($s)]);
}

// ===== 添加学生（教师端） =====
if ($action === 'add') {
    $name     = trim($input['name']     ?? '');
    $username = trim($input['username'] ?? '');
    $password = trim($input['password'] ?? '');
    $class    = trim($input['class']    ?? '未分班');
    if (!$name || !$username || !$password) respErr('姓名/账号/密码不能为空');

    $dup = $pdo->prepare("SELECT id FROM students WHERE username=?");
    $dup->execute([$username]);
    if ($dup->fetch()) respErr('账号已存在');

    $id = (int)(microtime(true) * 1000);
    $defStatus   = json_encode(['health'=>100,'hungry'=>100,'happy'=>100,'clean'=>100]);
    $defBackpack = json_encode(['apple'=>3,'soap'=>2,'ball'=>1]);
    $pdo->prepare("INSERT INTO students (id,name,username,password,class,points,pet_status,backpack,join_date) VALUES (?,?,?,?,?,0,?,?,?)")
        ->execute([$id,$name,$username,$password,$class,$defStatus,$defBackpack,date('Y-m-d')]);

    $newS = ['id'=>$id,'name'=>$name,'username'=>$username,'role'=>'student','class'=>$class,'points'=>0,'petType'=>null,'petName'=>null,'petExp'=>0,'petStage'=>0,'petStatus'=>['health'=>100,'hungry'=>100,'happy'=>100,'clean'=>100],'backpack'=>['apple'=>3,'soap'=>2,'ball'=>1],'joinDate'=>date('Y-m-d'),'pointsLog'=>[]];
    respOk(['student'=>$newS]);
}

// ===== 删除学生 =====
if ($action === 'delete') {
    $id = (int)($input['id'] ?? 0);
    $pdo->prepare("DELETE FROM students WHERE id=?")->execute([$id]);
    $pdo->prepare("DELETE FROM task_submissions WHERE student_id=?")->execute([$id]);
    respOk();
}

// ===== 重置学生密码 =====
if ($action === 'resetPassword') {
    $id  = (int)($input['id']       ?? 0);
    $pwd = trim($input['password']  ?? '');
    if (!$id || !$pwd) respErr('参数不完整');
    $pdo->prepare("UPDATE students SET password=? WHERE id=?")->execute([$pwd, $id]);
    respOk();
}

// ===== 领取宠物 =====
if ($action === 'adoptPet') {
    $id      = (int)($input['id']      ?? 0);
    $petType = trim($input['petType']  ?? '');
    $petName = trim($input['petName']  ?? '');
    if (!$id || !$petType) respErr('参数不完整');
    $defStatus = json_encode(['health'=>100,'hungry'=>80,'happy'=>80,'clean'=>100]);
    $pdo->prepare("UPDATE students SET pet_type=?,pet_name=?,pet_exp=0,pet_stage=0,pet_dead=0,pet_hatch_progress=0,pet_status=? WHERE id=?")
        ->execute([$petType, $petName, $defStatus, $id]);
    respOk();
}

// ===== 手动发放积分（教师/管理员） =====
if ($action === 'grantPoints') {
    $id     = (int)($input['id']     ?? 0);
    $pts    = (int)($input['points'] ?? 0);
    $reason = trim($input['reason']  ?? "老师奖励了 {$pts} 积分");
    if (!$id || $pts <= 0) respErr('参数不完整');
    addPointsDB($pdo, $id, $pts, $reason, '🎁');
    respOk();
}

// ===== 扣除积分 =====
if ($action === 'deductPoints') {
    $id     = (int)($input['id']     ?? 0);
    $pts    = (int)($input['points'] ?? 0);
    $reason = trim($input['reason']  ?? "老师扣除了 {$pts} 积分");
    if (!$id || $pts <= 0) respErr('参数不完整');

    $s = $pdo->prepare("SELECT points,points_log FROM students WHERE id=?");
    $s->execute([$id]);
    $row = $s->fetch();
    if (!$row) respErr('学生不存在');

    $deduct    = min($pts, (int)$row['points']);
    $newPoints = max(0, (int)$row['points'] - $pts);
    $log       = $row['points_log'] ? json_decode($row['points_log'], true) : [];
    $log[]     = ['icon'=>'📉','label'=>$reason,'delta'=>-$deduct,'time'=>date('Y-m-d H:i'),'total'=>$newPoints];

    $pdo->prepare("UPDATE students SET points=?,points_log=?,last_grant_reason=? WHERE id=?")
        ->execute([$newPoints, json_encode($log, JSON_UNESCAPED_UNICODE), $reason, $id]);
    respOk(['deducted'=>$deduct]);
}

// ===== 购买道具 =====
if ($action === 'buyItem') {
    $id     = (int)($input['id']     ?? 0);
    $itemId = trim($input['itemId']  ?? '');
    $cost   = (int)($input['cost']   ?? 0);
    $name   = trim($input['name']    ?? $itemId);
    if (!$id || !$itemId) respErr('参数不完整');

    $s = $pdo->prepare("SELECT * FROM students WHERE id=?");
    $s->execute([$id]);
    $row = $s->fetch();
    if (!$row) respErr('学生不存在');
    if ((int)$row['points'] < $cost) respErr("积分不足，需要{$cost}积分");

    $backpack = $row['backpack'] ? json_decode($row['backpack'], true) : [];
    $backpack[$itemId] = ($backpack[$itemId] ?? 0) + 1;

    $newPoints = (int)$row['points'] - $cost;
    $log       = $row['points_log'] ? json_decode($row['points_log'], true) : [];
    $log[]     = ['icon'=>'🛒','label'=>"购买道具「{$name}」",'delta'=>-$cost,'time'=>date('Y-m-d H:i'),'total'=>$newPoints];
    $buyDeduct = (int)$row['buy_deduct'] + $cost;

    $pdo->prepare("UPDATE students SET points=?,backpack=?,points_log=?,buy_deduct=? WHERE id=?")
        ->execute([$newPoints, json_encode($backpack, JSON_UNESCAPED_UNICODE), json_encode($log, JSON_UNESCAPED_UNICODE), $buyDeduct, $id]);
    respOk(['newPoints'=>$newPoints,'backpack'=>$backpack,'buyDeduct'=>$buyDeduct]);
}

// ===== 使用道具 =====
if ($action === 'useItem') {
    $id     = (int)($input['id']     ?? 0);
    $itemId = trim($input['itemId']  ?? '');
    $effect = $input['effect']       ?? [];   // 由前端传入 effect 对象
    if (!$id || !$itemId) respErr('参数不完整');

    $s = $pdo->prepare("SELECT * FROM students WHERE id=?");
    $s->execute([$id]);
    $row = $s->fetch();
    if (!$row) respErr('学生不存在');

    $backpack = $row['backpack'] ? json_decode($row['backpack'], true) : [];
    if (empty($backpack[$itemId]) || $backpack[$itemId] <= 0) respErr('背包中没有该道具！');

    $status = $row['pet_status'] ? json_decode($row['pet_status'], true) : ['health'=>100,'hungry'=>100,'happy'=>100,'clean'=>100];
    $petDead = (bool)$row['pet_dead'];
    $petExp  = (int)$row['pet_exp'];
    $petStage= (int)$row['pet_stage'];
    $lastFed = $row['last_fed_at'];
    $hatchProgress = (int)$row['pet_hatch_progress'];

    $itemType = $input['itemType'] ?? '';
    $levelUp  = false;
    $hatched  = false;

    // ===== 状态满值校验（服务端二次确认）=====
    if (!$petDead) {
        if ($itemType === 'food'  && ($status['hungry'] ?? 0) >= 100) respErr('宠物已经吃饱了！饱食度满值时不能再喂食 🍗');
        if ($itemType === 'clean' && ($status['clean']  ?? 0) >= 100) respErr('宠物已经很干净了！清洁度满值时不需要洗澡 🛁');
        if ($itemType === 'toy'   && ($status['happy']  ?? 0) >= 100) respErr('宠物心情满溢了！心情值满值时不需要再玩耍 😊');
        if ($itemType === 'heal'  && ($status['health'] ?? 0) >= 100) respErr('宠物身体很健康！生命值满值时不需要治疗 ❤️');
    }
    // ===== 结束状态满值校验 =====

    // 食物道具处理（包含孵化逻辑）
    if ($itemType === 'food') {
        $lastFed = (int)(microtime(true) * 1000);
        if ($petDead) {
            $hatchProgress++;
            $backpack[$itemId]--;
            if ($hatchProgress >= 3) {
                $petDead = false; $petExp = 0; $petStage = 0; $hatchProgress = 0;
                $status  = ['health'=>100,'hungry'=>80,'happy'=>80,'clean'=>100];
                $hatched = true;
            }
            $pdo->prepare("UPDATE students SET backpack=?,pet_dead=?,pet_exp=?,pet_stage=?,pet_hatch_progress=?,pet_status=?,last_fed_at=? WHERE id=?")
                ->execute([json_encode($backpack), $hatched?0:1, $petExp, $petStage, $hatchProgress, json_encode($status), $lastFed, $id]);
            respOk(['hatched'=>$hatched,'hatchProgress'=>$hatchProgress,'levelUp'=>false]);
        }
    }

    // 死亡状态下非食物道具不可用
    if ($petDead) respErr('宠物还是一颗蛋，请先用食物喂食孵化它！');

    // ===== 每日经验上限逻辑 =====
    // 每天喂食/洗澡/玩耍/治疗行为才能给宠物积累经验，每日最多 DAILY_EXP_LIMIT 点
    $DAILY_EXP_LIMIT = 50;  // 与前端 data.js 保持一致
    // 今日已获经验（从 daily_exp_date 和 daily_exp_earned 字段读取）
    $todayDate   = date('Y-m-d');
    $dailyDate   = $row['daily_exp_date']   ?? '';
    $dailyEarned = $dailyDate === $todayDate ? (int)($row['daily_exp_earned'] ?? 0) : 0;
    $canEarnExp  = max(0, $DAILY_EXP_LIMIT - $dailyEarned);
    $dailyExpFull = false;

    // 护理行为给经验：喂食+5，洗澡+3，玩耍+4，治疗+2（每次使用道具可获得的基础经验）
    $careExpMap = ['food'=>5, 'clean'=>3, 'toy'=>4, 'heal'=>2];
    $careExp    = $careExpMap[$itemType] ?? 0;
    if ($careExp > 0) {
        if ($canEarnExp <= 0) {
            $careExp = 0;
            $dailyExpFull = true;  // 今日经验已满，提示前端
        } else {
            $careExp = min($careExp, $canEarnExp);
            $dailyEarned += $careExp;
        }
    }
    // ===== 结束每日经验上限逻辑 =====

    // 应用状态效果（去掉 exp 字段，exp 只由护理行为获得）
    foreach (['hungry','health','happy','clean'] as $k) {
        if (isset($effect[$k])) $status[$k] = min(100, max(0, ($status[$k]??0) + (int)$effect[$k]));
    }

    // 护理经验应用
    if ($careExp > 0) {
        $oldStage = $petStage;
        $petExp   = max(0, $petExp + $careExp);
        $petStage = getPetLevel($petExp);
        $levelUp  = $petStage > $oldStage;
    }

    $backpack[$itemId]--;

    // 更新数据库
    if ($itemType === 'food') {
        $pdo->prepare("UPDATE students SET backpack=?,pet_status=?,pet_exp=?,pet_stage=?,last_fed_at=?,daily_exp_date=?,daily_exp_earned=? WHERE id=?")
            ->execute([json_encode($backpack), json_encode($status), $petExp, $petStage, $lastFed, $todayDate, $dailyEarned, $id]);
    } else {
        $pdo->prepare("UPDATE students SET backpack=?,pet_status=?,pet_exp=?,pet_stage=?,daily_exp_date=?,daily_exp_earned=? WHERE id=?")
            ->execute([json_encode($backpack), json_encode($status), $petExp, $petStage, $todayDate, $dailyEarned, $id]);
    }

    respOk(['levelUp'=>$levelUp,'newStage'=>$petStage,'backpack'=>$backpack,'petStatus'=>$status,'petExp'=>$petExp,'dailyExpFull'=>$dailyExpFull,'dailyEarned'=>$dailyEarned,'dailyLimit'=>$DAILY_EXP_LIMIT]);
}

// ===== 宠物状态自然衰减（tick，由前端随机间隔调用）=====
// 衰减规则（每次 tick 均随机，让宠物状态变化更自然）：
//   饱食度：每次随机 -2 ~ -5（宠物容易饿，需频繁喂食）
//   心情：  每次随机 -1 ~ -3
//   清洁度：每次随机 -1 ~ -3
//   生命值：hungry<30 或 clean<30 时，每次随机 -2 ~ -4（健康受损，最低保留1，不致死）
//   宠物不会因 tick 直接死亡；致死只通过 checkPenalty（7天不喂）触发
if ($action === 'tick') {
    $id = (int)($input['id'] ?? 0);
    $s = $pdo->prepare("SELECT * FROM students WHERE id=?");
    $s->execute([$id]);
    $row = $s->fetch();
    if (!$row || !$row['pet_type'] || $row['pet_dead']) respOk(['skipped'=>true]);

    $status = $row['pet_status'] ? json_decode($row['pet_status'], true) : ['health'=>100,'hungry'=>100,'happy'=>100,'clean'=>100];

    // 随机衰减量（让宠物状态变化更自然，不死板）
    $dHungry = mt_rand(2, 5);   // 饱食度每次随机 -2 ~ -5
    $dHappy  = mt_rand(1, 3);   // 心情每次随机 -1 ~ -3
    $dClean  = mt_rand(1, 3);   // 清洁度每次随机 -1 ~ -3

    $status['hungry'] = max(0, ($status['hungry'] ?? 100) - $dHungry);
    $status['happy']  = max(0, ($status['happy']  ?? 100) - $dHappy);
    $status['clean']  = max(0, ($status['clean']  ?? 100) - $dClean);

    // 饱食度或清洁度过低时，健康随机受损（保留最低1，致死由 checkPenalty 控制）
    if (($status['hungry'] ?? 100) < 30 || ($status['clean'] ?? 100) < 30) {
        $dHealth = mt_rand(2, 4);
        $status['health'] = max(1, ($status['health'] ?? 100) - $dHealth);
    }

    $pdo->prepare("UPDATE students SET pet_status=? WHERE id=?")->execute([json_encode($status), $id]);
    respOk([
        'petStatus' => $status,
        'sick'      => ($status['health'] <= 30),
        'decay'     => ['hungry'=>-$dHungry, 'happy'=>-$dHappy, 'clean'=>-$dClean],
    ]);
}

// ===== 检查离线惩罚（登录时触发）=====
// 惩罚规则（以距上次喂食的小时数为基准）：
//   24h ~ 48h：扣 10 积分
//   48h ~ 72h：扣 30 积分（累计）
//   72h ~ 96h：扣 60 积分（累计）
//   96h ~ 120h：扣 100 积分（累计）
//   120h ~ 144h：扣 150 积分（累计）
//   144h ~ 168h：扣 200 积分（累计）
//   168h（7天）及以上：宠物饿死，积分清零
// 状态衰减（补算离线期间应有的数值下降，一次性计算）：
//   hungry/happy/clean 按小时衰减补算，health 在 hungry<30 或 clean<30 时每小时-3（最低1）
if ($action === 'checkPenalty') {
    $id = (int)($input['id'] ?? 0);
    $s = $pdo->prepare("SELECT * FROM students WHERE id=?");
    $s->execute([$id]);
    $row = $s->fetch();
    if (!$row || !$row['pet_type'] || $row['pet_dead']) respOk(['skipped'=>true]);

    $now     = (int)(microtime(true) * 1000);
    $lastFed = $row['last_fed_at'] ? (int)$row['last_fed_at'] : 0;

    // 首次登录且没有喂食记录，初始化时间戳，不惩罚
    if (!$row['last_fed_at']) {
        $pdo->prepare("UPDATE students SET last_fed_at=? WHERE id=?")->execute([$now, $id]);
        respOk(['skipped'=>true]);
    }

    $msPerHour  = 60 * 60 * 1000;
    $hoursMissed = floor(($now - $lastFed) / $msPerHour);

    // 不足24小时，无惩罚（正常范围）
    if ($hoursMissed < 24) respOk(['skipped'=>true, 'hoursMissed'=>$hoursMissed]);

    // ===== 计算积分惩罚（阶梯递增）=====
    // 每个 24h 阶梯的额外扣分（累计式，越久越多）
    $penaltyTable = [
        24  => 10,   // 第1天未喂：扣10分
        48  => 20,   // 第2天未喂：再扣20分（累计30）
        72  => 30,   // 第3天未喂：再扣30分（累计60）
        96  => 40,   // 第4天未喂：再扣40分（累计100）
        120 => 50,   // 第5天未喂：再扣50分（累计150）
        144 => 50,   // 第6天未喂：再扣50分（累计200）
    ];

    $died = false;
    $totalPointPenalty = 0;

    // 7天（168h）不喂，宠物饿死
    if ($hoursMissed >= 168) {
        $died = true;
    } else {
        // 按阶梯累计积分扣除
        foreach ($penaltyTable as $threshold => $penalty) {
            if ($hoursMissed >= $threshold) {
                $totalPointPenalty += $penalty;
            }
        }
    }

    // ===== 补算离线期间状态衰减（重现离线时宠物的真实状态）=====
    $status = $row['pet_status'] ? json_decode($row['pet_status'], true) : ['health'=>100,'hungry'=>100,'happy'=>100,'clean'=>100];

    // 补算离线期间状态衰减（模拟每次 tick 的随机衰减，最多算 168h 即7天）
    // 注意：离线期间 tick 间隔本身也是随机的（45~90min），这里用平均约 67min 估算 tick 次数
    $calcHours = min((int)$hoursMissed, 168);
    // 将离线小时数转换为估算 tick 次数（每 67 分钟一次，加少量随机）
    $estimatedTicks = max(1, (int)round($calcHours * 60 / 67));
    mt_srand((int)($lastFed / 1000));  // 用 lastFed 作种子，保证同一用户每次补算结果一致
    for ($t = 0; $t < $estimatedTicks; $t++) {
        $dHungry = mt_rand(2, 5);
        $dHappy  = mt_rand(1, 3);
        $dClean  = mt_rand(1, 3);
        $status['hungry'] = max(0, ($status['hungry'] ?? 100) - $dHungry);
        $status['happy']  = max(0, ($status['happy']  ?? 100) - $dHappy);
        $status['clean']  = max(0, ($status['clean']  ?? 100) - $dClean);
        // 饱食/清洁过低时健康随机受损（最低1，死亡由7天阈值控制）
        if ($status['hungry'] < 30 || $status['clean'] < 30) {
            $dHealth = mt_rand(2, 4);
            $status['health'] = max(1, ($status['health'] ?? 100) - $dHealth);
        }
    }

    $currentPoints = (int)$row['points'];
    $log = $row['points_log'] ? json_decode($row['points_log'], true) : [];

    if ($died) {
        // 宠物饿死：积分清零，状态归零
        $status = ['health'=>0,'hungry'=>0,'happy'=>0,'clean'=>0];
        $lostPts = $currentPoints;
        if ($lostPts > 0) {
            $log[] = ['icon'=>'💔','label'=>"宠物超过7天没被照顾，饿死了...全部积分已清零",'delta'=>-$lostPts,'time'=>date('Y-m-d H:i'),'total'=>0];
        } else {
            $log[] = ['icon'=>'💔','label'=>"宠物超过7天没被照顾，饿死了...",'delta'=>0,'time'=>date('Y-m-d H:i'),'total'=>0];
        }
        $pdo->prepare("UPDATE students SET pet_dead=1,pet_hatch_progress=0,pet_status=?,points=0,points_log=?,last_fed_at=? WHERE id=?")
            ->execute([json_encode($status), json_encode($log, JSON_UNESCAPED_UNICODE), $now, $id]);
        respOk(['died'=>true,'hoursMissed'=>$hoursMissed,'pointLost'=>$lostPts,'petStatus'=>$status]);
    }

    // 未死亡：扣积分（不低于0）
    $actualDeduct   = min($totalPointPenalty, $currentPoints);
    $newPoints      = max(0, $currentPoints - $totalPointPenalty);
    $daysMissed     = floor($hoursMissed / 24);

    if ($actualDeduct > 0) {
        $log[] = ['icon'=>'⏰','label'=>"{$daysMissed}天未喂宠物，扣除 {$actualDeduct} 积分（请记得照顾宠物！）",'delta'=>-$actualDeduct,'time'=>date('Y-m-d H:i'),'total'=>$newPoints];
    }

    // 写入：更新积分、状态，不重置 last_fed_at（保持真实喂食时间，让下次登录继续正确计算）
    $pdo->prepare("UPDATE students SET points=?,pet_status=?,points_log=? WHERE id=?")
        ->execute([$newPoints, json_encode($status), json_encode($log, JSON_UNESCAPED_UNICODE), $id]);

    respOk([
        'hoursMissed'    => $hoursMissed,
        'daysMissed'     => $daysMissed,
        'pointPenalty'   => $actualDeduct,
        'died'           => false,
        'petStatus'      => $status,
        'newPoints'      => $newPoints,
    ]);
}

// ===== 更新学生数据（通用） =====
if ($action === 'update') {
    $id      = (int)($input['id'] ?? 0);
    $updates = $input['updates'] ?? [];
    if (!$id) respErr('id 不能为空');

    $allowed = ['pet_status','backpack','points_log','pet_exp','pet_stage','pet_dead','pet_hatch_progress','last_fed_at','last_grant_reason','buy_deduct'];
    $sets = [];
    $vals = [];

    // 映射前端字段名到数据库字段名
    $fieldMap = [
        'petStatus'       => 'pet_status',
        'backpack'        => 'backpack',
        'pointsLog'       => 'points_log',
        'petExp'          => 'pet_exp',
        'petStage'        => 'pet_stage',
        'petDead'         => 'pet_dead',
        'petHatchProgress'=> 'pet_hatch_progress',
        '_lastFedAt'      => 'last_fed_at',
        '_lastGrantReason'=> 'last_grant_reason',
        '_buyDeduct'      => 'buy_deduct',
        'petType'         => 'pet_type',
        'petName'         => 'pet_name',
        'points'          => 'points',
    ];

    foreach ($updates as $key => $val) {
        $dbKey = $fieldMap[$key] ?? $key;
        if (is_array($val) || is_object($val)) $val = json_encode($val, JSON_UNESCAPED_UNICODE);
        $sets[] = "`{$dbKey}`=?";
        $vals[] = $val;
    }
    if (empty($sets)) respErr('没有可更新的字段');
    $vals[] = $id;
    $pdo->prepare("UPDATE students SET " . implode(',', $sets) . " WHERE id=?")->execute($vals);
    respOk();
}

respErr('未知操作');

// ===== 工具函数 =====
function decodeStudent($row) {
    if (!$row) return null;
    $row['role']       = 'student';
    $row['petType']    = $row['pet_type'];
    $row['petName']    = $row['pet_name'];
    $row['petExp']     = (int)$row['pet_exp'];
    $row['petStage']   = (int)$row['pet_stage'];
    $row['petDead']    = (bool)$row['pet_dead'];
    $row['petHatchProgress'] = (int)$row['pet_hatch_progress'];
    $row['petStatus']  = $row['pet_status']  ? json_decode($row['pet_status'], true)  : ['health'=>100,'hungry'=>100,'happy'=>100,'clean'=>100];
    $row['backpack']   = $row['backpack']    ? json_decode($row['backpack'], true)     : (object)[];
    $row['pointsLog']  = $row['points_log']  ? json_decode($row['points_log'], true)  : [];
    $row['joinDate']   = $row['join_date'];
    $row['_lastFedAt'] = $row['last_fed_at'] ? (int)$row['last_fed_at'] : null;
    $row['_lastGrantReason'] = $row['last_grant_reason'];
    $row['_buyDeduct'] = (int)$row['buy_deduct'];
    $row['dailyExpDate']   = $row['daily_exp_date']   ?? null;
    $row['dailyExpEarned'] = (int)($row['daily_exp_earned'] ?? 0);
    $row['points']     = (int)$row['points'];
    $row['id']         = (int)$row['id'];
    foreach(['pet_type','pet_name','pet_exp','pet_stage','pet_dead','pet_hatch_progress','pet_status','points_log','join_date','last_fed_at','last_grant_reason','buy_deduct','daily_exp_date','daily_exp_earned'] as $k) {
        unset($row[$k]);
    }
    return $row;
}

function addPointsDB($pdo, $studentId, $pts, $reason, $icon='⭐') {
    $s = $pdo->prepare("SELECT * FROM students WHERE id=?");
    $s->execute([$studentId]);
    $row = $s->fetch();
    if (!$row) return;

    $newPoints = (int)$row['points'] + $pts;
    // 积分与宠物经验完全解耦：积分不再转化为宠物经验
    // 宠物经验只通过喂食/洗澡/玩耍/治疗等护理行为每日积累（有每日上限）
    $log = $row['points_log'] ? json_decode($row['points_log'], true) : [];
    $log[] = ['icon'=>$icon,'label'=>$reason,'delta'=>$pts,'time'=>date('Y-m-d H:i'),'total'=>$newPoints];

    $pdo->prepare("UPDATE students SET points=?,points_log=?,last_grant_reason=? WHERE id=?")
        ->execute([$newPoints, json_encode($log, JSON_UNESCAPED_UNICODE), $reason, $studentId]);
}

function getPetLevel($exp) {
    $stages = [0,100,300,600,1000,1500,2200,3100,4200,5600,7200,9000,11200,13700,16500,20000,24000,28500,33500,39000,45000];
    for ($i = count($stages)-1; $i >= 0; $i--) {
        if ($exp >= $stages[$i]) return $i;
    }
    return 0;
}
