import { fetchCalendarEvents, createEvent } from './calendar.js';

/**
 * Main Scheduling Engine Algorithm
 * Follows local-first architecture. Runs primarily in Background Service Worker.
 */
export async function runScheduler(token, preferences) {
    console.log('Running Cai Scheduler with preferences:', preferences);

    if (!preferences) return;

    try {
        const rawEvents = await fetchCalendarEvents(token);

        // Process next 14 days
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Group existing events by date string (YYYY-MM-DD)
        const eventsByDate = {};
        for (const ev of rawEvents) {
            if (!ev.start || !ev.start.dateTime) continue; // Skip all day events for now

            const startDate = new Date(ev.start.dateTime);
            const dateStr = getLocalDateString(startDate);

            if (!eventsByDate[dateStr]) eventsByDate[dateStr] = [];
            eventsByDate[dateStr].push({
                start: new Date(ev.start.dateTime),
                end: new Date(ev.end.dateTime),
                summary: ev.summary || 'Busy',
                isCaiEvent: (ev.summary || '').includes('[Cai]')
            });
        }

        // Identify which weeks we are looking at (Current week and Next week)
        // We will keep a simple sum of scheduled focus time per week
        let currentWeekFocusSecs = 0;
        let nextWeekFocusSecs = 0;

        // First pass: count existing [Cai] Focus events to see how much we already have
        for (const dateStr in eventsByDate) {
            for (const ev of eventsByDate[dateStr]) {
                if (ev.isCaiEvent && ev.summary.includes('Focus Time')) {
                    const durationSecs = (ev.end - ev.start) / 1000;
                    if (isThisWeek(ev.start)) currentWeekFocusSecs += durationSecs;
                    else if (isNextWeek(ev.start)) nextWeekFocusSecs += durationSecs;
                }
            }
        }

        const focusGoalSecs = (preferences.focusTimeGoal || 10) * 3600;

        // Loop through the next 14 days
        for (let i = 0; i < 14; i++) {
            const targetDate = new Date(today);
            targetDate.setDate(targetDate.getDate() + i);

            // Skip weekends
            if (targetDate.getDay() === 0 || targetDate.getDay() === 6) continue;

            const dateStr = getLocalDateString(targetDate);
            const dayEvents = eventsByDate[dateStr] || [];

            // Determine working boundary times for this date
            const [wHourStart, wMinStart] = parseTimeString(preferences.workingHoursStart || '09:00');
            const [wHourEnd, wMinEnd] = parseTimeString(preferences.workingHoursEnd || '17:00');

            const workStart = new Date(targetDate);
            workStart.setHours(wHourStart, wMinStart, 0, 0);

            const workEnd = new Date(targetDate);
            workEnd.setHours(wHourEnd, wMinEnd, 0, 0);

            // Filter events strictly within working hours
            const busyBlocks = dayEvents
                .filter(e => e.start < workEnd && e.end > workStart)
                .map(e => ({
                    start: new Date(Math.max(e.start, workStart)),
                    end: new Date(Math.min(e.end, workEnd)),
                    summary: e.summary
                }))
                .sort((a, b) => a.start - b.start);

            // Consolidate overlapping blocks
            const consolidatedBusy = [];
            for (const block of busyBlocks) {
                if (consolidatedBusy.length === 0) {
                    consolidatedBusy.push(block);
                } else {
                    const last = consolidatedBusy[consolidatedBusy.length - 1];
                    if (block.start <= last.end) {
                        last.end = new Date(Math.max(last.end, block.end));
                    } else {
                        consolidatedBusy.push(block);
                    }
                }
            }

            // Find Free Slots
            const freeSlots = [];
            let cursor = new Date(workStart);

            for (const block of consolidatedBusy) {
                if (cursor < block.start) {
                    freeSlots.push({ start: cursor, end: block.start });
                }
                cursor = new Date(Math.max(cursor, block.end));
            }
            if (cursor < workEnd) {
                freeSlots.push({ start: cursor, end: workEnd });
            }

            // Has Lunch been scheduled?
            const hasLunch = dayEvents.some(e => e.summary.toLowerCase().includes('lunch'));
            if (!hasLunch && preferences.lunchDuration > 0) {
                const lunchMins = parseInt(preferences.lunchDuration);
                // Try to place near lunchPreference
                const [lHour, lMin] = parseTimeString(preferences.lunchPreference || '12:00');
                const preferredLunchTime = new Date(targetDate);
                preferredLunchTime.setHours(lHour, lMin, 0, 0);

                // Find a slot that can fit lunch around preferred time
                const lunchSlotDetails = findBestFit(freeSlots, lunchMins, preferredLunchTime);
                if (lunchSlotDetails) {
                    console.log('Scheduling Lunch for', dateStr);
                    await createEvent(token, {
                        summary: '🍽️ Lunch [Cai]',
                        startTime: lunchSlotDetails.start.toISOString(),
                        endTime: lunchSlotDetails.end.toISOString(),
                        colorId: '5' // Yellow
                    });

                    // Update free slots by cutting out the used chunk (simplified)
                    removeSlotUsage(freeSlots, lunchSlotDetails);
                }
            }

            // Has Coffee Break been scheduled?
            const hasCoffee = dayEvents.some(e => e.summary.includes('Coffee') || e.summary.includes('Break'));
            const coffeeMins = parseInt(preferences.coffeeBreakDuration || '0');
            if (!hasCoffee && coffeeMins > 0) {
                const preferredCoffeeTime = new Date(targetDate);
                preferredCoffeeTime.setHours(15, 0, 0, 0); // Default 3 PM

                const coffeeSlotDetails = findBestFit(freeSlots, coffeeMins, preferredCoffeeTime);
                if (coffeeSlotDetails) {
                    console.log('Scheduling Coffee Break for', dateStr);
                    await createEvent(token, {
                        summary: '☕ Coffee Break [Cai]',
                        startTime: coffeeSlotDetails.start.toISOString(),
                        endTime: coffeeSlotDetails.end.toISOString(),
                        colorId: '4' // Orange/Pink
                    });
                    removeSlotUsage(freeSlots, coffeeSlotDetails);
                }
            }

            // Schedule Focus Time if needed
            const isCurrent = isThisWeek(targetDate);
            let neededSecs = isCurrent ? (focusGoalSecs - currentWeekFocusSecs) : (focusGoalSecs - nextWeekFocusSecs);

            if (neededSecs > 0) {
                // Try to schedule Focus Blocks of 60 mins max, 30 mins min
                for (const slot of freeSlots) {
                    let slotDurationSecs = (slot.end - slot.start) / 1000;

                    while (slotDurationSecs >= 1800 && neededSecs > 0) { // at least 30 mins
                        const focusBlockSecs = Math.min(3600, slotDurationSecs, neededSecs);

                        const focusStart = new Date(slot.start);
                        const focusEnd = new Date(focusStart.getTime() + (focusBlockSecs * 1000));

                        console.log('Scheduling Focus Time for', dateStr);
                        await createEvent(token, {
                            summary: '⚡ Focus Time [Cai]',
                            startTime: focusStart.toISOString(),
                            endTime: focusEnd.toISOString(),
                            colorId: '1' // Lavender
                        });

                        slot.start = focusEnd;
                        slotDurationSecs = (slot.end - slot.start) / 1000;
                        neededSecs -= focusBlockSecs;

                        if (isCurrent) currentWeekFocusSecs += focusBlockSecs;
                        else nextWeekFocusSecs += focusBlockSecs;
                    }
                }
            }
        }

        console.log('Cai Scheduler completed pass.');

        // --- Calculate Insights ---
        await computeInsights(rawEvents, preferences);

    } catch (err) {
        console.error('Error running scheduler:', err);
    }
}

async function computeInsights(events, preferences) {
    const focusGoal = preferences.focusTimeGoal || 15;
    const insightsByWeek = {}; // Map of { offset: { focusTimeHours, meetingsHours, oneOnOneHours, recurrentHours } }

    // Initialize current and past weeks explicitly up to -4
    for (let i = 0; i >= -4; i--) {
        insightsByWeek[i] = {
            focusTimeHours: 0,
            focusTimeGoal: focusGoal,
            meetingsHours: 0,
            oneOnOneHours: 0,
            recurrentHours: 0
        };
    }

    const currentWeekNum = getWeekNumber(new Date());

    for (const ev of events) {
        if (!ev.start || !ev.start.dateTime) continue;
        const start = new Date(ev.start.dateTime);
        const evWeekNum = getWeekNumber(start);
        const weekOffset = evWeekNum - currentWeekNum;

        // We only care about this week (0) or past weeks (-1, -2...)
        if (weekOffset > 0 || weekOffset < -4) continue;
        if (!insightsByWeek[weekOffset]) continue;

        const durationHours = (new Date(ev.end.dateTime) - start) / 3600000;

        const isFocus = (ev.summary || '').includes('Focus Time');
        const isLunchOrBreak = (ev.summary || '').includes('Lunch') || (ev.summary || '').includes('Coffee');

        if (isFocus) {
            insightsByWeek[weekOffset].focusTimeHours += durationHours;
        } else if (!isLunchOrBreak) {
            // It's a standard event/meeting
            insightsByWeek[weekOffset].meetingsHours += durationHours;

            // Check if it's a 1-on-1 (usually exactly 2 attendees counting self)
            const numAttendees = ev.attendees ? ev.attendees.length : 0;
            if (numAttendees === 2) {
                insightsByWeek[weekOffset].oneOnOneHours += durationHours;
            }

            // Check if recurrent
            if (ev.recurringEventId || ev.recurrence) {
                insightsByWeek[weekOffset].recurrentHours += durationHours;
            }
        }
    }

    // Format numbers nicely
    for (const key in insightsByWeek) {
        insightsByWeek[key].focusTimeHours = Math.round(insightsByWeek[key].focusTimeHours * 10) / 10;
        insightsByWeek[key].meetingsHours = Math.round(insightsByWeek[key].meetingsHours * 10) / 10;
        insightsByWeek[key].oneOnOneHours = Math.round(insightsByWeek[key].oneOnOneHours * 10) / 10;
        insightsByWeek[key].recurrentHours = Math.round(insightsByWeek[key].recurrentHours * 10) / 10;
    }

    console.log('Saving Computed Insights:', insightsByWeek);

    if (chrome && chrome.storage) {
        chrome.storage.local.set({ caiInsights: insightsByWeek });
    }
}

// Helpers
function getLocalDateString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function parseTimeString(timeStr) {
    return timeStr.split(':').map(Number);
}

function getWeekNumber(d) {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

function isThisWeek(date) {
    return getWeekNumber(date) === getWeekNumber(new Date());
}

function isNextWeek(date) {
    return getWeekNumber(date) === (getWeekNumber(new Date()) + 1);
}

function findBestFit(freeSlots, requiredMins, preferredTime) {
    const requiredMs = requiredMins * 60000;

    // Simple fit: find first slot that can hold it and is closest to preferredTime
    let bestFit = null;
    let minDiff = Infinity;

    for (const slot of freeSlots) {
        if ((slot.end - slot.start) >= requiredMs) {
            // Check diff against start of slot
            const diff1 = Math.abs(preferredTime - slot.start);
            // Or against preferred time inside slot
            let potentialStart = preferredTime;

            if (preferredTime < slot.start) potentialStart = slot.start;
            if (preferredTime > slot.end - requiredMs) potentialStart = new Date(slot.end - requiredMs);

            const diff2 = Math.abs(preferredTime - potentialStart);
            const actualDiff = Math.min(diff1, diff2);

            if (actualDiff < minDiff) {
                minDiff = actualDiff;
                bestFit = {
                    start: potentialStart,
                    end: new Date(potentialStart.getTime() + requiredMs)
                };
            }
        }
    }
    return bestFit;
}

function removeSlotUsage(slots, usedBlock) {
    // For simplicity array modification:
    for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        if (usedBlock.start >= slot.start && usedBlock.end <= slot.end) {
            // Splitting slot
            const newSlot1 = { start: slot.start, end: usedBlock.start };
            const newSlot2 = { start: usedBlock.end, end: slot.end };

            slots.splice(i, 1); // remove original
            if (newSlot2.end > newSlot2.start) slots.splice(i, 0, newSlot2);
            if (newSlot1.end > newSlot1.start) slots.splice(i, 0, newSlot1);
            break;
        }
    }
}
