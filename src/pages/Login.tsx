import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import BinaryPattern from '@/components/BinaryPattern';
import logoWhite from '@/assets/logo-interlan-white.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from || '/dashboard';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(email, password)) {
      navigate(redirectTo);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left panel - blue */}
      <div className="hidden md:flex w-1/2 bg-interlan-blue relative items-center justify-center">
        <BinaryPattern opacity={20} />
        <div className="relative z-10 flex flex-col items-center justify-center text-center px-12">
          <img src={logoWhite} alt="Interlan" className="w-[320px] h-auto mb-0" style={{ minHeight: '60px' }} />
           <p className="text-white/85 -mt-2 font-sans text-xl font-light">Portal Talento Humano</p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 md:hidden">
            <img src={logoWhite} alt="Interlan" className="max-w-[140px] invert" />
          </div>

          <h1 className="font-nunito font-bold text-[28px] text-foreground mb-2">Inicia sesión</h1>
          <p className="font-nunito text-[15px] text-interlan-text-secondary mb-8">Portal interno de permisos y ausencias</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block font-nunito text-[13px] font-semibold text-interlan-text-secondary mb-1.5">Correo corporativo</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nombre@interlan.co"
                className="w-full h-11 px-3 border border-interlan-border-gray rounded-lg font-nunito text-[14px] focus:outline-none focus:ring-2 focus:ring-interlan-blue/30 focus:border-interlan-blue bg-background"
                required
              />
            </div>
            <div>
              <label className="block font-nunito text-[13px] font-semibold text-interlan-text-secondary mb-1.5">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 px-3 border border-interlan-border-gray rounded-lg font-nunito text-[14px] focus:outline-none focus:ring-2 focus:ring-interlan-blue/30 focus:border-interlan-blue bg-background"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full h-[44px] bg-interlan-blue text-white font-nunito text-[14px] font-bold rounded-lg hover:bg-interlan-blue/90 transition-colors"
            >
              Ingresar
            </button>
          </form>

          <div className="mt-4 space-y-3">
            <p className="text-center">
              <a href="#" className="font-nunito text-[13px] text-interlan-blue">¿Olvidaste tu contraseña?</a>
            </p>
            <div className="border-t border-interlan-border-gray pt-3">
              <p className="font-nunito text-[12px] text-interlan-text-secondary text-center mb-2">Acceso rápido (demo)</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => { login('carlos@interlan.co', ''); navigate(redirectTo); }} className="flex-1 h-9 border border-interlan-border-gray rounded-lg font-nunito text-[12px] font-semibold hover:bg-accent transition-colors">Empleado</button>
                <button type="button" onClick={() => { login('ana@interlan.co', ''); navigate(redirectTo); }} className="flex-1 h-9 border border-interlan-border-gray rounded-lg font-nunito text-[12px] font-semibold hover:bg-accent transition-colors">Líder</button>
                <button type="button" onClick={() => { login('hr@interlan.co', ''); navigate(redirectTo); }} className="flex-1 h-9 border border-interlan-border-gray rounded-lg font-nunito text-[12px] font-semibold hover:bg-accent transition-colors">Talento Humano</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
