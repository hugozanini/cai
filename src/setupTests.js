import '@testing-library/jest-dom';

// Mock chrome API globally for tests
global.chrome = {
    runtime: {
        sendMessage: vi.fn((msg, cb) => cb && cb()),
        lastError: null,
        onInstalled: {
            addListener: vi.fn(),
        },
        onMessage: {
            addListener: vi.fn(),
        }
    },
    storage: {
        local: {
            get: vi.fn((keys, cb) => cb && cb({})),
            set: vi.fn((data, cb) => cb && cb()),
        }
    },
    alarms: {
        create: vi.fn(),
        onAlarm: {
            addListener: vi.fn(),
        }
    },
    identity: {
        getAuthToken: vi.fn((opts, cb) => cb && cb('mock-token')),
    },
    sidePanel: {
        setPanelBehavior: vi.fn(),
    }
};
