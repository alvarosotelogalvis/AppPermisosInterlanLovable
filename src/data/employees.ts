// Static employee directory used for admin utilities (birthdays, etc.)
// In a real backend this would come from the usuarios table.
export interface Empleado {
  id: string;
  name: string;
  email: string;
  area: string;
  cedula: string;
}

export const empleados: Empleado[] = [
  { id: '00000000-0000-0000-0000-000000000001', name: 'Carlos Martínez', email: 'carlos.martinez@interlan.co', area: 'Tecnología', cedula: '1.023.456.789' },
  { id: '00000000-0000-0000-0000-000000000004', name: 'Andrea RC', email: 'andrearc@interlan.com.co', area: 'Tecnología', cedula: '1.056.789.012' },
  { id: '4', name: 'Pedro López', email: 'pedro.lopez@interlan.co', area: 'Comercial', cedula: '1.089.012.345' },
  { id: '5', name: 'María Torres', email: 'maria.torres@interlan.co', area: 'Finanzas', cedula: '1.090.123.456' },
  { id: '7', name: 'Andrés Vargas', email: 'andres.vargas@interlan.co', area: 'Tecnología', cedula: '1.101.234.567' },
  { id: '8', name: 'Sofía Restrepo', email: 'sofia.restrepo@interlan.co', area: 'Comercial', cedula: '1.112.345.678' },
];

// localStorage-backed birthdays DB (demo app)
const BIRTHDAYS_KEY = 'birthdays_db';

export type BirthdaysMap = Record<string, string>; // key: user id, value: 'YYYY-MM-DD'

export const getBirthdays = (): BirthdaysMap => {
  try {
    return JSON.parse(localStorage.getItem(BIRTHDAYS_KEY) || '{}');
  } catch {
    return {};
  }
};

export const setBirthday = (userId: string, dateISO: string) => {
  const db = getBirthdays();
  if (dateISO) db[userId] = dateISO;
  else delete db[userId];
  try { localStorage.setItem(BIRTHDAYS_KEY, JSON.stringify(db)); } catch {}
};

export const getBirthdayForUser = (userId?: string): string | undefined => {
  if (!userId) return undefined;
  return getBirthdays()[userId];
};

// Quinquenios DB (same localStorage-backed pattern)
const QUINQUENIOS_KEY = 'quinquenios_db';

export const getQuinquenios = (): BirthdaysMap => {
  try {
    return JSON.parse(localStorage.getItem(QUINQUENIOS_KEY) || '{}');
  } catch {
    return {};
  }
};

export const setQuinquenio = (userId: string, dateISO: string) => {
  const db = getQuinquenios();
  if (dateISO) db[userId] = dateISO;
  else delete db[userId];
  try { localStorage.setItem(QUINQUENIOS_KEY, JSON.stringify(db)); } catch {}
};

export const getQuinquenioForUser = (userId?: string): string | undefined => {
  if (!userId) return undefined;
  return getQuinquenios()[userId];
};
