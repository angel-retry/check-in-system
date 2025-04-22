import { COMPANY_LOCATION, GPS_CONFIG } from './config.js';

// 全局變量來追踪 GPS 狀態
let hasValidGPS = false;

// 計算兩點之間的距離（使用 Haversine 公式）
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = GPS_CONFIG.EARTH_RADIUS_METERS;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
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
            locationStatus.style.color = '#666';
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
            
            locationStatus.innerHTML = '<i class="fas fa-map-marker-alt"></i> ' + 
                (isInRange ? '位於公司範圍內' : `距離公司 ${Math.round(distance)} 公尺，超出打卡範圍`);
            locationStatus.style.color = isInRange ? '#28a745' : '#dc3545';
            if (latitudeDisplay) latitudeDisplay.textContent = message.latitude.toFixed(6);
            if (longitudeDisplay) longitudeDisplay.textContent = message.longitude.toFixed(6);
            hasValidGPS = isInRange;
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
export async function checkGPSLocation() {
    if (!navigator.geolocation) {
        updateGPSStatus('error', '您的瀏覽器不支援地理位置功能');
        throw new Error('您的瀏覽器不支援地理位置功能');
    }

    updateGPSStatus('loading');

    try {
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: false,
                timeout: GPS_CONFIG.TIMEOUT,
                maximumAge: GPS_CONFIG.MAX_AGE
            });
        });

        updateGPSStatus('success', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        });
        return position;
    } catch (error) {
        hasValidGPS = false;
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
        throw new Error(errorMessage);
    }
}

export function isGPSValid() {
    return hasValidGPS;
} 