import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppConfigProvider } from "@/contexts/AppConfigContext";
import { RequestsProvider } from "@/contexts/RequestsContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NuevaSolicitud from "./pages/NuevaSolicitud";
import MisSolicitudes from "./pages/MisSolicitudes";
import RequestDetail from "./pages/RequestDetail";
import Aprobaciones from "./pages/Aprobaciones";
import Documentos from "./pages/Documentos";
import Administracion from "./pages/Administracion";
import NotFound from "./pages/NotFound";
import AccionCorreo from "./pages/AccionCorreo";

const queryClient = new QueryClient();

// Power Apps code apps sirve la app desde una ruta propia (…/index.html).
// Igual que en la plantilla oficial de Microsoft: normalizar la URL y usarla como basename.
const BASENAME = new URL(".", location.href).pathname;
if (location.pathname.endsWith("/index.html")) {
  history.replaceState(null, "", BASENAME + location.search + location.hash);
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter basename={BASENAME}>
          <RequestsProvider>
          <AppConfigProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/accion-correo" element={<AccionCorreo />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/nueva-solicitud" element={<ProtectedRoute><NuevaSolicitud /></ProtectedRoute>} />
              <Route path="/mis-solicitudes" element={<ProtectedRoute><MisSolicitudes /></ProtectedRoute>} />
              <Route path="/mis-solicitudes/:id" element={<ProtectedRoute><RequestDetail /></ProtectedRoute>} />
              <Route path="/aprobaciones" element={<ProtectedRoute allowedRoles={['leader', 'hr']}><Aprobaciones /></ProtectedRoute>} />
              <Route path="/documentos" element={<ProtectedRoute allowedRoles={['hr']}><Documentos /></ProtectedRoute>} />
              <Route path="/administracion" element={<ProtectedRoute allowedRoles={['hr']}><Administracion /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppConfigProvider>
          </RequestsProvider>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
