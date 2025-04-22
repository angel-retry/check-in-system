// 儲存員工資料
let employees = JSON.parse(localStorage.getItem('employees')) || [];

// 載入畫面控制
function showLoading() {
    document.getElementById('loading-overlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden');
}

// 更新時間顯示
function updateCurrentTime() {
    const now = new Date();
    const timeDisplay = document.querySelector('.time-display');
    const dateDisplay = document.querySelector('.date-display');
    
    if (timeDisplay && dateDisplay) {
        // 更新時間，確保時分秒都是兩位數
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        timeDisplay.textContent = `${hours}:${minutes}:${seconds}`;
        
        // 更新日期
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric', 
            weekday: 'long' 
        };
        dateDisplay.textContent = now.toLocaleDateString('zh-TW', options);
    }
}

// 註冊按鈕狀態控制
function setRegisterButtonLoading(isLoading) {
    const button = document.getElementById('registerButton');
    const textSpan = button.querySelector('.register-text');
    const loadingSpan = button.querySelector('.register-loading');
    
    if (isLoading) {
        button.disabled = true;
        textSpan.classList.add('d-none');
        loadingSpan.classList.remove('d-none');
    } else {
        button.disabled = false;
        textSpan.classList.remove('d-none');
        loadingSpan.classList.add('d-none');
    }
}

// 打卡按鈕狀態控制
function setPunchButtonState(button, isDisabled, message = '') {
    button.disabled = isDisabled;
    if (isDisabled) {
        button.classList.add('btn-secondary');
        button.classList.remove(button.dataset.type === 'clockIn' ? 'btn-success' : 'btn-danger');
    } else {
        button.classList.remove('btn-secondary');
        button.classList.add(button.dataset.type === 'clockIn' ? 'btn-success' : 'btn-danger');
    }
    button.title = message;
}

// 獲取 cookie 的函數
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

// 設置 cookie 的函數
function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = `expires=${date.toUTCString()}`;
    document.cookie = `${name}=${value};${expires};path=/`;
}

// 全局變量來追踪 GPS 狀態
let hasValidGPS = false;

// GPS 狀態顯示
function updateGPSStatus(status, message) {
    const locationStatus = document.querySelector('.location-status');
    const latitudeDisplay = document.querySelector('.latitude-display');
    const longitudeDisplay = document.querySelector('.longitude-display');
    
    if (!locationStatus) return;
    
    switch (status) {
        case 'loading':
            locationStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 定位中...';
            locationStatus.style.color = '#666';
            if (latitudeDisplay) latitudeDisplay.textContent = '---';
            if (longitudeDisplay) longitudeDisplay.textContent = '---';
            break;
        case 'success':
            locationStatus.innerHTML = '<i class="fas fa-map-marker-alt"></i> 已獲取位置';
            locationStatus.style.color = '#28a745';
            if (latitudeDisplay) latitudeDisplay.textContent = message.latitude.toFixed(6);
            if (longitudeDisplay) longitudeDisplay.textContent = message.longitude.toFixed(6);
            break;
        case 'error':
            locationStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> ' + message;
            locationStatus.style.color = '#dc3545';
            if (latitudeDisplay) latitudeDisplay.textContent = '---';
            if (longitudeDisplay) longitudeDisplay.textContent = '---';
            break;
    }
}

// 檢查 GPS 位置
async function checkGPSLocation() {
    if (!navigator.geolocation) {
        updateGPSStatus('error', '您的瀏覽器不支援地理位置功能');
        throw new Error('您的瀏覽器不支援地理位置功能');
    }

    updateGPSStatus('loading');

    try {
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: false,  // 改為 false，不要求高精確度
                timeout: 10000,            // 延長到 10 秒
                maximumAge: 30000          // 允許使用 30 秒內的快取位置
            });
        });

        hasValidGPS = true;
        updateGPSStatus('success', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        });
        return position;
    } catch (error) {
        hasValidGPS = false;
        let errorMessage = '無法獲取地理位置';
        
        switch (error.code) {
            case 1: // PERMISSION_DENIED
                errorMessage = '您已拒絕提供位置資訊，請開啟位置權限';
                break;
            case 2: // POSITION_UNAVAILABLE
                errorMessage = '無法獲取您的位置資訊，請確認GPS已開啟';
                break;
            case 3: // TIMEOUT
                errorMessage = '獲取位置資訊超時，請確認網路連線正常且GPS已開啟';
                break;
        }
        
        updateGPSStatus('error', errorMessage);
        throw new Error(errorMessage);
    }
}

// 檢查打卡條件
async function checkPunchConditions() {
    const userId = getCookie('userId');
    if (!userId) {
        throw new Error('請先註冊後再打卡');
    }

    let retryCount = 0;
    const maxRetries = 2;  // 最多重試 2 次

    while (retryCount <= maxRetries) {
        try {
            await checkGPSLocation();
            return true;
        } catch (error) {
            if (error.message.includes('超時') && retryCount < maxRetries) {
                retryCount++;
                await new Promise(resolve => setTimeout(resolve, 1000));  // 等待 1 秒後重試
                continue;
            }
            throw error;
        }
    }
}

// 更新打卡按鈕狀態
async function updatePunchButtonsState() {
    const buttons = document.querySelectorAll('.punch-btn');
    const authMessage = document.getElementById('authMessage');
    
    try {
        await checkPunchConditions();
        buttons.forEach(button => {
            setPunchButtonState(button, false, button.dataset.type === 'clockIn' ? '上班打卡' : '下班打卡');
        });
        if (authMessage) authMessage.innerText = '';
    } catch (error) {
        buttons.forEach(button => {
            setPunchButtonState(button, true, error.message);
        });
        if (authMessage) authMessage.innerText = error.message;
    }
}

// 打卡功能
async function punchTime(type) {
    try {
        showLoading();
        await checkPunchConditions();
        
        // 模擬打卡處理時間
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const now = new Date();
        const timeString = now.toLocaleTimeString('zh-TW');
        
        // 更新訊息
        const actionText = type === 'clockIn' ? '上班' : '下班';
        const message = `${actionText}打卡成功！\n時間：${timeString}`;
        document.getElementById('punchMessage').innerText = message;
    } catch (error) {
        document.getElementById('punchMessage').innerText = `打卡失敗：${error.message}`;
    } finally {
        hideLoading();
    }
}

// 更新用戶資訊顯示
function updateUserInfo() {
    const userNameElement = document.getElementById('userName');
    const userId = getCookie('userId');
    
    if (!userId) {
        if (userNameElement) userNameElement.textContent = '尚未登入';
        return;
    }
    
    const employees = JSON.parse(localStorage.getItem('employees')) || [];
    const employee = employees.find(emp => emp.id === userId);
    
    if (employee && userNameElement) {
        userNameElement.textContent = employee.name;
    }
}

// 重新整理頁面
async function refreshPage() {
    const refreshIcon = document.querySelector('.fa-sync-alt');
    refreshIcon.classList.add('spinning');
    showLoading();
    
    try {
        await checkGPSLocation();  // 先檢查 GPS
        await updatePunchButtonsState();  // 再更新按鈕狀態
        updateUserInfo();  // 最後更新用戶資訊
    } catch (error) {
        console.error('更新狀態失敗：', error);
    } finally {
        hideLoading();
        refreshIcon.classList.remove('spinning');
    }
}

// 處理註冊表單提交
if (document.getElementById('registerForm')) {
    document.getElementById('registerForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // 顯示載入動畫和禁用按鈕
        showLoading();
        setRegisterButtonLoading(true);
        
        const name = document.getElementById('employeeName').value;
        const id = document.getElementById('employeeId').value;
        
        try {
            // 檢查工號是否已存在
            if (employees.some(emp => emp.id === id)) {
                throw new Error('此工號已被註冊！');
            }
            
            // 模擬註冊處理時間
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // 新增員工資料
            employees.push({ name, id });
            localStorage.setItem('employees', JSON.stringify(employees));
            
            // 設置 cookie
            setCookie('userId', id, 30); // 設置 30 天的 cookie
            
            alert('註冊成功！');
            window.location.href = 'index.html';
        } catch (error) {
            alert(error.message);
        } finally {
            // 隱藏載入動畫和啟用按鈕
            hideLoading();
            setRegisterButtonLoading(false);
        }
    });
}

// 頁面初始化
document.addEventListener('DOMContentLoaded', async function() {
    // 更新時間顯示
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    
    // 如果是打卡頁面
    if (document.querySelector('.punch-btn')) {
        try {
            showLoading();
            await checkGPSLocation();  // 先檢查 GPS
            await updatePunchButtonsState();  // 再更新按鈕狀態
            updateUserInfo();  // 最後更新用戶資訊
        } catch (error) {
            console.error('初始化失敗：', error);
        } finally {
            hideLoading();
        }
    }
}); 