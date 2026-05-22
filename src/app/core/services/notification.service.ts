import { Injectable, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ConfigService } from './config.service';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface OrdenProxima {
  id: number | string;
  doctor?: string;
  servicio?: string;
  fechaVencimiento: Date;
}

export interface NotificacionProgramada {
  id: string;
  titulo: string;
  cuerpo: string;
  fechaHora: Date;
  timerId?: any;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy {

  private notificacionesProgramadas: Map<string, NotificacionProgramada> = new Map();
  private readonly STORAGE_KEY = 'notificaciones_programadas';
  private swRegistration: ServiceWorkerRegistration | null = null;
  private configSub?: Subscription;

  constructor(private configService: ConfigService) {
    this.inicializar();
  }

  ngOnDestroy(): void {
    this.configSub?.unsubscribe();
    this.cancelarTodasLasNotificaciones();
  }

  // ─── Inicialización ────────────────────────────────────────────────────────

  private async inicializar(): Promise<void> {
    await this.registrarServiceWorker();
    await this.solicitarPermiso();
    this.restaurarNotificacionesPendientes();
  }

  // ─── Service Worker ────────────────────────────────────────────────────────

  private async registrarServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('[SW] Service Workers no soportados en este navegador');
      return;
    }
    try {
      const reg = await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
      this.swRegistration = reg;
      console.log('[SW] Service Worker registrado:', reg.scope);

      // Esperar a que esté activo
      if (reg.installing) {
        await new Promise<void>(resolve => {
          reg.installing!.addEventListener('statechange', function handler(e) {
            if ((e.target as ServiceWorker).state === 'activated') {
              reg.installing?.removeEventListener('statechange', handler);
              resolve();
            }
          });
        });
      }

      // Obtener registro activo si ya existe
      if (!this.swRegistration) {
        this.swRegistration = await navigator.serviceWorker.ready;
      }
    } catch (error) {
      console.error('[SW] Error registrando Service Worker:', error);
    }
  }

  // ─── Permisos ──────────────────────────────────────────────────────────────

  async solicitarPermiso(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('🔔 Este navegador no soporta notificaciones');
      return false;
    }

    if (Notification.permission === 'granted') {
      console.log('✅ Permiso de notificaciones ya concedido');
      return true;
    }

    if (Notification.permission === 'denied') {
      console.warn('❌ Permiso de notificaciones denegado por el usuario');
      return false;
    }

    try {
      const permiso = await Notification.requestPermission();
      console.log(`🔔 Permiso de notificaciones: ${permiso}`);
      return permiso === 'granted';
    } catch (error) {
      console.error('Error solicitando permiso de notificaciones:', error);
      return false;
    }
  }

  get tienePermiso(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
  }

  get estadoPermiso(): NotificationPermission {
    if (!('Notification' in window)) return 'denied';
    return Notification.permission;
  }

  // ─── Programar notificación ────────────────────────────────────────────────

  /**
   * Programa una notificación para una fecha/hora específica.
   * @param id           Identificador único (ej: "orden-42-exacta")
   * @param titulo       Título de la notificación
   * @param cuerpo       Cuerpo del mensaje
   * @param fechaHora    Momento exacto en que debe dispararse (ya calculado)
   * @param minutosAntes Minutos de anticipación (default 0 = hora exacta)
   */
  programarNotificacion(
    id: string,
    titulo: string,
    cuerpo: string,
    fechaHora: Date,
    minutosAntes: number = 0
  ): boolean {
    if (!this.tienePermiso) {
      console.warn('⚠️ Sin permiso para notificaciones');
      return false;
    }

    // Calcular momento de disparo
    const momentoDisparo = new Date(fechaHora.getTime() - minutosAntes * 60 * 1000);
    const ahora = new Date();
    const msHastaDisparo = momentoDisparo.getTime() - ahora.getTime();

    if (msHastaDisparo <= 0) {
      console.warn(`⚠️ La fecha/hora de la notificación "${id}" ya pasó`);
      return false;
    }

    // Cancelar si ya existe una con el mismo id
    this.cancelarNotificacion(id);

    const notificacion: NotificacionProgramada = {
      id,
      titulo,
      cuerpo,
      fechaHora: momentoDisparo
    };

    // Programar con setTimeout (funciona hasta ~24.8 días)
    notificacion.timerId = setTimeout(() => {
      this.mostrarNotificacion(titulo, cuerpo, id);
      this.notificacionesProgramadas.delete(id);
      this.persistirNotificaciones();
    }, msHastaDisparo);

    this.notificacionesProgramadas.set(id, notificacion);
    this.persistirNotificaciones();

    const minutosRestantes = Math.round(msHastaDisparo / 60000);
    console.log(`🔔 Notificación "${id}" programada en ${minutosRestantes} minutos`);
    return true;
  }

  // ─── Mostrar notificación inmediata ───────────────────────────────────────

  mostrarNotificacion(titulo: string, cuerpo: string, tag?: string): void {
    if (!this.tienePermiso) {
      console.warn('⚠️ Sin permiso para mostrar notificaciones');
      return;
    }

    const opciones: NotificationOptions = {
      body: cuerpo,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: tag || `notif-${Date.now()}`,
      requireInteraction: false,
      silent: false,
      data: { url: '/ordenes' }
    };

    // Intentar via Service Worker primero (funciona con app cerrada)
    if (this.swRegistration?.active) {
      this.swRegistration.showNotification(titulo, opciones)
        .then(() => console.log(`📣 Notificación SW mostrada: "${titulo}"`))
        .catch(err => {
          console.warn('SW notification failed, fallback to Notification API:', err);
          this.mostrarNotificacionNativa(titulo, opciones);
        });
    } else {
      // Fallback: Notification API directa
      this.mostrarNotificacionNativa(titulo, opciones);
    }

    // Vibración
    const cfg = this.configService.config;
    if (cfg.vibracionHabilitada && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    // Sonido
    if (cfg.sonidoHabilitado) {
      this.reproducirBeep();
    }
  }

  private mostrarNotificacionNativa(titulo: string, opciones: NotificationOptions): void {
    try {
      const notif = new Notification(titulo, opciones);
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
      console.log(`📣 Notificación nativa mostrada: "${titulo}"`);
    } catch (error) {
      console.error('Error mostrando notificación nativa:', error);
    }
  }

  // ─── Cancelar notificación ────────────────────────────────────────────────

  cancelarNotificacion(id: string): void {
    const notif = this.notificacionesProgramadas.get(id);
    if (notif?.timerId) {
      clearTimeout(notif.timerId);
      this.notificacionesProgramadas.delete(id);
      this.persistirNotificaciones();
      console.log(`🗑️ Notificación "${id}" cancelada`);
    }
  }

  cancelarTodasLasNotificaciones(): void {
    this.notificacionesProgramadas.forEach((notif) => {
      if (notif.timerId) clearTimeout(notif.timerId);
    });
    this.notificacionesProgramadas.clear();
    this.persistirNotificaciones();
    console.log('🗑️ Todas las notificaciones canceladas');
  }

  // ─── Persistencia ─────────────────────────────────────────────────────────

  private persistirNotificaciones(): void {
    try {
      const datos = Array.from(this.notificacionesProgramadas.values()).map(n => ({
        id: n.id,
        titulo: n.titulo,
        cuerpo: n.cuerpo,
        fechaHora: n.fechaHora.toISOString()
      }));
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(datos));
    } catch (error) {
      console.error('Error persistiendo notificaciones:', error);
    }
  }

  private restaurarNotificacionesPendientes(): void {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return;

      const datos: Array<{ id: string; titulo: string; cuerpo: string; fechaHora: string }> =
        JSON.parse(raw);

      const ahora = new Date();
      let restauradas = 0;

      datos.forEach(d => {
        const fechaHora = new Date(d.fechaHora);
        if (fechaHora > ahora) {
          // Restaurar: la fechaHora ya es el momento de disparo (minutosAntes=0)
          this.programarNotificacion(d.id, d.titulo, d.cuerpo, fechaHora, 0);
          restauradas++;
        }
      });

      if (restauradas > 0) {
        console.log(`🔄 ${restauradas} notificación(es) restaurada(s) desde localStorage`);
      }
    } catch (error) {
      console.error('Error restaurando notificaciones:', error);
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  // ─── Helpers para órdenes ─────────────────────────────────────────────────

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
  }): { programadas: number; mensaje: string } {
    if (!orden.fecha_limite) {
      return { programadas: 0, mensaje: 'La orden no tiene fecha límite' };
    }

    const horaStr = orden.hora_limite || '08:00';
    const fechaHoraStr = `${orden.fecha_limite}T${horaStr}`;
    const fechaHora = new Date(fechaHoraStr);

    if (isNaN(fechaHora.getTime())) {
      return { programadas: 0, mensaje: 'Fecha/hora inválida' };
    }

    const ahora = new Date();
    if (fechaHora <= ahora) {
      return { programadas: 0, mensaje: 'La fecha/hora de la orden ya pasó' };
    }

    const titulo = `📋 Orden ${orden.id_externo} — Vence hoy`;
    const doctor = orden.doctor?.nombre || 'Doctor';
    const servicio = orden.servicio?.nombre || 'Servicio';
    const cliente = orden.cliente_nombre ? ` | Cliente: ${orden.cliente_nombre}` : '';
    const cuerpo = `${doctor} — ${servicio}${cliente}`;

    let programadas = 0;
    const idBase = `orden-${orden.id}`;

    // Notificación a la hora exacta
    const ok1 = this.programarNotificacion(
      `${idBase}-exacta`,
      titulo,
      `⏰ ¡Hora límite ahora! ${cuerpo}`,
      fechaHora,
      0
    );
    if (ok1) programadas++;

    // Notificación con anticipación configurada
    const minutosAnticipacion = this.configService.config.tiempoNotificacionAnticipada;
    const msHastaAnticipacion = fechaHora.getTime() - ahora.getTime() - minutosAnticipacion * 60 * 1000;

    if (msHastaAnticipacion > 0) {
      const anticipacionTexto = minutosAnticipacion < 60
        ? `${minutosAnticipacion} min`
        : `${Math.floor(minutosAnticipacion / 60)} h`;

      const ok2 = this.programarNotificacion(
        `${idBase}-anticipada`,
        `⚠️ Orden ${orden.id_externo} — Vence en ${anticipacionTexto}`,
        cuerpo,
        fechaHora,
        minutosAnticipacion
      );
      if (ok2) programadas++;
    }

    // Notificación 30 minutos antes (solo si es diferente a la anticipación y hay tiempo)
    if (minutosAnticipacion !== 30) {
      const msHasta30 = fechaHora.getTime() - ahora.getTime() - 30 * 60 * 1000;
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

    let mensaje: string;
    if (programadas === 0) {
      mensaje = 'No se pudo programar ninguna notificación';
    } else if (programadas === 1) {
      mensaje = 'Notificación programada para la hora exacta';
    } else {
      mensaje = `${programadas} notificaciones programadas (hora exacta + anticipación)`;
    }

    return { programadas, mensaje };
  }

  // ─── Estado ───────────────────────────────────────────────────────────────

  getNotificacionesPendientes(): NotificacionProgramada[] {
    return Array.from(this.notificacionesProgramadas.values());
  }

  tieneNotificacionParaOrden(ordenId: number | string): boolean {
    return (
      this.notificacionesProgramadas.has(`orden-${ordenId}-exacta`) ||
      this.notificacionesProgramadas.has(`orden-${ordenId}-anticipada`) ||
      this.notificacionesProgramadas.has(`orden-${ordenId}-30min`)
    );
  }

  // ─── Audio ────────────────────────────────────────────────────────────────

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
}