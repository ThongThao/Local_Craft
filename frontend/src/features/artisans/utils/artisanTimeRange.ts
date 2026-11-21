/**
 * Utility functions for Time Range calculation, formatting, and LocalStorage persistence
 * in the LocalCraft Craft Village (Artisan) Dashboard.
 */

export type ArtisanTimeRangeKey =
  | 'TODAY'
  | '7_DAYS'
  | '30_DAYS'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'THIS_YEAR'
  | 'CUSTOM';

export interface TimeRangeOptionConfig {
  key: ArtisanTimeRangeKey;
  label: string;
  subLabel?: string;
}

export interface CalculatedTimeRange {
  key: ArtisanTimeRangeKey;
  label: string;
  fromDate?: string; // YYYY-MM-DD
  toDate?: string;   // YYYY-MM-DD
}

export const TIME_RANGE_STORAGE_KEY = 'localcraft_artisan_time_range';

/**
 * Format a Date object to YYYY-MM-DD in local timezone (avoiding UTC offset bugs)
 */
export const formatDateToIso = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Format ISO string YYYY-MM-DD to DD/MM
 */
export const formatIsoToShortVn = (isoStr: string): string => {
  if (!isoStr) return '';
  const parts = isoStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return isoStr;
};

/**
 * Format ISO string YYYY-MM-DD to DD/MM/YYYY
 */
export const formatIsoToFullVn = (isoStr: string): string => {
  if (!isoStr) return '';
  const parts = isoStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoStr;
};

/**
 * Get dynamic list of available Time Range options with localized labels
 */
export const getPresetTimeRangeOptions = (): TimeRangeOptionConfig[] => {
  const now = new Date();
  const currMonth = now.getMonth() + 1;
  const currYear = now.getFullYear();
  const prevMonth = currMonth === 1 ? 12 : currMonth - 1;
  const prevMonthYear = currMonth === 1 ? currYear - 1 : currYear;

  return [
    {
      key: 'THIS_MONTH',
      label: `Tháng ${currMonth}`,
      subLabel: `01/${currMonth.toString().padStart(2, '0')} - Hôm nay`,
    },
    {
      key: 'LAST_MONTH',
      label: `Tháng ${prevMonth}`,
      subLabel: `Toàn bộ Tháng ${prevMonth}/${prevMonthYear}`,
    },
    {
      key: '30_DAYS',
      label: '30 ngày qua',
      subLabel: 'Số liệu 30 ngày gần nhất',
    },
    {
      key: '7_DAYS',
      label: '7 ngày qua',
      subLabel: 'Số liệu 7 ngày gần nhất',
    },
    {
      key: 'TODAY',
      label: 'Hôm nay',
      subLabel: 'Thời gian thực trong ngày',
    },
    {
      key: 'THIS_YEAR',
      label: `Năm ${currYear}`,
      subLabel: `Toàn bộ năm ${currYear}`,
    },
    {
      key: 'CUSTOM',
      label: 'Tùy chỉnh khoảng ngày...',
      subLabel: 'Chọn mốc ngày bắt đầu & kết thúc',
    },
  ];
};

/**
 * Calculates start and end dates in YYYY-MM-DD format for a given time range key.
 */
export const calculateTimeRangeDates = (
  rangeKey: ArtisanTimeRangeKey | string,
  customFrom?: string,
  customTo?: string
): CalculatedTimeRange => {
  const now = new Date();
  const todayStr = formatDateToIso(now);
  const currMonth = now.getMonth() + 1;
  const currYear = now.getFullYear();

  switch (rangeKey) {
    case 'TODAY':
      return {
        key: 'TODAY',
        label: 'Hôm nay',
        fromDate: todayStr,
        toDate: todayStr,
      };

    case '7_DAYS': {
      const past = new Date(now);
      past.setDate(now.getDate() - 6);
      return {
        key: '7_DAYS',
        label: '7 ngày qua',
        fromDate: formatDateToIso(past),
        toDate: todayStr,
      };
    }

    case '30_DAYS': {
      const past = new Date(now);
      past.setDate(now.getDate() - 29);
      return {
        key: '30_DAYS',
        label: '30 ngày qua',
        fromDate: formatDateToIso(past),
        toDate: todayStr,
      };
    }

    case 'LAST_MONTH': {
      const prevMonth = currMonth === 1 ? 12 : currMonth - 1;
      const prevYear = currMonth === 1 ? currYear - 1 : currYear;
      const firstDay = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
      const lastDayObj = new Date(prevYear, prevMonth, 0); // Day 0 gives last day of prevMonth
      const lastDay = formatDateToIso(lastDayObj);
      return {
        key: 'LAST_MONTH',
        label: `Tháng ${prevMonth}`,
        fromDate: firstDay,
        toDate: lastDay,
      };
    }

    case 'THIS_YEAR': {
      return {
        key: 'THIS_YEAR',
        label: `Năm ${currYear}`,
        fromDate: `${currYear}-01-01`,
        toDate: todayStr,
      };
    }

    case 'CUSTOM': {
      if (customFrom && customTo) {
        return {
          key: 'CUSTOM',
          label: `${formatIsoToShortVn(customFrom)} - ${formatIsoToShortVn(customTo)}`,
          fromDate: customFrom,
          toDate: customTo,
        };
      }
      const firstDayOfMonth = `${currYear}-${String(currMonth).padStart(2, '0')}-01`;
      return {
        key: 'CUSTOM',
        label: `Tháng ${currMonth}`,
        fromDate: firstDayOfMonth,
        toDate: todayStr,
      };
    }

    case 'THIS_MONTH':
    default: {
      const firstDayOfMonth = `${currYear}-${String(currMonth).padStart(2, '0')}-01`;
      return {
        key: 'THIS_MONTH',
        label: `Tháng ${currMonth}`,
        fromDate: firstDayOfMonth,
        toDate: todayStr,
      };
    }
  }
};

/**
 * Loads persisted time range from localStorage with zero-trust validation
 */
export const loadPersistedTimeRange = (): CalculatedTimeRange => {
  const fallback = calculateTimeRangeDates('THIS_MONTH');
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = localStorage.getItem(TIME_RANGE_STORAGE_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);
    const validKeys: ArtisanTimeRangeKey[] = [
      'TODAY',
      '7_DAYS',
      '30_DAYS',
      'THIS_MONTH',
      'LAST_MONTH',
      'THIS_YEAR',
      'CUSTOM',
    ];

    if (parsed && typeof parsed.key === 'string' && validKeys.includes(parsed.key as ArtisanTimeRangeKey)) {
      if (parsed.key === 'CUSTOM' && parsed.fromDate && parsed.toDate) {
        return {
          key: 'CUSTOM',
          label: parsed.label || `${formatIsoToShortVn(parsed.fromDate)} - ${formatIsoToShortVn(parsed.toDate)}`,
          fromDate: parsed.fromDate,
          toDate: parsed.toDate,
        };
      }
      return calculateTimeRangeDates(parsed.key as ArtisanTimeRangeKey);
    }
  } catch (err) {
    console.warn('Could not read persisted time range from storage:', err);
  }

  return fallback;
};

/**
 * Saves selected time range to localStorage
 */
export const persistTimeRange = (range: CalculatedTimeRange): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      TIME_RANGE_STORAGE_KEY,
      JSON.stringify({
        key: range.key,
        label: range.label,
        fromDate: range.fromDate,
        toDate: range.toDate,
      })
    );
  } catch (err) {
    console.warn('Could not persist time range:', err);
  }
};
