// 確保 toast 容器存在
function ensureToastContainer() {
    console.log('確保 toast 容器存在');
    let container = document.getElementById('toast-container');
    if (!container) {
        console.log('創建新的 toast 容器');
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
    } else {
        console.log('找到現有的 toast 容器');
    }
    return container;
}

export function showToast(message, type = 'success') {
    console.log('顯示 toast:', message, type);

    // 創建 toast 元素
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            ${message}
        </div>
    `;

    // 設置基礎樣式
    const styles = {
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: type === 'success' ? '#4CAF50' : '#f44336',
        color: 'white',
        padding: '16px 24px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        marginBottom: '10px',
        minWidth: '300px',
        textAlign: 'center',
        fontSize: '16px',
        fontWeight: 'bold',
        zIndex: '999999',
        opacity: '0',
        transform: 'translateY(-20px)',
        transition: 'all 0.3s ease-in-out',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)'
    };

    // 應用樣式
    Object.assign(toast.style, styles);

    // 直接添加到 body
    document.body.appendChild(toast);

    // 強制重繪
    void toast.offsetHeight;

    // 顯示動畫
    requestAnimationFrame(() => {
        console.log('開始顯示動畫');
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    // 3秒後開始淡出
    setTimeout(() => {
        console.log('開始淡出動畫');
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        
        // 動畫結束後移除元素
        setTimeout(() => {
            console.log('移除 toast 元素');
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// 添加全局樣式
const styleId = 'toast-style';
if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .toast {
            pointer-events: none;
            user-select: none;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }
    `;
    document.head.appendChild(style);
} 