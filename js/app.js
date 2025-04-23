import { GPS_CONFIG } from './config.js';
import { showLoading, hideLoading } from './utils.js';
import { checkGPSLocation, isGPSValid } from './gps.js';
import { getCurrentUser, registerUser, updateUserDisplay } from './auth.js';
import { canPunch, doPunch, getPunchStatus } from './punch.js';
import { 
    updateTimeDisplay, 
    setPunchButtonState,
    updatePunchMessage,
    setRegisterButtonLoading,
    setRefreshButtonSpinning
} from './ui.js';
import { showToast } from './toast.js';

// 檢查打卡條件
async function checkPunchConditions(type) {
    // 檢查用戶資料
    try {
        getCurrentUser();
    } catch (error) {
        throw error;
    }

    // 檢查打卡狀態
    try {
        canPunch(type);
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

// 更新打卡記錄顯示
function updatePunchRecordDisplay() {
    const status = getPunchStatus();
    const clockInElement = document.getElementById('clockInTime');
    const clockOutElement = document.getElementById('clockOutTime');
    
    if (clockInElement) {
        clockInElement.textContent = status.lastClockIn || '--:--:--';
        if (status.lastClockIn) {
            clockInElement.style.color = '#28a745';  // 綠色
        }
    }
    
    if (clockOutElement) {
        clockOutElement.textContent = status.lastClockOut || '--:--:--';
        if (status.lastClockOut) {
            clockOutElement.style.color = '#dc3545';  // 紅色
        }
    }
}

// 更新打卡按鈕狀態
function updatePunchButtonsState() {
    const status = getPunchStatus();
    const clockInBtn = document.querySelector('.punch-btn[data-type="clockIn"]');
    const clockOutBtn = document.querySelector('.punch-btn[data-type="clockOut"]');
    const authMessage = document.getElementById('authMessage');

    if (clockInBtn) {
        setPunchButtonState(clockInBtn, !status.canClockIn, 
            status.lastClockIn ? `已於 ${status.lastClockIn} 完成上班打卡` : '');
    }
    if (clockOutBtn) {
        setPunchButtonState(clockOutBtn, !status.canClockOut,
            status.lastClockOut ? `已於 ${status.lastClockOut} 完成下班打卡` : 
            !status.canClockOut && !status.lastClockIn ? '請先進行上班打卡' : '');
    }

    // 更新認證訊息
    if (authMessage) {
        try {
            getCurrentUser();
            authMessage.innerText = '';
        } catch (error) {
            authMessage.innerText = error.message;
            if (clockInBtn) setPunchButtonState(clockInBtn, true, error.message);
            if (clockOutBtn) setPunchButtonState(clockOutBtn, true, error.message);
        }
    }

    // 更新打卡記錄顯示
    updatePunchRecordDisplay();
}

// 打卡功能
export async function punchTime(type) {
    try {
        showLoading();
        await checkPunchConditions(type);
        
        // 執行打卡
        const timeString = doPunch(type);
        const actionText = type === 'clockIn' ? '上班' : '下班';
        const successMessage = `✅ ${actionText}打卡成功！\n時間：${timeString}`;
        
        // 更新打卡訊息
        const messageElement = document.getElementById('punchMessage');
        if (messageElement) {
            messageElement.style.color = '#28a745';
            messageElement.style.fontWeight = 'bold';
            messageElement.style.fontSize = '1.2rem';
            messageElement.innerText = successMessage;
        }
        
        // 更新按鈕狀態和打卡記錄
        updatePunchButtonsState();
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
        updatePunchButtonsState();
    } catch (error) {
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