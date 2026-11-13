# Portal de Permisos en Power Apps code apps (rama `powerapps`)

Esta rama permite publicar el portal como **Power Apps code app**, en **modo solo-demo**:

- Usa los datos de prueba en memoria.
- **No** se conecta a Supabase. El build no incluye la URL ni la llave.
- **No** envía correos.

Su único objetivo es ver la interfaz corriendo dentro del entorno de Power Apps. La versión con datos reales se construirá sobre Dataverse (ver el plan de implementación).

## Requisitos

- Node.js LTS (incluye npm).
- Un entorno de Power Platform con **code apps habilitado**.
- Una cuenta con permisos de creador en ese entorno.
- Opcional: Power Platform CLI (`pac`). La alternativa es la CLI por npm (`npx power-apps`).

## Cambios respecto a `main`

| Archivo | Cambio |
|---|---|
| `package.json` | Agrega `@microsoft/power-apps` y `@microsoft/power-apps-vite`. Actualiza Vite a 7 y plugin-react-swc a 4, como las plantillas de Microsoft. Quita los plugins de Lovable. Agrega el script `build:powerapps`. |
| `vite.config.ts` | Agrega el plugin `powerApps()` y quita `lovable-tagger`. |
| `.env.powerapps` | Modo `powerapps`: `VITE_DEMO_ONLY=true` y las variables de Supabase vacías. |
| `src/integrations/supabase/client.ts` | En modo solo-demo exporta un cliente "apagado" que no hace llamadas de red. |
| `src/contexts/RequestsContext.tsx` | En modo solo-demo fuerza el modo demo y no permite pasar a real. |
| `src/pages/Administracion.tsx` | En modo solo-demo deshabilita el interruptor demo/real. |
| `src/App.tsx` | `basename` del router calculado como en la plantilla oficial (la app se sirve desde una ruta de Power Apps). |
| `index.html` | Título "Portal de Permisos - Interlan" y sin metadatos ni imágenes de Lovable. |

## Pasos

```powershell
git checkout powerapps
npm install

# 1) Vincular la app al entorno (crea power.config.json, que no se versiona)
#    Opción A (PAC CLI):
pac auth create --environment <ID-del-entorno>
pac code init --environment <ID-del-entorno> --displayName "Portal de Permisos (demo)"
#    Opción B (CLI por npm):
npx power-apps init

# 2) Compilar en modo solo-demo
npm run build:powerapps

# 3) Publicar
pac code push          # o: npx power-apps push
```

Después de publicar, la app aparece en https://make.powerapps.com → **Aplicaciones**, dentro del entorno elegido.

**Para probar localmente** antes de publicar, ejecuta `npm run dev -- --mode powerapps` y abre la URL que muestre la consola, en el mismo navegador donde iniciaste sesión con la cuenta del entorno.

## Si algo falla

| Síntoma | Qué hacer |
|---|---|
| `npm install` falla por dependencias incompatibles (ERESOLVE) | Ejecutar `npm install --legacy-peer-deps` y reportar el mensaje. |
| `pac code init` dice que code apps no está habilitado | Activarlo en el centro de administración: Entorno → Configuración → Producto → Características. |
| La app publicada abre en blanco | Abrir las herramientas de desarrollador del navegador (F12 → Consola) y revisar el error. Suele ser una ruta de archivos o el router. |
| Error de permisos al publicar | La cuenta necesita el rol Environment Maker en el entorno. |

## Notas

- La pantalla de login sigue siendo la de **demostración**. Cualquier correo entra con un rol de prueba: un correo que contenga "hr" entra como Talento Humano, uno que contenga "ana" como líder, y cualquier otro como empleado. En la versión real se reemplaza por la identidad de Microsoft Entra ID.
- No usar esta rama con datos reales.
