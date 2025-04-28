import { GPS_CONFIG, PUNCH_CONFIG } from './config.js';
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

// 監聽位置權限變更
function setupPermissionListener() {
    navigator.permissions.query({ name: 'geolocation' }).then(function(permissionStatus) {
        // 初始檢查
        handlePermissionChange(permissionStatus);

        // 監聽權限變更
        permissionStatus.onchange = function() {
            handlePermissionChange(this);
        };
    });
}

// 處理權限變更
function handlePermissionChange(permissionStatus) {
    const locationInfo = document.getElementById('locationInfo');
    const locationStatus = locationInfo.querySelector('.location-status');
    
    if (permissionStatus.state === 'denied') {
        locationStatus.innerHTML = '<i class="fas fa-exclamation-triangle text-danger"></i> 請啟用位置權限以進行打卡';
        locationStatus.className = 'location-status text-danger';
        locationInfo.querySelector('.latitude-display').textContent = '--';
        locationInfo.querySelector('.longitude-display').textContent = '--';
    }
    
    // 更新按鈕狀態
    updatePunchButtonsState();
}

// 更新打卡按鈕狀態
function updatePunchButtonsState() {
    const status = getPunchStatus();
    const clockInBtn = document.querySelector('.punch-btn[data-type="clockIn"]');
    const clockOutBtn = document.querySelector('.punch-btn[data-type="clockOut"]');
    const authMessage = document.getElementById('authMessage');
    let isUserValid = true;
    let errorMessage = '';

    console.log('打卡狀態：', status); // 除錯用

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

    console.log('檢查狀態：', {  // 除錯用
        isUserValid,
        isGPSValid,
        isLocationDenied,
        canClockIn: status.canClockIn,
        canClockOut: status.canClockOut,
        currentHour: status.currentHour
    });

    // 設置按鈕狀態
    if (clockInBtn) {
        const shouldDisable = !isUserValid || !isGPSValid || isLocationDenied || !status.canClockIn;
        clockInBtn.disabled = shouldDisable;
        clockInBtn.style.opacity = shouldDisable ? '0.6' : '1';
        clockInBtn.style.cursor = shouldDisable ? 'not-allowed' : 'pointer';
        
        const message = !isUserValid ? errorMessage : 
                       isLocationDenied ? '請啟用位置權限以進行打卡' :
                       !isGPSValid ? '位置超出打卡範圍' :
                       !status.canClockIn ? '不在上班打卡時間內' :
                       status.lastClockIn ? `已於 ${status.lastClockIn} 完成上班打卡` : '';
        
        clockInBtn.title = message;
        console.log('上班按鈕狀態：', { shouldDisable, message }); // 除錯用
    }

    if (clockOutBtn) {
        const shouldDisable = !isUserValid || !isGPSValid || isLocationDenied || !status.canClockOut;
        clockOutBtn.disabled = shouldDisable;
        clockOutBtn.style.opacity = shouldDisable ? '0.6' : '1';
        clockOutBtn.style.cursor = shouldDisable ? 'not-allowed' : 'pointer';
        
        const message = !isUserValid ? errorMessage :
                       isLocationDenied ? '請啟用位置權限以進行打卡' :
                       !isGPSValid ? '位置超出打卡範圍' :
                       !status.canClockOut ? '不在下班打卡時間內' :
                       status.lastClockOut ? `已於 ${status.lastClockOut} 完成下班打卡` :
                       !status.lastClockIn ? '請先進行上班打卡' : '';
        
        clockOutBtn.title = message;
        console.log('下班按鈕狀態：', { shouldDisable, message }); // 除錯用
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
        // 更新錯誤訊息樣式
        const messageElement = document.getElementById('punchMessage');
        if (messageElement) {
            messageElement.style.color = '#dc3545';
            messageElement.style.fontWeight = 'bold';
            messageElement.style.fontSize = '1.2rem';
            messageElement.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${error.message}`;
        }
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
            setupPermissionListener(); // 添加權限監聽器
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