/**
 * SessionService
 * ─────────────────────────────────────────────────────────────────────────────
 * Monitorea la inactividad del usuario y cierra la sesión automáticamente.
 *
 * El tiempo de inactividad se lee desde ConfigService en tiempo real, por lo
 * que cualquier cambio en la página de Configuración se aplica de inmediato
 * sin necesidad de recargar la app.
 *
 * Flujo:
 *   1. iniciar() → registra listeners de actividad + tick cada segundo
 *   2. Cada segundo verifica cuánto tiempo lleva inactivo el usuario
 *   3. Si supera (tiempoCierreAutomatico - ADVERTENCIA_SEG) → muestra modal
 *   4. Si supera tiempoCierreAutomatico → cierra sesión y redirige a /login
 */

import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Subject, interval, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ConfigService } from './config.service';

export interface EstadoSesion {
  activa: boolean;
  mostrarAdvertencia: boolean;
  segundosRestantes: number;
  tiempoInactividad: number; // segundos
}

@Injectable({
  providedIn: 'root'
})
export class SessionService implements OnDestroy {

  // ─── Configuración ────────────────────────────────────────────────────────

  /** Segundos antes del cierre en que se muestra la advertencia */
  private readonly ADVERTENCIA_SEG = 60;

  // ─── Estado ───────────────────────────────────────────────────────────────

  private ultimaActividad: number = Date.now();
  private destroy$ = new Subject<void>();
  private tickSub?: Subscription;

  private estadoSubject = new BehaviorSubject<EstadoSesion>({
    activa: false,
    mostrarAdvertencia: false,
    segundosRestantes: this.ADVERTENCIA_SEG,
    tiempoInactividad: 0
  });

  public estado$ = this.estadoSubject.asObservable();

  // ─── Eventos de actividad ─────────────────────────────────────────────────

  private readonly EVENTOS_ACTIVIDAD = [
    'mousemove', 'mousedown', 'keypress', 'keydown',
    'scroll', 'touchstart', 'touchmove', 'click', 'wheel'
  ];

  private boundResetHandler = this.registrarActividad.bind(this);

  constructor(
    private router: Router,
    private ngZone: NgZone,
    private configService: ConfigService
  ) {}

  // ─── Ciclo de vida ────────────────────────────────────────────────────────

  /**
   * Inicia el monitoreo de inactividad. Llamar cuando el usuario inicia sesión.
   */
  iniciar(): void {
    this.detener(); // Limpiar cualquier estado previo

    this.ultimaActividad = Date.now();
    this.actualizarEstado(false, this.ADVERTENCIA_SEG);

    // Registrar listeners fuera de Angular para no disparar change detection
    this.ngZone.runOutsideAngular(() => {
      this.EVENTOS_ACTIVIDAD.forEach(evento => {
        document.addEventListener(evento, this.boundResetHandler, { passive: true });
      });

      // Tick cada segundo para actualizar el contador
      this.tickSub = interval(1000)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => this.verificarInactividad());
    });

    console.log('🛡️ Monitoreo de sesión iniciado');
  }

  /**
   * Detiene el monitoreo. Llamar cuando el usuario cierra sesión.
   */
  detener(): void {
    this.EVENTOS_ACTIVIDAD.forEach(evento => {
      document.removeEventListener(evento, this.boundResetHandler);
    });

    this.tickSub?.unsubscribe();
    this.tickSub = undefined;

    this.actualizarEstado(false, this.ADVERTENCIA_SEG);
    console.log('🛡️ Monitoreo de sesión detenido');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.detener();
  }

  // ─── Lógica de inactividad ────────────────────────────────────────────────

  private registrarActividad(): void {
    this.ultimaActividad = Date.now();

    if (this.estadoSubject.value.mostrarAdvertencia) {
      this.ngZone.run(() => {
        this.actualizarEstado(false, this.ADVERTENCIA_SEG);
      });
    }
  }

  private verificarInactividad(): void {
    const ahora = Date.now();
    const segundosInactivo = Math.floor((ahora - this.ultimaActividad) / 1000);

    // Leer tiempo configurable en tiempo real desde ConfigService
    const tiempoTotalSeg = this.configService.config.tiempoCierreAutomatico * 60;
    const segundosHastaCierre = tiempoTotalSeg - segundosInactivo;

    if (segundosHastaCierre <= 0) {
      this.ngZone.run(() => this.cerrarSesionPorInactividad());
      return;
    }

    if (segundosHastaCierre <= this.ADVERTENCIA_SEG) {
      this.ngZone.run(() => {
        this.actualizarEstado(true, segundosHastaCierre);
      });
    } else if (this.estadoSubject.value.mostrarAdvertencia) {
      this.ngZone.run(() => {
        this.actualizarEstado(false, this.ADVERTENCIA_SEG);
      });
    }
  }

  private actualizarEstado(mostrarAdvertencia: boolean, segundosRestantes: number): void {
    const tiempoInactividad = Math.floor((Date.now() - this.ultimaActividad) / 1000);

    this.estadoSubject.next({
      activa: true,
      mostrarAdvertencia,
      segundosRestantes: Math.max(0, segundosRestantes),
      tiempoInactividad
    });
  }

  // ─── Acciones públicas ────────────────────────────────────────────────────

  /**
   * El usuario hizo clic en "Continuar sesión" → resetear timer.
   */
  extenderSesion(): void {
    this.ultimaActividad = Date.now();
    this.actualizarEstado(false, this.ADVERTENCIA_SEG);
    console.log('🔄 Sesión extendida por el usuario');
  }

  /**
   * Cierra sesión inmediatamente (llamado desde el componente de advertencia).
   */
  cerrarSesionAhora(): void {
    this.detener();
    this.limpiarSesion();
  }

  private cerrarSesionPorInactividad(): void {
    const minutos = this.configService.config.tiempoCierreAutomatico;
    const tiempoTexto = minutos < 60
      ? `${minutos} minutos`
      : `${Math.floor(minutos / 60)} hora(s)`;

    console.log(`⏰ Sesión cerrada por inactividad (${tiempoTexto})`);
    this.detener();
    this.limpiarSesion();
  }

  private limpiarSesion(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    this.estadoSubject.next({
      activa: false,
      mostrarAdvertencia: false,
      segundosRestantes: 0,
      tiempoInactividad: 0
    });

    if (this.router.url !== '/login') {
      this.router.navigate(['/login']);
    }
  }

  // ─── Getters de utilidad ──────────────────────────────────────────────────

  get tiempoInactividadSegundos(): number {
    return Math.floor((Date.now() - this.ultimaActividad) / 1000);
  }

  get tiempoHastaCierreSegundos(): number {
    const tiempoTotalSeg = this.configService.config.tiempoCierreAutomatico * 60;
    return Math.max(0, tiempoTotalSeg - this.tiempoInactividadSegundos);
  }

  formatearTiempo(segundos: number): string {
    const min = Math.floor(segundos / 60);
    const seg = segundos % 60;
    return `${min}:${seg.toString().padStart(2, '0')}`;
  }
}
