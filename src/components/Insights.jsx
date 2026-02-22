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
                    setStats(getMockStats(weekOffset));
                }
            });

            // Listen for background updates
            const storageListener = (changes, namespace) => {
                if (namespace === 'local' && changes.caiInsights?.newValue) {
                    const newInsights = changes.caiInsights.newValue;
                    if (newInsights[weekOffset]) {
                        setStats(newInsights[weekOffset]);
                    }
                }
            };

            chrome.storage.onChanged.addListener(storageListener);
            return () => {
                chrome.storage.onChanged.removeListener(storageListener);
            };
        } else {
            setStats(getMockStats(weekOffset));
        }
    }, [weekOffset]);

    const getMockStats = (offset) => {
        // Generate some slightly different data based on week offset
        const baseFocus = 12 + offset;
        return {
            focusTimeHours: Math.max(0, baseFocus),
            focusTimeGoal: 15,
            meetingsHours: Math.max(0, 14 - offset),
            oneOnOneHours: Math.max(0, 5 - offset),
            recurrentHours: Math.max(0, 8 - offset),
        };
    };

    const handlePrevWeek = () => setWeekOffset(prev => prev - 1);
    const handleNextWeek = () => setWeekOffset(prev => Math.min(0, prev + 1));

    if (!stats) return <div>Loading insights...</div>;

    const focusProgress = Math.min(100, (stats.focusTimeHours / stats.focusTimeGoal) * 100);

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.2rem', margin: '0' }}>Weekly Insights</h2>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                        className="btn-secondary"
                        style={{ padding: '4px 8px', width: 'auto' }}
                        onClick={handlePrevWeek}
                    >
                        ←
                    </button>
                    <span style={{ fontSize: '0.9rem', width: '80px', textAlign: 'center' }}>
                        {weekOffset === 0 ? 'This Week' : `${Math.abs(weekOffset)} wks ago`}
                    </span>
                    <button
                        className="btn-secondary"
                        style={{ padding: '4px 8px', width: 'auto', opacity: weekOffset === 0 ? 0.5 : 1 }}
                        onClick={handleNextWeek}
                        disabled={weekOffset === 0}
                    >
                        →
                    </button>
                </div>
            </div>

            {/* Focus Time Card */}
            <div className="glass-panel" style={{ padding: '20px', marginBottom: '16px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--accent-primary)' }}>Focus Time</h3>
                    <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>
                        {stats.focusTimeHours} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>/ {stats.focusTimeGoal} hrs</span>
                    </span>
                </div>

                {/* Progress Bar */}
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                        height: '100%',
                        width: `${focusProgress}%`,
                        background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
                        borderRadius: '4px',
                        transition: 'width 0.5s ease'
                    }} />
                </div>
            </div>

            {/* Meetings Breakdown */}
            <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: 'var(--accent-secondary)' }}>Time Breakdown</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
        </div>
    );
};

export default Insights;
