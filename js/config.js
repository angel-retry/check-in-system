// 公司位置設定
export const COMPANY_LOCATION = {
    latitude: 23.962156,
    longitude: 120.534493
};

// GPS 設定
export const GPS_CONFIG = {
    MAX_DISTANCE_METERS: 100,    // 允許打卡的最大距離（公尺）
    EARTH_RADIUS_METERS: 6371e3, // 地球半徑（公尺）
    MAX_RETRIES: 2,             // GPS 重試次數
    TIMEOUT: 10000,             // GPS 超時時間（毫秒）
    MAX_AGE: 30000             // GPS 快取時間（毫秒）
};

// Cookie 設定
export const COOKIE_CONFIG = {
    USER_ID_KEY: 'userId',
    EXPIRES_DAYS: 30
};

// localStorage 設定
export const STORAGE_CONFIG = {
    EMPLOYEES_KEY: 'employees',
    PUNCH_RECORDS_KEY: 'punchRecords'
};

// 打卡設定
export const PUNCH_CONFIG = {
    // 最短打卡間隔（毫秒）
    MIN_PUNCH_INTERVAL: 60000, // 1分鐘
    // 工作時間設定（24小時制）
    WORK_HOURS: {
        START: 9,  // 最早可打上班卡時間
        END: 18    // 最晚應打下班卡時間
    }
}; 