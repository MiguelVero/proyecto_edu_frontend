import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, Subscription, timer } from 'rxjs';
import { tap, catchError, finalize, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  // Estado de carga de autenticación
  private authLoadingSubject = new BehaviorSubject<boolean>(true);
  public authLoading$ = this.authLoadingSubject.asObservable();
  
  // Temporizador de inactividad
  private inactivityTimer: any = null;
  private readonly INACTIVITY_TIME = 5 * 60 * 1000; // 5 minutos en milisegundos
  private userActivityEvents = ['click', 'mousemove', 'keydown', 'scroll', 'touchstart'];

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.loadStoredUser();
    this.initInactivityTimer();
  }

  private loadStoredUser() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      this.currentUserSubject.next(JSON.parse(user));
      this.verificarTokenEnBackend();
    } else {
      this.authLoadingSubject.next(false);
    }
  }

  private verificarTokenEnBackend() {
    this.http.get(`${this.apiUrl}/verificar`).pipe(
      catchError((error) => {
        console.error('❌ Token inválido o expirado');
        this.logoutSilently();
        return [];
      }),
      finalize(() => {
        this.authLoadingSubject.next(false);
      })
    ).subscribe({
      next: (response: any) => {
        console.log('✅ Token válido');
        if (response.usuario) {
          this.currentUserSubject.next(response.usuario);
          localStorage.setItem('user', JSON.stringify(response.usuario));
          this.resetInactivityTimer(); // Iniciar timer de inactividad
        }
      }
    });
  }

  private logoutSilently() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
    this.clearInactivityTimer();
    if (this.router.url !== '/login') {
      this.router.navigate(['/login']);
    }
  }

  // ==================== INACTIVIDAD ====================
  
  private initInactivityTimer() {
    // Agregar listeners para detectar actividad del usuario
    this.userActivityEvents.forEach(event => {
      window.addEventListener(event, () => this.resetInactivityTimer());
    });
  }

  private resetInactivityTimer() {
    if (!this.isAuthenticated()) return;
    
    this.clearInactivityTimer();
    this.inactivityTimer = setTimeout(() => {
      this.onInactivityTimeout();
    }, this.INACTIVITY_TIME);
  }

  private clearInactivityTimer() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  private onInactivityTimeout() {
    console.log('⏰ Inactividad detectada - Cerrando sesión');
    
    Swal.fire({
      title: 'Sesión expirada por inactividad',
      text: 'Has estado inactivo por más de 5 minutos. Por favor, inicia sesión nuevamente.',
      icon: 'info',
      timer: 3000,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    }).then(() => {
      this.logoutSilently();
    });
  }

  // ==================== MÉTODOS PÚBLICOS ====================

  login(credentials: { nombre_usuario: string, contrasena: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap((response: any) => {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.usuario));
        this.currentUserSubject.next(response.usuario);
        this.resetInactivityTimer(); // Iniciar timer después del login
        
        Swal.fire({
          icon: 'success',
          title: '¡Bienvenido!',
          text: `Hola ${response.usuario.nombre_completo}`,
          timer: 1500,
          showConfirmButton: false
        });
      })
    );
  }

  logout() {
    Swal.fire({
      title: '¿Cerrar sesión?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, salir',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.clearInactivityTimer();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.currentUserSubject.next(null);
        this.router.navigate(['/login']);
      } else {
        this.resetInactivityTimer(); // Reiniciar timer si cancela
      }
    });
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  isLoading(): boolean {
    return this.authLoadingSubject.value;
  }

  hasRole(role: string): boolean {
    const user = this.currentUserSubject.value;
    return user && user.rol === role;
  }
}