import { runScheduler, clearAllCaiEvents } from '../utils/scheduler.js';
import { fetchWeekInsights } from '../utils/calendar.js';

// Cai Background Service Worker

// Initialize when extension is installed
chrome.runtime.onInstalled.addListener(() => {
    console.log('Cai Extension Installed');
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// Alarm for periodic calendar sync (every 15 minutes)
chrome.alarms.create('syncCalendar', { periodInMinutes: 15 });

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'syncCalendar') {
        syncCalendarData();
    }
});

let isScheduling = false;

async function syncCalendarData() {
    if (isScheduling) {
        console.log('Scheduler is already running. Skipping overlapping execution.');
        return;
    }

    isScheduling = true;
    console.log('Syncing calendar data...');
    try {
        const token = await getAuthToken();
        if (token) {
            console.log('Got auth token, fetching preferences from storage...');

            const prefsResult = await new Promise(resolve => {
                chrome.storage.local.get(['caiPreferences'], resolve);
            });

            if (prefsResult.caiPreferences) {
                await runScheduler(token, prefsResult.caiPreferences);
            } else {
                console.log('No Cai preferences found, skipping scheduler.');
            }
        }
    } catch (error) {
        console.error('Failed to sync calendar:', error);
    } finally {
        isScheduling = false;
    }
}

// Helper to get OAuth token
function getAuthToken() {
    return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: false }, (token) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(token);
            }
        });
    });
}

// Listen for messages from the UI (Side Panel)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'AUTHENTICATE') {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
            if (chrome.runtime.lastError) {
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
                // Init first sync immediately
                syncCalendarData();
                sendResponse({ success: true, token });
            }
        });
        return true; // Keep message channel open for async response
    }

    if (message.type === 'SYNC_NOW') {
        console.log('Manual sync triggered from UI');
        syncCalendarData();
        sendResponse({ success: true });
        return true;
    }

    if (message.type === 'CLEAR_EVENTS') {
        console.log('Clear Events triggered from UI');
        getAuthToken().then(token => {
            return clearAllCaiEvents(token);
        }).then(count => {
            sendResponse({ success: true, count });
        }).catch(err => {
            sendResponse({ success: false, error: err.message });
        });
        return true;
    }

    if (message.type === 'FETCH_WEEK_INSIGHTS') {
        const offset = message.offset || 0;
        getAuthToken()
            .then(token => fetchWeekInsights(token, offset))
            .then(stats => sendResponse({ success: true, stats }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }
});
