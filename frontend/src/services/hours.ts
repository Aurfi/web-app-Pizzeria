export async function isOpenNow(): Promise<{ open: boolean; window: string }> {
  try {
    const resp = await fetch('/api/restaurant/hours');
    if (!resp.ok) return { open: true, window: '' };
    const data = await resp.json();
    const hours = data.hours || {};
    const now = new Date();
    const jsDay = now.getDay(); // 0 Sun..6 Sat
    const dayKeys = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    const todayKey = dayKeys[(jsDay + 6) % 7];
    const today = hours[todayKey] || { closed: true };
    const win = today.closed ? 'Fermé' : `${today.open || ''} - ${today.close || ''}`;
    if (today.closed) return { open: false, window: win };
    const intervals = Array.isArray(today.intervals)
      ? today.intervals
      : (today.open && today.close ? [{ open: today.open, close: today.close }] : []);
    const minutesNow = now.getHours() * 60 + now.getMinutes();
    const anyOpen = intervals.some((i: any) => {
      const [oh, om] = (i.open || '00:00').split(':').map(Number);
      const [ch, cm] = (i.close || '00:00').split(':').map(Number);
      const openM = oh * 60 + om;
      const closeM = ch * 60 + cm;
      return minutesNow >= openM && minutesNow < closeM;
    });
    return { open: anyOpen, window: intervals.map((i: any) => `${i.open} - ${i.close}`).join(', ') };
  } catch {
    return { open: true, window: '' };
  }
}

