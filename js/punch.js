import { STORAGE_CONFIG } from './config.js';
import { getCurrentUser } from './auth.js';

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

    // 檢查今日打卡記錄
    if (type === 'clockIn' && todayRecord.clockIn) {
        throw new Error('今日已完成上班打卡');
    }
    if (type === 'clockOut') {
        if (!todayRecord.clockIn) {
            throw new Error('請先進行上班打卡');
        }
        if (todayRecord.clockOut) {
            throw new Error('今日已完成下班打卡');
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
        
        return {
            canClockIn: !todayRecord.clockIn,
            canClockOut: todayRecord.clockIn && !todayRecord.clockOut,
            lastClockIn: todayRecord.clockIn ? new Date(todayRecord.clockIn).toLocaleTimeString('zh-TW') : null,
            lastClockOut: todayRecord.clockOut ? new Date(todayRecord.clockOut).toLocaleTimeString('zh-TW') : null
        };
    } catch (error) {
        return {
            canClockIn: false,
            canClockOut: false,
            lastClockIn: null,
            lastClockOut: null
        };
    }
} 