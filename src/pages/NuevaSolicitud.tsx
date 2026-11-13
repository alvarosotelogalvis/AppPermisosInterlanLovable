import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAppConfig } from '@/contexts/AppConfigContext';
import { useRequests } from '@/contexts/RequestsContext';
import Navbar from '@/components/Navbar';
import BackButton from '@/components/BackButton';
import { permissionTypes, hourBasedMotivos, motivoDuration, lutoFamiliares, sepelioFamiliares, motivoMaxDays, motivoRequiresDocuments } from '@/data/mockData';
import { getBirthdayForUser, getQuinquenioForUser } from '@/data/employees';
import { calamidadTypes } from '@/data/calamidadTypes';
import {
  isBusinessDay, contarDiasHabiles, getNextBusinessDay,
  calcEffectiveMinutes, formatMinutes,
  getFullDayMinutes, getHalfDayMinutes, getAfternoonEndMinutes, getAfternoonEndTime,
  sumBusinessMinutesRange, sumBusinessMinutesRangeWithBounds,
} from '@/data/colombianHolidays';
import { format, isBefore, isAfter, startOfDay, isEqual } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

const formatDateES = (date: Date) => format(date, "dd/MMMM/yyyy", { locale: es });
const formatDateTimeES = (date: Date, time?: string) => {
  const dateStr = format(date, "dd/MMMM/yyyy", { locale: es });
  if (time) {
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${dateStr} ${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  }
  return `${dateStr} 08:00 AM`;
};

// Motivos with fixed duration (no hour selection)
const fixedDurationMotivos = ['Derecho por jurado de votación', 'Derecho por votación', 'Quinquenio', 'Cumpleaños'];

// Motivos that require double approval (Líder → TH)
const approvalFlowMotivos = ['Calamidad doméstica grave'];

// Motivos that only need leader approval (no TH, no soportes)
const leaderOnlyApprovalMotivos = ['Sepelio compañeros', 'Graduación', 'Sepelio otros familiares', 'Luto mascotas', 'Matrimonio', 'Cumpleaños', 'Quinquenio', 'Diligencias personales'];

// Parse "dd/MMMM/yyyy" (Spanish) to Date
const _spanishMonths = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const parseSpanishDate = (str: string): Date | null => {
  if (!str) return null;
  const parts = str.split('/');
  if (parts.length !== 3) return null;
  const d = Number(parts[0]);
  const m = _spanishMonths.indexOf(parts[1].toLowerCase());
  const y = Number(parts[2]);
  if (m < 0 || isNaN(d) || isNaN(y)) return null;
  return new Date(y, m, d);
};
// Add 1 calendar month, clamping to the last day of the next month when the day does not exist.
const addOneMonthClamped = (date: Date): Date => {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  const naive = new Date(y, m + 1, d);
  const lastDayOfNextMonth = new Date(y, m + 2, 0);
  return naive > lastDayOfNextMonth ? lastDayOfNextMonth : naive;
};
// Monday-based week key
const getWeekKey = (d: Date): string => {
  const day = d.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset);
  return `${monday.getFullYear()}-${monday.getMonth()}-${monday.getDate()}`;
};

// Motivos that only need leader notification
const notificationFlowMotivos = [
  'Cita escolar acudiente', 'Cita judicial o administrativa',
  'Cita médica acudiente', 'Cita médica programada',
  'Derecho por jurado de votación', 'Derecho por votación',
  'Luto', 'Uso de bicicleta',
];

// Motivos that require hours (single day, hour-based)
const hourBasedMotivosSet = new Set([
  'Cita escolar acudiente', 'Cita médica acudiente', 'Cita médica programada',
  'Sepelio compañeros', 'Uso de bicicleta',
  // Sueños Compartidos
  'Diligencias personales', 'Graduación', 'Luto mascotas', 'Sepelio otros familiares',
]);

// Calamidad can be hours or days
const isCalamidadMotivo = (m: string) => m === 'Calamidad doméstica grave';
// Cita judicial: sin límite de duración; puede ser por horas (mismo día) o multi-día
const isJudicialMotivo = (m: string) => m === 'Cita judicial o administrativa';
// Traslado temporal por teletrabajo móvil: sin límite, puede ser por horas o multi-día
const isTrasladoMotivo = (m: string) => m === 'Traslado temporal por teletrabajo móvil';

const NuevaSolicitud = () => {
  const { user } = useAuth();
  const { electoralActive } = useAppConfig();
  const { addRequest, sendNotification, isRealMode, requests } = useRequests();
  const navigate = useNavigate();

  const [tipo, setTipo] = useState('');
  const [motivo, setMotivo] = useState('');
  const [fechaInicio, setFechaInicio] = useState<Date>();
  const [fechaFin, setFechaFin] = useState<Date>();
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [calamidadSubcategoria, setCalamidadSubcategoria] = useState('');
  const [calamidadTipo, setCalamidadTipo] = useState('');
  const [calamidadDesc, setCalamidadDesc] = useState('');
  const [lutoFamiliar, setLutoFamiliar] = useState('');
  const [fechaCumpleanos, setFechaCumpleanos] = useState('');
  const [fechaQuinquenio, setFechaQuinquenio] = useState('');
  const [direccion, setDireccion] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [pais, setPais] = useState('');
  const [approver, setApprover] = useState('lider');
  const [approverEmail, setApproverEmail] = useState(user?.leaderEmail || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showModal, setShowModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [votacionTurno, setVotacionTurno] = useState<'mañana' | 'tarde'>('mañana');

  // Filter motivos: hide electoral ones if not active
  const motivos = useMemo(() => {
    const all = tipo ? permissionTypes[tipo as keyof typeof permissionTypes] || [] : [];
    let filtered = all;
    if (tipo === 'Licencia remunerada por ley') {
      filtered = all.filter(m => {
        if ((m === 'Derecho por jurado de votación' || m === 'Derecho por votación') && !electoralActive) return false;
        return true;
      });
    }
    return [...filtered].sort((a, b) => a.localeCompare(b, 'es'));
  }, [tipo, electoralActive]);

  const isCalamidad = isCalamidadMotivo(motivo);
  const isJudicial = isJudicialMotivo(motivo);
  const isTraslado = isTrasladoMotivo(motivo);
  const isLuto = motivo === 'Luto';
  const isLutoMascotas = motivo === 'Luto mascotas';
  const isSepelioOtros = motivo === 'Sepelio otros familiares';
  const isCumpleanos = motivo === 'Cumpleaños';
  const isQuinquenio = motivo === 'Quinquenio';
  const isMatrimonio = motivo === 'Matrimonio';
  const isDiligencias = motivo === 'Diligencias personales';
  const isFixedDuration = fixedDurationMotivos.includes(motivo);
  const isHourBased = hourBasedMotivosSet.has(motivo);
  // Flexible motivos: hours when single-day, days when multi-day
  const isFlexible = isCalamidad || isJudicial || isTraslado;
  const calamidadUsesHours = isFlexible && fechaInicio && fechaFin && isEqual(startOfDay(fechaInicio), startOfDay(fechaFin));
  const maxDays = motivoMaxDays[motivo];

  // Multi-day motivos: Calamidad (up to 3), Luto (up to 5), Matrimonio (up to 3), Cita judicial (sin límite), Traslado (sin límite)
  const isMultiDay = isCalamidad || isLuto || isJudicial || isTraslado || isMatrimonio || isDiligencias;
  // Hours are shown for every motivo except fixed-duration ones (Derecho por votación / jurado / Quinquenio)
  const showHours = !!motivo && !isFixedDuration;

  const today = startOfDay(new Date());

  // Date restriction — also blocks Sundays and Colombian holidays
  const getDateDisabled = (date: Date) => {
    const d = startOfDay(date);
    // Block non-business days (Sundays + holidays) for all motivos
    if (!isBusinessDay(d)) return true;
    if (isCalamidad) {
      if (calamidadSubcategoria === 'Programada') return isBefore(d, startOfDay(new Date(today.getTime() + 86400000)));
      if (calamidadSubcategoria === 'No programada') return isAfter(d, today);
      return true;
    }
    // Luto: allow past dates (only block non-business days)
    if (isLuto) return false;
    // Luto mascotas: only past or today
    if (isLutoMascotas) return isAfter(d, today);
    // Cumpleaños: solo dentro de la ventana [cumpleaños, +7 días calendario] y futuro
    if (isCumpleanos) {
      const stored = getBirthdayForUser(user?.id);
      const effectiveBirthday = stored || fechaCumpleanos;
      if (!effectiveBirthday) return true;
      const [by, bm, bd] = effectiveBirthday.split('-').map(Number);
      const birthday = startOfDay(new Date(by, bm - 1, bd));
      const maxAllowed = startOfDay(new Date(birthday.getTime() + 7 * 86400000));
      if (isBefore(d, birthday) || isAfter(d, maxAllowed)) return true;
      return isBefore(d, startOfDay(new Date(today.getTime() + 86400000)));
    }
    // Quinquenio: solo dentro de la ventana [quinquenio, +1 mes calendario] y futuro
    if (isQuinquenio) {
      const stored = getQuinquenioForUser(user?.id);
      const effectiveQ = stored || fechaQuinquenio;
      if (!effectiveQ) return true;
      const [qy, qm, qd] = effectiveQ.split('-').map(Number);
      const quinquenio = startOfDay(new Date(qy, qm - 1, qd));
      const maxAllowed = startOfDay(addOneMonthClamped(quinquenio)); // +1 month, clamped
      if (isBefore(d, quinquenio) || isAfter(d, maxAllowed)) return true;
      return isBefore(d, startOfDay(new Date(today.getTime() + 86400000)));
    }
    // Diligencias personales: futuro + máx 1 por día + no consecutivo + máx 2 por semana
    if (isDiligencias) {
      const tomorrow = startOfDay(new Date(today.getTime() + 86400000));
      if (isBefore(d, tomorrow)) return true;
      const wk = getWeekKey(d);
      if ((diligenciasStats.weekMap.get(wk) || 0) >= 2) return true;
      if (isSameDayUsed(d)) return true;
      if (isConsecutiveBusinessDay(d)) return true;
      return false;
    }
    // All others: strictly future
    return isBefore(d, startOfDay(new Date(today.getTime() + 86400000)));
  };

  const handleTipoChange = (value: string) => {
    setTipo(value);
    setMotivo('');
    resetFields();
  };

  const handleMotivoChange = (value: string) => {
    setMotivo(value);
    resetFields();
  };

  const resetFields = () => {
    setFechaInicio(undefined);
    setFechaFin(undefined);
    setHoraInicio('');
    setHoraFin('');
    setCalamidadSubcategoria('');
    setCalamidadTipo('');
    setCalamidadDesc('');
    setLutoFamiliar('');
    setFechaCumpleanos('');
    setFechaQuinquenio('');
    setDireccion('');
    setCiudad('');
    setPais('');
    setVotacionTurno('mañana');
    setErrors({});
  };

  const handleFechaInicioChange = (date: Date | undefined) => {
    setFechaInicio(date);
    setErrors(prev => { const { fechaInicio: _, fechaFin: __, ...rest } = prev; return rest; });
    if (date && !isMultiDay) {
      setFechaFin(date);
    } else if (date && fechaFin && isBefore(fechaFin, date)) {
      setFechaFin(undefined);
    }
  };

  // Reference date for hora fin bounds: multi-day → fechaFin day; single-day → fechaInicio
  const horaFinRefDate = fechaFin || fechaInicio;
  const horaFinMax = horaFinRefDate ? getAfternoonEndTime(horaFinRefDate) : '17:30';
  const horaInicioRefDate = fechaInicio;
  const horaInicioMax = horaInicioRefDate ? getAfternoonEndTime(horaInicioRefDate) : '17:30';

  // Auto-clamp horaFin when the reference date changes (e.g. user picks a Monday)
  useEffect(() => {
    if (!horaFin || !horaFinRefDate) return;
    const [h, m] = horaFin.split(':').map(Number);
    const finMin = h * 60 + m;
    const endMin = getAfternoonEndMinutes(horaFinRefDate);
    if (finMin > endMin) {
      setHoraFin(horaFinMax);
      setErrors(prev => ({
        ...prev,
        horaFin: `La jornada de ese día termina a las ${horaFinMax}. Se ajustó automáticamente.`,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horaFinRefDate?.getTime()]);

  useEffect(() => {
    if (!horaInicio || !horaInicioRefDate) return;
    const [h, m] = horaInicio.split(':').map(Number);
    const startMin = h * 60 + m;
    const endMin = getAfternoonEndMinutes(horaInicioRefDate);
    if (startMin > endMin) {
      setHoraInicio(horaInicioMax);
      setErrors(prev => ({
        ...prev,
        horaInicio: `La jornada de ese día termina a las ${horaInicioMax}. Se ajustó automáticamente.`,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horaInicioRefDate?.getTime()]);

  // Auto-default hora inicio (08:00) and hora fin (fin de jornada del día fin) once dates are picked.
  useEffect(() => {
    if (!showHours) return;
    if (fechaInicio && !horaInicio) setHoraInicio('08:00');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaInicio?.getTime(), showHours]);

  // Cumpleaños: validación reactiva de la ventana [cumpleaños, +7 días calendario]
  useEffect(() => {
    if (!isCumpleanos) return;
    const stored = getBirthdayForUser(user?.id);
    const effectiveBirthday = stored || fechaCumpleanos;
    if (!effectiveBirthday || !fechaInicio) {
      setErrors(prev => {
        if (prev.fechaInicio === 'El permiso de cumpleaños solo puede tomarse el día del cumpleaños o hasta una semana después.') {
          const { fechaInicio: _, ...rest } = prev; return rest;
        }
        return prev;
      });
      return;
    }
    const [by, bm, bd] = effectiveBirthday.split('-').map(Number);
    const birthday = startOfDay(new Date(by, bm - 1, bd));
    const maxAllowed = startOfDay(new Date(birthday.getTime() + 7 * 86400000));
    const start = startOfDay(fechaInicio);
    if (isBefore(start, birthday) || isAfter(start, maxAllowed)) {
      setErrors(prev => ({ ...prev, fechaInicio: 'El permiso de cumpleaños solo puede tomarse el día del cumpleaños o hasta una semana después.' }));
    } else {
      setErrors(prev => {
        if (prev.fechaInicio === 'El permiso de cumpleaños solo puede tomarse el día del cumpleaños o hasta una semana después.') {
          const { fechaInicio: _, ...rest } = prev; return rest;
        }
        return prev;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCumpleanos, fechaCumpleanos, fechaInicio?.getTime(), user?.id]);

  // Quinquenio: validación reactiva de la ventana [quinquenio, +1 mes calendario]
  const QUINQUENIO_ERR = 'El permiso de quinquenio solo puede tomarse el día del quinquenio o hasta un mes después.';
  useEffect(() => {
    if (!isQuinquenio) return;
    const stored = getQuinquenioForUser(user?.id);
    const effectiveQ = stored || fechaQuinquenio;
    if (!effectiveQ || !fechaInicio) {
      setErrors(prev => {
        if (prev.fechaInicio === QUINQUENIO_ERR) {
          const { fechaInicio: _, ...rest } = prev; return rest;
        }
        return prev;
      });
      return;
    }
    const [qy, qm, qd] = effectiveQ.split('-').map(Number);
    const quinquenio = startOfDay(new Date(qy, qm - 1, qd));
    const maxAllowed = startOfDay(addOneMonthClamped(quinquenio));
    const start = startOfDay(fechaInicio);
    if (isBefore(start, quinquenio) || isAfter(start, maxAllowed)) {
      setErrors(prev => ({ ...prev, fechaInicio: QUINQUENIO_ERR }));
    } else {
      setErrors(prev => {
        if (prev.fechaInicio === QUINQUENIO_ERR) {
          const { fechaInicio: _, ...rest } = prev; return rest;
        }
        return prev;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isQuinquenio, fechaQuinquenio, fechaInicio?.getTime(), user?.id]);

  // Diligencias personales: aggregate stats for current year
  const diligenciasStats = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const mine = requests.filter(r =>
      r.employeeId === (user?.id || '') &&
      r.motivo === 'Diligencias personales' &&
      ['pendiente', 'aprobado', 'finalizado'].includes(r.status)
    );
    let minutesUsed = 0;
    const businessDatesUsed: Date[] = [];
    const weekMap = new Map<string, number>();
    for (const r of mine) {
      const d = parseSpanishDate(r.fechaInicio);
      if (!d || d.getFullYear() !== currentYear) continue;
      if (r.horaInicio && r.horaFin) {
        minutesUsed += calcEffectiveMinutes(r.horaInicio, r.horaFin);
      }
      businessDatesUsed.push(startOfDay(d));
      const wk = getWeekKey(d);
      weekMap.set(wk, (weekMap.get(wk) || 0) + 1);
    }
    return { minutesUsed, businessDatesUsed, weekMap };
  }, [requests, user?.id]);

  const diligenciasMinutesAvailable = 30 * 60 - diligenciasStats.minutesUsed;
  const diligenciasCurrentMinutes = (isDiligencias && horaInicio && horaFin)
    ? ((fechaInicio && fechaFin && !isEqual(startOfDay(fechaInicio), startOfDay(fechaFin)))
        ? sumBusinessMinutesRangeWithBounds(fechaInicio, fechaFin, horaInicio, horaFin)
        : calcEffectiveMinutes(horaInicio, horaFin))
    : 0;

  // Two Diligencias are consecutive only if they fall on adjacent CALENDAR days.
  // Weekends and holidays break consecutivity (Fri + Mon is allowed).
  const isConsecutiveBusinessDay = (candidate: Date): boolean => {
    const c = startOfDay(candidate).getTime();
    for (const used of diligenciasStats.businessDatesUsed) {
      const diff = Math.abs(c - startOfDay(used).getTime());
      if (diff === 86400000) return true;
    }
    return false;
  };

  // Same request spanning several days: only allowed when start and end are
  // consecutive business days in DIFFERENT weeks (Fri→Mon, Fri→Tue if Mon is holiday).
  const DILIG_RANGE_ERR = 'Diligencias personales no permite días consecutivos en la misma semana.';
  const weekStart = (d: Date): number => {
    const s0 = startOfDay(d);
    s0.setDate(s0.getDate() - ((s0.getDay() + 6) % 7));
    return s0.getTime();
  };
  const isInvalidDiligRange = (ini?: Date, fin?: Date): boolean => {
    if (!ini || !fin) return false;
    const a = startOfDay(ini), b = startOfDay(fin);
    if (a.getTime() >= b.getTime()) return false;
    return !(weekStart(a) !== weekStart(b) && getNextBusinessDay(a).getTime() === b.getTime());
  };

  // Same-day: block a second Diligencias request on the same date
  const isSameDayUsed = (candidate: Date): boolean => {
    const c = startOfDay(candidate).getTime();
    return diligenciasStats.businessDatesUsed.some(u => startOfDay(u).getTime() === c);
  };


  // Diligencias personales: validación reactiva (mismo día, semana, consecutivos, tope anual)
  const DILIG_ERR_KEYS = [
    'Superas el límite de 30 horas anuales de Diligencias personales.',
    'No puedes tomar Diligencias personales en dos días calendario consecutivos.',
    'Ya tienes 2 solicitudes de Diligencias personales esta semana.',
    'Ya tienes una solicitud de Diligencias personales para este día.',
  ];
  useEffect(() => {
    if (!isDiligencias) return;
    setErrors(prev => {
      const next = { ...prev };
      // clear old diligencias errors
      if (next.fechaInicio && DILIG_ERR_KEYS.some(k => next.fechaInicio!.startsWith(k))) delete next.fechaInicio;
      if (next.horaFin && next.horaFin.startsWith(DILIG_ERR_KEYS[0])) delete next.horaFin;
      if (fechaInicio) {
        const wk = getWeekKey(fechaInicio);
        if (isSameDayUsed(fechaInicio)) {
          next.fechaInicio = 'Ya tienes una solicitud de Diligencias personales para este día. Máximo una por día.';
        } else if ((diligenciasStats.weekMap.get(wk) || 0) >= 2) {
          next.fechaInicio = 'Ya tienes 2 solicitudes de Diligencias personales esta semana. Solo se permiten hasta 2 por semana calendario.';
        } else if (isConsecutiveBusinessDay(fechaInicio)) {
          next.fechaInicio = 'No puedes tomar Diligencias personales en dos días calendario consecutivos.';
        }
      }
      if (next.fechaFin && next.fechaFin.startsWith(DILIG_RANGE_ERR)) delete next.fechaFin;
      if (isInvalidDiligRange(fechaInicio, fechaFin)) {
        next.fechaFin = `${DILIG_RANGE_ERR} Solo se permite si caen en semanas diferentes (ej. viernes y lunes, o viernes y martes si el lunes es festivo).`;
      }
      if (horaInicio && horaFin && diligenciasCurrentMinutes > 0) {
        if (diligenciasCurrentMinutes > diligenciasMinutesAvailable) {
          next.horaFin = `Superas el límite de 30 horas anuales de Diligencias personales. Horas disponibles: ${formatMinutes(diligenciasMinutesAvailable)}.`;
        }
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDiligencias, fechaInicio?.getTime(), fechaFin?.getTime(), horaInicio, horaFin, diligenciasStats]);



  useEffect(() => {
    if (!showHours) return;
    if (horaFinRefDate && !horaFin) setHoraFin(getAfternoonEndTime(horaFinRefDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horaFinRefDate?.getTime(), showHours]);

  // Calamidad doméstica grave: always full workday, hours not editable
  const calamidadFullDay = isCalamidadMotivo(motivo);
  useEffect(() => {
    if (!calamidadFullDay) return;
    if (fechaInicio && horaInicio !== '08:00') setHoraInicio('08:00');
    if (horaFinRefDate) {
      const end = getAfternoonEndTime(horaFinRefDate);
      if (horaFin !== end) setHoraFin(end);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calamidadFullDay, fechaInicio?.getTime(), horaFinRefDate?.getTime(), horaInicio, horaFin]);

  // Live re-validation of hora errors on any change to horas/fechas/motivo
  useEffect(() => {
    if (!showHours) return;
    let hiErr = '';
    let hfErr = '';
    if (horaInicio && horaFin) {
      const [sh, sm] = horaInicio.split(':').map(Number);
      const [fh, fm] = horaFin.split(':').map(Number);
      const startMin = sh * 60 + sm;
      const finMin = fh * 60 + fm;
      if (fechaInicio) {
        const endMinStart = getAfternoonEndMinutes(fechaInicio);
        const endTimeStart = getAfternoonEndTime(fechaInicio);
        if (startMin < 8 * 60) hiErr = `La jornada inicia a las 08:00.`;
        else if (startMin > endMinStart) hiErr = `La jornada de ese día termina a las ${endTimeStart}.`;
      }
      const endRef = horaFinRefDate;
      if (endRef) {
        const endMinFin = getAfternoonEndMinutes(endRef);
        const endTimeFin = getAfternoonEndTime(endRef);
        if (finMin > endMinFin) hfErr = `La jornada de ese día termina a las ${endTimeFin}.`;
      }
      const isSameDay = !fechaFin || (fechaInicio && isEqual(startOfDay(fechaInicio), startOfDay(fechaFin)));
      if (isSameDay && !hfErr) {
        const mins = calcEffectiveMinutes(horaInicio, horaFin);
        if (mins <= 0) {
          hfErr = 'La hora de fin debe ser posterior a la hora de inicio.';
        } else {
          if (['Cita escolar acudiente', 'Cita médica acudiente', 'Cita médica programada'].includes(motivo)) {
            if (mins < 60 || mins > 240) hfErr = 'Este permiso debe tener una duración entre 1 hora y 4 horas.';
          }
          if (motivo === 'Sepelio compañeros') {
            const half = fechaInicio ? getHalfDayMinutes(fechaInicio) : 255;
            if (mins > half) hfErr = 'Este permiso tiene un máximo de media jornada laboral.';
          }
          if (['Uso de bicicleta', 'Diligencias personales', 'Graduación', 'Luto mascotas', 'Sepelio otros familiares'].includes(motivo)) {
            const full = fechaInicio ? getFullDayMinutes(fechaInicio) : 510;
            if (mins > full) hfErr = 'Este permiso tiene un máximo de una jornada laboral.';
          }
          if ((isCalamidad && calamidadUsesHours) || (isTraslado && calamidadUsesHours)) {
            if (mins < 60) hfErr = 'La duración mínima es 1 hora.';
          }
        }
      }
    }
    setErrors(prev => {
      const next = { ...prev };
      if (hiErr) next.horaInicio = hiErr; else delete next.horaInicio;
      if (hfErr) next.horaFin = hfErr; else delete next.horaFin;
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horaInicio, horaFin, fechaInicio?.getTime(), fechaFin?.getTime(), motivo, showHours]);

  // Business days count
  const businessDays = useMemo(() => {
    if (fechaInicio && fechaFin) return contarDiasHabiles(fechaInicio, fechaFin);
    return 0;
  }, [fechaInicio, fechaFin]);

  // Effective minutes for hour-based
  const effectiveMinutes = useMemo(() => {
    if (horaInicio && horaFin) return calcEffectiveMinutes(horaInicio, horaFin);
    return 0;
  }, [horaInicio, horaFin]);

  const absenceDays = useMemo(() => {
    const isHourPermit = isHourBased || calamidadUsesHours;

    if (isHourPermit) {
      if (!fechaInicio && !fechaFin && !horaInicio && !horaFin) return null;
      const dayFull = fechaInicio ? getFullDayMinutes(fechaInicio) : 510;
      return effectiveMinutes < dayFull ? 0 : 1;
    }

    if (motivo === 'Derecho por votación' || motivo === 'Cumpleaños') return fechaInicio ? 0 : null;
    if (fechaInicio && fechaFin) return businessDays;
    if (isFixedDuration && fechaInicio) return 1;

    return null;
  }, [
    businessDays,
    calamidadUsesHours,
    effectiveMinutes,
    fechaFin,
    fechaInicio,
    horaFin,
    horaInicio,
    isFixedDuration,
    isHourBased,
    motivo,
  ]);

  // Helper: adjust return time to respect work schedule.
  // End-of-day depends on the weekday: Mon = 17:00, Tue–Fri = 17:30.
  const adjustReturnTime = (date: Date, time: string): { date: Date; time: string; sameDay: boolean } => {
    const [h, m] = time.split(':').map(Number);
    const finMin = h * 60 + m;
    const lunchStart = 12 * 60 + 30; // 12:30
    const lunchEnd = 13 * 60 + 30;   // 13:30
    const endOfDay = getAfternoonEndMinutes(date);

    // If hora fin >= end of workday → next business day at 08:00
    if (finMin >= endOfDay) {
      return { date: getNextBusinessDay(date), time: '08:00', sameDay: false };
    }
    // If hora fin falls during lunch (12:30–13:30) → same day at 13:30
    if (finMin >= lunchStart && finMin < lunchEnd) {
      return { date: new Date(date), time: '13:30', sameDay: true };
    }
    // Otherwise return same day at hora fin
    return { date: new Date(date), time: time, sameDay: true };
  };

  // Return date — corrected logic per spec
  const returnDate = useMemo(() => {
    const isHourPermit = isHourBased || calamidadUsesHours;
    // Hour-based permits
    if (isHourPermit && fechaInicio && horaFin) {
      return adjustReturnTime(fechaInicio, horaFin);
    }
    // Fixed duration: Derecho por votación depends on turno
    if ((motivo === 'Derecho por votación' || motivo === 'Cumpleaños') && fechaInicio) {
      if (votacionTurno === 'mañana') {
        // Morning half-day ends at 12:30 → falls in lunch → return at 13:30
        return { date: new Date(fechaInicio), time: '13:30', sameDay: true };
      }
      // Afternoon half-day → next business day 08:00
      return { date: getNextBusinessDay(fechaInicio), time: '08:00', sameDay: false };
    }
    // Other fixed duration (full day) → next business day
    if (isFixedDuration && fechaInicio) {
      return { date: getNextBusinessDay(fechaInicio), time: '08:00', sameDay: false };
    }
    // Multi-day permits → apply same return logic to fecha fin + hora fin
    if (isMultiDay && fechaFin) {
      if (horaFin) return adjustReturnTime(fechaFin, horaFin);
      return { date: getNextBusinessDay(fechaFin), time: '08:00', sameDay: false };
    }
    // Single-day non-hour (shouldn't happen but fallback)
    if (fechaInicio) {
      return { date: getNextBusinessDay(fechaInicio), time: '08:00', sameDay: false };
    }
    return null;
  }, [fechaFin, fechaInicio, isMultiDay, isHourBased, calamidadUsesHours, horaFin, isFixedDuration, motivo, votacionTurno]);

  // Semester check for Uso de bicicleta using localStorage
  const bicicletaUsedThisSemester = useMemo(() => {
    if (motivo !== 'Uso de bicicleta') return false;
    try {
      const now = new Date();
      const year = now.getFullYear();
      const semester = now.getMonth() < 6 ? 1 : 2;
      const key = `bicicleta_${year}_S${semester}`;
      return localStorage.getItem(key) === 'true';
    } catch {
      return false;
    }
  }, [motivo]);

  const getFixedDurationText = () => {
    if (motivo === 'Derecho por jurado de votación') {
      if (fechaInicio) {
        const full = getFullDayMinutes(fechaInicio);
        return `Duración: 1 jornada laboral completa (${formatMinutes(full)} efectivas).`;
      }
      return 'Duración: 1 jornada laboral completa (8h lunes / 8h 30min martes a viernes).';
    }
    if (motivo === 'Derecho por votación') {
      if (fechaInicio) {
        const half = getHalfDayMinutes(fechaInicio);
        return `Duración: media jornada laboral (${formatMinutes(half)} efectivas).`;
      }
      return 'Duración: media jornada laboral (4h lunes / 4h 15min martes a viernes).';
    }
    if (motivo === 'Quinquenio') {
      if (fechaInicio) {
        const full = getFullDayMinutes(fechaInicio);
        return `Duración: 1 jornada laboral completa (${formatMinutes(full)} efectivas).`;
      }
      return 'Duración: 1 jornada laboral completa (8h lunes / 8h 30min martes a viernes).';
    }
    if (motivo === 'Cumpleaños') {
      if (fechaInicio) {
        const half = getHalfDayMinutes(fechaInicio);
        return `Duración: media jornada laboral (${formatMinutes(half)} efectivas).`;
      }
      return 'Duración: media jornada laboral (4h lunes / 4h 15min martes a viernes).';
    }
    return '';
  };

  // Duration display
  const durationDisplay = useMemo(() => {
    if (isFixedDuration) {
      if (motivo === 'Derecho por jurado de votación' || motivo === 'Quinquenio') {
        if (fechaInicio) return `1 jornada laboral (${formatMinutes(getFullDayMinutes(fechaInicio))})`;
        return '1 jornada laboral (8h / 8h 30min según día)';
      }
      if (motivo === 'Derecho por votación' || motivo === 'Cumpleaños') {
        if (fechaInicio) return `Media jornada (${formatMinutes(getHalfDayMinutes(fechaInicio))})`;
        return 'Media jornada (4h / 4h 15min según día)';
      }
    }
    // Hour-based single day
    if ((isHourBased || calamidadUsesHours) && effectiveMinutes > 0) {
      return formatMinutes(effectiveMinutes);
    }
    // Multi-day — show days + total real minutes across the range (bounded by horas si están presentes)
    if (businessDays > 0 && isMultiDay && !(calamidadUsesHours) && fechaInicio && fechaFin) {
      const totalMin = (horaInicio && horaFin)
        ? sumBusinessMinutesRangeWithBounds(fechaInicio, fechaFin, horaInicio, horaFin)
        : sumBusinessMinutesRange(fechaInicio, fechaFin);
      return `${businessDays} día(s) hábil(es) — ${formatMinutes(totalMin)}`;
    }
    // Single day non-hour
    if (businessDays === 1 && !isHourBased && !isFixedDuration && fechaInicio) {
      return `1 día hábil (${formatMinutes(getFullDayMinutes(fechaInicio))})`;
    }
    return null;
  }, [isFixedDuration, isHourBased, calamidadUsesHours, effectiveMinutes, businessDays, isMultiDay, motivo, fechaInicio, fechaFin, horaInicio, horaFin]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!tipo) e.tipo = 'Este campo es obligatorio.';
    if (!motivo) e.motivo = 'Este campo es obligatorio.';

    if (isCalamidad) {
      if (!calamidadSubcategoria) e.calamidadSubcategoria = 'Este campo es obligatorio.';
      if (!calamidadTipo) e.calamidadTipo = 'Este campo es obligatorio.';
      if (!calamidadDesc || calamidadDesc.trim().length < 10)
        e.calamidadDesc = 'La descripción debe tener al menos 10 caracteres.';
    }

    if ((isLuto || isSepelioOtros) && !lutoFamiliar) e.lutoFamiliar = 'Este campo es obligatorio.';
    if (isCumpleanos && !fechaCumpleanos) e.fechaCumpleanos = 'Este campo es obligatorio.';
    // Cumpleaños: fecha inicio debe estar entre fechaCumpleanos y +7 días calendario
    if (isCumpleanos && fechaCumpleanos && fechaInicio) {
      const stored = getBirthdayForUser(user?.id);
      const effectiveBirthday = stored || fechaCumpleanos;
      const [by, bm, bd] = effectiveBirthday.split('-').map(Number);
      const birthday = startOfDay(new Date(by, bm - 1, bd));
      const maxAllowed = new Date(birthday.getTime() + 7 * 86400000);
      const start = startOfDay(fechaInicio);
      if (isBefore(start, birthday) || isAfter(start, maxAllowed)) {
        e.fechaInicio = 'El permiso de cumpleaños solo puede tomarse el día del cumpleaños o hasta una semana después.';
      }
    }
    if (isQuinquenio && !fechaQuinquenio) e.fechaQuinquenio = 'Este campo es obligatorio.';
    // Quinquenio: fecha inicio debe estar entre fechaQuinquenio y +1 mes calendario
    if (isQuinquenio && fechaQuinquenio && fechaInicio) {
      const stored = getQuinquenioForUser(user?.id);
      const effectiveQ = stored || fechaQuinquenio;
      const [qy, qm, qd] = effectiveQ.split('-').map(Number);
      const quinquenio = startOfDay(new Date(qy, qm - 1, qd));
      const maxAllowed = startOfDay(new Date(qy, qm, qd));
      const start = startOfDay(fechaInicio);
      if (isBefore(start, quinquenio) || isAfter(start, maxAllowed)) {
        e.fechaInicio = 'El permiso de quinquenio solo puede tomarse el día del quinquenio o hasta un mes después.';
      }
    }
    if (isTraslado) {
      if (!direccion.trim()) e.direccion = 'Este campo es obligatorio.';
      if (!ciudad.trim()) e.ciudad = 'Este campo es obligatorio.';
      if (!pais.trim()) e.pais = 'Este campo es obligatorio.';
    }

    if (!isFixedDuration) {
      if (!fechaInicio) e.fechaInicio = 'Este campo es obligatorio.';
    }
    if (isMultiDay && !fechaFin) e.fechaFin = 'Este campo es obligatorio.';

    if (fechaInicio && fechaFin && isBefore(fechaFin, fechaInicio))
      e.fechaFin = 'La fecha final debe ser igual o posterior a la inicial.';

    // Date direction for calamidad
    if (isCalamidad && fechaInicio) {
      const tomorrow = new Date(today.getTime() + 86400000);
      if (calamidadSubcategoria === 'Programada' && isBefore(startOfDay(fechaInicio), startOfDay(tomorrow))) {
        e.fechaInicio = 'Las calamidades programadas solo permiten fechas futuras (no hoy).';
      }
      if (calamidadSubcategoria === 'No programada' && isAfter(startOfDay(fechaInicio), today)) {
        e.fechaInicio = 'Las calamidades no programadas solo permiten fechas de hoy o pasadas.';
      }
    }

    // Hour validation
    if (showHours) {
      if (!horaInicio) e.horaInicio = 'Este campo es obligatorio.';
      if (!horaFin) e.horaFin = 'Este campo es obligatorio.';
      if (horaInicio && horaFin) {
        const [sh, sm] = horaInicio.split(':').map(Number);
        const [fh, fm] = horaFin.split(':').map(Number);
        const startMin = sh * 60 + sm;
        const finMin = fh * 60 + fm;
        // Hora inicio validation against fechaInicio's workday
        if (fechaInicio) {
          const endMinStart = getAfternoonEndMinutes(fechaInicio);
          const endTimeStart = getAfternoonEndTime(fechaInicio);
          if (startMin < 8 * 60) e.horaInicio = `La jornada inicia a las 08:00.`;
          if (startMin > endMinStart) e.horaInicio = `La jornada de ese día termina a las ${endTimeStart}.`;
        }
        // Hora fin validation against fechaFin's workday (or fechaInicio if single-day)
        const endRef = horaFinRefDate;
        if (endRef) {
          const endMinFin = getAfternoonEndMinutes(endRef);
          const endTimeFin = getAfternoonEndTime(endRef);
          if (finMin > endMinFin) e.horaFin = `La jornada de ese día termina a las ${endTimeFin}.`;
        }
        // Same-day: horaFin must be after horaInicio
        const isSameDay = !fechaFin || (fechaInicio && isEqual(startOfDay(fechaInicio), startOfDay(fechaFin)));
        if (isSameDay) {
          const mins = calcEffectiveMinutes(horaInicio, horaFin);
          if (mins <= 0) {
            e.horaFin = 'La hora de fin debe ser posterior a la hora de inicio.';
          } else {
            // Per-motivo validation (only single-day/hour-based motivos)
            if (['Cita escolar acudiente', 'Cita médica acudiente', 'Cita médica programada'].includes(motivo)) {
              if (mins < 60 || mins > 240) e.horaFin = 'Este permiso debe tener una duración entre 1 hora y 4 horas.';
            }
            if (motivo === 'Sepelio compañeros') {
              const half = fechaInicio ? getHalfDayMinutes(fechaInicio) : 255;
              if (mins > half) e.horaFin = 'Este permiso tiene un máximo de media jornada laboral.';
            }
            if (['Uso de bicicleta', 'Diligencias personales', 'Graduación', 'Luto mascotas', 'Sepelio otros familiares'].includes(motivo)) {
              const full = fechaInicio ? getFullDayMinutes(fechaInicio) : 510;
              if (mins > full) e.horaFin = 'Este permiso tiene un máximo de una jornada laboral.';
            }
            if ((isCalamidad && calamidadUsesHours) || (isTraslado && calamidadUsesHours)) {
              if (mins < 60) e.horaFin = 'La duración mínima es 1 hora.';
            }
          }
        }
      }
    }

    // Business days max validation
    if (fechaInicio && fechaFin && maxDays && isMultiDay) {
      const days = contarDiasHabiles(fechaInicio, fechaFin);
      if (days > maxDays) e.fechaFin = `Este permiso tiene un máximo de ${maxDays} día(s) hábil(es).`;
    }

    // Calamidad multi-day max check
    if (isCalamidad && fechaInicio && fechaFin && !calamidadUsesHours) {
      const days = contarDiasHabiles(fechaInicio, fechaFin);
      if (days > 3) e.fechaFin = 'Este permiso tiene un máximo de 3 días hábiles.';
    }

    // Bicicleta semester
    if (bicicletaUsedThisSemester) {
      e.motivo = 'Ya utilizaste este permiso en el semestre actual. Solo está permitido 1 vez por semestre.';
    }

    // Diligencias personales: reglas anuales / semanales / consecutivos / mismo día
    if (isDiligencias && fechaInicio) {
      const wk = getWeekKey(fechaInicio);
      if (isSameDayUsed(fechaInicio)) {
        e.fechaInicio = 'Ya tienes una solicitud de Diligencias personales para este día. Máximo una por día.';
      } else if ((diligenciasStats.weekMap.get(wk) || 0) >= 2) {
        e.fechaInicio = 'Ya tienes 2 solicitudes de Diligencias personales esta semana. Solo se permiten hasta 2 por semana calendario.';
      } else if (isConsecutiveBusinessDay(fechaInicio)) {
        e.fechaInicio = 'No puedes tomar Diligencias personales en dos días calendario consecutivos.';
      }
    }
    if (isDiligencias && isInvalidDiligRange(fechaInicio, fechaFin)) {
      e.fechaFin = `${DILIG_RANGE_ERR} Solo se permite si caen en semanas diferentes (ej. viernes y lunes, o viernes y martes si el lunes es festivo).`;
    }
    if (isDiligencias && diligenciasCurrentMinutes > 0 && diligenciasCurrentMinutes > diligenciasMinutesAvailable) {
      e.horaFin = `Superas el límite de 30 horas anuales de Diligencias personales. Horas disponibles: ${formatMinutes(diligenciasMinutesAvailable)}.`;
    }


    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) setShowConfirmDialog(true);
  };

  const handleConfirmSend = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    // Save bicycle semester usage to localStorage
    if (motivo === 'Uso de bicicleta') {
      try {
        const now = new Date();
        const year = now.getFullYear();
        const semester = now.getMonth() < 6 ? 1 : 2;
        const key = `bicicleta_${year}_S${semester}`;
        localStorage.setItem(key, 'true');
      } catch { /* ignore */ }
    }

    const startDate = fechaInicio || new Date();
    const endDate = fechaFin || startDate;
    const today = new Date();

    const requestData = {
      employeeId: user?.id || '',
      employeeName: user?.name || '',
      employeeInitials: user?.initials || '',
      employeeArea: user?.area || '',
      type: tipo,
      motivo,
      fechaSolicitud: formatDateES(today),
      fechaInicio: formatDateES(startDate),
      fechaFin: formatDateES(endDate),
      diasHabiles: absenceDays ?? 0,
      approver: user?.leaderName || approver,
      approverEmail: approverEmail || user?.leaderEmail || '',
      timeline: motivo === 'Calamidad doméstica grave' ? [
        { label: 'Enviada', date: formatDateES(today), completed: true },
        { label: 'Validación líder', date: '', completed: false },
        { label: 'Validación TH', date: '', completed: false },
        { label: 'Permiso otorgado', date: '', completed: false },
        { label: 'Soportes cargados', date: '', completed: false },
        { label: 'Aprobación final', date: '', completed: false },
      ] : (motivo === 'Graduación' || motivo === 'Sepelio otros familiares' || motivo === 'Luto mascotas' || motivo === 'Matrimonio') ? [
        { label: 'Enviada', date: formatDateES(today), completed: true },
        { label: 'Aprobación del líder', date: '', completed: false },
        { label: 'Permiso aprobado', date: '', completed: false },
        { label: 'Soportes cargados', date: '', completed: false },
        { label: 'Aprobación final', date: '', completed: false },
      ] : motivo === 'Sepelio compañeros' ? [
        { label: 'Enviada', date: formatDateES(today), completed: true },
        { label: 'Aprobación del líder', date: '', completed: false },
        { label: 'Aprobada y finalizada', date: '', completed: false },
      ] : (motivo === 'Cumpleaños' || motivo === 'Quinquenio' || motivo === 'Diligencias personales') ? [
        { label: 'Enviada', date: formatDateES(today), completed: true },
        { label: 'Aprobación del líder', date: '', completed: false },
        { label: 'Finalizada', date: '', completed: false },
      ] : motivo === 'Traslado temporal por teletrabajo móvil' ? [
        { label: 'Enviada', date: formatDateES(today), completed: true },
        { label: 'Aprobación del líder', date: '', completed: false },
        { label: 'Aprobación de TH', date: '', completed: false },
        { label: 'Finalizada', date: '', completed: false },
      ] : [
        { label: 'Enviada', date: formatDateES(today), completed: true },
        { label: 'Notificada al líder', date: '', completed: false },
        { label: 'Aprobada', date: '', completed: false },
        { label: 'Finalizada', date: '', completed: false },
      ],
      calamidadSubcategoria: calamidadSubcategoria || undefined,
      calamidadTipo: calamidadTipo || undefined,
      calamidadDescripcion: calamidadDesc || undefined,
      lutoFamiliar: lutoFamiliar || undefined,
      horaInicio: horaInicio || undefined,
      horaFin: horaFin || undefined,
      direccion: isTraslado ? direccion.trim() : undefined,
      ciudad: isTraslado ? ciudad.trim() : undefined,
      pais: isTraslado ? pais.trim() : undefined,
      documentDeadline: undefined as string | undefined,
    };

    try {
      const result = await addRequest(requestData);
      if (!result) return;

      await sendNotification('solicitud_enviada', result);
      setShowConfirmDialog(false);
      setShowModal(true);
    } catch (err) {
      console.error('Error creating request:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getConfirmMessage = () => {
    let msg = '';
    if (motivo === 'Traslado temporal por teletrabajo móvil') {
      msg = 'Esta solicitud requiere aprobación de tu líder y de Talento Humano.';
    } else if (approvalFlowMotivos.includes(motivo)) {
      msg = 'Esta solicitud tiene 3 niveles de aprobación:\n\n1. Validación de la calamidad por tu líder y Talento Humano.\n2. Otorgamiento del permiso.\n3. Aprobación final tras cargar los soportes después de la calamidad.';
    } else if (leaderOnlyApprovalMotivos.includes(motivo)) {
      msg = 'Esta solicitud requiere aprobación de tu líder.';
    } else {
      msg = 'Esta solicitud requiere notificación a tu líder.';
    }

    // Plazo de soportes según motivo
    if (motivo === 'Calamidad doméstica grave') {
      msg += '\n\nSi es aprobado, deberás cargar los soportes dentro de los 5 días hábiles siguientes a la fecha de terminación del permiso.';
    } else if (motivo !== 'Sepelio compañeros' && motivo !== 'Uso de bicicleta' && motivo !== 'Luto' && motivoRequiresDocuments[motivo]?.length > 0) {
      msg += '\n\nRecuerda que debes cargar los soportes dentro de los 5 días hábiles siguientes a la fecha de terminación del permiso.';
    }

    const requiredDocs = motivoRequiresDocuments[motivo];
    if (requiredDocs && requiredDocs.length > 0) {
      msg += '\n\nDocumentos requeridos: ' + requiredDocs.join(', ') + '.';
    }
    if (isDiligencias) {
      const remaining = Math.max(0, diligenciasMinutesAvailable - diligenciasCurrentMinutes);
      msg += `\n\nHoras de Diligencias personales disponibles tras esta solicitud: ${formatMinutes(remaining)} de ${formatMinutes(30 * 60)}.`;
    }
    return msg;
  };

  const getFlowMessage = () => {
    if (motivo === 'Traslado temporal por teletrabajo móvil') {
      return 'Tu solicitud ha sido enviada. Requiere aprobación de tu líder y luego de Talento Humano. Te notificaremos en cada paso.';
    }
    if (approvalFlowMotivos.includes(motivo)) {
      return 'Tu solicitud ha sido enviada. Requiere aprobación de tu líder y luego de Talento Humano. Te notificaremos en cada paso.';
    }
    if (leaderOnlyApprovalMotivos.includes(motivo)) {
      return 'Tu solicitud ha sido enviada. Tu líder debe aprobarla para que sea efectiva.';
    }
    return 'Tu solicitud ha sido enviada y notificada a tu líder. Recibirás confirmación por correo.';
  };

  // Max end date for multi-day motivos
  const maxEndDate = useMemo(() => {
    if (!fechaInicio || !maxDays || !isMultiDay) return null;
    let count = 0;
    const current = new Date(fechaInicio);
    while (count < maxDays) {
      if (isBusinessDay(current)) count++;
      if (count < maxDays) current.setDate(current.getDate() + 1);
    }
    return new Date(current);
  }, [fechaInicio, maxDays, isMultiDay]);

  if (!user) return null;

  const labelClass = "block font-nunito text-[13px] font-semibold text-interlan-text-secondary mb-1.5";
  const inputReadOnlyClass = "w-full h-11 px-3 bg-interlan-light-gray border border-interlan-border-gray rounded-lg font-nunito text-[14px] text-interlan-text-muted";
  const selectClass = "w-full h-11 px-3 border border-interlan-border-gray rounded-lg font-nunito text-[14px] bg-background focus:outline-none focus:ring-2 focus:ring-interlan-blue/30";
  const errorClass = "font-nunito text-[12px] text-[#E53935] mt-1";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <BackButton />
        <h1 className="font-nunito font-bold text-[28px] text-foreground mb-8">Nueva solicitud de permiso</h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* Form */}
          <form onSubmit={handleSubmit} className="border border-interlan-border-gray rounded-xl p-6 md:p-8">
            {/* Section 1: Employee data */}
            <h3 className="font-nunito font-bold text-[16px] mb-4">Datos del empleado</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {[
                { label: 'Nombre y apellidos', value: user.name },
                { label: 'Cédula', value: user.cedula },
                { label: 'Área', value: user.area },
              ].map(f => (
                <div key={f.label}>
                  <label className={labelClass}>{f.label}</label>
                  <input value={f.value} readOnly className={inputReadOnlyClass} />
                </div>
              ))}
            </div>

            {/* Section 2: Request details */}
            <h3 className="font-nunito font-bold text-[16px] mb-4">Detalles de la solicitud</h3>
            <div className="space-y-4 mb-8">
              <div>
                <label className={labelClass}>Fecha de solicitud</label>
                <input value={formatDateES(new Date())} readOnly className={inputReadOnlyClass} />
              </div>

              <div>
                <label className={labelClass}>Tipo de ausencia</label>
                <select value={tipo} onChange={e => handleTipoChange(e.target.value)} className={selectClass}>
                  <option value="">Seleccionar tipo</option>
                  {Object.keys(permissionTypes).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {errors.tipo && <p className={errorClass}>{errors.tipo}</p>}
              </div>

              {tipo && (
                <div>
                  <label className={labelClass}>Motivo</label>
                  <select value={motivo} onChange={e => handleMotivoChange(e.target.value)} className={selectClass}>
                    <option value="">Seleccionar motivo</option>
                    {motivos.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  {errors.motivo && <p className={errorClass}>{errors.motivo}</p>}
                  {motivo && motivoDuration[motivo] && (
                    <p className="font-nunito text-[12px] text-interlan-blue mt-1.5">
                      Duración permitida: {motivoDuration[motivo]}
                    </p>
                  )}
                </div>
              )}

              {/* === DYNAMIC FIELDS PER MOTIVO === */}
              {motivo && (
                <>
                  {/* Calamidad: subcategory + tipo + description */}
                  {isCalamidad && (
                    <>
                      <div>
                        <label className={labelClass}>Subcategoría</label>
                        <select
                          value={calamidadSubcategoria}
                          onChange={e => { setCalamidadSubcategoria(e.target.value); setFechaInicio(undefined); setFechaFin(undefined); setErrors(prev => { const { calamidadSubcategoria: _, ...rest } = prev; return rest; }); }}
                          className={selectClass}
                        >
                          <option value="">Seleccionar</option>
                          <option value="Programada">Programada</option>
                          <option value="No programada">No programada</option>
                        </select>
                        {errors.calamidadSubcategoria && <p className={errorClass}>{errors.calamidadSubcategoria}</p>}
                        {calamidadSubcategoria && (
                          <p className="font-nunito text-[12px] text-interlan-text-muted mt-1">
                            {calamidadSubcategoria === 'Programada'
                            ? 'Solo puedes seleccionar fechas futuras (no hoy).'
                              : 'Solo puedes seleccionar fechas de hoy o pasadas.'}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className={labelClass}>Tipo de calamidad</label>
                        <select value={calamidadTipo} onChange={e => { setCalamidadTipo(e.target.value); setErrors(prev => { const { calamidadTipo: _, ...rest } = prev; return rest; }); }} className={selectClass}>
                          <option value="">Seleccionar</option>
                          {calamidadTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        {errors.calamidadTipo && <p className={errorClass}>{errors.calamidadTipo}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Descripción de la calamidad</label>
                        <textarea
                          value={calamidadDesc}
                          onChange={e => { setCalamidadDesc(e.target.value); setErrors(prev => { const { calamidadDesc: _, ...rest } = prev; return rest; }); }}
                          rows={3}
                          className="w-full px-3 py-2 border border-interlan-border-gray rounded-lg font-nunito text-[14px] bg-background resize-none focus:outline-none focus:ring-2 focus:ring-interlan-blue/30"
                          placeholder="Describe brevemente la situación (mínimo 10 caracteres)..."
                        />
                        {errors.calamidadDesc && <p className={errorClass}>{errors.calamidadDesc}</p>}
                      </div>
                    </>
                  )}

                  {/* Luto / Sepelio otros familiares: familiar dropdown */}
                  {(isLuto || isSepelioOtros) && (
                    <div>
                      <label className={labelClass}>Familiar fallecido</label>
                      <select value={lutoFamiliar} onChange={e => { setLutoFamiliar(e.target.value); setErrors(prev => { const { lutoFamiliar: _, ...rest } = prev; return rest; }); }} className={selectClass}>
                        <option value="">Seleccionar</option>
                        {(isSepelioOtros ? sepelioFamiliares : lutoFamiliares).map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                      {errors.lutoFamiliar && <p className={errorClass}>{errors.lutoFamiliar}</p>}
                    </div>
                  )}

                  {/* Cumpleaños: fecha de cumpleaños */}
                  {isCumpleanos && (() => {
                    const stored = getBirthdayForUser(user?.id);
                    const mismatch = stored && fechaCumpleanos && stored !== fechaCumpleanos;
                    return (
                      <div>
                        <label className={labelClass}>Fecha de cumpleaños</label>
                        <input
                          type="date"
                          value={fechaCumpleanos}
                          onChange={e => { setFechaCumpleanos(e.target.value); setErrors(prev => { const { fechaCumpleanos: _, fechaInicio: __, ...rest } = prev; return rest; }); }}
                          className="w-full h-11 px-3 border border-interlan-border-gray rounded-lg font-nunito text-[14px] bg-background focus:outline-none focus:ring-2 focus:ring-interlan-blue/30"
                        />
                        {errors.fechaCumpleanos && <p className={errorClass}>{errors.fechaCumpleanos}</p>}
                        {mismatch && (
                          <p className="font-nunito text-[12px] text-[#E65100] mt-1.5 bg-[#FFF3E0] border border-[#FFB74D] rounded-md p-2">
                            La fecha ingresada no coincide con la fecha registrada por Talento Humano ({stored}). Se validará el permiso contra la fecha registrada.
                          </p>
                        )}
                        {!stored && (
                          <p className="font-nunito text-[12px] text-interlan-text-muted mt-1">
                            El permiso solo puede tomarse el día del cumpleaños o hasta una semana después.
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  {/* Quinquenio: fecha del quinquenio */}
                  {isQuinquenio && (() => {
                    const stored = getQuinquenioForUser(user?.id);
                    const mismatch = stored && fechaQuinquenio && stored !== fechaQuinquenio;
                    return (
                      <div>
                        <label className={labelClass}>Fecha del quinquenio</label>
                        <input
                          type="date"
                          value={fechaQuinquenio}
                          onChange={e => { setFechaQuinquenio(e.target.value); setErrors(prev => { const { fechaQuinquenio: _, fechaInicio: __, ...rest } = prev; return rest; }); }}
                          className="w-full h-11 px-3 border border-interlan-border-gray rounded-lg font-nunito text-[14px] bg-background focus:outline-none focus:ring-2 focus:ring-interlan-blue/30"
                        />
                        {errors.fechaQuinquenio && <p className={errorClass}>{errors.fechaQuinquenio}</p>}
                        {mismatch && (
                          <p className="font-nunito text-[12px] text-[#E65100] mt-1.5 bg-[#FFF3E0] border border-[#FFB74D] rounded-md p-2">
                            La fecha ingresada no coincide con la fecha registrada por Talento Humano ({stored}). Se validará el permiso contra la fecha registrada.
                          </p>
                        )}
                        {!stored && (
                          <p className="font-nunito text-[12px] text-interlan-text-muted mt-1">
                            El permiso solo puede tomarse el día del quinquenio o hasta un mes después.
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  {/* Traslado temporal: dirección, ciudad, país */}
                  {isTraslado && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className={labelClass}>Dirección</label>
                        <input
                          type="text"
                          value={direccion}
                          onChange={e => { setDireccion(e.target.value); setErrors(prev => { const { direccion: _, ...rest } = prev; return rest; }); }}
                          className="w-full h-11 px-3 border border-interlan-border-gray rounded-lg font-nunito text-[14px] bg-background focus:outline-none focus:ring-2 focus:ring-interlan-blue/30"
                          placeholder="Calle / carrera / n.º"
                        />
                        {errors.direccion && <p className={errorClass}>{errors.direccion}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Ciudad</label>
                        <input
                          type="text"
                          value={ciudad}
                          onChange={e => { setCiudad(e.target.value); setErrors(prev => { const { ciudad: _, ...rest } = prev; return rest; }); }}
                          className="w-full h-11 px-3 border border-interlan-border-gray rounded-lg font-nunito text-[14px] bg-background focus:outline-none focus:ring-2 focus:ring-interlan-blue/30"
                        />
                        {errors.ciudad && <p className={errorClass}>{errors.ciudad}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>País</label>
                        <input
                          type="text"
                          value={pais}
                          onChange={e => { setPais(e.target.value); setErrors(prev => { const { pais: _, ...rest } = prev; return rest; }); }}
                          className="w-full h-11 px-3 border border-interlan-border-gray rounded-lg font-nunito text-[14px] bg-background focus:outline-none focus:ring-2 focus:ring-interlan-blue/30"
                        />
                        {errors.pais && <p className={errorClass}>{errors.pais}</p>}
                      </div>
                    </div>
                  )}

                  {/* Bicicleta semester block */}
                  {bicicletaUsedThisSemester && (
                    <div className="bg-[#FFF3E0] border border-[#FFB74D] rounded-lg p-4">
                      <p className="font-nunito text-[13px] text-[#E65100] font-semibold">
                        Ya utilizaste este permiso en el semestre actual. Solo está permitido 1 vez por semestre.
                      </p>
                    </div>
                  )}

                  {/* Diligencias personales: contador anual visible */}
                  {isDiligencias && (() => {
                    return (
                      <div className="bg-interlan-light-blue border border-interlan-blue/20 rounded-lg p-4">
                        <p className="font-nunito text-[13px] text-interlan-blue font-semibold">
                          Horas disponibles este año: {formatMinutes(diligenciasMinutesAvailable)} de {formatMinutes(30 * 60)}
                        </p>
                        <p className="font-nunito text-[12px] text-interlan-text-secondary mt-1">
                          Ya utilizadas: {formatMinutes(diligenciasStats.minutesUsed)}. Máximo 2 solicitudes por semana. No se permiten días hábiles consecutivos.
                        </p>
                      </div>
                    );
                  })()}

                  {/* Fixed duration info */}
                  {isFixedDuration && (
                    <div className="bg-interlan-light-blue border border-interlan-blue/20 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <Info size={16} className="text-interlan-blue shrink-0" />
                        <p className="font-nunito text-[13px] text-interlan-blue font-semibold">
                          {getFixedDurationText()}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Date selectors */}
                  {!bicicletaUsedThisSemester && (isCalamidad ? !!calamidadSubcategoria : true) && !isFixedDuration && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Fecha inicio</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button type="button" className={cn("w-full h-11 px-3 border border-interlan-border-gray rounded-lg font-nunito text-[14px] flex items-center justify-between bg-background", !fechaInicio && "text-interlan-text-muted")}>
                              {fechaInicio ? formatDateES(fechaInicio) : 'Seleccionar fecha'}
                              <CalendarIcon size={16} className="text-interlan-text-muted" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={fechaInicio}
                              onSelect={handleFechaInicioChange}
                              disabled={getDateDisabled}
                              initialFocus
                              className="p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                        {errors.fechaInicio && <p className={errorClass}>{errors.fechaInicio}</p>}
                      </div>

                      {isMultiDay ? (
                        <div>
                          <label className={labelClass}>Fecha fin</label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button type="button" className={cn("w-full h-11 px-3 border border-interlan-border-gray rounded-lg font-nunito text-[14px] flex items-center justify-between bg-background", !fechaFin && "text-interlan-text-muted")}>
                                {fechaFin ? formatDateES(fechaFin) : 'Seleccionar fecha'}
                                <CalendarIcon size={16} className="text-interlan-text-muted" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={fechaFin}
                                onSelect={(d) => { setFechaFin(d); setErrors(prev => { const { fechaFin: _, ...rest } = prev; return rest; }); }}
                                disabled={(date) => {
                                  if (!isBusinessDay(startOfDay(date))) return true;
                                  if (isCalamidad) {
                                    if (calamidadSubcategoria === 'Programada' && isBefore(startOfDay(date), startOfDay(new Date(today.getTime() + 86400000)))) return true;
                                    if (calamidadSubcategoria === 'No programada' && isAfter(startOfDay(date), today)) return true;
                                  }
                                  if (fechaInicio && isBefore(startOfDay(date), startOfDay(fechaInicio))) return true;
                                  if (maxEndDate && isAfter(startOfDay(date), startOfDay(maxEndDate))) return true;
                                  return false;
                                }}
                                initialFocus
                                className="p-3 pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                          {errors.fechaFin && <p className={errorClass}>{errors.fechaFin}</p>}
                        </div>
                      ) : fechaInicio ? (
                        <div>
                          <label className={labelClass}>Fecha fin</label>
                          <input value={formatDateES(fechaInicio)} readOnly className={inputReadOnlyClass} />
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Fixed duration: single date picker */}
                  {isFixedDuration && !bicicletaUsedThisSemester && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Fecha inicio</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button type="button" className={cn("w-full h-11 px-3 border border-interlan-border-gray rounded-lg font-nunito text-[14px] flex items-center justify-between bg-background", !fechaInicio && "text-interlan-text-muted")}>
                              {fechaInicio ? formatDateES(fechaInicio) : 'Seleccionar fecha'}
                              <CalendarIcon size={16} className="text-interlan-text-muted" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={fechaInicio}
                              onSelect={(d) => { setFechaInicio(d); setFechaFin(d); setErrors(prev => { const { fechaInicio: _, ...rest } = prev; return rest; }); }}
                              disabled={getDateDisabled}
                              initialFocus
                              className="p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                        {errors.fechaInicio && <p className={errorClass}>{errors.fechaInicio}</p>}
                      </div>
                      {fechaInicio && (
                        <div>
                          <label className={labelClass}>Fecha fin</label>
                          <input value={formatDateES(fechaInicio)} readOnly className={inputReadOnlyClass} />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Votación: selector Mañana/Tarde */}
                  {(motivo === 'Derecho por votación' || motivo === 'Cumpleaños') && fechaInicio && (
                    <div>
                      <label className={labelClass}>Turno de la media jornada</label>
                      <select
                        value={votacionTurno}
                        onChange={e => setVotacionTurno(e.target.value as 'mañana' | 'tarde')}
                        className="w-full h-11 px-3 border border-interlan-border-gray rounded-lg font-nunito text-[14px] bg-background focus:outline-none focus:ring-2 focus:ring-interlan-blue/30"
                      >
                        <option value="mañana">Mañana (08:00 AM – 12:30 PM)</option>
                        <option value="tarde">Tarde (01:30 PM – {getAfternoonEndTime(fechaInicio) === '17:00' ? '05:00 PM' : '05:30 PM'})</option>
                      </select>
                    </div>
                  )}

                  {showHours && !bicicletaUsedThisSemester && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Hora inicio</label>
                        <input type="time" value={horaInicio} min="08:00" max={horaInicioMax} disabled={calamidadFullDay} onChange={e => {
                          const v = e.target.value;
                          setHoraInicio(v);
                          setErrors(prev => { const { horaInicio: _, horaFin: __, ...rest } = prev; return rest; });
                        }} className="w-full h-11 px-3 border border-interlan-border-gray rounded-lg font-nunito text-[14px] bg-background focus:outline-none focus:ring-2 focus:ring-interlan-blue/30 disabled:opacity-70 disabled:cursor-not-allowed" />
                        {errors.horaInicio && <p className={errorClass}>{errors.horaInicio}</p>}
                        {calamidadFullDay && <p className="text-[12px] text-muted-foreground mt-1 font-nunito">Se toma la jornada completa automáticamente.</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Hora fin</label>
                        <input type="time" value={horaFin} min="08:00" max={horaFinMax} disabled={calamidadFullDay} onChange={e => {
                          const v = e.target.value;
                          setHoraFin(v);
                          setErrors(prev => { const { horaInicio: _, horaFin: __, ...rest } = prev; return rest; });
                        }} className="w-full h-11 px-3 border border-interlan-border-gray rounded-lg font-nunito text-[14px] bg-background focus:outline-none focus:ring-2 focus:ring-interlan-blue/30 disabled:opacity-70 disabled:cursor-not-allowed" />
                        {errors.horaFin && <p className={errorClass}>{errors.horaFin}</p>}
                      </div>
                    </div>
                  )}

                  {/* Calculated summary fields */}
                  {!bicicletaUsedThisSemester && (fechaInicio || isFixedDuration) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Duración de la ausencia</label>
                        <input value={durationDisplay || '—'} readOnly className={inputReadOnlyClass} />
                      </div>
                      {returnDate && (
                        <div>
                          <label className={labelClass}>Fecha de regreso a labores</label>
                          <input
                            value={returnDate.sameDay
                              ? formatDateTimeES(returnDate.date, returnDate.time)
                              : `${formatDateES(returnDate.date)} 08:00 AM`}
                            readOnly
                            className={inputReadOnlyClass}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Numero de dias (read only) */}
                  {!bicicletaUsedThisSemester && absenceDays !== null && (isMultiDay || isHourBased || calamidadUsesHours) && (
                    <div>
                      <label className={labelClass}>Número de días de ausencia</label>
                      <input value={`${absenceDays} día(s) hábil(es)`} readOnly className={inputReadOnlyClass} />
                    </div>
                  )}

                </>
              )}
            </div>

            {/* Section 3: Approver */}
            {motivo && !bicicletaUsedThisSemester && (
              <>
                <h3 className="font-nunito font-bold text-[16px] mb-4">Aprobador</h3>
                <div className="space-y-4 mb-8">
                  <div>
                    <label className={labelClass}>Aprobador</label>
                    <select
                      value={approver}
                      onChange={e => {
                        setApprover(e.target.value);
                        if (e.target.value === 'lider') setApproverEmail(user.leaderEmail || '');
                        else setApproverEmail('');
                      }}
                      className={selectClass}
                    >
                      <option value="lider">{user.leaderName || 'Líder directo'}</option>
                      <option value="ausencias">Aprobador de ausencias</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Correo del aprobador</label>
                    <input
                      value={approverEmail}
                      onChange={e => setApproverEmail(e.target.value)}
                      readOnly={approver === 'lider'}
                      className={cn("w-full h-11 px-3 border border-interlan-border-gray rounded-lg font-nunito text-[14px]", approver === 'lider' ? 'bg-interlan-light-gray text-interlan-text-muted' : 'bg-background')}
                    />
                  </div>
                </div>
              </>
            )}

            {/* NO document upload section — documents are uploaded post-submission */}

            <button
              type="submit"
              disabled={bicicletaUsedThisSemester}
              className={cn(
                "w-full h-[44px] font-nunito text-[14px] font-bold rounded-lg mt-6 transition-colors",
                bicicletaUsedThisSemester
                  ? "bg-interlan-border-gray text-interlan-text-muted cursor-not-allowed"
                  : "bg-interlan-blue text-white hover:bg-interlan-blue/90"
              )}
            >
              Enviar solicitud
            </button>
          </form>

          {/* Summary panel */}
          <div className="hidden lg:block">
            <div className="sticky top-[76px] bg-interlan-light-gray rounded-xl p-6">
              <h3 className="font-nunito font-bold text-[16px] mb-4">Resumen de solicitud</h3>
              <div className="space-y-3">
                {[
                  { label: 'Empleado', value: user.name },
                  { label: 'Tipo', value: tipo || '—' },
                  { label: 'Motivo', value: motivo || '—' },
                  ...(isCalamidad && calamidadSubcategoria ? [{ label: 'Subcategoría', value: calamidadSubcategoria }] : []),
                  ...(isCalamidad && calamidadTipo ? [{ label: 'Tipo calamidad', value: calamidadTipo }] : []),
                  ...((isLuto || isSepelioOtros) && lutoFamiliar ? [{ label: 'Familiar', value: lutoFamiliar }] : []),
                  { label: 'Fecha inicio', value: fechaInicio ? formatDateES(fechaInicio) : '—' },
                  ...(isMultiDay ? [{ label: 'Fecha fin', value: fechaFin ? formatDateES(fechaFin) : '—' }] : []),
                  ...(showHours && horaInicio ? [{ label: 'Hora inicio', value: horaInicio }] : []),
                  ...(showHours && horaFin ? [{ label: 'Hora fin', value: horaFin }] : []),
                  { label: 'Duración', value: durationDisplay || '—' },
                  ...(absenceDays !== null ? [{ label: 'Días de ausencia', value: `${absenceDays} día(s) hábil(es)` }] : []),
                  { label: 'Regreso', value: returnDate ? (returnDate.sameDay ? formatDateTimeES(returnDate.date, returnDate.time) : `${formatDateES(returnDate.date)} 08:00 AM`) : '—' },
                  { label: 'Aprobador', value: approver === 'lider' ? (user.leaderName || '—') : 'Aprobador de ausencias' },
                ].map(item => (
                  <div key={item.label} className="flex justify-between">
                    <span className="font-nunito text-[13px] text-interlan-text-secondary">{item.label}</span>
                    <span className="font-nunito text-[13px] font-semibold text-foreground text-right">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pre-send confirmation dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-nunito">Confirmar envío</DialogTitle>
            <DialogDescription className="font-nunito text-[14px] text-interlan-text-secondary mt-2 whitespace-pre-line">
              {getConfirmMessage()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button
              onClick={() => setShowConfirmDialog(false)}
              className="h-[44px] px-6 border border-interlan-border-gray font-nunito text-[14px] font-bold rounded-lg"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmSend}
              disabled={isSubmitting}
              className={`h-[44px] px-6 bg-interlan-blue text-white font-nunito text-[14px] font-bold rounded-lg ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Confirmar envío
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-nunito">Solicitud enviada correctamente</DialogTitle>
            <DialogDescription className="font-nunito text-[14px] text-interlan-text-secondary mt-2">
              {getFlowMessage()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => { setShowModal(false); navigate('/mis-solicitudes'); }}
              className="w-full h-[44px] bg-interlan-blue text-white font-nunito text-[14px] font-bold rounded-lg"
            >
              Ver mis solicitudes
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NuevaSolicitud;
