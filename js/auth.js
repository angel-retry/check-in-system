import { COOKIE_CONFIG, STORAGE_CONFIG } from './config.js';
import { getCookie, setCookie } from './utils.js';

// 檢查用戶是否已登入
export function isUserLoggedIn() {
    return !!getCookie(COOKIE_CONFIG.USER_ID_KEY);
}

// 獲取當前用戶資訊
export function getCurrentUser() {
    const userId = getCookie(COOKIE_CONFIG.USER_ID_KEY);
    if (!userId) {
        throw new Error('請先註冊後再打卡');
    }
    
    const employees = JSON.parse(localStorage.getItem(STORAGE_CONFIG.EMPLOYEES_KEY)) || [];
    const employee = employees.find(emp => emp.id === userId);
    
    if (!employee) {
        throw new Error('找不到您的員工資料，請重新註冊');
    }
    
    return employee;
}

// 註冊新用戶
export async function registerUser(name, id) {
    const employees = JSON.parse(localStorage.getItem(STORAGE_CONFIG.EMPLOYEES_KEY)) || [];
    
    // 檢查工號是否已存在
    if (employees.some(emp => emp.id === id)) {
        throw new Error('此工號已被註冊！');
    }
    
    // 新增員工資料
    employees.push({ name, id });
    localStorage.setItem(STORAGE_CONFIG.EMPLOYEES_KEY, JSON.stringify(employees));
    
    // 設置 cookie
    setCookie(COOKIE_CONFIG.USER_ID_KEY, id, COOKIE_CONFIG.EXPIRES_DAYS);
}

// 更新用戶顯示名稱
export function updateUserDisplay() {
    const userNameElement = document.getElementById('userName');
    if (!userNameElement) return;

    try {
        const user = getCurrentUser();
        userNameElement.innerHTML = `
            <span class="logged-in">
                <i class="fas fa-user text-success me-2"></i>
                <span class="fw-bold">${user.name}</span>
            </span>
        `;
    } catch (error) {
        userNameElement.innerHTML = `
            <span class="not-logged-in">
                <i class="fas fa-exclamation-triangle text-danger me-2"></i>
                <span class="text-danger fw-bold">尚未登入</span>
            </span>
        `;
    }
} 