import { COMPANY_LOCATION, GPS_CONFIG } from './config.js';

// 全局變量來追踪 GPS 狀態
let hasValidGPS = false;

// 計算兩點之間的距離（使用 Haversine 公式）
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = GPS_CONFIG.EARTH_RADIUS_METERS;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
             Math.cos(φ1) * Math.cos(φ2) *
             Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    console.log('距離計算：', {
        當前位置: { 緯度: lat1, 經度: lon1 },
        公司位置: { 緯度: lat2, 經度: lon2 },
        距離: distance.toFixed(2) + '公尺',
        允許範圍: GPS_CONFIG.MAX_DISTANCE_METERS + '公尺'
    });

    return distance;
}

// 檢查是否在允許範圍內
export function checkLocationRange(latitude, longitude) {
    const distance = calculateDistance(
        latitude,
        longitude,
        COMPANY_LOCATION.latitude,
        COMPANY_LOCATION.longitude
    );
    
    const isInRange = distance <= GPS_CONFIG.MAX_DISTANCE_METERS;
    console.log('位置檢查結果：', { isInRange, distance: distance.toFixed(2) + '公尺' });
    
    return isInRange;
}

// GPS 狀態顯示
function updateGPSStatus(status, message) {
    const locationStatus = document.querySelector('.location-status');
    const latitudeDisplay = document.querySelector('.latitude-display');
    const longitudeDisplay = document.querySelector('.longitude-display');
    
    if (!locationStatus) return;
    
    switch (status) {
        case 'loading':
            locationStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 定位中...';
            locationStatus.className = 'location-status text-secondary';
            if (latitudeDisplay) latitudeDisplay.textContent = '---';
            if (longitudeDisplay) longitudeDisplay.textContent = '---';
            break;
        case 'success':
            const distance = calculateDistance(
                message.latitude,
                message.longitude,
                COMPANY_LOCATION.latitude,
                COMPANY_LOCATION.longitude
            );
            const isInRange = distance <= GPS_CONFIG.MAX_DISTANCE_METERS;
            
            locationStatus.innerHTML = isInRange ? 
                '<i class="fas fa-check-circle"></i> 位於公司範圍內' : 
                `<i class="fas fa-exclamation-triangle"></i> 距離公司 ${Math.round(distance)} 公尺，超出打卡範圍`;
            locationStatus.className = `location-status ${isInRange ? 'text-success' : 'text-danger'}`;
            if (latitudeDisplay) latitudeDisplay.textContent = message.latitude.toFixed(6);
            if (longitudeDisplay) longitudeDisplay.textContent = message.longitude.toFixed(6);
            hasValidGPS = isInRange;
            break;
        case 'error':
            locationStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> ' + message;
            locationStatus.className = 'location-status text-danger';
            if (latitudeDisplay) latitudeDisplay.textContent = '---';
            if (longitudeDisplay) longitudeDisplay.textContent = '---';
            hasValidGPS = false;
            break;
    }
}

// 檢查 GPS 位置
export async function checkGPSLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            updateGPSStatus('error', '您的瀏覽器不支援地理位置功能');
            reject(new Error('您的瀏覽器不支援地理位置功能'));
            return;
        }

        updateGPSStatus('loading');

        const options = {
            enableHighAccuracy: true,
            timeout: GPS_CONFIG.TIMEOUT,
            maximumAge: GPS_CONFIG.MAX_AGE
        };

        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                console.log('獲取到的位置：', { 緯度: latitude, 經度: longitude });
                updateGPSStatus('success', {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
                resolve(position);
            },
            error => {
                console.error('GPS錯誤：', error);
                let errorMessage = '無法獲取地理位置';
                switch (error.code) {
                    case 1:
                        errorMessage = '您已拒絕提供位置資訊，請開啟位置權限';
                        break;
                    case 2:
                        errorMessage = '無法獲取您的位置資訊，請確認GPS已開啟';
                        break;
                    case 3:
                        errorMessage = '獲取位置資訊超時，請確認網路連線正常且GPS已開啟';
                        break;
                }
                updateGPSStatus('error', errorMessage);
                reject(new Error(errorMessage));
            },
            options
        );
    });
}

// 檢查 GPS 是否有效
export function isGPSValid() {
    return hasValidGPS;
} 