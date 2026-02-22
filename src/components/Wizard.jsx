import { useState } from 'react';

const Wizard = ({ onComplete }) => {
    const [step, setStep] = useState(1);
    const [config, setConfig] = useState({
        workingHoursStart: '09:00',
        workingHoursEnd: '17:00',
        lunchDuration: '60',
        lunchPreference: '12:00',
        coffeeBreakDuration: '15',
        focusTimeGoal: 10,
    });
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    const handleNext = () => setStep((s) => s + 1);
    const handleBack = () => setStep((s) => s - 1);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setConfig({ ...config, [name]: value });
    };

    const handleConnectCalendar = () => {
        setIsAuthenticating(true);
        if (chrome && chrome.runtime) {
            chrome.runtime.sendMessage({ type: 'AUTHENTICATE' }, (response) => {
                setIsAuthenticating(false);
                if (response && response.success) {
                    handleNext();
                } else {
                    alert('Failed to connect Calendar: ' + (response?.error || 'Unknown error'));
                }
            });
        } else {
            // Mock for standard web environment
            setTimeout(() => {
                setIsAuthenticating(false);
                handleNext();
            }, 1000);
        }
    };

    const finishWizard = () => {
        if (chrome && chrome.storage) {
            chrome.storage.local.set({ caiPreferences: config }, () => {
                chrome.runtime.sendMessage({ type: 'SYNC_NOW' });
                onComplete();
            });
        } else {
            onComplete();
        }
    };

    return (
        <div className="glass-panel animate-fade-in" style={{ padding: '30px 24px' }}>
            <h1 style={{ textAlign: 'center' }}>Welcome to Cai</h1>
            <p style={{ textAlign: 'center', marginBottom: '30px' }}>
                Your enterprise local-first calendar assistant.
            </p>

            {step === 1 && (
                <div className="animate-fade-in">
                    <h2>Step 1: Connect Calendar</h2>
                    <p>
                        Cai needs access to your Google Calendar to schedule focus time and breaks.
                        Everything runs locally in your browser.
                    </p>
                    <button
                        className="btn-primary"
                        onClick={handleConnectCalendar}
                        disabled={isAuthenticating}
                        style={{ marginTop: '20px' }}
                    >
                        {isAuthenticating ? 'Connecting...' : 'Connect Google Calendar'}
                    </button>
                </div>
            )}

            {step === 2 && (
                <div className="animate-fade-in">
                    <h2>Step 2: Working Hours</h2>
                    <p>When does your workday typically start and end?</p>

                    <div className="form-group" style={{ marginTop: '20px' }}>
                        <label className="form-label">Start Time</label>
                        <input
                            type="time"
                            name="workingHoursStart"
                            className="form-input"
                            value={config.workingHoursStart}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">End Time</label>
                        <input
                            type="time"
                            name="workingHoursEnd"
                            className="form-input"
                            value={config.workingHoursEnd}
                            onChange={handleChange}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                        <button className="btn-secondary" onClick={handleBack}>Back</button>
                        <button className="btn-primary" onClick={handleNext}>Next</button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="animate-fade-in">
                    <h2>Step 3: Breaks</h2>
                    <p>How much time do you need to recharge?</p>

                    <div className="form-group" style={{ marginTop: '20px' }}>
                        <label className="form-label">Lunch Duration (mins)</label>
                        <select name="lunchDuration" className="form-select" value={config.lunchDuration} onChange={handleChange}>
                            <option value="30">30 minutes</option>
                            <option value="60">1 hour</option>
                            <option value="90">1.5 hours</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Preferred Lunch Time</label>
                        <input
                            type="time"
                            name="lunchPreference"
                            className="form-input"
                            value={config.lunchPreference}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Afternoon Coffee Break</label>
                        <select name="coffeeBreakDuration" className="form-select" value={config.coffeeBreakDuration} onChange={handleChange}>
                            <option value="0">None</option>
                            <option value="15">15 minutes</option>
                            <option value="30">30 minutes</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                        <button className="btn-secondary" onClick={handleBack}>Back</button>
                        <button className="btn-primary" onClick={handleNext}>Next</button>
                    </div>
                </div>
            )}

            {step === 4 && (
                <div className="animate-fade-in">
                    <h2>Step 4: Focus Time</h2>
                    <p>How many protected hours do you need each week to get deep work done?</p>

                    <div style={{ textAlign: 'center', margin: '30px 0' }}>
                        <span style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--accent-primary)' }}>
                            {config.focusTimeGoal}
                        </span>
                        <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}> hrs/week</span>
                    </div>

                    <input
                        type="range"
                        name="focusTimeGoal"
                        min="5"
                        max="30"
                        step="1"
                        value={config.focusTimeGoal}
                        onChange={handleChange}
                        style={{ width: '100%', marginBottom: '20px' }}
                    />

                    <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                        <button className="btn-secondary" onClick={handleBack}>Back</button>
                        <button className="btn-primary" onClick={finishWizard}>Finish Setup</button>
                    </div>
                </div>
            )}

            {/* Progress indicators */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '30px', gap: '6px' }}>
                {[1, 2, 3, 4].map(i => (
                    <div
                        key={i}
                        style={{
                            width: i === step ? '24px' : '8px',
                            height: '8px',
                            borderRadius: '4px',
                            background: i === step ? 'var(--accent-primary)' : 'var(--border-light)',
                            transition: 'all 0.3s ease'
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

export default Wizard;
