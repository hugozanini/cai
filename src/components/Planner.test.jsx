import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Planner from './Planner';

describe('Planner Component', () => {
    beforeEach(() => {
        chrome.storage.local.get.mockImplementation((keys, cb) => {
            setTimeout(() => cb({
                caiPreferences: {
                    workingHoursStart: '09:00',
                    workingHoursEnd: '17:00',
                    lunchDuration: '60',
                    lunchPreference: '12:00',
                    coffeeBreakDuration: '15',
                    focusTimeGoal: 10,
                }
            }), 0);
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('renders with existing configuration', async () => {
        render(<Planner />);

        // Wait for state to set from mock chrome.storage
        expect(await screen.findByDisplayValue('09:00')).toBeInTheDocument();
        expect(screen.getByDisplayValue('17:00')).toBeInTheDocument();

        // Assert select value
        expect(screen.getByDisplayValue('1 hr')).toBeInTheDocument();

        // The focus slider should exist and show "10 hrs"
        expect(screen.getByText('10 hrs')).toBeInTheDocument();
    });

    it('saves configurations on button click', async () => {
        render(<Planner />);

        await screen.findByDisplayValue('09:00'); // Wait for mount

        // Change working hours end to 18:00
        const endInput = screen.getByDisplayValue('17:00');
        fireEvent.change(endInput, { target: { name: 'workingHoursEnd', value: '18:00' } });

        const saveButton = screen.getByText('Save Changes');
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(chrome.storage.local.set).toHaveBeenCalledTimes(1);
        });

        expect(chrome.storage.local.set).toHaveBeenCalledWith(
            expect.objectContaining({
                caiPreferences: expect.objectContaining({
                    workingHoursEnd: '18:00', // Assert it saved our change
                })
            }),
            expect.any(Function)
        );

        // Since we mocked set to call cb immediately, it should trigger messages
        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'CLEAR_EVENTS' }, expect.any(Function));
    });

    it('triggers CLEAR_EVENTS correctly when confirmed', async () => {
        // Mock prompt confirmation
        global.confirm = vi.fn(() => true);
        global.alert = vi.fn();

        render(<Planner />);
        await screen.findByDisplayValue('09:00'); // Wait for mount

        const clearBtn = screen.getByText('Clear Cai Events');
        fireEvent.click(clearBtn);

        expect(global.confirm).toHaveBeenCalled();
        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'CLEAR_EVENTS' }, expect.any(Function));
    });

    it('does not trigger CLEAR_EVENTS if prompt is cancelled', async () => {
        global.confirm = vi.fn(() => false);

        render(<Planner />);
        await screen.findByDisplayValue('09:00'); // Wait for mount

        const clearBtn = screen.getByText('Clear Cai Events');
        fireEvent.click(clearBtn);

        expect(global.confirm).toHaveBeenCalled();
        expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith({ type: 'CLEAR_EVENTS' }, expect.any(Function));
    });
});
