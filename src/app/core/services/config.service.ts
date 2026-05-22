import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface AppConfig {
  // Seguridad de sesión
  tiempoCierreAutomatico: number;   // minutos (5–480)

  // Notificaciones
  tiempoNotificacionAnticipada: number; // minutos (5–1440)
  notificacionesPushHabilitadas: boolean;
  sonidoHabilitado: boolean;
  vibracionHabilitada: boolean;

  // Contacto
  numeroCelular: string;
}

const CONFIG_KEY = 'app_config';

const DEFAULT_CONFIG: AppConfig = {
  tiempoCierreAutomatico: 5,
  tiempoNotificacionAnticipada: 60,
  notificacionesPushHabilitadas: true,
  sonidoHabilitado: true,
  vibracionHabilitada: true,
  numeroCelular: ''
};

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  private configSubject: BehaviorSubject<AppConfig>;
  public config$: Observable<AppConfig>;

  constructor() {
    const stored = this.loadFromStorage();
    this.configSubject = new BehaviorSubject<AppConfig>(stored);
    this.config$ = this.configSubject.asObservable();
  }

  /** Devuelve la configuración actual (snapshot). */
  get config(): AppConfig {
    return this.configSubject.value;
  }

  /** Guarda una configuración completa. */
  saveConfig(config: AppConfig): void {
    const sanitized = this.sanitize(config);
    localStorage.setItem(CONFIG_KEY, JSON.stringify(sanitized));
    this.configSubject.next(sanitized);
  }

  /** Actualiza sólo los campos indicados. */
  patchConfig(partial: Partial<AppConfig>): void {
    this.saveConfig({ ...this.config, ...partial });
  }

  /** Restablece los valores por defecto. */
  resetToDefaults(): void {
    this.saveConfig({ ...DEFAULT_CONFIG });
  }

  /** Tiempo de cierre automático en milisegundos (para el timer de inactividad). */
  get inactivityTimeMs(): number {
    return this.config.tiempoCierreAutomatico * 60 * 1000;
  }

  /** Tiempo de notificación anticipada en milisegundos. */
  get notificationLeadTimeMs(): number {
    return this.config.tiempoNotificacionAnticipada * 60 * 1000;
  }

  // ─── Privados ────────────────────────────────────────────────────────────────

  private loadFromStorage(): AppConfig {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      if (!raw) return { ...DEFAULT_CONFIG };
      const parsed = JSON.parse(raw) as Partial<AppConfig>;
      return this.sanitize({ ...DEFAULT_CONFIG, ...parsed });
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  private sanitize(c: AppConfig): AppConfig {
    return {
      tiempoCierreAutomatico: Math.min(480, Math.max(5, Number(c.tiempoCierreAutomatico) || DEFAULT_CONFIG.tiempoCierreAutomatico)),
      tiempoNotificacionAnticipada: Math.min(1440, Math.max(5, Number(c.tiempoNotificacionAnticipada) || DEFAULT_CONFIG.tiempoNotificacionAnticipada)),
      notificacionesPushHabilitadas: Boolean(c.notificacionesPushHabilitadas),
      sonidoHabilitado: Boolean(c.sonidoHabilitado),
      vibracionHabilitada: Boolean(c.vibracionHabilitada),
      numeroCelular: (c.numeroCelular ?? '').toString().trim()
    };
  }
}
