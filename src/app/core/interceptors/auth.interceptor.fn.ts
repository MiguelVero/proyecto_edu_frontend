import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
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
  
  const token = authService.getToken();
  const tokenPresent = !!token;
  const isExcludedUrl = excludedUrls.some(url => req.url.includes(url));
  
  // Solo loguear si no es una URL excluida
  if (!isExcludedUrl) {
    console.log('🔑 Token:', tokenPresent ? 'Presente' : 'No presente');
    if (token) {
      console.log('🔑 Token (primeros 20 caracteres):', token.substring(0, 20) + '...');
    }
    console.log('📡 Request URL:', req.url);
  }
  
  if (monitor) {
    monitor.logRequest(req, tokenPresent);
  }
  
  let authReq = req;
  if (token && !isExcludedUrl) {
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
    
    console.log('📤 Headers configurados:', Object.keys(headers));
  }

  return next(authReq).pipe(
    catchError((error: any) => {
      if (monitor) {
        monitor.logError(req, error.error, error.status);
      }
      
      console.error('❌ Error en petición:', {
        url: error.url,
        status: error.status,
        message: error.message
      });

      if (error.status === 0) {
        console.warn('⚠️ Error de red o CORS');
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