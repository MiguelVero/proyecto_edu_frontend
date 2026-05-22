# 🔥 Configuración de Firebase Cloud Messaging (FCM)

## ¿Por qué necesito esto?

Firebase Cloud Messaging (FCM) permite enviar notificaciones push **reales** al celular del usuario, incluso cuando el navegador está cerrado. Sin esta configuración, las notificaciones solo funcionan mientras la app está abierta.

---

## Paso 1: Crear proyecto en Firebase

1. Ve a [https://console.firebase.google.com](https://console.firebase.google.com)
2. Haz clic en **"Agregar proyecto"**
3. Nombre del proyecto: `proyecto-edu` (o el que prefieras)
4. Desactiva Google Analytics (opcional)
5. Haz clic en **"Crear proyecto"**

---

## Paso 2: Registrar la app web

1. En la consola de Firebase, haz clic en el ícono **`</>`** (Web)
2. Nombre de la app: `Lab.Rosas Frontend`
3. **NO** actives Firebase Hosting
4. Haz clic en **"Registrar app"**
5. Copia el objeto `firebaseConfig` que aparece:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

---

## Paso 3: Obtener la VAPID Key

1. En la consola de Firebase → **Configuración del proyecto** (⚙️)
2. Pestaña **"Cloud Messaging"**
3. Sección **"Configuración web"** → **"Certificados push web"**
4. Haz clic en **"Generar par de claves"**
5. Copia la **Clave pública** (empieza con `B...`)

---

## Paso 4: Reemplazar los valores PLACEHOLDER

### Archivo 1: `src/environments/environment.ts` (desarrollo)

```typescript
firebase: {
  apiKey: 'AIzaSy...',           // ← Tu apiKey real
  authDomain: 'tu-proyecto.firebaseapp.com',
  projectId: 'tu-proyecto',
  storageBucket: 'tu-proyecto.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abc123',
  vapidKey: 'BPtu...'            // ← Tu VAPID key real
}
```

### Archivo 2: `src/environments/environment.prod.ts` (producción)

Mismos valores que arriba.

### Archivo 3: `src/firebase-messaging-sw.js`

```javascript
const firebaseConfig = {
  apiKey: 'AIzaSy...',
  authDomain: 'tu-proyecto.firebaseapp.com',
  projectId: 'tu-proyecto',
  storageBucket: 'tu-proyecto.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abc123'
  // ⚠️ NO incluir vapidKey aquí, solo en el cliente
};
```

---

## Paso 5: Configurar el backend para enviar notificaciones

Para que las notificaciones lleguen al celular cuando el navegador está cerrado, el **backend** necesita usar Firebase Admin SDK para enviar los mensajes.

### Instalar en el backend (Node.js):

```bash
npm install firebase-admin
```

### Inicializar Firebase Admin:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // Descargar desde Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
```

> Para obtener `serviceAccountKey.json`: Firebase Console → Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada

### Enviar notificación push:

```javascript
async function enviarNotificacionPush(tokenFcm, titulo, cuerpo, url = '/ordenes') {
  const mensaje = {
    notification: {
      title: titulo,
      body: cuerpo,
    },
    data: {
      url: url,
      tag: `orden-${Date.now()}`
    },
    token: tokenFcm  // Token FCM del dispositivo del usuario
  };

  try {
    const response = await admin.messaging().send(mensaje);
    console.log('✅ Notificación enviada:', response);
    return response;
  } catch (error) {
    console.error('❌ Error enviando notificación:', error);
    throw error;
  }
}
```

### Guardar el token FCM del usuario:

El frontend obtiene el token FCM y lo muestra en **Configuración → Notificaciones en celular → "Activar en este dispositivo"**. 

Necesitas:
1. Un endpoint en el backend para guardar el token: `POST /api/usuarios/fcm-token`
2. Llamar a ese endpoint desde el frontend cuando se obtiene el token
3. Asociar el token al usuario autenticado en la base de datos

---

## Paso 6: Verificar que funciona

1. Despliega la app con los valores reales de Firebase
2. Ve a **Configuración** en la app
3. Haz clic en **"Activar en este dispositivo"**
4. Acepta el permiso de notificaciones
5. Deberías ver "✅ Activo" en el panel de FCM
6. Desde el backend, envía una notificación de prueba al token obtenido
7. Cierra el navegador → la notificación debe llegar igual

---

## Flujo completo de notificaciones

```
Usuario crea orden con fecha límite
         ↓
Frontend programa notificación local (setTimeout)
         ↓
Frontend envía token FCM al backend
         ↓
Backend programa envío push para la hora límite
         ↓
A la hora límite:
  - Si app abierta: NotificationService.disparar() → toast + notif nativa
  - Si app cerrada: Firebase Admin → FCM → firebase-messaging-sw.js → notif del sistema
```

---

## Notas importantes

- **HTTPS requerido**: FCM solo funciona en HTTPS (en producción está bien, en desarrollo usa `localhost`)
- **Chrome/Edge/Firefox**: Soportan FCM. Safari tiene soporte limitado en iOS
- **iOS**: Las notificaciones push en iOS requieren que el usuario agregue la app a la pantalla de inicio (PWA)
- **Token FCM**: Puede cambiar. El frontend lo renueva automáticamente cada 7 días
