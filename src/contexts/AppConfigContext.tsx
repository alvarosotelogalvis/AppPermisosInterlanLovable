import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AppConfigContextType {
  electoralActive: boolean;
  setElectoralActive: (active: boolean) => void;
  emailsActive: boolean;
  setEmailsActive: (active: boolean) => void;
}

const AppConfigContext = createContext<AppConfigContextType | undefined>(undefined);

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const [electoralActive, setElectoralActiveState] = useState(() => {
    try {
      return localStorage.getItem('electoralActive') === 'true';
    } catch {
      return false;
    }
  });

  const [emailsActive, setEmailsActiveState] = useState(() => {
    try {
      const stored = localStorage.getItem('emailsActive');
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });

  // Electoral period is a global setting: shared by every user via app_config
  useEffect(() => {
    supabase.from('app_config').select('value').eq('key', 'electoral_active').maybeSingle()
      .then(({ data }) => {
        if (data) {
          const v = data.value === 'true';
          setElectoralActiveState(v);
          try { localStorage.setItem('electoralActive', String(v)); } catch {}
        }
      });
  }, []);

  const setElectoralActive = async (active: boolean) => {
    setElectoralActiveState(active);
    try {
      localStorage.setItem('electoralActive', String(active));
    } catch {}
    const { data } = await supabase.from('app_config').select('id').eq('key', 'electoral_active').maybeSingle();
    if (data) {
      await supabase.from('app_config').update({ value: String(active), updated_at: new Date().toISOString() }).eq('id', data.id);
    } else {
      await supabase.from('app_config').insert({ key: 'electoral_active', value: String(active) });
    }
  };

  // Emails switch is also global (shared by every user/browser)
  useEffect(() => {
    supabase.from('app_config').select('value').eq('key', 'emails_active').maybeSingle()
      .then(({ data }) => {
        if (data) {
          const v = data.value === 'true';
          setEmailsActiveState(v);
          try { localStorage.setItem('emailsActive', String(v)); } catch {}
        }
      });
  }, []);

  const setEmailsActive = async (active: boolean) => {
    setEmailsActiveState(active);
    try {
      localStorage.setItem('emailsActive', String(active));
    } catch {}
    const { data } = await supabase.from('app_config').select('id').eq('key', 'emails_active').maybeSingle();
    if (data) {
      await supabase.from('app_config').update({ value: String(active), updated_at: new Date().toISOString() }).eq('id', data.id);
    } else {
      await supabase.from('app_config').insert({ key: 'emails_active', value: String(active) });
    }
  };

  return (
    <AppConfigContext.Provider value={{ electoralActive, setElectoralActive, emailsActive, setEmailsActive }}>
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig() {
  const ctx = useContext(AppConfigContext);
  if (!ctx) throw new Error('useAppConfig must be used within AppConfigProvider');
  return ctx;
}
