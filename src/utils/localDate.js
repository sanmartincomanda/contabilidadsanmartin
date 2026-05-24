export const APP_TIMEZONE = 'America/Managua';

const getFormatter = (timeZone = APP_TIMEZONE) => (
    new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    })
);

export const getLocalDateString = (value = new Date(), timeZone = APP_TIMEZONE) => {
    const date = value instanceof Date ? value : new Date(value);
    const parts = getFormatter(timeZone).formatToParts(date);
    const partMap = parts.reduce((acc, part) => {
        if (part.type !== 'literal') acc[part.type] = part.value;
        return acc;
    }, {});

    return `${partMap.year}-${partMap.month}-${partMap.day}`;
};

export const getLocalMonthString = (value = new Date(), timeZone = APP_TIMEZONE) => (
    getLocalDateString(value, timeZone).substring(0, 7)
);
