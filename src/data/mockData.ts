export type RequestStatus = 'pendiente' | 'notificado' | 'en_revision_th' | 'aprobado' | 'denegado' | 'soportes_pendientes' | 'soportes_en_revision' | 'finalizado' | 'mas_info_requerida';
export type DocumentStatus = 'sin_documentos' | 'documentos_cargados' | 'aprobado_finalizado' | 'mas_info';

export interface PermissionRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeInitials: string;
  employeeArea: string;
  type: string;
  motivo: string;
  fechaSolicitud: string;
  fechaInicio: string;
  fechaFin: string;
  diasHabiles: number;
  status: RequestStatus;
  approver: string;
  approverEmail: string;
  documentStatus: DocumentStatus;
  documentDeadline?: string;
  rejectionReason?: string;
  rejectedBy?: 'lider' | 'th';
  rejectionDate?: string;
  infoRequestMessage?: string;
  timeline: { label: string; date: string; completed: boolean }[];
  calamidadTipo?: string;
  calamidadSubcategoria?: string;
  calamidadDescripcion?: string;
  lutoFamiliar?: string;
  horaInicio?: string;
  horaFin?: string;
  direccion?: string;
  ciudad?: string;
  pais?: string;
}

export const mockRequests: PermissionRequest[] = [
  {
    id: '1',
    employeeId: '1',
    employeeName: 'Carlos Martínez',
    employeeInitials: 'CM',
    employeeArea: 'Tecnología',
    type: 'Licencia remunerada por ley',
    motivo: 'Luto',
    fechaSolicitud: '15/marzo/2026',
    fechaInicio: '16/marzo/2026',
    fechaFin: '20/marzo/2026',
    diasHabiles: 5,
    status: 'pendiente',
    approver: 'Ana Rodríguez',
    approverEmail: 'ana.rodriguez@interlan.co',
    documentStatus: 'sin_documentos',
    documentDeadline: '23/marzo/2026',
    timeline: [
      { label: 'Enviada', date: '15/marzo/2026', completed: true },
      { label: 'Notificada al líder', date: '', completed: false },
      { label: 'Aprobada por TH', date: '', completed: false },
      { label: 'Finalizada', date: '', completed: false },
    ],
  },
  {
    id: '2',
    employeeId: '1',
    employeeName: 'Carlos Martínez',
    employeeInitials: 'CM',
    employeeArea: 'Tecnología',
    type: 'Permiso remunerado Sueños Compartidos',
    motivo: 'Día de cumpleaños',
    fechaSolicitud: '10/marzo/2026',
    fechaInicio: '25/marzo/2026',
    fechaFin: '25/marzo/2026',
    diasHabiles: 1,
    status: 'aprobado',
    approver: 'Ana Rodríguez',
    approverEmail: 'ana.rodriguez@interlan.co',
    documentStatus: 'aprobado_finalizado',
    timeline: [
      { label: 'Enviada', date: '10/marzo/2026', completed: true },
      { label: 'Aprobada por líder', date: '11/marzo/2026', completed: true },
      { label: 'Finalizada', date: '11/marzo/2026', completed: true },
    ],
  },
  {
    id: '4',
    employeeId: '4',
    employeeName: 'Pedro López',
    employeeInitials: 'PL',
    employeeArea: 'Comercial',
    type: 'Licencia remunerada por ley',
    motivo: 'Cita médica programada',
    fechaSolicitud: '14/marzo/2026',
    fechaInicio: '18/marzo/2026',
    fechaFin: '18/marzo/2026',
    diasHabiles: 1,
    status: 'pendiente',
    approver: 'Ana Rodríguez',
    approverEmail: 'ana.rodriguez@interlan.co',
    documentStatus: 'sin_documentos',
    documentDeadline: '20/marzo/2026',
    timeline: [
      { label: 'Enviada', date: '14/marzo/2026', completed: true },
      { label: 'Notificada al líder', date: '', completed: false },
    ],
  },
  {
    id: '5',
    employeeId: '5',
    employeeName: 'María Torres',
    employeeInitials: 'MT',
    employeeArea: 'Finanzas',
    type: 'Licencia remunerada por ley',
    motivo: 'Calamidad doméstica grave',
    fechaSolicitud: '12/marzo/2026',
    fechaInicio: '12/marzo/2026',
    fechaFin: '14/marzo/2026',
    diasHabiles: 3,
    status: 'denegado',
    approver: 'Ana Rodríguez',
    approverEmail: 'ana.rodriguez@interlan.co',
    documentStatus: 'sin_documentos',
    rejectionReason: 'No se adjuntaron los documentos de soporte requeridos dentro del plazo establecido.',
    timeline: [
      { label: 'Enviada', date: '12/marzo/2026', completed: true },
      { label: 'Denegada por líder', date: '13/marzo/2026', completed: true },
    ],
  },
  {
    id: '6',
    employeeId: '6',
    employeeName: 'Laura Gómez',
    employeeInitials: 'LG',
    employeeArea: 'Operaciones',
    type: 'Licencia remunerada por ley',
    motivo: 'Calamidad doméstica grave',
    fechaSolicitud: '13/marzo/2026',
    fechaInicio: '13/marzo/2026',
    fechaFin: '15/marzo/2026',
    diasHabiles: 3,
    status: 'en_revision_th',
    approver: 'Ana Rodríguez',
    approverEmail: 'ana.rodriguez@interlan.co',
    documentStatus: 'documentos_cargados',
    timeline: [
      { label: 'Enviada', date: '13/marzo/2026', completed: true },
      { label: 'Notificada al líder', date: '13/marzo/2026', completed: true },
      { label: 'En revisión TH', date: '14/marzo/2026', completed: true },
    ],
  },
  {
    id: '7',
    employeeId: '7',
    employeeName: 'Andrés Vargas',
    employeeInitials: 'AV',
    employeeArea: 'Tecnología',
    type: 'Licencia remunerada por ley',
    motivo: 'Luto',
    fechaSolicitud: '11/marzo/2026',
    fechaInicio: '12/marzo/2026',
    fechaFin: '18/marzo/2026',
    diasHabiles: 5,
    status: 'soportes_en_revision',
    approver: 'Ana Rodríguez',
    approverEmail: 'ana.rodriguez@interlan.co',
    documentStatus: 'documentos_cargados',
    timeline: [
      { label: 'Enviada', date: '11/marzo/2026', completed: true },
      { label: 'Aprobada por líder', date: '12/marzo/2026', completed: true },
      { label: 'Soportes en revisión', date: '15/marzo/2026', completed: true },
    ],
  },
  {
    id: '8',
    employeeId: '8',
    employeeName: 'Sofía Restrepo',
    employeeInitials: 'SR',
    employeeArea: 'Comercial',
    type: 'Permiso remunerado Sueños Compartidos',
    motivo: 'Grado académico',
    fechaSolicitud: '10/marzo/2026',
    fechaInicio: '20/marzo/2026',
    fechaFin: '20/marzo/2026',
    diasHabiles: 1,
    status: 'soportes_en_revision',
    approver: 'Ana Rodríguez',
    approverEmail: 'ana.rodriguez@interlan.co',
    documentStatus: 'documentos_cargados',
    timeline: [
      { label: 'Enviada', date: '10/marzo/2026', completed: true },
      { label: 'Aprobada por líder', date: '11/marzo/2026', completed: true },
      { label: 'Soportes en revisión', date: '14/marzo/2026', completed: true },
    ],
  },
];

export const permissionTypes = {
  'Licencia remunerada por ley': [
    'Calamidad doméstica grave',
    'Cita escolar acudiente',
    'Cita judicial o administrativa',
    'Cita médica acudiente',
    'Cita médica programada',
    'Derecho por jurado de votación',
    'Derecho por votación',
    'Luto',
    'Sepelio compañeros',
    'Uso de bicicleta',
  ],
  'Permiso remunerado Sueños Compartidos': [
    'Cumpleaños',
'Diligencias personales',
    'Graduación',
    'Matrimonio',
    'Quinquenio',
    'Sepelio otros familiares',
    'Traslado temporal por teletrabajo móvil',
  ],
  
};

export const motivoDuration: Record<string, string> = {
  'Calamidad doméstica grave': 'Desde horas hasta máx. 3 días hábiles',
  'Cita escolar acudiente': '1h a 4h',
  'Cita judicial o administrativa': 'Sin tiempo determinado',
  'Cita médica acudiente': '1h a 4h',
  'Cita médica programada': '1h a 4h',
  'Derecho por jurado de votación': '1 jornada laboral',
  'Derecho por votación': 'Media jornada laboral',
  'Luto': 'Máx. 5 días hábiles',
  'Sepelio compañeros': 'Máx. media jornada laboral',
  'Uso de bicicleta': 'Máx. 1 jornada laboral por semestre',
  // Sueños Compartidos
  'Cumpleaños': 'Media jornada laboral (4h lunes / 4h 15min martes a viernes)',
  'Diligencias personales': 'Desde horas hasta máx. 1 jornada laboral',
'Graduación': 'Desde horas hasta máx. 1 jornada laboral',
  'Matrimonio': 'Hasta máx. 3 días hábiles',
  'Quinquenio': '1 jornada laboral completa',
  'Sepelio otros familiares': 'Desde horas hasta máx. 1 jornada laboral',
  'Traslado temporal por teletrabajo móvil': 'Sin tiempo determinado',
};

export const hourBasedMotivos = [
  'Cita escolar acudiente',
  'Cita médica acudiente',
  'Cita médica programada',
  'Derecho por votación',
  'Sepelio compañeros',
  'Calamidad doméstica grave',
  'Diligencias personales',
'Graduación',
  'Sepelio otros familiares',
];

export const motivoMaxDays: Record<string, number> = {
  'Calamidad doméstica grave': 3,
  'Cita escolar acudiente': 1,
  'Cita médica acudiente': 1,
  'Cita médica programada': 1,
  'Derecho por jurado de votación': 1,
  'Derecho por votación': 1,
  'Luto': 5,
  'Sepelio compañeros': 1,
  'Uso de bicicleta': 1,
  // Sueños Compartidos
  'Cumpleaños': 1,
  'Diligencias personales': 2,
'Graduación': 1,
  'Matrimonio': 3,
  'Quinquenio': 1,
  'Sepelio otros familiares': 1,
};

export const motivoRequiresDocuments: Record<string, string[]> = {
  'Cita escolar acudiente': ['Certificado de asistencia'],
  'Cita médica acudiente': ['Certificado de asistencia'],
  'Cita médica programada': ['Certificado de asistencia'],
  'Cita judicial o administrativa': ['Citación judicial o administrativa'],
  'Luto': ['Certificado de defunción', 'Documento que acredite parentesco'],
  'Calamidad doméstica grave': ['Documentos de soporte de la calamidad'],
  'Derecho por jurado de votación': ['Certificado electoral'],
  'Derecho por votación': ['Certificado electoral'],
  'Uso de bicicleta': ['Certificado o comprobante de uso de bicicleta como medio de transporte'],
  'Graduación': ['Invitación a la graduación'],
  'Sepelio otros familiares': ['Certificado de defunción', 'Documento que soporte el parentesco (cédula o registro civil)'],
  'Matrimonio': ['Partida de matrimonio'],
};

export const lutoFamiliares = [
  'Padre',
  'Madre',
  'Hijo/a',
  'Hermano/a',
  'Abuelo/a',
  'Cónyuge',
  'Compañero/a permanente',
  'Suegro/a',
  'Yerno/Nuera',
  'Nieto/a',
];

export const sepelioFamiliares = [
  'Tío(a)',
  'Sobrino(a)',
  'Primo(a)',
  'Bisabuelo(a)',
  'Bisnieto(a)',
  'Cuñado(a)',
  'Yerno',
  'Nuera',
  'Otro familiar',
];

// Holidays now managed in src/data/colombianHolidays.ts
