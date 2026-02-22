import { useState, useEffect } from 'react';

const Insights = () => {
    const [stats, setStats] = useState(null);
    const [weekOffset, setWeekOffset] = useState(0);

    useEffect(() => {
        if (chrome && chrome.storage) {
            // Initial fetch
            chrome.storage.local.get(['caiInsights'], (result) => {
                if (result.caiInsights && result.caiInsights[weekOffset]) {
                    setStats(result.caiInsights[weekOffset]);
                } else {
                    setStats(getEmptyStats());
                }
            });

            // Listen for background updates
            const storageListener = (changes, namespace) => {
                if (namespace === 'local' && changes.caiInsights?.newValue) {
                    const newInsights = changes.caiInsights.newValue;
                    if (newInsights[weekOffset]) {
                        setStats(newInsights[weekOffset]);
                    } else {
                        setStats(getEmptyStats());
                    }
                }
            };

            chrome.storage.onChanged.addListener(storageListener);
            return () => {
                chrome.storage.onChanged.removeListener(storageListener);
            };
        } else {
            setStats(getEmptyStats());
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
                        disabled={weekOffset === -2}
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
                        disabled={weekOffset === 2}
                    >
                        →
                    </button>
                </div>
            </div>

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
        </div>
    );
};

export default Insights;
