import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, retry, timeout } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { MonitorService } from '../services/monitor.service';
import { environment } from '../../../environments/environment'; // <-- IMPORTAR AQUÍ
import Swal from 'sweetalert2';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private authService: AuthService,
    private router: Router,
    private monitor: MonitorService
  ) {}

 intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
  const token = this.authService.getToken();
  const tokenPresent = !!token;
  
  console.log('🔑 Token:', tokenPresent ? 'Presente' : 'No presente');
  if (token) {
    console.log('🔑 Token (primeros 20 caracteres):', token.substring(0, 20) + '...');
    console.log('🔑 Token length:', token.length);
  }
  console.log('📡 Request URL:', req.url);
  console.log('📡 Request Method:', req.method);
  
  // Registrar la petición
  this.monitor.logRequest(req, tokenPresent);
  
  // Clonar request con headers
  let authReq = req;
  if (token) {
    // Verificar si es FormData (no agregar Content-Type)
    const isFormData = req.body instanceof FormData;
    
    let headers: any = {
      Authorization: `Bearer ${token}`
    };
    
    // Solo agregar Content-Type si NO es FormData
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    
    authReq = req.clone({
      setHeaders: headers
    });
    
    console.log('📤 Headers configurados:', Object.keys(headers));
  }

  return next.handle(authReq).pipe(
    timeout(10000),
    retry(1),
    catchError((error: HttpErrorResponse) => {
      // Registrar el error
      this.monitor.logError(req, error.error, error.status);
      
      console.error('❌ Error en petición:', {
        url: error.url,
        status: error.status,
        statusText: error.statusText,
        message: error.message,
        error: error.error
      });

      // Si es error 0 (network error), podría ser CORS o backend caído
      if (error.status === 0) {
        console.warn('⚠️ Posible error CORS o backend no disponible');
        console.warn('⚠️ URL que falló:', req.url);
        console.warn('⚠️ Token presente:', tokenPresent);
        console.warn('⚠️ Verifica que el backend esté corriendo en:', environment.apiUrl);
        
        // No mostramos Swal para no molestar al usuario
        // Solo logueamos
      } else if (error.status === 401) {
        console.warn('⚠️ Token inválido o expirado');
        this.authService.logout();
        this.router.navigate(['/login']);
        Swal.fire({
          icon: 'error',
          title: 'Sesión expirada',
          text: 'Por favor, inicie sesión nuevamente',
          timer: 3000
        });
      } else if (error.status === 403) {
        Swal.fire({
          icon: 'error',
          title: 'Acceso denegado',
          text: 'No tiene permisos para realizar esta acción',
          timer: 3000
        });
      } else if (error.status === 500) {
        Swal.fire({
          icon: 'error',
          title: 'Error del servidor',
          text: 'Ocurrió un error inesperado. Intente más tarde.',
          timer: 3000
        });
      }
      
      return throwError(() => error);
    })
  );
 }
}