import { Injectable, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

import { ConfigService, AppConfig } from './config.service';

export interface OrdenProxima {
  id: number | string;
  doctor?: string;
  servicio?: string;
  fechaVencimiento: Date;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy {

  private configSub?: Subscription;
  private config!: AppConfig;

  constructor(private configService: ConfigService) {
    // Mantener la configuración actualizada en tiempo real
    this.configSub = this.configService.config$.subscribe(cfg => {
      this.config = cfg;
    });
  }

  ngOnDestroy(): void {
    this.configSub?.unsubscribe();
  }

  // ─── API pública ─────────────────────────────────────────────────────────────

  /**
   * Evalúa una lista de órdenes y emite notificaciones para las que
   * vencen dentro del tiempo de anticipación configurado.
   */
  evaluarOrdenes(ordenes: OrdenProxima[]): void {
    if (!this.config.notificacionesPushHabilitadas) return;

    const ahora = Date.now();
    const leadMs = this.configService.notificationLeadTimeMs;

    const proximas = ordenes.filter(o => {
      const vence = new Date(o.fechaVencimiento).getTime();
      const diff = vence - ahora;
      return diff > 0 && diff <= leadMs;
    });

    proximas.forEach(o => this.notificarOrden(o));
  }

  /**
   * Emite una notificación para una orden específica.
   */
  notificarOrden(orden: OrdenProxima): void {
    if (!this.config.notificacionesPushHabilitadas) return;

    const leadMin = this.config.tiempoNotificacionAnticipada;
    const leadTexto = leadMin < 60
      ? `${leadMin} min`
      : `${Math.floor(leadMin / 60)} h`;

    // Vibración
    if (this.config.vibracionHabilitada && 'vibrate' in navigator) {
      navigator.vibrate([150, 80, 150]);
    }

    // Sonido
    if (this.config.sonidoHabilitado) {
      this.reproducirBeep();
    }

    // Notificación nativa del navegador (si el usuario la concedió)
    this.mostrarNotificacionNativa(
      `⚠️ Orden próxima a vencer`,
      `${orden.doctor ?? 'Orden'} — ${orden.servicio ?? ''} vence en menos de ${leadTexto}.`
    );

    // Toast de SweetAlert2 como respaldo visual
    Swal.fire({
      icon: 'warning',
      title: '⚠️ Orden próxima a vencer',
      html: `
        <strong>${orden.doctor ?? 'Orden #' + orden.id}</strong><br>
        <small>${orden.servicio ?? ''}</small><br>
        <span style="color:#f59e0b">Vence en menos de <strong>${leadTexto}</strong></span>
      `,
      toast: true,
      position: 'top-end',
      timer: 6000,
      showConfirmButton: false,
      timerProgressBar: true
    });
  }

  /**
   * Solicita permiso para notificaciones nativas del navegador.
   * Llama a esto una vez al iniciar la app (p.ej. en AppComponent).
   */
  async solicitarPermiso(): Promise<NotificationPermission> {
    if (!('Notification' in window)) return 'denied';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    return Notification.requestPermission();
  }

  // ─── Privados ────────────────────────────────────────────────────────────────

  private mostrarNotificacionNativa(titulo: string, cuerpo: string): void {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
      new Notification(titulo, {
        body: cuerpo,
        icon: 'assets/icons/icon-192x192.png'
      });
    } catch {
      // Algunos navegadores bloquean Notification fuera de service workers
    }
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
}
