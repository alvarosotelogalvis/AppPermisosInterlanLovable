import React, { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'employee' | 'leader' | 'hr';

export interface User {
  id: string;
  name: string;
  email: string;
  cedula: string;
  area: string;
  role: UserRole;
  initials: string;
  leaderId?: string;
  leaderName?: string;
  leaderEmail?: string;
}

interface Notification {
  id: string;
  message: string;
  timestamp: Date;
  read: boolean;
  icon: 'info' | 'success' | 'warning';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  notifications: Notification[];
  unreadCount: number;
  markAllRead: () => void;
}

const createDemoUuid = (id: number) => `00000000-0000-0000-0000-${String(id).padStart(12, '0')}`;

const mockUsers: Record<UserRole, User> = {
  employee: {
    id: createDemoUuid(1),
    name: 'Carlos Martínez',
    email: 'carlos.martinez@interlan.co',
    cedula: '1.023.456.789',
    area: 'Tecnología',
    role: 'employee',
    initials: 'CM',
    leaderId: createDemoUuid(2),
    leaderName: 'Ana Rodríguez',
    leaderEmail: 'ana.rodriguez@interlan.co',
  },
  leader: {
    id: createDemoUuid(2),
    name: 'Ana Rodríguez',
    email: 'ana.rodriguez@interlan.co',
    cedula: '1.034.567.890',
    area: 'Tecnología',
    role: 'leader',
    initials: 'AR',
  },
  hr: {
    id: createDemoUuid(3),
    name: 'Laura Gómez',
    email: 'laura.gomez@interlan.co',
    cedula: '1.045.678.901',
    area: 'Talento Humano',
    role: 'hr',
    initials: 'LG',
  },
};

const extraUsers: Record<string, User> = {
  'andrearc@interlan.com.co': {
    id: createDemoUuid(4),
    name: 'Andrea RC',
    email: 'andrearc@interlan.com.co',
    cedula: '1.056.789.012',
    area: 'Tecnología',
    role: 'employee',
    initials: 'AR',
    leaderId: createDemoUuid(5),
    leaderName: 'Juan RA',
    leaderEmail: 'juanra@interlan.com.co',
  },
  'juanra@interlan.com.co': {
    id: createDemoUuid(5),
    name: 'Juan RA',
    email: 'juanra@interlan.com.co',
    cedula: '1.067.890.123',
    area: 'Tecnología',
    role: 'leader',
    initials: 'JR',
  },
  'felipeullo33@gmail.com': {
    id: createDemoUuid(6),
    name: 'Felipe Ullo',
    email: 'felipeullo33@gmail.com',
    cedula: '1.078.901.234',
    area: 'Talento Humano',
    role: 'hr',
    initials: 'FU',
  },
};

const mockNotifications: Notification[] = [
  { id: '1', message: 'Tu solicitud de Licencia remunerada ha sido enviada correctamente.', timestamp: new Date(Date.now() - 3600000), read: false, icon: 'success' },
  { id: '2', message: 'El estado de tu permiso de Luto cambió a Aprobado.', timestamp: new Date(Date.now() - 7200000), read: false, icon: 'info' },
  { id: '3', message: 'Tienes hasta mañana para cargar los documentos de tu permiso.', timestamp: new Date(Date.now() - 86400000), read: true, icon: 'warning' },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(mockUsers.employee);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

  const login = (email: string, password: string) => {
    // Credenciales de prueba: se leen de VITE_DEMO_CREDENTIALS (.env, no versionado).
    // Formato JSON: {"correo@dominio.com":"clave", ...}
    let credentials: Record<string, string> = {};
    try {
      credentials = JSON.parse(import.meta.env.VITE_DEMO_CREDENTIALS || '{}');
    } catch {
      credentials = {};
    }
    const lower = email.toLowerCase();
    // Check credentialed users
    if (credentials[lower] !== undefined) {
      if (password !== credentials[lower]) return false;
      const extraUser = extraUsers[lower];
      if (extraUser) { setUser(extraUser); return true; }
    }
    // Demo quick-access login
    const role = email.includes('hr') ? 'hr' : email.includes('ana') ? 'leader' : 'employee';
    setUser(mockUsers[role]);
    return true;
  };

  const logout = () => setUser(null);

  const switchRole = (role: UserRole) => setUser(mockUsers[role]);

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, switchRole, notifications, unreadCount, markAllRead }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
