import { useState, useEffect } from 'react';

const Planner = () => {
    const [config, setConfig] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (chrome && chrome.storage) {
            chrome.storage.local.get(['caiPreferences'], (result) => {
                if (result.caiPreferences) setConfig(result.caiPreferences);
            });
        } else {
            // Mock data
            setConfig({
                workingHoursStart: '09:00',
                workingHoursEnd: '17:00',
                lunchDuration: '60',
                lunchPreference: '12:00',
                coffeeBreakDuration: '15',
                focusTimeGoal: 10,
            });
        }
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setConfig({ ...config, [name]: value });
    };

    const saveConfig = () => {
        setIsSaving(true);
        if (chrome && chrome.storage) {
            chrome.storage.local.set({ caiPreferences: config }, () => {
                chrome.runtime.sendMessage({ type: 'SYNC_NOW' });
                setTimeout(() => setIsSaving(false), 500);
            });
        } else {
            setTimeout(() => setIsSaving(false), 500);
        }
    };

    if (!config) return <div>Loading planner...</div>;

    return (
        <div className="animate-fade-in">
            <h2 style={{ fontSize: '1.2rem', marginBottom: '20px' }}>Schedule Preferences</h2>

            <div className="glass-panel" style={{ padding: '16px', marginBottom: '16px', borderRadius: '12px' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--accent-primary)' }}>Working Hours</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                        <label className="form-label" style={{ fontSize: '0.85rem' }}>Start</label>
                        <input type="time" name="workingHoursStart" className="form-input" style={{ padding: '8px' }} value={config.workingHoursStart} onChange={handleChange} />
                    </div>
                    <div>
                        <label className="form-label" style={{ fontSize: '0.85rem' }}>End</label>
                        <input type="time" name="workingHoursEnd" className="form-input" style={{ padding: '8px' }} value={config.workingHoursEnd} onChange={handleChange} />
                    </div>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '16px', marginBottom: '16px', borderRadius: '12px' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--accent-secondary)' }}>Daily Breaks</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                        <label className="form-label" style={{ fontSize: '0.85rem' }}>Lunch Duration & Time</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <select name="lunchDuration" className="form-select" style={{ padding: '8px' }} value={config.lunchDuration} onChange={handleChange}>
                                <option value="30">30 min</option>
                                <option value="60">1 hr</option>
                                <option value="90">1.5 hrs</option>
                            </select>
                            <input type="time" name="lunchPreference" className="form-input" style={{ padding: '8px' }} value={config.lunchPreference} onChange={handleChange} />
                        </div>
                    </div>
                    <div>
                        <label className="form-label" style={{ fontSize: '0.85rem' }}>Coffee Break</label>
                        <select name="coffeeBreakDuration" className="form-select" style={{ padding: '8px' }} value={config.coffeeBreakDuration} onChange={handleChange}>
                            <option value="0">None</option>
                            <option value="15">15 minutes</option>
                            <option value="30">30 minutes</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px', borderRadius: '12px' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--success)' }}>Focus Target</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.9rem' }}>Weekly Goal</span>
                    <span style={{ fontWeight: 'bold' }}>{config.focusTimeGoal} hrs</span>
                </div>
                <input
                    type="range"
                    name="focusTimeGoal"
                    min="5" max="30" step="1"
                    value={config.focusTimeGoal}
                    onChange={handleChange}
                    style={{ width: '100%' }}
                />
            </div>

            <button className="btn-primary" onClick={saveConfig}>
                {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
        </div>
    );
};

export default Planner;
