import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// We need to mock the exported functions from other modules
const mockRunScheduler = vi.fn();
const mockClearEvents = vi.fn(() => Promise.resolve(5));

vi.mock('../utils/scheduler.js', () => ({
    runScheduler: (...args) => mockRunScheduler(...args),
    clearAllCaiEvents: (...args) => mockClearEvents(...args)
}));
vi.mock('../utils/calendar.js', () => ({
    fetchWeekInsights: vi.fn(() => Promise.resolve({ focusTimeHours: 10 }))
}));

describe('Background Worker', () => {
    beforeEach(async () => {
        chrome.storage.local.get.mockImplementation((keys, cb) => {
            const result = { caiPreferences: { workingHoursStart: '09:00', focusTimeGoal: 10 } };
            if (cb) cb(result);
            return Promise.resolve(result);
        });
        chrome.identity.getAuthToken.mockImplementation((opts, cb) => cb ? cb('mock-token') : Promise.resolve('mock-token'));
        await import('./index.js');
    });

    afterEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    it('sets up alarms and install listener', () => {
        expect(chrome.runtime.onInstalled.addListener).toHaveBeenCalled();
        expect(chrome.alarms.create).toHaveBeenCalledWith('syncCalendar', { periodInMinutes: 15 });
        expect(chrome.alarms.onAlarm.addListener).toHaveBeenCalled();
        expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();
    });

    it('handles FETCH_WEEK_INSIGHTS message', async () => {
        const messageHandler = chrome.runtime.onMessage.addListener.mock.calls[0][0];

        const sendResponseMock = vi.fn();
        messageHandler(
            { type: 'FETCH_WEEK_INSIGHTS', offset: 0 },
            {},
            sendResponseMock
        );

        await vi.waitUntil(() => sendResponseMock.mock.calls.length > 0);

        expect(sendResponseMock).toHaveBeenCalledWith({
            success: true,
            stats: { focusTimeHours: 10 }
        });
    });

    it('handles CLEAR_EVENTS message', async () => {
        const messageHandler = chrome.runtime.onMessage.addListener.mock.calls[0][0];
        const sendResponseMock = vi.fn();

        messageHandler(
            { type: 'CLEAR_EVENTS' },
            {},
            sendResponseMock
        );

        await vi.waitUntil(() => sendResponseMock.mock.calls.length > 0);

        expect(sendResponseMock).toHaveBeenCalledWith({
            success: true,
            count: 5
        });
    });

    it('runs sync logic on SYNC_NOW', async () => {
        const messageHandler = chrome.runtime.onMessage.addListener.mock.calls[0][0];
        const sendResponseMock = vi.fn();

        messageHandler(
            { type: 'SYNC_NOW' },
            {},
            sendResponseMock
        );

        // Wait for asynchronous sync operation to complete
        await vi.waitFor(() => {
            expect(mockRunScheduler).toHaveBeenCalled();
        }, { timeout: 1000 });
        expect(sendResponseMock).toHaveBeenCalledWith({ success: true });
    });

    it('runs sync logic on alarm trigger', async () => {
        const alarmHandler = chrome.alarms.onAlarm.addListener.mock.calls[0][0];
        mockRunScheduler.mockClear();

        alarmHandler({ name: 'syncCalendar' });

        await vi.waitUntil(() => mockRunScheduler.mock.calls.length > 0);
        expect(mockRunScheduler).toHaveBeenCalled();
    });

    it('skips schedule runs if isScheduling is true (Mutex Lock)', async () => {
        const messageHandler = chrome.runtime.onMessage.addListener.mock.calls[0][0];
        const sendResponseMock = vi.fn();

        // We simulate a slow schedule run
        mockRunScheduler.mockImplementationOnce(() => new Promise((resolve) => setTimeout(resolve, 100)));

        // Fire first sync
        messageHandler({ type: 'SYNC_NOW' }, {}, sendResponseMock);
        // Fire second sync instantly
        messageHandler({ type: 'SYNC_NOW' }, {}, sendResponseMock);

        await vi.waitFor(() => {
            expect(mockRunScheduler).toHaveBeenCalledTimes(1);
        }, { timeout: 1000 });

        // Verify sendResponseMock was also called properly to avoid hanging listeners
        expect(sendResponseMock).toHaveBeenCalled();
    });
});
