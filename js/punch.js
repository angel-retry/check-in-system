import { STORAGE_CONFIG } from './config.js';
import { getCurrentUser } from './auth.js';

// 取得今日打卡紀錄（多筆）
function getTodayPunchRecord(userId) {
    const records = JSON.parse(localStorage.getItem(STORAGE_CONFIG.PUNCH_RECORDS_KEY)) || {};
    const today = new Date().toLocaleDateString('zh-TW');
    if (!records[userId]) {
        records[userId] = {};
    }
    if (!records[userId][today]) {
        records[userId][today] = {
            date: today,
            punchTimes: []
        };
    }
    return records[userId][today];
}

// SQL Server datetime 格式
function toSqlDatetime(date) {
    const pad = n => n < 10 ? '0' + n : n;
    return date.getFullYear() + '-' +
        pad(date.getMonth() + 1) + '-' +
        pad(date.getDate()) + ' ' +
        pad(date.getHours()) + ':' +
        pad(date.getMinutes()) + ':' +
        pad(date.getSeconds());
}

// 保存打卡紀錄（多筆，存字串）
function savePunchRecord(userId, sqlDatetime) {
    const records = JSON.parse(localStorage.getItem(STORAGE_CONFIG.PUNCH_RECORDS_KEY)) || {};
    const today = new Date().toLocaleDateString('zh-TW');
    if (!records[userId]) {
        records[userId] = {};
    }
    if (!records[userId][today]) {
        records[userId][today] = {
            date: today,
            punchTimes: []
        };
    }
    records[userId][today].punchTimes.push(sqlDatetime);
    localStorage.setItem(STORAGE_CONFIG.PUNCH_RECORDS_KEY, JSON.stringify(records));
}

// 執行打卡（每次都可打）
export function doPunch() {
    const user = getCurrentUser();
    const now = new Date();
    const sqlDatetime = toSqlDatetime(now);
    savePunchRecord(user.id, sqlDatetime);
    return sqlDatetime;
} 