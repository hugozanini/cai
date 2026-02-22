const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

// Fetch events from Primary calendar for next 14 days
export async function fetchCalendarEvents(token) {
    const minDate = new Date();
    minDate.setDate(minDate.getDate() - 21); // 3 weeks ago
    const timeMin = minDate.toISOString();

    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 21); // 3 weeks future
    const timeMax = maxDate.toISOString();

    const url = new URL(`${GOOGLE_CALENDAR_API_BASE}/calendars/primary/events`);
    url.searchParams.append('timeMin', timeMin);
    url.searchParams.append('timeMax', timeMax);
    url.searchParams.append('singleEvents', 'true');
    url.searchParams.append('orderBy', 'startTime');

    const response = await fetch(url.toString(), {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const errBody = await response.text();
        console.error('Calendar API Error Details:', errBody);
        throw new Error(`Failed to fetch events: ${response.statusText}. Details: ${errBody}`);
    }

    const data = await response.json();
    return data.items;
}

// Create a new event (Focus Time, Lunch, etc.)
export async function createEvent(token, { summary, description, startTime, endTime, colorId = '1' }) {
    const event = {
        summary,
        description,
        start: {
            dateTime: startTime,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
            dateTime: endTime,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        colorId // e.g., '1' for lavender (usually focus), '5' for yellow (lunch)
    };

    const response = await fetch(`${GOOGLE_CALENDAR_API_BASE}/calendars/primary/events`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
    });

    if (!response.ok) {
        throw new Error(`Failed to create event: ${response.statusText}`);
    }

    return response.json();
}

// Delete an event
export async function deleteEvent(token, eventId) {
    const response = await fetch(`${GOOGLE_CALENDAR_API_BASE}/calendars/primary/events/${eventId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to delete event: ${response.statusText}`);
    }

    return true;
}

// Simple Free/Busy analysis
export function findFreeSlots(events, workStartHour = 9, workEndHour = 17) {
    // Simplified for V0: This should ideally analyze days and find empty gaps 
    // between existing events during the work hours.
    // Full implementation requires mapping busy blocks and finding inverse areas.
    return [];
}
