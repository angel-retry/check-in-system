import { GPS_CONFIG } from './config.js';
import { showLoading, hideLoading } from './utils.js';
import { checkGPSLocation, isGPSValid } from './gps.js';
import { getCurrentUser, registerUser, updateUserDisplay } from './auth.js';
import { 
    updateTimeDisplay, 
    updatePunchButtonsState, 
    updatePunchMessage,
    setRegisterButtonLoading,
    setRefreshButtonSpinning
} from './ui.js';

// 檢查打卡條件
async function checkPunchConditions() {
    // 檢查用戶資料
    try {
        getCurrentUser();
    } catch (error) {
        throw error;
    }

    // 檢查 GPS
    let retryCount = 0;
    while (retryCount <= GPS_CONFIG.MAX_RETRIES) {
        try {
            await checkGPSLocation();
            if (!isGPSValid()) {
                throw new Error('您不在公司允許打卡範圍內');
            }
            return true;
        } catch (error) {
            if (error.message.includes('超時') && retryCount < GPS_CONFIG.MAX_RETRIES) {
                retryCount++;
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
            }
            throw error;
        }
    }
}

// 打卡功能
export async function punchTime(type) {
    try {
        showLoading();
        await checkPunchConditions();
        
        // 模擬打卡處理時間
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const now = new Date();
        const timeString = now.toLocaleTimeString('zh-TW');
        
        updatePunchMessage(type, true, timeString);
    } catch (error) {
        updatePunchMessage(type, false, error.message);
    } finally {
        hideLoading();
    }
}

// 重新整理頁面狀態
export async function refreshPageState() {
    setRefreshButtonSpinning(true);
    showLoading();
    
    try {
        await checkGPSLocation();
        await checkPunchConditions();
        updatePunchButtonsState(false);
    } catch (error) {
        updatePunchButtonsState(true, error.message);
        console.error('更新狀態失敗：', error);
    } finally {
        hideLoading();
        setRefreshButtonSpinning(false);
    }
}

// 處理註冊表單提交
export async function handleRegister(name, id) {
    showLoading();
    setRegisterButtonLoading(true);
    
    try {
        await registerUser(name, id);
        alert('註冊成功！');
        window.location.href = 'index.html';
    } catch (error) {
        alert(error.message);
    } finally {
        hideLoading();
        setRegisterButtonLoading(false);
    }
}

// 頁面初始化
document.addEventListener('DOMContentLoaded', async function() {
    // 更新時間顯示
    updateTimeDisplay();
    setInterval(updateTimeDisplay, 1000);
    
    // 如果是打卡頁面
    if (document.querySelector('.punch-btn')) {
        try {
            showLoading();
            await refreshPageState();
            updateUserDisplay();
        } catch (error) {
            console.error('初始化失敗：', error);
        } finally {
            hideLoading();
        }
    }
    
    // 註冊表單處理
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const name = document.getElementById('employeeName').value;
            const id = document.getElementById('employeeId').value;
            await handleRegister(name, id);
        });
    }
}); 