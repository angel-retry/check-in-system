import { formatTime, formatDate } from './utils.js';

// 更新時間顯示
export function updateTimeDisplay() {
    const now = new Date();
    const timeDisplay = document.querySelector('.time-display');
    const dateDisplay = document.querySelector('.date-display');
    
    if (timeDisplay && dateDisplay) {
        timeDisplay.textContent = formatTime(now);
        dateDisplay.textContent = formatDate(now);
    }
}

// 打卡按鈕狀態控制
export function setPunchButtonState(button, isDisabled, message = '') {
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

// 更新打卡按鈕狀態
export function updatePunchButtonsState(isDisabled, message = '') {
    const buttons = document.querySelectorAll('.punch-btn');
    const authMessage = document.getElementById('authMessage');
    
    buttons.forEach(button => {
        setPunchButtonState(button, isDisabled, message);
    });
    
    if (authMessage) {
        authMessage.innerText = isDisabled ? message : '';
    }
}

// 更新打卡訊息
export function updatePunchMessage(type, success, message) {
    const punchMessage = document.getElementById('punchMessage');
    if (!punchMessage) return;

    const actionText = type === 'clockIn' ? '上班' : '下班';
    if (success) {
        punchMessage.innerText = `${actionText}打卡成功！\n時間：${message}`;
    } else {
        punchMessage.innerText = `打卡失敗：${message}`;
    }
}

// 註冊按鈕狀態控制
export function setRegisterButtonLoading(isLoading) {
    const button = document.getElementById('registerButton');
    if (!button) return;

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

// 重新整理按鈕動畫
export function setRefreshButtonSpinning(isSpinning) {
    const refreshIcon = document.querySelector('.fa-sync-alt');
    if (refreshIcon) {
        if (isSpinning) {
            refreshIcon.classList.add('spinning');
        } else {
            refreshIcon.classList.remove('spinning');
        }
    }
} 