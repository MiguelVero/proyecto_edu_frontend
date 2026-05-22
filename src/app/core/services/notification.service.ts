import { Injectable } from '@angular/core';

export interface NotificacionProgramada {
  id: string;
  titulo: string;
  cuerpo: string;
  fechaHora: Date;
  timerId?: any;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificacionesProgramadas: Map<string, NotificacionProgramada> = new Map();
  private readonly STORAGE_KEY = 'notificaciones_programadas';
  private permisoConcedido = false;

  constructor() {
    this.inicializar();
  }

  // ─── Inicialización ────────────────────────────────────────────────────────

  private async inicializar() {
    await this.solicitarPermiso();
    this.restaurarNotificacionesPendientes();
  }

  // ─── Permisos ──────────────────────────────────────────────────────────────

  async solicitarPermiso(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('🔔 Este navegador no soporta notificaciones');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.permisoConcedido = true;
      console.log('✅ Permiso de notificaciones ya concedido');
      return true;
    }

    if (Notification.permission === 'denied') {
      console.warn('❌ Permiso de notificaciones denegado por el usuario');
      return false;
    }

    try {
      const permiso = await Notification.requestPermission();
      this.permisoConcedido = permiso === 'granted';
      console.log(`🔔 Permiso de notificaciones: ${permiso}`);
      return this.permisoConcedido;
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
   * @param id        Identificador único (ej: "orden-42")
   * @param titulo    Título de la notificación
   * @param cuerpo    Cuerpo del mensaje
   * @param fechaHora Momento exacto en que debe dispararse
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

    try {
      const opciones: NotificationOptions = {
        body: cuerpo,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: tag || `notif-${Date.now()}`,
        requireInteraction: false,
        silent: false
      };

      const notif = new Notification(titulo, opciones);

      notif.onclick = () => {
        window.focus();
        notif.close();
      };

      notif.onerror = (err) => {
        console.error('Error en notificación:', err);
      };

      console.log(`📣 Notificación mostrada: "${titulo}"`);
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
          this.programarNotificacion(d.id, d.titulo, d.cuerpo, fechaHora);
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
   * Dispara a la hora exacta y también 30 minutos antes.
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

    // Notificación 30 minutos antes (solo si hay tiempo suficiente)
    const msHasta30 = fechaHora.getTime() - ahora.getTime() - 30 * 60 * 1000;
    if (msHasta30 > 0) {
      const ok2 = this.programarNotificacion(
        `${idBase}-30min`,
        `⚠️ Orden ${orden.id_externo} — Vence en 30 min`,
        cuerpo,
        fechaHora,
        30
      );
      if (ok2) programadas++;
    }

    const mensajes: Record<number, string> = {
      0: 'No se pudo programar ninguna notificación',
      1: 'Notificación programada para la hora exacta',
      2: 'Notificaciones programadas: a la hora exacta y 30 min antes'
    };

    return {
      programadas,
      mensaje: mensajes[programadas] ?? `${programadas} notificaciones programadas`
    };
  }

  // ─── Estado ───────────────────────────────────────────────────────────────

  getNotificacionesPendientes(): NotificacionProgramada[] {
    return Array.from(this.notificacionesProgramadas.values());
  }

  tieneNotificacionParaOrden(ordenId: number | string): boolean {
    return (
      this.notificacionesProgramadas.has(`orden-${ordenId}-exacta`) ||
      this.notificacionesProgramadas.has(`orden-${ordenId}-30min`)
    );
  }
}
