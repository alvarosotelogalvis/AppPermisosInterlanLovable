import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Menu, X, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logoWhite from '@/assets/logo-interlan-white.png';

const Navbar = () => {
  const { user, logout, switchRole, notifications, unreadCount, markAllRead } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <nav className="sticky top-0 z-50 h-[60px] bg-background border-b border-interlan-border-gray flex items-center px-4 md:px-6">
      <div className="flex items-center cursor-pointer" onClick={() => navigate('/dashboard')}>
        <img
          src={logoWhite}
          alt="Interlan"
          className="h-14 w-auto"
          style={{ filter: 'brightness(0) saturate(100%) invert(15%) sepia(95%) saturate(7404%) hue-rotate(226deg) brightness(101%) contrast(107%)' }}
        />
      </div>

      {/* Administración link - HR only */}
      {user.role === 'hr' && (
        <div className="hidden md:flex items-center ml-8">
          <button onClick={() => navigate('/administracion')} className="font-nunito text-[13px] font-semibold px-3 py-1.5 rounded-md hover:bg-interlan-light-gray transition-colors">
            Administración
          </button>
        </div>
      )}


      <div className="ml-auto flex items-center gap-4">
        {/* Role switcher (dev mode) */}
        <div className="relative hidden md:block">
          <button
            onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
            className="font-nunito text-[11px] font-bold uppercase tracking-[0.05em] px-2 py-1 border border-interlan-border-gray rounded-[6px] text-interlan-text-muted hover:border-interlan-blue transition-colors"
          >
            {user.role === 'employee' ? 'Empleado' : user.role === 'leader' ? 'Líder' : 'Talento Humano'}
          </button>
          {showRoleSwitcher && (
            <div className="absolute right-0 top-full mt-1 bg-background border border-interlan-border-gray rounded-lg p-1 min-w-[140px]">
              {(['employee', 'leader', 'hr'] as const).map(role => (
                <button
                  key={role}
                  onClick={() => { switchRole(role); setShowRoleSwitcher(false); }}
                  className="block w-full text-left px-3 py-2 font-nunito text-[13px] hover:bg-interlan-light-gray rounded-md"
                >
                  {role === 'employee' ? 'Empleado' : role === 'leader' ? 'Líder' : 'Talento Humano'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative">
          <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-1">
            <Bell size={20} className="text-interlan-text-secondary" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-[320px] bg-background border border-interlan-border-gray rounded-xl p-4 max-h-[400px] overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <span className="font-nunito font-bold text-sm">Notificaciones</span>
                <button onClick={markAllRead} className="font-nunito text-[12px] text-interlan-blue flex items-center gap-1">
                  <Check size={12} /> Marcar como leídas
                </button>
              </div>
              {notifications.map(n => (
                <div key={n.id} className={`py-2 border-b border-interlan-border-gray last:border-0 ${!n.read ? 'bg-interlan-light-blue/30' : ''} px-2 rounded`}>
                  <p className="font-nunito text-[13px] text-foreground">{n.message}</p>
                  <p className="font-nunito text-[11px] text-interlan-text-muted mt-1">
                    {n.timestamp.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User info */}
        <div className="hidden md:flex items-center gap-3">
          <span className="font-nunito text-[13px] text-interlan-text-secondary">Bienvenido, {user.name.split(' ')[0]}</span>
          <div className="w-8 h-8 bg-interlan-blue rounded-full flex items-center justify-center">
            <span className="text-white text-[12px] font-bold font-nunito">{user.initials}</span>
          </div>
        </div>

        {/* Logout */}
        <button onClick={() => { logout(); navigate('/login'); }} className="hidden md:block font-nunito text-[13px] text-interlan-text-muted hover:text-foreground">
          Salir
        </button>

        {/* Mobile hamburger */}
        <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="md:hidden p-1">
          {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {showMobileMenu && (
        <div className="absolute top-[60px] left-0 right-0 bg-background border-b border-interlan-border-gray p-4 md:hidden flex flex-col gap-3">
          <span className="font-nunito text-[13px] text-interlan-text-secondary">Bienvenido, {user.name.split(' ')[0]}</span>
          <div className="flex gap-2">
            {(['employee', 'leader', 'hr'] as const).map(role => (
              <button
                key={role}
                onClick={() => { switchRole(role); setShowMobileMenu(false); }}
                className={`font-nunito text-[12px] font-bold px-3 py-1.5 rounded-[6px] border ${user.role === role ? 'bg-interlan-blue text-white border-interlan-blue' : 'border-interlan-border-gray'}`}
              >
                {role === 'employee' ? 'Empleado' : role === 'leader' ? 'Líder' : 'Talento Humano'}
              </button>
            ))}
          </div>
          <button onClick={() => { navigate('/dashboard'); setShowMobileMenu(false); }} className="font-nunito text-[14px] py-2 text-left">Panel principal</button>
          <button onClick={() => { navigate('/nueva-solicitud'); setShowMobileMenu(false); }} className="font-nunito text-[14px] py-2 text-left">Nueva solicitud</button>
          <button onClick={() => { navigate('/mis-solicitudes'); setShowMobileMenu(false); }} className="font-nunito text-[14px] py-2 text-left">Mis solicitudes</button>
          {(user.role === 'leader' || user.role === 'hr') && (
            <button onClick={() => { navigate('/aprobaciones'); setShowMobileMenu(false); }} className="font-nunito text-[14px] py-2 text-left">Aprobaciones</button>
          )}
          {user.role === 'hr' && (
            <>
              <button onClick={() => { navigate('/documentos'); setShowMobileMenu(false); }} className="font-nunito text-[14px] py-2 text-left">Documentos</button>
              <button onClick={() => { navigate('/administracion'); setShowMobileMenu(false); }} className="font-nunito text-[14px] py-2 text-left">Administración</button>
            </>
          )}
          <button onClick={() => { logout(); navigate('/login'); setShowMobileMenu(false); }} className="font-nunito text-[14px] py-2 text-left text-interlan-text-muted">Salir</button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
