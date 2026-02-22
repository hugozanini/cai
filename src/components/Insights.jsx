import { useState, useEffect } from 'react';

const Insights = () => {
    const [stats, setStats] = useState(null);
    const [weekOffset, setWeekOffset] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        if (chrome && chrome.runtime) {
            chrome.runtime.sendMessage({ type: 'FETCH_WEEK_INSIGHTS', offset: weekOffset }, (response) => {
                if (response && response.success) {
                    setStats(response.stats);

                    // Auto-sync current week's focus time to the Planner goal
                    if (weekOffset === 0 && chrome.storage) {
                        const currentFocusHours = response.stats.focusTimeHours;
                        const clampedGoal = Math.max(0, Math.min(40, Math.round(currentFocusHours)));

                        chrome.storage.local.get(['caiPreferences'], (result) => {
                            const prefs = result.caiPreferences || {};
                            if (prefs.focusTimeGoal !== clampedGoal) {
                                prefs.focusTimeGoal = clampedGoal;
                                chrome.storage.local.set({ caiPreferences: prefs });
                            }
                        });
                    }
                } else {
                    console.error('Failed to fetch insights', response?.error);
                    setStats(getEmptyStats());
                }
                setIsLoading(false);
            });
        } else {
            setStats(getEmptyStats());
            setIsLoading(false);
        }
    }, [weekOffset]);

    const getEmptyStats = () => ({
        focusTimeHours: 0,
        focusTimeGoal: 15,
        meetingsHours: 0,
        oneOnOneHours: 0,
        recurrentHours: 0,
    });

    const getWeekLabel = (offset) => {
        const today = new Date();
        const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + (offset * 7)));
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        const formatOpts = { month: 'short', day: 'numeric' };

        let startStr = startOfWeek.toLocaleDateString(undefined, formatOpts);
        let endStr = endOfWeek.toLocaleDateString(undefined, formatOpts);

        // If they are strictly in the same month, we can compress it like "Feb 22 - 28"
        if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
            endStr = endOfWeek.getDate().toString();
        }

        return `${startStr} - ${endStr}`;
    };

    const handlePrevWeek = () => setWeekOffset(prev => Math.max(-2, prev - 1));
    const handleNextWeek = () => setWeekOffset(prev => Math.min(2, prev + 1));

    if (!stats) return <div>Loading insights...</div>;

    const focusProgress = Math.min(100, (stats.focusTimeHours / stats.focusTimeGoal) * 100);

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.2rem', margin: '0' }}>Weekly Insights</h2>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                        className="btn-secondary"
                        style={{ padding: '4px 8px', width: 'auto', opacity: weekOffset === -2 ? 0.5 : 1 }}
                        onClick={handlePrevWeek}
                        disabled={weekOffset === -2 || isLoading}
                    >
                        ←
                    </button>
                    <span style={{ fontSize: '0.9rem', width: '110px', textAlign: 'center' }}>
                        {getWeekLabel(weekOffset)}
                    </span>
                    <button
                        className="btn-secondary"
                        style={{ padding: '4px 8px', width: 'auto', opacity: weekOffset === 2 ? 0.5 : 1 }}
                        onClick={handleNextWeek}
                        disabled={weekOffset === 2 || isLoading}
                    >
                        →
                    </button>
                </div>
            </div>

            {isLoading && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                    Fetching exact metadata...
                </div>
            )}

            {!isLoading && (
                <>
                    {/* Meetings Breakdown */}
                    <div className="glass-panel" style={{ padding: '20px', marginBottom: '16px', borderRadius: '12px' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: 'var(--accent-secondary)' }}>Time Breakdown</h3>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#8b5cf6' }} />
                                Focus Time
                            </span>
                            <span style={{ fontWeight: 'bold' }}>{stats.focusTimeHours} hrs</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
                                Total Meetings
                            </span>
                            <span style={{ fontWeight: 'bold' }}>{stats.meetingsHours} hrs</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6' }} />
                                1-on-1s
                            </span>
                            <span style={{ fontWeight: 'bold' }}>{stats.oneOnOneHours} hrs</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
                                Recurrent Syncs
                            </span>
                            <span style={{ fontWeight: 'bold' }}>{stats.recurrentHours} hrs</span>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Insights;
