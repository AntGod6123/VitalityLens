import { useAppSelector } from './useAppSelector';

const KG_TO_LBS = 2.20462;
const CM_TO_IN = 0.393701;
const KM_TO_MI = 0.621371;

export function useUnits() {
  const unitSystem = useAppSelector(s => s.user.profile?.unitSystem ?? 'metric');
  const isImperial = unitSystem === 'imperial';

  return {
    unitSystem,
    isImperial,

    weightUnit: isImperial ? 'lbs' : 'kg',
    heightUnit: isImperial ? 'in' : 'cm',
    distanceUnit: isImperial ? 'mi' : 'km',

    /** Display a kg value in the user's preferred unit */
    displayWeight: (kg: number): number =>
      isImperial ? Math.round(kg * KG_TO_LBS * 10) / 10 : kg,

    /** Display a cm value in the user's preferred unit */
    displayHeight: (cm: number): number =>
      isImperial ? Math.round(cm * CM_TO_IN * 10) / 10 : cm,

    /** Display a km distance in the user's preferred unit */
    displayDistance: (km: number): number =>
      isImperial ? Math.round(km * KM_TO_MI * 100) / 100 : km,

    /** Convert a display value back to kg for storage */
    toKg: (val: number): number =>
      isImperial ? Math.round((val / KG_TO_LBS) * 100) / 100 : val,

    /** Convert a display value back to cm for storage */
    toCm: (val: number): number =>
      isImperial ? Math.round((val / CM_TO_IN) * 10) / 10 : val,

    /** Format a kg weight with unit suffix */
    formatWeight: (kg: number): string => {
      const v = isImperial ? Math.round(kg * KG_TO_LBS * 10) / 10 : kg;
      return `${v} ${isImperial ? 'lbs' : 'kg'}`;
    },

    /** Format a cm height with unit suffix */
    formatHeight: (cm: number): string => {
      if (!isImperial) return `${cm} cm`;
      const totalIn = cm * CM_TO_IN;
      const ft = Math.floor(totalIn / 12);
      const inches = Math.round(totalIn % 12);
      return `${ft}'${inches}"`;
    },
  };
}
