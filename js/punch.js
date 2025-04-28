import { STORAGE_CONFIG } from './config.js';
import { getCurrentUser } from './auth.js';
import { PUNCH_CONFIG } from './config.js';

// 獲取今日打卡記錄
function getTodayPunchRecord(userId) {
    const records = JSON.parse(localStorage.getItem(STORAGE_CONFIG.PUNCH_RECORDS_KEY)) || {};
    const today = new Date().toLocaleDateString('zh-TW');
    
    // 如果沒有今天的記錄，創建一個新的
    if (!records[userId] || !records[userId][today]) {
        if (!records[userId]) {
            records[userId] = {};
        }
        records[userId][today] = {
            date: today,
            clockIn: null,
            clockOut: null
        };
    }
    
    return records[userId][today];
}

// 保存打卡記錄
function savePunchRecord(userId, type, timestamp) {
    const records = JSON.parse(localStorage.getItem(STORAGE_CONFIG.PUNCH_RECORDS_KEY)) || {};
    const today = new Date().toLocaleDateString('zh-TW');
    
    if (!records[userId]) {
        records[userId] = {};
    }
    if (!records[userId][today]) {
        records[userId][today] = {
            date: today,
            clockIn: null,
            clockOut: null
        };
    }
    
    records[userId][today][type] = timestamp;
    localStorage.setItem(STORAGE_CONFIG.PUNCH_RECORDS_KEY, JSON.stringify(records));
}

// 檢查是否可以打卡
export function canPunch(type) {
    const user = getCurrentUser();
    const todayRecord = getTodayPunchRecord(user.id);
    const now = new Date();
    const currentHour = now.getHours();

    // 檢查今日打卡記錄
    if (type === 'clockIn') {
        if (todayRecord.clockIn) {
            throw new Error('今日已完成上班打卡');
        }
        // 檢查上班打卡時間
        if (currentHour < PUNCH_CONFIG.WORK_HOURS.START) {
            throw new Error(`上班打卡時間未到，請於 ${PUNCH_CONFIG.WORK_HOURS.START}:00 後打卡`);
        }
        if (currentHour >= PUNCH_CONFIG.WORK_HOURS.CLOCK_IN_END) {
            throw new Error(`已超過上班打卡時間，最晚可打卡時間為 ${PUNCH_CONFIG.WORK_HOURS.CLOCK_IN_END}:00`);
        }
    }
    
    if (type === 'clockOut') {
        if (!todayRecord.clockIn) {
            throw new Error('請先進行上班打卡');
        }
        if (todayRecord.clockOut) {
            throw new Error('今日已完成下班打卡');
        }
        // 檢查下班打卡時間
        if (currentHour < PUNCH_CONFIG.WORK_HOURS.CLOCK_OUT_START) {
            throw new Error(`下班打卡時間未到，請於 ${PUNCH_CONFIG.WORK_HOURS.CLOCK_OUT_START}:00 後打卡`);
        }
        if (currentHour >= PUNCH_CONFIG.WORK_HOURS.END) {
            throw new Error(`已超過下班打卡時間，最晚可打卡時間為 ${PUNCH_CONFIG.WORK_HOURS.END}:00`);
        }
    }

    return true;
}

// 執行打卡
export function doPunch(type) {
    const user = getCurrentUser();
    const now = new Date();
    const timestamp = now.getTime();
    
    // 保存記錄
    savePunchRecord(user.id, type, timestamp);

    return now.toLocaleTimeString('zh-TW');
}

// 獲取打卡狀態
export function getPunchStatus() {
    try {
        const user = getCurrentUser();
        const todayRecord = getTodayPunchRecord(user.id);
        const now = new Date();
        const currentHour = now.getHours();
        
        // 檢查是否在允許的打卡時間範圍內
        const isWithinClockInTime = currentHour >= PUNCH_CONFIG.WORK_HOURS.START && 
                                  currentHour < PUNCH_CONFIG.WORK_HOURS.CLOCK_IN_END;
        const isWithinClockOutTime = currentHour >= PUNCH_CONFIG.WORK_HOURS.CLOCK_OUT_START && 
                                   currentHour < PUNCH_CONFIG.WORK_HOURS.END;
        
        return {
            canClockIn: !todayRecord.clockIn && isWithinClockInTime,
            canClockOut: todayRecord.clockIn && !todayRecord.clockOut && isWithinClockOutTime,
            lastClockIn: todayRecord.clockIn ? new Date(todayRecord.clockIn).toLocaleTimeString('zh-TW') : null,
            lastClockOut: todayRecord.clockOut ? new Date(todayRecord.clockOut).toLocaleTimeString('zh-TW') : null,
            currentHour: currentHour // 添加當前小時以便除錯
        };
    } catch (error) {
        return {
            canClockIn: false,
            canClockOut: false,
            lastClockIn: null,
            lastClockOut: null,
            currentHour: new Date().getHours() // 添加當前小時以便除錯
        };
    }
} 