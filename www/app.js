/**
 * 清息控烟 - 核心应用逻辑
 * 纯本地离线 PWA，无外部依赖
 */

(function () {
  'use strict';

  // ==========================================
  // 常量与默认配置
  // ==========================================
  const STORAGE_KEYS = {
    SETTINGS: 'smokefree_settings_v1',
    LOGS: 'smokefree_smoke_logs_v1',
    RESISTS: 'smokefree_resist_logs_v1',
    ACTIVE_DAYS: 'smokefree_active_days_v1',
    DAY_PRICES: 'smokefree_day_prices_v1', // 每日基准时价快照映射表
  };

  const DEFAULT_SETTINGS = {
    packPrice: 25,       // 单包价格 (元)
    pastDaily: 20,       // 既往日均吸烟量 (支)
    dailyTarget: 10,     // 今日目标上限 (支)
    wakeTime: '08:00',   // 清醒开始时间
    sleepTime: '23:59',  // 清醒结束时间
  };

  const BREATH_QUOTES = [
    '烟瘾在体内只是一道短暂的神经波浪，跟随深呼吸，它会在3分钟内退散。',
    '每一口新鲜空气，都在帮助肺泡重新恢复活力与弹性。',
    '你不是真正想抽烟，你的大脑只是在寻求一次片刻的深呼吸放松。',
    '喝一口温水，感受温润流过喉咙，冲淡对焦油的渴求。',
    '刚才的冲动已经过去一半，你比自己想象的更有掌控力！',
    '少抽一根，血液中的一氧化碳水平就在悄悄下降。'
  ];

  // ==========================================
  // 状态管理
  // ==========================================
  let state = {
    settings: loadSettings(),
    logs: loadLogs(),
    resists: loadResists(),
    activeDays: loadActiveDays(),
    dayPrices: loadDayPrices(),
    lastCreatedLogId: null,
    resistInterval: null,
    resistTimeLeft: 300,
    breathPhaseTimer: null,
    currentTrendRange: 7, // 7 天或 30 天
  };

  // ==========================================
  // DOM 元素引用
  // ==========================================
  const DOM = {
    // 顶部与账单
    totalSavedMoney: document.getElementById('totalSavedMoney'),
    totalSavedCigs: document.getElementById('totalSavedCigs'),
    totalResistCount: document.getElementById('totalResistCount'),
    currentDateStr: document.getElementById('currentDateStr'),
    planBadge: document.getElementById('planBadge'),
    btnOpenSettings: document.getElementById('btnOpenSettings'),

    // Tab 导航
    navTabs: document.querySelectorAll('.nav-tab'),
    tabPanes: document.querySelectorAll('.tab-pane'),

    // 今日配额卡片
    todayCount: document.getElementById('todayCount'),
    targetQuota: document.getElementById('targetQuota'),
    quotaStatusTag: document.getElementById('quotaStatusTag'),
    quotaProgressBar: document.getElementById('quotaProgressBar'),
    timeSinceLast: document.getElementById('timeSinceLast'),
    recommendedInterval: document.getElementById('recommendedInterval'),
    intervalStatus: document.getElementById('intervalStatus'),

    // 近 7 天消耗与花费卡片
    sevenDayCostTag: document.getElementById('sevenDayCostTag'),
    sevenDayCountVal: document.getElementById('sevenDayCountVal'),
    sevenDayConversionPill: document.getElementById('sevenDayConversionPill'),
    sevenDayDailyAvgText: document.getElementById('sevenDayDailyAvgText'),
    sevenDayTotalCostVal: document.getElementById('sevenDayTotalCostVal'),
    sevenDayPackPriceVal: document.getElementById('sevenDayPackPriceVal'),

    // 核心操作
    btnSmoke: document.getElementById('btnSmoke'),
    smokeBtnText: document.getElementById('smokeBtnText'),
    smokeBtnSub: document.getElementById('smokeBtnSub'),
    undoBar: document.getElementById('undoBar'),
    lastSmokeTimeStr: document.getElementById('lastSmokeTimeStr'),
    btnQuickUndo: document.getElementById('btnQuickUndo'),
    btnResist: document.getElementById('btnResist'),
    todayResistBadge: document.getElementById('todayResistBadge'),
    healthTipText: document.getElementById('healthTipText'),

    // 手动场景选择抽屉 (取消自动倒计时)
    scenarioDrawer: document.getElementById('scenarioDrawer'),
    btnCloseScenario: document.getElementById('btnCloseScenario'),
    btnSkipScenario: document.getElementById('btnSkipScenario'),
    scenarioChips: document.getElementById('scenarioChips'),

    // 忍一忍全屏模态
    modalResist: document.getElementById('modalResist'),
    btnCloseResist: document.getElementById('btnCloseResist'),
    btnCancelResist: document.getElementById('btnCancelResist'),
    btnCompleteResistEarly: document.getElementById('btnCompleteResistEarly'),
    breathCircle: document.getElementById('breathCircle'),
    breathPhaseText: document.getElementById('breathPhaseText'),
    breathCounter: document.getElementById('breathCounter'),
    resistTotalTimer: document.getElementById('resistTotalTimer'),
    breathQuote: document.getElementById('breathQuote'),

    // 冲动二次确认模态
    modalWarning: document.getElementById('modalWarning'),
    warningDiffMinutes: document.getElementById('warningDiffMinutes'),
    warningDailyTarget: document.getElementById('warningDailyTarget'),
    btnDialogResist: document.getElementById('btnDialogResist'),
    btnDialogConfirmSmoke: document.getElementById('btnDialogConfirmSmoke'),

    // 设置模态
    modalSettings: document.getElementById('modalSettings'),
    btnCloseSettings: document.getElementById('btnCloseSettings'),
    formSettings: document.getElementById('formSettings'),
    settingPackPrice: document.getElementById('settingPackPrice'),
    settingPastDaily: document.getElementById('settingPastDaily'),
    settingDailyTarget: document.getElementById('settingDailyTarget'),
    settingWakeTime: document.getElementById('settingWakeTime'),
    settingSleepTime: document.getElementById('settingSleepTime'),
    perCigPriceHelper: document.getElementById('perCigPriceHelper'),
    awakeIntervalHelper: document.getElementById('awakeIntervalHelper'),

    // 统计图表与账单概览
    statsActiveDaysTag: document.getElementById('statsActiveDaysTag'),
    statsTotalExpense: document.getElementById('statsTotalExpense'),
    statsTotalPacks: document.getElementById('statsTotalPacks'),
    statsTotalSavedMoney: document.getElementById('statsTotalSavedMoney'),
    statsTotalSavedCigsText: document.getElementById('statsTotalSavedCigsText'),
    stats7dText: document.getElementById('stats7dText'),
    btnRange7: document.getElementById('btnRange7'),
    btnRange30: document.getElementById('btnRange30'),
    trendChart: document.getElementById('trendChart'),
    hourlyChart: document.getElementById('hourlyChart'),
    scenarioChart: document.getElementById('scenarioChart'),
    scenarioLegendList: document.getElementById('scenarioLegendList'),

    // 数据备份与管理
    btnCopyJSON: document.getElementById('btnCopyJSON'),
    btnExportJSON: document.getElementById('btnExportJSON'),
    inputImportJSON: document.getElementById('inputImportJSON'),
    textareaPasteJSON: document.getElementById('textareaPasteJSON'),
    btnRestoreFromText: document.getElementById('btnRestoreFromText'),
    btnSeedDemoData: document.getElementById('btnSeedDemoData'),
    btnClearAllData: document.getElementById('btnClearAllData'),

    // Toast
    toastMessage: document.getElementById('toastMessage'),
  };

  // ==========================================
  // 初始化入口
  // ==========================================
  function init() {
    markTodayActive();
    bindEvents();
    renderAll();

    // 启动秒级实时时钟，动态刷新用时与间隔状态
    setInterval(() => {
      updateTimeIndicators();
    }, 1000);
  }

  // ==========================================
  // 数据持久化方法
  // ==========================================
  function loadSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? Object.assign({}, DEFAULT_SETTINGS, JSON.parse(data)) : Object.assign({}, DEFAULT_SETTINGS);
    } catch (e) {
      return Object.assign({}, DEFAULT_SETTINGS);
    }
  }

  function saveSettings(newSettings) {
    state.settings = Object.assign({}, state.settings, newSettings);
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings));
  }

  function loadLogs() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LOGS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveLogs(logs) {
    state.logs = logs;
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  }

  function loadResists() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RESISTS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveResists(resists) {
    state.resists = resists;
    localStorage.setItem(STORAGE_KEYS.RESISTS, JSON.stringify(resists));
  }

  function loadActiveDays() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_DAYS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveActiveDays(days) {
    state.activeDays = days;
    localStorage.setItem(STORAGE_KEYS.ACTIVE_DAYS, JSON.stringify(days));
  }

  function loadDayPrices() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DAY_PRICES);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }

  function saveDayPrices(prices) {
    state.dayPrices = prices;
    localStorage.setItem(STORAGE_KEYS.DAY_PRICES, JSON.stringify(prices));
  }

  // 记录当天生效的单包价格快照（如果当天已有快照则保留）
  function recordDayPriceSnapshot(dateStr, packPrice) {
    if (!state.dayPrices[dateStr]) {
      state.dayPrices[dateStr] = packPrice;
      saveDayPrices(state.dayPrices);
    }
  }

  // 获取单条打卡记录的时价（单支价格），兼顾旧数据平滑回退
  function getLogCigPrice(log) {
    if (log) {
      if (typeof log.pricePerCig === 'number' && !isNaN(log.pricePerCig)) {
        return log.pricePerCig;
      }
      if (typeof log.packPrice === 'number' && !isNaN(log.packPrice)) {
        return log.packPrice / 20;
      }
    }
    return (state.settings.packPrice || 25) / 20;
  }

  // 记录今天已打开/使用 App
  function markTodayActive() {
    const today = getTodayDateStr();
    if (!state.activeDays.includes(today)) {
      state.activeDays.push(today);
      saveActiveDays(state.activeDays);
    }
  }

  // ==========================================
  // 核心计算工具函数
  // ==========================================

  // 计算清醒总时长（分钟）
  function getAwakeMinutes(wakeTime, sleepTime) {
    const parseTime = (str) => {
      if (!str) return 0;
      if (str === '24:00') return 24 * 60;
      const parts = str.split(':').map(Number);
      return parts[0] * 60 + parts[1];
    };
    const wake = parseTime(wakeTime || '08:00');
    const sleep = parseTime(sleepTime || '23:59');
    if (sleep > wake) {
      return sleep - wake;
    } else {
      return (24 * 60 - wake) + sleep;
    }
  }

  // 计算推荐安全间隔（分钟/支）
  function getRecommendedIntervalMinutes() {
    const awakeMins = getAwakeMinutes(state.settings.wakeTime, state.settings.sleepTime);
    const target = Math.max(1, state.settings.dailyTarget);
    return Math.max(10, Math.floor(awakeMins / target));
  }

  // 获取今天的日期字符串 YYYY-MM-DD
  function getTodayDateStr() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 格式化日期对象为 YYYY-MM-DD
  function formatDateStr(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 获取今日的打卡记录
  function getTodayLogs() {
    const today = getTodayDateStr();
    return state.logs.filter(item => item.timestamp.slice(0, 10) === today);
  }

  // 获取今日克制成功的次数
  function getTodayResistCount() {
    const today = getTodayDateStr();
    return state.resists.filter(item => item.timestamp.slice(0, 10) === today).length;
  }

  // 获取最近一次打卡记录
  function getLastLog() {
    if (!state.logs || state.logs.length === 0) return null;
    return state.logs[state.logs.length - 1];
  }

  /**
   * 真实省钱算法：
   * 严格规范：
   * 1. 累计省钱金额只统计【昨天及以前已过完】、且【当天有打开/打卡/克制记录】的天数；
   * 2. 跳过完全未打开 App 的日期，避免账单虚高；
   * 3. 每天省钱金额严格按照【当天记录绑定的单包价格快照】换算，修改当前设置不篡改历史省钱账单。
   */
  function calculateTotalSavings() {
    const pastDaily = state.settings.pastDaily;
    const todayStr = getTodayDateStr();

    // 收集所有发生过打卡或克制的日期
    const activeDateSet = new Set(state.activeDays);
    state.logs.forEach(log => {
      activeDateSet.add(log.timestamp.slice(0, 10));
    });
    state.resists.forEach(r => {
      activeDateSet.add(r.timestamp.slice(0, 10));
    });

    let totalSavedCigs = 0;
    let totalSavedMoneyNum = 0;
    let settledDaysCount = 0;

    // 按天归集打卡记录
    const dailyLogsMap = {};
    state.logs.forEach(log => {
      const d = log.timestamp.slice(0, 10);
      if (!dailyLogsMap[d]) dailyLogsMap[d] = [];
      dailyLogsMap[d].push(log);
    });

    // 遍历所有有记录的历史日期（严格要求 d < todayStr 且在 activeDateSet 中）
    activeDateSet.forEach(d => {
      if (d < todayStr) {
        settledDaysCount++;
        const dayLogs = dailyLogsMap[d] || [];
        const actual = dayLogs.length;
        const saved = Math.max(0, pastDaily - actual);
        totalSavedCigs += saved;

        // 确定当天适用的单支价格快照
        let dayPricePerCig = 0;
        if (dayLogs.length > 0) {
          // 若当天有吸烟，按当天记录的平均时价计算
          dayPricePerCig = dayLogs.reduce((acc, l) => acc + getLogCigPrice(l), 0) / dayLogs.length;
        } else if (state.dayPrices[d]) {
          // 若当天全天克制成功未抽烟，取当天记录的单包价格快照
          dayPricePerCig = state.dayPrices[d] / 20;
        } else {
          dayPricePerCig = (state.settings.packPrice || 25) / 20;
        }

        totalSavedMoneyNum += saved * dayPricePerCig;
      }
    });

    return {
      totalSavedMoney: totalSavedMoneyNum.toFixed(2),
      totalSavedCigs,
      settledDaysCount,
      totalResists: state.resists.length
    };
  }

  /**
   * 计算近 7 天消耗与花费：
   * 1. 严格按照 1 包 = 20 根、1 条 = 10 包 (200 根) 标准换算；
   * 2. 烟资花费全部按每条记录实际打卡时保存的快照时价进行累加，不随全局设置改变而失真。
   */
  function calculateSevenDayStats() {
    const now = new Date();
    const past7Dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      past7Dates.push(formatDateStr(d));
    }

    const logs7d = state.logs.filter(log => past7Dates.includes(log.timestamp.slice(0, 10)));
    const count = logs7d.length;

    // 换算包数与条数 (1包=20根，1条=200根)
    const packs = (count / 20).toFixed(1);
    const cartons = (count / 200).toFixed(2);

    // 累加近 7 天内每根烟打卡时的真实时价
    let totalCostNum = 0;
    logs7d.forEach(log => {
      totalCostNum += getLogCigPrice(log);
    });
    const totalCost = totalCostNum.toFixed(2);
    const dailyAvg = (count / 7).toFixed(1);

    const currentPerCigPrice = (state.settings.packPrice / 20).toFixed(2);

    return {
      count,
      packs,
      cartons,
      totalCost,
      dailyAvg,
      perCigPrice: currentPerCigPrice,
      packPrice: state.settings.packPrice
    };
  }

  /**
   * 计算历史累计总花费与总消耗（全部打卡记录）：
   * 每一根烟的花费均按其打卡时固化的历史单价累加
   */
  function calculateAllTimeStats() {
    const count = state.logs.length;
    let totalCostNum = 0;
    state.logs.forEach(log => {
      totalCostNum += getLogCigPrice(log);
    });

    const totalCost = totalCostNum.toFixed(2);
    const packs = (count / 20).toFixed(1);
    const cartons = (count / 200).toFixed(2);

    return {
      count,
      packs,
      cartons,
      totalCost
    };
  }

  // ==========================================
  // 视图渲染与状态更新
  // ==========================================

  function renderAll() {
    renderHeaderSavings();
    renderQuotaCard();
    renderSevenDayCard();
    renderStatsOverview();
    updateTimeIndicators();
    renderCharts();
  }

  // 1. 渲染顶部成果卡片
  function renderHeaderSavings() {
    const { totalSavedMoney, totalSavedCigs, settledDaysCount, totalResists } = calculateTotalSavings();
    DOM.totalSavedMoney.textContent = `￥${totalSavedMoney}`;
    DOM.totalSavedCigs.textContent = `${totalSavedCigs}`;
    DOM.totalResistCount.textContent = `${totalResists}`;

    const now = new Date();
    DOM.currentDateStr.textContent = settledDaysCount > 0 
      ? `已真实结算 ${settledDaysCount} 天成果`
      : `${now.getMonth() + 1}月${now.getDate()}日 (今日进行中)`;
    DOM.planBadge.textContent = `目标 ≤${state.settings.dailyTarget}支/天`;
    DOM.todayResistBadge.textContent = `今日已克制 ${getTodayResistCount()} 次`;
  }

  // 2. 渲染配额卡片
  function renderQuotaCard() {
    const todayLogs = getTodayLogs();
    const count = todayLogs.length;
    const target = state.settings.dailyTarget;

    DOM.todayCount.textContent = count;
    DOM.targetQuota.textContent = target;

    const percent = Math.min(100, Math.round((count / target) * 100));
    DOM.quotaProgressBar.style.width = `${percent}%`;

    DOM.quotaProgressBar.classList.remove('warn', 'danger');
    DOM.quotaStatusTag.classList.remove('warn', 'danger');

    if (count > target) {
      DOM.quotaStatusTag.textContent = `超出目标 +${count - target}`;
      DOM.quotaStatusTag.classList.add('danger');
      DOM.quotaProgressBar.classList.add('danger');
    } else if (count === target) {
      DOM.quotaStatusTag.textContent = '已达今日上限';
      DOM.quotaStatusTag.classList.add('warn');
      DOM.quotaProgressBar.classList.add('warn');
    } else if (count >= target * 0.7) {
      DOM.quotaStatusTag.textContent = '接近目标限额';
      DOM.quotaStatusTag.classList.add('warn');
      DOM.quotaProgressBar.classList.add('warn');
    } else {
      DOM.quotaStatusTag.textContent = '节制优秀';
    }

    const interval = getRecommendedIntervalMinutes();
    const hours = Math.floor(interval / 60);
    const mins = interval % 60;
    DOM.recommendedInterval.textContent = hours > 0 ? `${hours}时${mins}分` : `${mins}分钟`;
  }

  // 3. 渲染近 7 天消耗与花费卡片
  function renderSevenDayCard() {
    const s7 = calculateSevenDayStats();
    DOM.sevenDayCostTag.textContent = `￥${s7.totalCost}`;
    DOM.sevenDayCountVal.textContent = s7.count;
    DOM.sevenDayConversionPill.textContent = `折合 ${s7.packs} 包 (${s7.cartons} 条)`;
    DOM.sevenDayDailyAvgText.textContent = `日均约 ${s7.dailyAvg} 支/天`;
    DOM.sevenDayTotalCostVal.textContent = `￥${s7.totalCost}`;
    DOM.sevenDayPackPriceVal.textContent = `￥${s7.packPrice}/包 (￥${s7.perCigPrice}/支)`;
  }

  // 4. 渲染统计页账单总览卡片
  function renderStatsOverview() {
    const all = calculateAllTimeStats();
    const savings = calculateTotalSavings();
    const s7 = calculateSevenDayStats();

    if (DOM.statsActiveDaysTag) {
      DOM.statsActiveDaysTag.textContent = `已真实结算 ${savings.settledDaysCount} 天`;
    }
    if (DOM.statsTotalExpense) {
      DOM.statsTotalExpense.textContent = `￥${all.totalCost}`;
    }
    if (DOM.statsTotalPacks) {
      DOM.statsTotalPacks.textContent = `共 ${all.count} 支 · 折合 ${all.packs} 包 (${all.cartons} 条)`;
    }
    if (DOM.statsTotalSavedMoney) {
      DOM.statsTotalSavedMoney.textContent = `￥${savings.totalSavedMoney}`;
    }
    if (DOM.statsTotalSavedCigsText) {
      DOM.statsTotalSavedCigsText.textContent = `累计真实少抽 ${savings.totalSavedCigs} 支`;
    }
    if (DOM.stats7dText) {
      DOM.stats7dText.textContent = `${s7.count} 支 (折合 ${s7.packs} 包 · ￥${s7.totalCost})`;
    }
  }

  // 5. 实时更新时间指标与打卡大按钮状态
  function updateTimeIndicators() {
    const last = getLastLog();
    const intervalMins = getRecommendedIntervalMinutes();

    if (!last) {
      DOM.timeSinceLast.textContent = '今日尚无记录';
      DOM.intervalStatus.textContent = '安全状态';
      DOM.intervalStatus.className = 'rhythm-val highlight-state';
      setSmokeBtnSafe('抽了一根', '点击精准记录');
      return;
    }

    const diffMs = Date.now() - new Date(last.timestamp).getTime();
    const diffMinutes = Math.floor(diffMs / (60 * 1000));
    const h = Math.floor(diffMinutes / 60);
    const m = diffMinutes % 60;

    let timeStr = '';
    if (diffMinutes < 1) {
      timeStr = '刚刚打卡';
    } else if (h > 0) {
      timeStr = `${h}小时${m}分`;
    } else {
      timeStr = `${m}分钟前`;
    }
    DOM.timeSinceLast.textContent = timeStr;

    // 判断是否在安全间隔时间内
    if (diffMinutes < intervalMins) {
      const waitRemaining = intervalMins - diffMinutes;
      DOM.intervalStatus.textContent = `需等待 ${waitRemaining} 分钟`;
      DOM.intervalStatus.className = 'rhythm-val highlight-state warn';
      setSmokeBtnWarning(waitRemaining);
    } else {
      DOM.intervalStatus.textContent = '已过安全间隔';
      DOM.intervalStatus.className = 'rhythm-val highlight-state';
      setSmokeBtnSafe('抽了一根', `已超间隔 +${diffMinutes - intervalMins}分`);
    }
  }

  function setSmokeBtnSafe(mainText, subText) {
    DOM.btnSmoke.className = 'big-action-button state-safe';
    DOM.smokeBtnText.textContent = mainText;
    DOM.smokeBtnSub.textContent = subText;
  }

  function setSmokeBtnWarning(waitMinutes) {
    DOM.btnSmoke.className = 'big-action-button state-warning';
    DOM.smokeBtnText.textContent = '⚠️ 处于间隔期';
    DOM.smokeBtnSub.textContent = `建议忍耐 ${waitMinutes} 分钟 (点击将二次确认)`;
  }

  // ==========================================
  // 打卡操作与防误触
  // ==========================================

  function handleSmokeClick() {
    const last = getLastLog();
    const intervalMins = getRecommendedIntervalMinutes();

    if (last) {
      const diffMs = Date.now() - new Date(last.timestamp).getTime();
      const diffMinutes = Math.floor(diffMs / (60 * 1000));
      if (diffMinutes < intervalMins) {
        const waitMins = intervalMins - diffMinutes;
        showWarningModal(waitMins);
        return;
      }
    }

    recordSmokeLog();
  }

  function recordSmokeLog(sceneTag = '未注明') {
    const currentPackPrice = parseFloat(state.settings.packPrice) || 25;
    const currentPricePerCig = currentPackPrice / 20;
    const todayStr = getTodayDateStr();

    // 记录当天基准价格快照
    recordDayPriceSnapshot(todayStr, currentPackPrice);

    const newLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toISOString(),
      sceneTag: sceneTag,
      packPrice: currentPackPrice,       // 打卡时价快照 (单包)
      pricePerCig: currentPricePerCig    // 打卡时价快照 (单支)
    };

    state.logs.push(newLog);
    state.lastCreatedLogId = newLog.id;
    saveLogs(state.logs);
    markTodayActive();

    // 触觉震动反馈
    if (window.navigator && window.navigator.vibrate) {
      try { window.navigator.vibrate([40, 60, 40]); } catch (e) {}
    }

    renderAll();
    showToast('已成功记录 1 根 🚬');

    // 显示快捷撤销条
    const dateObj = new Date(newLog.timestamp);
    const timeFormatted = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
    DOM.lastSmokeTimeStr.textContent = timeFormatted;
    DOM.undoBar.style.display = 'flex';

    // 弹出手动选择场景抽屉 (无倒计时)
    openScenarioDrawer();
  }

  function handleQuickUndo() {
    if (!state.lastCreatedLogId && state.logs.length === 0) return;

    const targetId = state.lastCreatedLogId || (state.logs[state.logs.length - 1] && state.logs[state.logs.length - 1].id);
    const idx = state.logs.findIndex(item => item.id === targetId);

    if (idx !== -1) {
      state.logs.splice(idx, 1);
      saveLogs(state.logs);
      state.lastCreatedLogId = null;
      DOM.undoBar.style.display = 'none';
      closeScenarioDrawer();
      renderAll();
      showToast('已撤销刚才的打卡记录 ↩️');
    }
  }

  // ==========================================
  // 手动场景标签抽屉 (取消 3 秒倒计时)
  // ==========================================
  function openScenarioDrawer() {
    DOM.scenarioDrawer.classList.add('open');
  }

  function closeScenarioDrawer() {
    DOM.scenarioDrawer.classList.remove('open');
  }

  function handleSelectScenario(tag) {
    if (state.lastCreatedLogId) {
      const targetLog = state.logs.find(item => item.id === state.lastCreatedLogId);
      if (targetLog) {
        targetLog.sceneTag = tag;
        saveLogs(state.logs);
        renderCharts();
        showToast(`已标记场景：${tag}`);
      }
    }
    closeScenarioDrawer();
  }

  // ==========================================
  // 冲动二次确认模态
  // ==========================================
  function showWarningModal(waitMinutes) {
    DOM.warningDiffMinutes.textContent = waitMinutes;
    DOM.warningDailyTarget.textContent = state.settings.dailyTarget;
    DOM.modalWarning.style.display = 'flex';
  }

  function closeWarningModal() {
    DOM.modalWarning.style.display = 'none';
  }

  // ==========================================
  // “忍一忍” 5分钟抗烟瘾极简深呼吸
  // ==========================================
  function openResistModal() {
    DOM.modalResist.style.display = 'flex';
    state.resistTimeLeft = 300;
    updateResistTimerDisplay();
    startBreathCycle();
    updateBreathQuote();

    if (state.resistInterval) clearInterval(state.resistInterval);
    state.resistInterval = setInterval(() => {
      state.resistTimeLeft--;
      updateResistTimerDisplay();

      if (state.resistTimeLeft % 15 === 0) {
        updateBreathQuote();
      }

      if (state.resistTimeLeft <= 0) {
        finishResist(true);
      }
    }, 1000);
  }

  function closeResistModal() {
    DOM.modalResist.style.display = 'none';
    if (state.resistInterval) {
      clearInterval(state.resistInterval);
      state.resistInterval = null;
    }
    if (state.breathPhaseTimer) {
      clearTimeout(state.breathPhaseTimer);
      state.breathPhaseTimer = null;
    }
  }

  function updateResistTimerDisplay() {
    const mins = Math.floor(state.resistTimeLeft / 60);
    const secs = state.resistTimeLeft % 60;
    DOM.resistTotalTimer.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function updateBreathQuote() {
    const idx = Math.floor(Math.random() * BREATH_QUOTES.length);
    DOM.breathQuote.textContent = BREATH_QUOTES[idx];
  }

  function startBreathCycle() {
    let phase = 'inhale';
    let count = 4;

    const runPhase = () => {
      if (DOM.modalResist.style.display === 'none') return;

      DOM.breathCircle.className = `breath-circle ${phase}`;
      if (phase === 'inhale') {
        DOM.breathPhaseText.textContent = '缓慢吸气';
        DOM.breathCounter.textContent = count;
      } else if (phase === 'hold') {
        DOM.breathPhaseText.textContent = '平稳屏气';
        DOM.breathCounter.textContent = count;
      } else {
        DOM.breathPhaseText.textContent = '缓缓呼气';
        DOM.breathCounter.textContent = count;
      }

      if (count > 1) {
        count--;
        state.breathPhaseTimer = setTimeout(runPhase, 1000);
      } else {
        if (phase === 'inhale') {
          phase = 'hold';
          count = 4;
        } else if (phase === 'hold') {
          phase = 'exhale';
          count = 6;
        } else {
          phase = 'inhale';
          count = 4;
        }
        state.breathPhaseTimer = setTimeout(runPhase, 1000);
      }
    };

    runPhase();
  }

  function finishResist(isCompleted = false) {
    closeResistModal();

    const resistRecord = {
      id: 'resist_' + Date.now(),
      timestamp: new Date().toISOString(),
      durationSeconds: 300 - state.resistTimeLeft,
      fullCompleted: isCompleted
    };
    state.resists.push(resistRecord);
    saveResists(state.resists);
    markTodayActive();

    renderAll();

    if (window.navigator && window.navigator.vibrate) {
      try { window.navigator.vibrate([100, 50, 100, 50, 150]); } catch (e) {}
    }

    showToast('🎉 成功克制烟瘾！克制计数 +1 根！');
  }

  // ==========================================
  // 设置管理
  // ==========================================
  function openSettingsModal() {
    DOM.settingPackPrice.value = state.settings.packPrice;
    DOM.settingPastDaily.value = state.settings.pastDaily;
    DOM.settingDailyTarget.value = state.settings.dailyTarget;
    DOM.settingWakeTime.value = state.settings.wakeTime;
    DOM.settingSleepTime.value = state.settings.sleepTime;
    updateSettingsHelpers();
    DOM.modalSettings.style.display = 'flex';
  }

  function closeSettingsModal() {
    DOM.modalSettings.style.display = 'none';
  }

  function updateSettingsHelpers() {
    const price = parseFloat(DOM.settingPackPrice.value) || 25;
    DOM.perCigPriceHelper.textContent = `折合单支: ￥${(price / 20).toFixed(2)}`;

    const wake = DOM.settingWakeTime.value || '08:00';
    const sleep = DOM.settingSleepTime.value || '23:59';
    const target = parseInt(DOM.settingDailyTarget.value, 10) || 10;
    const awakeMins = getAwakeMinutes(wake, sleep);
    const interval = Math.max(10, Math.floor(awakeMins / target));
    const h = (awakeMins / 60).toFixed(1);
    DOM.awakeIntervalHelper.textContent = `清醒约 ${h} 小时，目标 ${target} 支，推荐间隔约 ${interval} 分钟/支`;
  }

  function handleSaveSettings(e) {
    e.preventDefault();
    const packPrice = parseFloat(DOM.settingPackPrice.value);
    const pastDaily = parseInt(DOM.settingPastDaily.value, 10);
    const dailyTarget = parseInt(DOM.settingDailyTarget.value, 10);
    const wakeTime = DOM.settingWakeTime.value;
    const sleepTime = DOM.settingSleepTime.value;

    if (packPrice <= 0 || pastDaily <= 0 || dailyTarget <= 0) {
      showToast('请填写大于0的有效数值！');
      return;
    }

    saveSettings({
      packPrice,
      pastDaily,
      dailyTarget,
      wakeTime,
      sleepTime
    });

    closeSettingsModal();
    renderAll();
    showToast('偏好配置已保存！');
  }

  // ==========================================
  // 高清自适应 Canvas 图表引擎 (适配 devicePixelRatio)
  // ==========================================

  function setupCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width || canvas.clientWidth || 340;
    const height = parseFloat(canvas.getAttribute('height')) || 180;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx, width, height };
  }

  function renderCharts() {
    renderTrendChart();
    renderHourlyChart();
    renderScenarioChart();
  }

  // 1. 绘制近 7 天 / 30 天吸烟趋势柱状图
  function renderTrendChart() {
    const canvas = DOM.trendChart;
    if (!canvas) return;
    const { ctx, width, height } = setupCanvas(canvas);

    ctx.clearRect(0, 0, width, height);

    const rangeDays = state.currentTrendRange;
    const dates = [];
    const counts = [];
    const target = state.settings.dailyTarget;

    const now = new Date();
    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const str = formatDateStr(d);
      dates.push(str);
      const count = state.logs.filter(log => log.timestamp.slice(0, 10) === str).length;
      counts.push(count);
    }

    const padding = { top: 25, right: 15, bottom: 25, left: 25 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxVal = Math.max(target + 3, ...counts, 5);

    // 绘制横向网格与 Y 轴刻度
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748b';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';

    const ySteps = 4;
    for (let i = 0; i <= ySteps; i++) {
      const yVal = Math.round((maxVal / ySteps) * i);
      const yPos = padding.top + chartHeight - (yVal / maxVal) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, yPos);
      ctx.lineTo(width - padding.right, yPos);
      ctx.stroke();
      ctx.fillText(yVal, padding.left - 6, yPos + 3);
    }

    // 绘制目标红色参考虚线
    const targetY = padding.top + chartHeight - (target / maxVal) * chartHeight;
    ctx.save();
    ctx.strokeStyle = '#ef4444';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padding.left, targetY);
    ctx.lineTo(width - padding.right, targetY);
    ctx.stroke();
    ctx.restore();

    // 绘制柱状图
    const barCount = dates.length;
    const gap = rangeDays === 7 ? 10 : 3;
    const barWidth = Math.max(3, (chartWidth - (barCount - 1) * gap) / barCount);

    dates.forEach((dateStr, i) => {
      const count = counts[i];
      const barH = (count / maxVal) * chartHeight;
      const x = padding.left + i * (barWidth + gap);
      const y = padding.top + chartHeight - barH;

      const isOver = count > target;
      const grad = ctx.createLinearGradient(0, y, 0, padding.top + chartHeight);
      if (isOver) {
        grad.addColorStop(0, '#f87171');
        grad.addColorStop(1, '#ef4444');
      } else {
        grad.addColorStop(0, '#34d399');
        grad.addColorStop(1, '#059669');
      }

      ctx.fillStyle = grad;
      drawRoundedRect(ctx, x, y, barWidth, Math.max(2, barH), Math.min(barWidth / 2, 4));
      ctx.fill();

      if (rangeDays === 7 || count > 0) {
        ctx.fillStyle = isOver ? '#fca5a5' : '#a7f3d0';
        ctx.textAlign = 'center';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText(count, x + barWidth / 2, y - 4);
      }

      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      if (rangeDays === 7) {
        const shortDate = dateStr.slice(5);
        ctx.fillText(shortDate, x + barWidth / 2, height - 8);
      } else if (i % 5 === 0 || i === barCount - 1) {
        const shortDate = dateStr.slice(5);
        ctx.fillText(shortDate, x + barWidth / 2, height - 8);
      }
    });
  }

  // 2. 绘制 24 小时高发时段柱状分布
  function renderHourlyChart() {
    const canvas = DOM.hourlyChart;
    if (!canvas) return;
    const { ctx, width, height } = setupCanvas(canvas);

    ctx.clearRect(0, 0, width, height);

    const hourlyCounts = new Array(24).fill(0);
    state.logs.forEach(log => {
      const d = new Date(log.timestamp);
      const h = d.getHours();
      hourlyCounts[h]++;
    });

    const padding = { top: 20, right: 15, bottom: 22, left: 20 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const maxVal = Math.max(...hourlyCounts, 3);

    const barWidth = (chartWidth - 23 * 2) / 24;

    hourlyCounts.forEach((count, h) => {
      const barH = (count / maxVal) * chartHeight;
      const x = padding.left + h * (barWidth + 2);
      const y = padding.top + chartHeight - barH;

      const isPeak = count >= 3 && count === maxVal;
      const grad = ctx.createLinearGradient(0, y, 0, padding.top + chartHeight);
      if (isPeak) {
        grad.addColorStop(0, '#fbbf24');
        grad.addColorStop(1, '#d97706');
      } else {
        grad.addColorStop(0, '#38bdf8');
        grad.addColorStop(1, '#1e40af');
      }

      ctx.fillStyle = count > 0 ? grad : 'rgba(255, 255, 255, 0.05)';
      drawRoundedRect(ctx, x, y, barWidth, Math.max(2, barH), 2);
      ctx.fill();

      if ([0, 6, 12, 18, 23].includes(h)) {
        ctx.fillStyle = '#64748b';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${h}h`, x + barWidth / 2, height - 6);
      }
    });
  }

  // 3. 绘制场景诱因分布环形图
  function renderScenarioChart() {
    const canvas = DOM.scenarioChart;
    if (!canvas) return;
    const { ctx, width, height } = setupCanvas(canvas);

    ctx.clearRect(0, 0, width, height);

    const tagCounts = {};
    state.logs.forEach(log => {
      const tag = log.sceneTag || '未注明';
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });

    const palette = [
      '#10b981', '#38bdf8', '#f59e0b', '#ec4899', '#8b5cf6', '#6366f1', '#14b8a6', '#64748b'
    ];

    const sortedTags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]);
    const total = state.logs.length;

    DOM.scenarioLegendList.innerHTML = '';
    if (total === 0) {
      DOM.scenarioLegendList.innerHTML = '<div style="font-size:12px;color:#64748b;">暂无场景数据，打卡时可快捷标记</div>';
    } else {
      sortedTags.slice(0, 5).forEach((tag, idx) => {
        const count = tagCounts[tag];
        const percent = Math.round((count / total) * 100);
        const color = palette[idx % palette.length];

        const item = document.createElement('div');
        item.className = 'scenario-legend-item';
        item.innerHTML = `
          <div class="scenario-legend-info">
            <span class="scenario-color-dot" style="background:${color}"></span>
            <span style="color:#cbd5e1;">${tag}</span>
          </div>
          <span class="scenario-count">${count}次 (${percent}%)</span>
        `;
        DOM.scenarioLegendList.appendChild(item);
      });
    }

    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = Math.min(centerX, centerY) - 8;
    const innerRadius = outerRadius * 0.65;

    if (total === 0) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = outerRadius - innerRadius;
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('无数据', centerX, centerY + 4);
      return;
    }

    let startAngle = -Math.PI / 2;
    sortedTags.forEach((tag, idx) => {
      const sliceAngle = (tagCounts[tag] / total) * (Math.PI * 2);
      const endAngle = startAngle + sliceAngle;
      const color = palette[idx % palette.length];

      ctx.beginPath();
      ctx.arc(centerX, centerY, (outerRadius + innerRadius) / 2, startAngle, endAngle);
      ctx.strokeStyle = color;
      ctx.lineWidth = outerRadius - innerRadius - 2;
      ctx.stroke();

      startAngle = endAngle;
    });

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${total}`, centerX, centerY);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    ctx.fillText('总支数', centerX, centerY + 14);
  }

  function drawRoundedRect(ctx, x, y, width, height, radius) {
    if (height < radius) radius = height / 2;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  // ==========================================
  // 数据导入/导出与一键复制备份
  // ==========================================

  function getBackupDataObj() {
    return {
      version: '1.3',
      exportTime: new Date().toISOString(),
      appName: '清息控烟',
      settings: state.settings,
      logs: state.logs,
      resists: state.resists,
      activeDays: state.activeDays,
      dayPrices: state.dayPrices,
    };
  }

  // 一键复制 JSON 备份到剪贴板
  async function copyBackupJSON() {
    const backupObj = getBackupDataObj();
    const jsonStr = JSON.stringify(backupObj, null, 2);

    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(jsonStr);
        showToast('已复制完整 JSON 备份到剪贴板 📋');
        if (DOM.textareaPasteJSON) {
          DOM.textareaPasteJSON.value = jsonStr;
        }
        return;
      } catch (err) {}
    }

    // 备用方案
    if (DOM.textareaPasteJSON) {
      DOM.textareaPasteJSON.value = jsonStr;
      DOM.textareaPasteJSON.select();
      document.execCommand('copy');
      showToast('已复制备份数据 📋');
    }
  }

  // 从文本框恢复
  function restoreFromText() {
    const text = (DOM.textareaPasteJSON.value || '').trim();
    if (!text) {
      showToast('请先粘贴 JSON 备份数据！');
      return;
    }
    try {
      const data = JSON.parse(text);
      applyRestoredBackup(data);
    } catch (e) {
      showToast('文本格式有误，无法解析为 JSON！');
    }
  }

  function exportBackupJSON() {
    const backupData = getBackupDataObj();
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    const now = new Date();
    const timeStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
    a.href = url;
    a.download = `smokefree_backup_${timeStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('备份文件已生成下载 📥');
  }

  function handleImportJSON(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        applyRestoredBackup(data);
      } catch (err) {
        showToast('备份解析失败，请检查文件格式！');
      }
    };
    reader.readAsText(file);
  }

  function applyRestoredBackup(data) {
    if (!data.settings && !data.logs) {
      throw new Error('未识别的备份数据结构');
    }
    if (data.settings) saveSettings(data.settings);
    if (data.logs) saveLogs(data.logs);
    if (data.resists) saveResists(data.resists);
    if (data.activeDays) saveActiveDays(data.activeDays);
    if (data.dayPrices) saveDayPrices(data.dayPrices);

    renderAll();
    showToast('备份恢复成功！🎉');
  }

  // 生成近 14 天科学控烟演示数据 (包含 activeDays)
  function seedDemoData() {
    const demoLogs = [];
    const demoResists = [];
    const demoActiveDays = [];
    const now = new Date();
    const tags = ['饭后', '工作压力', '开车', '无聊', '社交', '起床'];

    // 过去14天，吸烟量从 16 根减至 8 根
    for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
      const dayDate = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
      const dateStr = formatDateStr(dayDate);
      demoActiveDays.push(dateStr);

      const targetForDay = Math.max(7, Math.round(16 - (14 - dayOffset) * 0.6));
      const actualCount = Math.max(4, targetForDay + Math.floor(Math.random() * 3 - 1));

      for (let c = 0; c < actualCount; c++) {
        const hour = 8 + Math.floor(c * (14 / actualCount)) + (Math.random() > 0.5 ? 1 : 0);
        const minute = Math.floor(Math.random() * 60);
        const logDate = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), Math.min(23, hour), minute);

        demoLogs.push({
          id: 'demo_' + logDate.getTime() + '_' + c,
          timestamp: logDate.toISOString(),
          sceneTag: tags[Math.floor(Math.random() * tags.length)],
          packPrice: 25,
          pricePerCig: 1.25
        });
      }

      const resistCount = 1 + Math.floor(Math.random() * 3);
      for (let r = 0; r < resistCount; r++) {
        const rDate = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 10 + r * 4, 20);
        demoResists.push({
          id: 'demo_r_' + rDate.getTime(),
          timestamp: rDate.toISOString(),
          durationSeconds: 300,
          fullCompleted: true
        });
      }
    }

    saveLogs(demoLogs);
    saveResists(demoResists);
    saveActiveDays(demoActiveDays);
    const demoPrices = {};
    demoActiveDays.forEach(d => { demoPrices[d] = 25; });
    saveDayPrices(demoPrices);
    renderAll();
    showToast('已成功注入 14 天演示数据！✨');
  }

  function clearAllData() {
    if (confirm('确定要清空所有吸烟与克制记录吗？此操作无法撤销。')) {
      saveLogs([]);
      saveResists([]);
      saveActiveDays([getTodayDateStr()]);
      saveDayPrices({});
      state.lastCreatedLogId = null;
      renderAll();
      showToast('所有本地打卡记录已清空');
    }
  }

  // ==========================================
  // 事件绑定
  // ==========================================
  function bindEvents() {
    // Tab 导航切换
    DOM.navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        DOM.navTabs.forEach(t => t.classList.remove('active'));
        DOM.tabPanes.forEach(p => p.classList.remove('active'));

        tab.classList.add('active');
        const targetId = tab.getAttribute('data-tab');
        const targetPane = document.getElementById(targetId);
        if (targetPane) targetPane.classList.add('active');

        if (targetId === 'tab-stats') {
          setTimeout(renderCharts, 50);
          renderStatsOverview();
        }
      });
    });

    // 核心打卡主按钮
    DOM.btnSmoke.addEventListener('click', handleSmokeClick);

    // 快捷撤销
    DOM.btnQuickUndo.addEventListener('click', handleQuickUndo);

    // 手动场景抽屉按钮
    if (DOM.btnCloseScenario) {
      DOM.btnCloseScenario.addEventListener('click', closeScenarioDrawer);
    }
    if (DOM.btnSkipScenario) {
      DOM.btnSkipScenario.addEventListener('click', closeScenarioDrawer);
    }
    DOM.scenarioChips.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip-item');
      if (btn) {
        const tag = btn.getAttribute('data-tag');
        handleSelectScenario(tag);
      }
    });

    // 忍一忍抗烟瘾主按钮
    DOM.btnResist.addEventListener('click', openResistModal);
    DOM.btnCloseResist.addEventListener('click', closeResistModal);
    DOM.btnCancelResist.addEventListener('click', closeResistModal);
    DOM.btnCompleteResistEarly.addEventListener('click', () => finishResist(true));

    // 二次确认冲动拦截
    DOM.btnDialogResist.addEventListener('click', () => {
      closeWarningModal();
      openResistModal();
    });
    DOM.btnDialogConfirmSmoke.addEventListener('click', () => {
      closeWarningModal();
      recordSmokeLog();
    });

    // 设置弹窗
    DOM.btnOpenSettings.addEventListener('click', openSettingsModal);
    DOM.btnCloseSettings.addEventListener('click', closeSettingsModal);
    DOM.formSettings.addEventListener('submit', handleSaveSettings);
    DOM.settingPackPrice.addEventListener('input', updateSettingsHelpers);
    DOM.settingDailyTarget.addEventListener('input', updateSettingsHelpers);
    DOM.settingWakeTime.addEventListener('change', updateSettingsHelpers);
    DOM.settingSleepTime.addEventListener('change', updateSettingsHelpers);

    // 统计周期切换
    DOM.btnRange7.addEventListener('click', () => {
      state.currentTrendRange = 7;
      DOM.btnRange7.classList.add('active');
      DOM.btnRange30.classList.remove('active');
      renderTrendChart();
    });
    DOM.btnRange30.addEventListener('click', () => {
      state.currentTrendRange = 30;
      DOM.btnRange30.classList.add('active');
      DOM.btnRange7.classList.remove('active');
      renderTrendChart();
    });

    // 数据备份与管理
    if (DOM.btnCopyJSON) {
      DOM.btnCopyJSON.addEventListener('click', copyBackupJSON);
    }
    if (DOM.btnRestoreFromText) {
      DOM.btnRestoreFromText.addEventListener('click', restoreFromText);
    }
    DOM.btnExportJSON.addEventListener('click', exportBackupJSON);
    DOM.inputImportJSON.addEventListener('change', (e) => {
      const file = e.target.files[0];
      handleImportJSON(file);
      e.target.value = '';
    });
    DOM.btnSeedDemoData.addEventListener('click', seedDemoData);
    DOM.btnClearAllData.addEventListener('click', clearAllData);
  }

  // Toast 提示条
  let toastTimer = null;
  function showToast(msg) {
    if (toastTimer) clearTimeout(toastTimer);
    DOM.toastMessage.textContent = msg;
    DOM.toastMessage.classList.add('show');
    toastTimer = setTimeout(() => {
      DOM.toastMessage.classList.remove('show');
    }, 2400);
  }

  // 启动
  window.addEventListener('DOMContentLoaded', init);
})();
