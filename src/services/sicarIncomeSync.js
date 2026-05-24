import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { getLocalDateString } from '../utils/localDate';

const callable = httpsCallable(functions, 'syncSicarIngresosCarnesAmparito');

export async function syncSicarDailyIncome({ date, preview = false }) {
    const normalizedDate = (date || getLocalDateString()).substring(0, 10);
    const response = await callable({
        startDate: normalizedDate,
        endDate: normalizedDate,
        preview,
    });

    return response.data;
}
