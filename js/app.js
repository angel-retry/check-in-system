import { GPS_CONFIG } from './config.js';
import { showLoading, hideLoading } from './utils.js';
import { checkGPSLocation, isGPSValid } from './gps.js';
import { getCurrentUser, registerUser, updateUserDisplay } from './auth.js';
import { doPunch } from './punch.js';
import { 
    updateTimeDisplay, 
    setPunchButtonState,
    updatePunchMessage,
    setRegisterButtonLoading,
    setRefreshButtonSpinning
} from './ui.js';
import { showToast } from './toast.js';

// 檢查打卡條件
async function checkPunchConditions() {
    // 檢查用戶資料
    try {
        getCurrentUser();
    } catch (error) {
        throw error;
    }
    // 檢查位置權限和 GPS
    const locationStatus = document.querySelector('.location-status');
    if (locationStatus && locationStatus.textContent.includes('請啟用位置權限')) {
        throw new Error('請啟用位置權限以進行打卡');
    }
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

// 更新打卡按鈕狀態
function updatePunchButtonsState() {
    const punchBtn = document.getElementById('punchBtn');
    const authMessage = document.getElementById('authMessage');
    let isUserValid = true;
    let errorMessage = '';

    // 檢查用戶登入狀態
    try {
        getCurrentUser();
    } catch (error) {
        isUserValid = false;
        errorMessage = error.message;
        if (authMessage) {
            authMessage.innerHTML = '<i class="fas fa-exclamation-triangle"></i> ' + error.message;
            authMessage.style.color = '#dc3545';
            authMessage.style.fontWeight = 'bold';
        }
    }

    // 檢查 GPS 狀態
    const locationStatus = document.querySelector('.location-status');
    const isLocationDenied = locationStatus && (
        locationStatus.textContent.includes('請啟用位置權限') ||
        locationStatus.textContent.includes('無法取得位置')
    );
    const isGPSValid = locationStatus && locationStatus.classList.contains('text-success');

    // 設置按鈕狀態
    if (punchBtn) {
        let shouldDisable = false;
        let tip = '';
        if (!isUserValid) {
            shouldDisable = true;
            tip = errorMessage;
        } else if (isLocationDenied) {
            shouldDisable = true;
            tip = '請啟用位置權限以進行打卡';
        } else if (!isGPSValid) {
            shouldDisable = true;
            tip = '位置超出打卡範圍';
        }
        punchBtn.disabled = shouldDisable;
        punchBtn.style.opacity = shouldDisable ? '0.6' : '1';
        punchBtn.style.cursor = shouldDisable ? 'not-allowed' : 'pointer';
        punchBtn.title = tip;
    }
}

// 打卡功能
export function punchTime() {
    (async () => {
        try {
            showLoading();
            await checkPunchConditions();
            // 執行打卡
            const punchTime = doPunch();
            // 更新打卡訊息
            const messageElement = document.getElementById('punchMessage');
            if (messageElement) {
                messageElement.style.color = '#28a745';
                messageElement.style.fontWeight = 'bold';
                messageElement.style.fontSize = '1.2rem';
                messageElement.innerText = `✅ 打卡成功！\n時間：${punchTime}`;
            }
            // 更新按鈕狀態
            updatePunchButtonsState();
        } catch (error) {
            // 更新錯誤訊息樣式
            const messageElement = document.getElementById('punchMessage');
            if (messageElement) {
                messageElement.style.color = '#dc3545';
                messageElement.style.fontWeight = 'bold';
                messageElement.style.fontSize = '1.2rem';
                messageElement.innerHTML = `<i class=\"fas fa-exclamation-triangle\"></i> ${error.message}`;
            }
        } finally {
            hideLoading();
        }
    })();
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
window.updatePunchButtonsState = updatePunchButtonsState;

document.addEventListener('DOMContentLoaded', async function() {
    // 更新時間顯示
    updateTimeDisplay();
    setInterval(updateTimeDisplay, 1000);
    
    // 如果是打卡頁面
    if (document.getElementById('punchBtn')) {
        try {
            showLoading();
            // 預設先讓按鈕 disabled
            const punchBtn = document.getElementById('punchBtn');
            if (punchBtn) {
                punchBtn.disabled = true;
                punchBtn.style.opacity = '0.6';
                punchBtn.style.cursor = 'not-allowed';
                punchBtn.title = '定位中...';
            }
            // 無論登入與否都呼叫 checkGPSLocation
            console.log('初始化時呼叫 checkGPSLocation');
            await checkGPSLocation();
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

function updateLocationInfo(position) {
    const { latitude, longitude } = position.coords;
    const locationInfo = document.getElementById('locationInfo');
    const locationStatus = locationInfo.querySelector('.location-status');
    
    // 更新座標顯示
    locationInfo.querySelector('.latitude-display').textContent = latitude.toFixed(6);
    locationInfo.querySelector('.longitude-display').textContent = longitude.toFixed(6);
    
    // 檢查是否在允許範圍內
    const isInRange = checkLocationRange(latitude, longitude);
    
    if (isInRange) {
        locationStatus.innerHTML = '<i class="fas fa-check-circle text-success"></i> 位置正常';
        locationStatus.className = 'location-status text-success';
    } else {
        locationStatus.innerHTML = '<i class="fas fa-exclamation-triangle text-danger"></i> 超出打卡範圍';
        locationStatus.className = 'location-status text-danger';
    }
    
    // 更新按鈕狀態
    updatePunchButtonsState();
}

function handleLocationError(error) {
    const locationInfo = document.getElementById('locationInfo');
    const locationStatus = locationInfo.querySelector('.location-status');
    const errorMessage = error.code === 1 
        ? '<i class="fas fa-exclamation-triangle text-danger"></i> 請啟用位置權限以進行打卡'
        : '<i class="fas fa-exclamation-triangle text-danger"></i> 無法取得位置';
    
    locationStatus.innerHTML = errorMessage;
    locationStatus.className = 'location-status text-danger';
    
    locationInfo.querySelector('.latitude-display').textContent = '--';
    locationInfo.querySelector('.longitude-display').textContent = '--';
    
    console.error('位置錯誤:', error);
    
    // 更新按鈕狀態
    updatePunchButtonsState();
}

export function refreshPage() {
    location.reload();
} 