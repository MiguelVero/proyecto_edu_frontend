/**
 * NotificationService
 * ─────────────────────────────────────────────────────────────────────────────
 * Gestiona todas las notificaciones de la aplicación:
 *
 *  • Notificaciones nativas del navegador (Notification API)
 *  • Notificaciones push reales vía Firebase Cloud Messaging (FCM)
 *  • Programación de alertas con setTimeout (foreground)
 *  • Persistencia en localStorage para restaurar al recargar
 *  • Integración con ConfigService para respetar preferencias del usuario
 *
 * Flujo para notificaciones en celular (background):
 *   1. FirebaseMessagingService obtiene el token FCM del dispositivo
 *   2. El token se envía al backend junto con la orden
 *   3. El backend usa Firebase Admin SDK para enviar push al dispositivo
 *   4. El SW de Firebase (firebase-messaging-sw.js) muestra la notificación
 *      incluso con el navegador cerrado
 *
 * Flujo para notificaciones en foreground (app abierta):
 *   1. programarNotificacion() usa setTimeout
 *   2. Al dispararse, muestra Notification nativa + toast SweetAlert2
 */

import { Injectable, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

import { ConfigService, AppConfig } from './config.service';
import { FirebaseMessagingService, FcmMessage } from './firebase-messaging.service';

// ─── Interfaces públicas ─────────────────────────────────────────────────────

export interface NotificacionProgramada {
  id: string;
  titulo: string;
  cuerpo: string;
  /** Momento exacto en que se disparará (ya con anticipación aplicada) */
  fechaDisparo: Date;
  timerId?: any;
}

export interface ResultadoProgramacion {
  programadas: number;
  mensaje: string;
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const STORAGE_KEY = 'notificaciones_programadas';

@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy {

  // ─── Estado ───────────────────────────────────────────────────────────────

  private notificaciones = new Map<string, NotificacionProgramada>();
  private config!: AppConfig;
  private configSub?: Subscription;
  private fcmSub?: Subscription;

  constructor(
    private configService: ConfigService,
    private fcmService: FirebaseMessagingService
  ) {
    // Mantener config actualizada en tiempo real
    this.configSub = this.configService.config$.subscribe(cfg => {
      this.config = cfg;
    });

    // Mostrar mensajes FCM en foreground como toast
    this.fcmSub = this.fcmService.message$.subscribe(msg => {
      if (msg) this.mostrarMensajeFcmEnForeground(msg);
    });

    // Restaurar notificaciones pendientes del localStorage
    this.restaurarPendientes();
  }

  ngOnDestroy(): void {
    this.configSub?.unsubscribe();
    this.fcmSub?.unsubscribe();
  }

  // ─── Permisos ─────────────────────────────────────────────────────────────

  /**
   * Solicita permiso de notificaciones del navegador.
   * También inicializa FCM y obtiene el token del dispositivo.
   */
  async solicitarPermiso(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('[Notif] Navegador no soporta notificaciones');
      return false;
    }

    let permiso = Notification.permission;

    if (permiso === 'default') {
      permiso = await Notification.requestPermission();
    }

    const concedido = permiso === 'granted';
    console.log(`[Notif] Permiso de notificaciones: ${permiso}`);

    // Inicializar FCM en paralelo (no bloquea)
    if (concedido) {
      this.fcmService.solicitarPermisoYObtenerToken().then(token => {
        if (token) {
          console.log('[Notif] Token FCM listo para enviar al backend');
        }
      });
    }

    return concedido;
  }

  get tienePermiso(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
  }

  get estadoPermiso(): NotificationPermission | 'no-soportado' {
    if (!('Notification' in window)) return 'no-soportado';
    return Notification.permission;
  }

  get tokenFcm(): string | null {
    return this.fcmService.tokenActual;
  }

  get fcmListo(): boolean {
    return this.fcmService.estaListo;
  }

  get fcmConfigurado(): boolean {
    return this.fcmService.tieneConfigReal;
  }

  // ─── Programar notificación ───────────────────────────────────────────────

  /**
   * Programa una notificación para dispararse en un momento futuro.
   *
   * @param id           Identificador único (ej: "orden-42-exacta")
   * @param titulo       Título de la notificación
   * @param cuerpo       Cuerpo del mensaje
   * @param fechaHora    Momento base (hora límite de la orden)
   * @param minutosAntes Anticipación en minutos (0 = hora exacta)
   */
  programarNotificacion(
    id: string,
    titulo: string,
    cuerpo: string,
    fechaHora: Date,
    minutosAntes: number = 0
  ): boolean {
    if (!this.tienePermiso) {
      console.warn('[Notif] Sin permiso para programar notificaciones');
      return false;
    }

    const fechaDisparo = new Date(fechaHora.getTime() - minutosAntes * 60_000);
    const msHasta = fechaDisparo.getTime() - Date.now();

    if (msHasta <= 0) {
      console.warn(`[Notif] Fecha de disparo ya pasó para "${id}"`);
      return false;
    }

    // Cancelar si ya existe una con el mismo id
    this.cancelarNotificacion(id);

    const notif: NotificacionProgramada = { id, titulo, cuerpo, fechaDisparo };

    notif.timerId = setTimeout(() => {
      this.disparar(titulo, cuerpo, id);
      this.notificaciones.delete(id);
      this.persistir();
    }, msHasta);

    this.notificaciones.set(id, notif);
    this.persistir();

    const min = Math.round(msHasta / 60_000);
    console.log(`[Notif] ✅ "${id}" programada en ${min} min`);
    return true;
  }

  // ─── Mostrar notificación inmediata ───────────────────────────────────────

  /**
   * Muestra una notificación nativa del navegador de forma inmediata.
   */
  mostrarNotificacion(titulo: string, cuerpo: string, tag?: string): void {
    if (!this.tienePermiso) return;

    try {
      const notif = new Notification(titulo, {
        body: cuerpo,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: tag ?? `notif-${Date.now()}`,
        requireInteraction: false,
        silent: false
      } as NotificationOptions);

      notif.onclick = () => { window.focus(); notif.close(); };
    } catch (err) {
      console.error('[Notif] Error mostrando notificación nativa:', err);
    }
  }

  // ─── Cancelar notificaciones ──────────────────────────────────────────────

  cancelarNotificacion(id: string): void {
    const notif = this.notificaciones.get(id);
    if (notif?.timerId) {
      clearTimeout(notif.timerId);
      this.notificaciones.delete(id);
      this.persistir();
    }
  }

  cancelarTodasLasNotificaciones(): void {
    this.notificaciones.forEach(n => {
      if (n.timerId) clearTimeout(n.timerId);
    });
    this.notificaciones.clear();
    this.persistir();
    console.log('[Notif] Todas las notificaciones canceladas');
  }

  // ─── Helper para órdenes ──────────────────────────────────────────────────

  /**
   * Programa notificaciones para una orden de trabajo.
   * Dispara a la hora exacta y también con la anticipación configurada.
   */
  programarNotificacionOrden(orden: {
    id: number | string;
    id_externo: string;
    fecha_limite: string;
    hora_limite?: string;
    doctor?: { nombre: string };
    servicio?: { nombre: string };
    cliente_nombre?: string;
  }): ResultadoProgramacion {
    if (!orden.fecha_limite) {
      return { programadas: 0, mensaje: 'La orden no tiene fecha límite' };
    }

    const horaStr = orden.hora_limite || '08:00';
    const fechaHora = new Date(`${orden.fecha_limite}T${horaStr}`);

    if (isNaN(fechaHora.getTime())) {
      return { programadas: 0, mensaje: 'Fecha/hora inválida' };
    }

    if (fechaHora <= new Date()) {
      return { programadas: 0, mensaje: 'La fecha/hora de la orden ya pasó' };
    }

    const doctor = orden.doctor?.nombre ?? 'Doctor';
    const servicio = orden.servicio?.nombre ?? 'Servicio';
    const cliente = orden.cliente_nombre ? ` | ${orden.cliente_nombre}` : '';
    const cuerpo = `${doctor} — ${servicio}${cliente}`;
    const idBase = `orden-${orden.id}`;
    let programadas = 0;

    // ── Notificación a la hora exacta ──
    const ok1 = this.programarNotificacion(
      `${idBase}-exacta`,
      `📋 Orden ${orden.id_externo} — ¡Hora límite!`,
      `⏰ Vence AHORA: ${cuerpo}`,
      fechaHora,
      0
    );
    if (ok1) programadas++;

    // ── Notificación anticipada (según config) ──
    const leadMin = this.config?.tiempoNotificacionAnticipada ?? 30;
    const msHastaLead = fechaHora.getTime() - Date.now() - leadMin * 60_000;
    if (msHastaLead > 0) {
      const leadTexto = leadMin < 60
        ? `${leadMin} min`
        : `${Math.floor(leadMin / 60)} h`;
      const ok2 = this.programarNotificacion(
        `${idBase}-anticipada`,
        `⚠️ Orden ${orden.id_externo} — Vence en ${leadTexto}`,
        cuerpo,
        fechaHora,
        leadMin
      );
      if (ok2) programadas++;
    }

    // ── Notificación 30 min antes (si la anticipación no es ya 30 min) ──
    if (leadMin !== 30) {
      const msHasta30 = fechaHora.getTime() - Date.now() - 30 * 60_000;
      if (msHasta30 > 0) {
        const ok3 = this.programarNotificacion(
          `${idBase}-30min`,
          `⚠️ Orden ${orden.id_externo} — Vence en 30 min`,
          cuerpo,
          fechaHora,
          30
        );
        if (ok3) programadas++;
      }
    }

    const mensajes: Record<number, string> = {
      0: 'No se pudo programar ninguna notificación',
      1: 'Notificación programada para la hora exacta',
      2: 'Notificaciones programadas: hora exacta + anticipación',
      3: 'Notificaciones programadas: hora exacta + 30 min + anticipación'
    };

    return {
      programadas,
      mensaje: mensajes[programadas] ?? `${programadas} notificaciones programadas`
    };
  }

  // ─── Estado ───────────────────────────────────────────────────────────────

  getNotificacionesPendientes(): NotificacionProgramada[] {
    return Array.from(this.notificaciones.values());
  }

  tieneNotificacionParaOrden(ordenId: number | string): boolean {
    return (
      this.notificaciones.has(`orden-${ordenId}-exacta`) ||
      this.notificaciones.has(`orden-${ordenId}-anticipada`) ||
      this.notificaciones.has(`orden-${ordenId}-30min`)
    );
  }

  // ─── Privados ─────────────────────────────────────────────────────────────

  /**
   * Dispara la notificación: nativa + efectos + toast de respaldo.
   */
  private disparar(titulo: string, cuerpo: string, tag: string): void {
    // Vibración
    if (this.config?.vibracionHabilitada && 'vibrate' in navigator) {
      navigator.vibrate([150, 80, 150]);
    }

    // Sonido
    if (this.config?.sonidoHabilitado) {
      this.reproducirBeep();
    }

    // Notificación nativa
    this.mostrarNotificacion(titulo, cuerpo, tag);

    // Toast SweetAlert2 como respaldo visual
    Swal.fire({
      icon: 'warning',
      title: titulo,
      html: `<span style="color:#f59e0b">${cuerpo}</span>`,
      toast: true,
      position: 'top-end',
      timer: 7000,
      showConfirmButton: false,
      timerProgressBar: true
    });
  }

  /**
   * Muestra un mensaje FCM recibido en foreground como toast.
   */
  private mostrarMensajeFcmEnForeground(msg: FcmMessage): void {
    // Vibración
    if (this.config?.vibracionHabilitada && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    // Sonido
    if (this.config?.sonidoHabilitado) {
      this.reproducirBeep();
    }

    // Notificación nativa
    this.mostrarNotificacion(msg.title, msg.body, msg.tag);

    // Toast visual
    Swal.fire({
      icon: 'info',
      title: msg.title,
      html: `<span>${msg.body}</span>`,
      toast: true,
      position: 'top-end',
      timer: 8000,
      showConfirmButton: false,
      timerProgressBar: true
    });
  }

  private reproducirBeep(): void {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // AudioContext puede estar bloqueado sin interacción previa
    }
  }

  // ─── Persistencia ─────────────────────────────────────────────────────────

  private persistir(): void {
    try {
      const datos = Array.from(this.notificaciones.values()).map(n => ({
        id: n.id,
        titulo: n.titulo,
        cuerpo: n.cuerpo,
        fechaDisparo: n.fechaDisparo.toISOString()
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(datos));
    } catch (err) {
      console.error('[Notif] Error persistiendo notificaciones:', err);
    }
  }

  private restaurarPendientes(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const datos: Array<{
        id: string;
        titulo: string;
        cuerpo: string;
        fechaDisparo: string;
      }> = JSON.parse(raw);

      const ahora = new Date();
      let restauradas = 0;

      datos.forEach(d => {
        const fechaDisparo = new Date(d.fechaDisparo);
        if (fechaDisparo > ahora) {
          const msHasta = fechaDisparo.getTime() - ahora.getTime();
          const notif: NotificacionProgramada = {
            id: d.id,
            titulo: d.titulo,
            cuerpo: d.cuerpo,
            fechaDisparo
          };
          notif.timerId = setTimeout(() => {
            this.disparar(d.titulo, d.cuerpo, d.id);
            this.notificaciones.delete(d.id);
            this.persistir();
          }, msHasta);
          this.notificaciones.set(d.id, notif);
          restauradas++;
        }
      });

      if (restauradas > 0) {
        console.log(`[Notif] 🔄 ${restauradas} notificación(es) restaurada(s)`);
      }

      // Limpiar entradas expiradas del storage
      this.persistir();
    } catch (err) {
      console.error('[Notif] Error restaurando notificaciones:', err);
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}
