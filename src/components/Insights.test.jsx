import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Insights from './Insights';

describe('Insights Component', () => {
    beforeEach(() => {
        // Mock default message response
        chrome.runtime.sendMessage.mockImplementation((msg, cb) => {
            if (msg.type === 'FETCH_WEEK_INSIGHTS') {
                cb({
                    success: true,
                    stats: {
                        focusTimeHours: 5.5,
                        meetingsHours: 8,
                        oneOnOneHours: 2,
                        recurrentHours: 3,
                        focusTimeGoal: 10
                    }
                });
            }
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('renders loading state initially then populates stats', async () => {
        render(<Insights />);

        // Should render loading state or breakdown immediately
        expect(screen.getByText('Weekly Insights')).toBeInTheDocument();

        // Wait for stats to populate
        await waitFor(() => {
            expect(screen.getByText('5.5 hrs')).toBeInTheDocument(); // Focus
            expect(screen.getByText('8 hrs')).toBeInTheDocument();  // Total Meetings
            expect(screen.getByText('2 hrs')).toBeInTheDocument();  // 1-on-1s
            expect(screen.getByText('3 hrs')).toBeInTheDocument();  // Recurrent
        });

        // Verifies the message was sent to background
        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'FETCH_WEEK_INSIGHTS', offset: 0 }),
            expect.any(Function)
        );
    });

    it('syncs focus time to storage for the current week', async () => {
        render(<Insights />);

        await waitFor(() => {
            expect(screen.getByText('5.5 hrs')).toBeInTheDocument();
        });

        // 5.5 rounds to 6. Our logic should clamp and sync.
        expect(chrome.storage.local.get).toHaveBeenCalled();
        // Storage set should have been called with the clamped goal
        expect(chrome.storage.local.set).toHaveBeenCalledWith({
            caiPreferences: expect.objectContaining({ focusTimeGoal: 6 })
        });
    });

    it('navigates weeks forward and updates data', async () => {
        const { unmount } = render(<Insights />);

        await waitFor(() => expect(screen.getByText('5.5 hrs')).toBeInTheDocument());

        // Change mock for week 1
        chrome.runtime.sendMessage.mockImplementation((msg, cb) => {
            if (msg.type === 'FETCH_WEEK_INSIGHTS') {
                cb({
                    success: true,
                    stats: {
                        focusTimeHours: 9,
                        meetingsHours: 0,
                        oneOnOneHours: 0,
                        recurrentHours: 0,
                        focusTimeGoal: 10
                    }
                });
            }
        });

        const nextBtn = screen.getByText('→');
        fireEvent.click(nextBtn);

        await waitFor(() => {
            expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'FETCH_WEEK_INSIGHTS', offset: 1 }),
                expect.any(Function)
            );
            expect(screen.getByText('9 hrs')).toBeInTheDocument(); // Updated focus
        });

        unmount();
    });
});
