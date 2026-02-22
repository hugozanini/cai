import { runScheduler } from '../utils/scheduler.js';

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

async function syncCalendarData() {
    console.log('Syncing calendar data...');
    try {
        const token = await getAuthToken();
        if (token) {
            console.log('Got auth token, fetching preferences from storage...');
            chrome.storage.local.get(['caiPreferences'], async (result) => {
                if (result.caiPreferences) {
                    await runScheduler(token, result.caiPreferences);
                } else {
                    console.log('No Cai preferences found, skipping scheduler.');
                }
            });
        }
    } catch (error) {
        console.error('Failed to sync calendar:', error);
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
});
