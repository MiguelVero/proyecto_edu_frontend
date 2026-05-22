import { Injectable, OnDestroy } from '@angular/core';
import { ConfigService } from './config.service';

export interface NotificacionProgramada {
  id: string;
  titulo: string;
  cuerpo: string;
  /** Momento exacto en que se disparará (ya descontada la anticipación) */
  fechaDisparo: Date;
  timerId?: any;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy {

  private notificacionesProgramadas: Map<string, NotificacionProgramada> = new Map();
  private readonly STORAGE_KEY = 'notificaciones_programadas';

  constructor(private configService: ConfigService) {
    this.inicializar();
  }

  ngOnDestroy(): void {
    this.cancelarTodasLasNotificaciones();
  }

  // ─── Inicialización ────────────────────────────────────────────────────────

  private async inicializar(): Promise<void> {
    await this.solicitarPermiso();
    await this.registrarServiceWorker();
    this.restaurarNotificacionesPendientes();
  }

  // ─── Service Worker ────────────────────────────────────────────────────────

  /**
   * Registra el Service Worker para notificaciones push reales en celular.
   * El SW existe en src/service-worker.js y está configurado en angular.json.
   */
  private async registrarServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('🔔 Service Worker no soportado en este navegador');
      return;
    }

    try {
      const existing = await navigator.serviceWorker.getRegistration('/');
      if (existing) {
        console.log('✅ Service Worker ya registrado:', existing.scope);
        return;
      }
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      });
      console.log('✅ Service Worker registrado:', registration.scope);
    } catch (error) {
      console.warn('⚠️ Error registrando Service Worker:', error);
    }
  }

  /**
   * Obtiene el registro activo del Service Worker.
   */
  private async getSwRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) return null;
    try {
      const reg = await navigator.serviceWorker.getRegistration('/');
      return reg ?? null;
    } catch {
      return null;
    }
  }

  // ─── Permisos ──────────────────────────────────────────────────────────────

  /**
   * Solicita permiso para notificaciones nativas del navegador/celular.
   */
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
      const concedido = permiso === 'granted';
      console.log(`🔔 Permiso de notificaciones: ${permiso}`);
      return concedido;
    } catch (error) {
      console.error('Error solicitando permiso de notificaciones:', error);
      return false;
    }
  }

  get tienePermiso(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
  }

  get estadoPermiso(): string {
    if (!('Notification' in window)) return 'no-soportado';
    return Notification.permission;
  }

  // ─── Programar notificación ────────────────────────────────────────────────

  /**
   * Programa una notificación para una fecha/hora específica.
   *
   * @param id           Identificador único (ej: "orden-42-exacta")
   * @param titulo       Título de la notificación
   * @param cuerpo       Cuerpo del mensaje
   * @param fechaHora    Momento base (hora límite de la orden)
   * @param minutosAntes Minutos de anticipación (0 = hora exacta)
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
      console.warn(`⚠️ La notificación "${id}" ya pasó (${momentoDisparo.toLocaleString()})`);
      return false;
    }

    // Cancelar si ya existe una con el mismo id
    this.cancelarNotificacion(id);

    const notificacion: NotificacionProgramada = {
      id,
      titulo,
      cuerpo,
      fechaDisparo: momentoDisparo
    };

    // Programar con setTimeout (funciona hasta ~24.8 días)
    notificacion.timerId = setTimeout(async () => {
      await this.mostrarNotificacion(titulo, cuerpo, id);
      this.notificacionesProgramadas.delete(id);
      this.persistirNotificaciones();
    }, msHastaDisparo);

    this.notificacionesProgramadas.set(id, notificacion);
    this.persistirNotificaciones();

    const minutosRestantes = Math.round(msHastaDisparo / 60000);
    console.log(`🔔 Notificación "${id}" programada en ${minutosRestantes} min (${momentoDisparo.toLocaleString()})`);
    return true;
  }

  // ─── Mostrar notificación inmediata ───────────────────────────────────────

  /**
   * Muestra una notificación inmediata.
   * Usa el Service Worker si está disponible (funciona con navegador en segundo plano),
   * con fallback a la Notification API directa.
   */
  async mostrarNotificacion(titulo: string, cuerpo: string, tag?: string): Promise<void> {
    if (!this.tienePermiso) {
      console.warn('⚠️ Sin permiso para mostrar notificaciones');
      return;
    }

    const opciones: any = {
      body: cuerpo,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: tag || `notif-${Date.now()}`,
      requireInteraction: false,
      silent: false,
      vibrate: [200, 100, 200],
      data: { url: '/ordenes' }
    };

    // Intentar via Service Worker primero (funciona con app en segundo plano)
    const swReg = await this.getSwRegistration();
    if (swReg) {
      try {
        await swReg.showNotification(titulo, opciones);
        console.log(`📣 Notificación via SW: "${titulo}"`);
        return;
      } catch (swError) {
        console.warn('⚠️ Error via SW, usando Notification API directa:', swError);
      }
    }

    // Fallback: Notification API directa
    try {
      const notif = new Notification(titulo, opciones);
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
      console.log(`📣 Notificación directa: "${titulo}"`);
    } catch (error) {
      console.error('Error mostrando notificación:', error);
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

  // ─── Helper principal para órdenes ────────────────────────────────────────

  /**
   * Programa notificaciones para una orden de trabajo.
   * - A la hora exacta de vencimiento
   * - Con la anticipación configurada en ConfigService (ej: 30 min, 1 h, etc.)
   *
   * @returns { programadas, mensaje } con el resultado
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

    // Leer anticipación desde ConfigService
    const minutosAnticipacion = this.configService.config.tiempoNotificacionAnticipada;
    const leadTexto = minutosAnticipacion < 60
      ? `${minutosAnticipacion} min`
      : `${Math.floor(minutosAnticipacion / 60)} h`;

    const titulo = `📋 Orden ${orden.id_externo} — Vence hoy`;
    const doctor = orden.doctor?.nombre || 'Doctor';
    const servicio = orden.servicio?.nombre || 'Servicio';
    const cliente = orden.cliente_nombre ? ` | ${orden.cliente_nombre}` : '';
    const cuerpoBase = `${doctor} — ${servicio}${cliente}`;

    let programadas = 0;
    const idBase = `orden-${orden.id}`;

    // 1. Notificación a la hora exacta
    const ok1 = this.programarNotificacion(
      `${idBase}-exacta`,
      titulo,
      `⏰ ¡Hora límite ahora! ${cuerpoBase}`,
      fechaHora,
      0
    );
    if (ok1) programadas++;

    // 2. Notificación con anticipación configurada (si hay tiempo suficiente)
    const msHastaAnticipacion = fechaHora.getTime() - ahora.getTime() - minutosAnticipacion * 60 * 1000;
    if (msHastaAnticipacion > 0) {
      const ok2 = this.programarNotificacion(
        `${idBase}-anticipada`,
        `⚠️ Orden ${orden.id_externo} — Vence en ${leadTexto}`,
        cuerpoBase,
        fechaHora,
        minutosAnticipacion
      );
      if (ok2) programadas++;
    }

    const mensajes: Record<number, string> = {
      0: 'No se pudo programar ninguna notificación',
      1: 'Notificación programada para la hora exacta',
      2: `Notificaciones programadas: hora exacta y ${leadTexto} antes`
    };

    return {
      programadas,
      mensaje: mensajes[programadas] ?? `${programadas} notificaciones programadas`
    };
  }

  // ─── Persistencia ─────────────────────────────────────────────────────────

  private persistirNotificaciones(): void {
    try {
      const datos = Array.from(this.notificacionesProgramadas.values()).map(n => ({
        id: n.id,
        titulo: n.titulo,
        cuerpo: n.cuerpo,
        fechaDisparo: n.fechaDisparo.toISOString()
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

      const datos: Array<{ id: string; titulo: string; cuerpo: string; fechaDisparo: string }> =
        JSON.parse(raw);

      const ahora = new Date();
      let restauradas = 0;

      datos.forEach(d => {
        const fechaDisparo = new Date(d.fechaDisparo);
        if (fechaDisparo > ahora) {
          // Restaurar: fechaDisparo ya es el momento exacto de disparo
          this.programarNotificacion(d.id, d.titulo, d.cuerpo, fechaDisparo, 0);
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

  // ─── Estado ───────────────────────────────────────────────────────────────

  getNotificacionesPendientes(): NotificacionProgramada[] {
    return Array.from(this.notificacionesProgramadas.values());
  }

  tieneNotificacionParaOrden(ordenId: number | string): boolean {
    return (
      this.notificacionesProgramadas.has(`orden-${ordenId}-exacta`) ||
      this.notificacionesProgramadas.has(`orden-${ordenId}-anticipada`)
    );
  }
}
