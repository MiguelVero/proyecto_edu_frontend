import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timer, of } from 'rxjs';
import { catchError, retry, timeout, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { MonitorService } from '../services/monitor.service';
import { environment } from '../../../environments/environment';
import Swal from 'sweetalert2';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  // URLs que no deben ser interceptadas para logout
  private excludedUrls = ['/auth/login', '/auth/verificar', '/health', '/ping'];
  
  constructor(
    private authService: AuthService,
    private router: Router,
    private monitor: MonitorService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getToken();
    const tokenPresent = !!token;
    const isExcludedUrl = this.excludedUrls.some(url => req.url.includes(url));
    
    console.log('🔑 Token:', tokenPresent ? 'Presente' : 'No presente');
    if (token && !isExcludedUrl) {
      console.log('🔑 Token (primeros 20 caracteres):', token.substring(0, 20) + '...');
      console.log('🔑 Token length:', token.length);
    }
    console.log('📡 Request URL:', req.url);
    console.log('📡 Request Method:', req.method);
    
    this.monitor.logRequest(req, tokenPresent);
    
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

    return next.handle(authReq).pipe(
      timeout(30000), // Aumentar timeout a 30 segundos
      retry(1),
      catchError((error: HttpErrorResponse) => {
        this.monitor.logError(req, error.error, error.status);
        
        console.error('❌ Error en petición:', {
          url: error.url,
          status: error.status,
          statusText: error.statusText,
          message: error.message
        });

        // Error de red (0) - No mostrar alerta, solo log
        if (error.status === 0) {
          console.warn('⚠️ Error de red o CORS - El backend podría no estar disponible');
          console.warn('⚠️ URL que falló:', req.url);
          return throwError(() => error);
        }
        
        // Error 401 - Token inválido
        if (error.status === 401) {
          console.warn('⚠️ Token inválido o expirado');
          
          // No mostrar Swal si es la petición de verificación
          const isVerificationUrl = req.url.includes('/auth/verificar');
          if (!isVerificationUrl) {
            Swal.fire({
              icon: 'error',
              title: 'Sesión expirada',
              text: 'Por favor, inicie sesión nuevamente',
              timer: 2000,
              showConfirmButton: false
            }).then(() => {
              this.authService.logout();
            });
          } else {
            this.authService.logout();
          }
        } 
        // Error 403 - Sin permisos
        else if (error.status === 403) {
          Swal.fire({
            icon: 'error',
            title: 'Acceso denegado',
            text: 'No tiene permisos para realizar esta acción',
            timer: 3000
          });
        }
        // Error 500 - Error del servidor
        else if (error.status === 500) {
          console.error('❌ Error 500 del servidor:', error.error);
          // No mostramos Swal para no molestar, solo log
        }
        
        return throwError(() => error);
      })
    );
  }
}