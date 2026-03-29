import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, timeout } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { MonitorService } from '../services/monitor.service';
import Swal from 'sweetalert2';

const excludedUrls = ['/auth/login', '/auth/verificar', '/health', '/ping'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const monitor = inject(MonitorService);
  
  const isExcludedUrl = excludedUrls.some(url => req.url.includes(url));
  
  // Para URLs excluidas, pasar la petición sin modificar
  if (isExcludedUrl) {
    return next(req);
  }
  
  // Verificar que authService está disponible y tiene getToken
  let token: string | null = null;
  try {
    token = authService?.getToken ? authService.getToken() : null;
  } catch (err) {
    console.error('❌ Error accediendo a authService.getToken:', err);
    return next(req);
  }
  
  const tokenPresent = !!token;
  
  if (tokenPresent && token) {  // <-- AÑADIR VERIFICACIÓN token !== null
    console.log('🔑 Token (primeros 20 caracteres):', token.substring(0, 20) + '...');
    console.log('📡 Request URL:', req.url);
  }
  
  if (monitor) {
    monitor.logRequest(req, tokenPresent);
  }
  
  let authReq = req;
  if (tokenPresent && token) {  // <-- AÑADIR VERIFICACIÓN token !== null
    const isFormData = req.body instanceof FormData;
    
    let headers: any = {
      Authorization: `Bearer ${token}`
    };
    
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    
    authReq = req.clone({
      setHeaders: headers
    });
  }

  return next(authReq).pipe(
    timeout(30000),
    catchError((error: any) => {
      if (monitor) {
        monitor.logError(req, error.error, error.status);
      }
      
      // Solo loguear errores que no sean de URLs excluidas
      if (!isExcludedUrl) {
        console.error('❌ Error en petición:', {
          url: error.url,
          status: error.status,
          message: error.message
        });
      }

      if (error.status === 0) {
        if (!isExcludedUrl) {
          console.warn('⚠️ Error de red o CORS');
        }
        return throwError(() => error);
      }
      
      if (error.status === 401 && !req.url.includes('/auth/verificar')) {
        console.warn('⚠️ Token inválido o expirado');
        
        Swal.fire({
          icon: 'error',
          title: 'Sesión expirada',
          text: 'Por favor, inicie sesión nuevamente',
          timer: 2000,
          showConfirmButton: false
        }).then(() => {
          authService.logout();
        });
      } else if (error.status === 403) {
        Swal.fire({
          icon: 'error',
          title: 'Acceso denegado',
          text: 'No tiene permisos para realizar esta acción',
          timer: 3000
        });
      }
      
      return throwError(() => error);
    })
  );
};