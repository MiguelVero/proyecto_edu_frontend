import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl
} from '@angular/forms';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

import { ConfigService, AppConfig } from '../../core/services/config.service';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './configuracion.component.html',
  styleUrls: ['./configuracion.component.css']
})
export class ConfiguracionComponent implements OnInit, OnDestroy {

  form!: FormGroup;
  guardando = false;
  guardadoExitoso = false;
  private sub?: Subscription;

  // Etiquetas legibles para los sliders
  readonly labelsCierre: Record<number, string> = {
    5: '5 min',
    15: '15 min',
    30: '30 min',
    60: '1 h',
    120: '2 h',
    240: '4 h',
    480: '8 h'
  };

  readonly labelsNotif: Record<number, string> = {
    5: '5 min',
    15: '15 min',
    30: '30 min',
    60: '1 h',
    120: '2 h',
    360: '6 h',
    720: '12 h',
    1440: '24 h'
  };

  constructor(
    private fb: FormBuilder,
    private configService: ConfigService
  ) {}

  ngOnInit(): void {
    const cfg = this.configService.config;

    this.form = this.fb.group({
      tiempoCierreAutomatico: [
        cfg.tiempoCierreAutomatico,
        [Validators.required, Validators.min(5), Validators.max(480)]
      ],
      tiempoNotificacionAnticipada: [
        cfg.tiempoNotificacionAnticipada,
        [Validators.required, Validators.min(5), Validators.max(1440)]
      ],
      notificacionesPushHabilitadas: [cfg.notificacionesPushHabilitadas],
      sonidoHabilitado: [cfg.sonidoHabilitado],
      vibracionHabilitada: [cfg.vibracionHabilitada],
      numeroCelular: [
        cfg.numeroCelular,
        [Validators.pattern(/^[+]?[\d\s\-().]{0,20}$/)]
      ]
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  // ─── Helpers de template ─────────────────────────────────────────────────────

  get f(): { [key: string]: AbstractControl } {
    return this.form.controls;
  }

  formatMinutos(minutos: number): string {
    if (minutos < 60) return `${minutos} min`;
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return m === 0 ? `${h} h` : `${h} h ${m} min`;
  }

  // ─── Acciones ────────────────────────────────────────────────────────────────

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando = true;
    const config: AppConfig = this.form.value as AppConfig;

    // Simular latencia mínima para feedback visual
    setTimeout(() => {
      this.configService.saveConfig(config);
      this.guardando = false;
      this.guardadoExitoso = true;

      Swal.fire({
        icon: 'success',
        title: '¡Configuración guardada!',
        text: 'Los cambios se aplicarán de inmediato.',
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });

      setTimeout(() => (this.guardadoExitoso = false), 3000);
    }, 400);
  }

  restaurarDefectos(): void {
    Swal.fire({
      title: '¿Restaurar valores por defecto?',
      text: 'Se perderán todos los ajustes personalizados.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, restaurar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#6366f1'
    }).then(result => {
      if (result.isConfirmed) {
        this.configService.resetToDefaults();
        const cfg = this.configService.config;
        this.form.patchValue(cfg);

        Swal.fire({
          icon: 'success',
          title: 'Valores restaurados',
          timer: 1500,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });
      }
    });
  }

  probarNotificacion(): void {
    const cfg: AppConfig = this.form.value as AppConfig;

    if (!cfg.notificacionesPushHabilitadas) {
      Swal.fire({
        icon: 'info',
        title: 'Notificaciones desactivadas',
        text: 'Activa las notificaciones push para probar esta función.',
        confirmButtonColor: '#6366f1'
      });
      return;
    }

    // Vibración de prueba
    if (cfg.vibracionHabilitada && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    // Sonido de prueba (beep sintético con Web Audio API)
    if (cfg.sonidoHabilitado) {
      this.reproducirBeep();
    }

    Swal.fire({
      icon: 'success',
      title: '🔔 Notificación de prueba',
      html: `
        <p>Así se verá una notificación del sistema.</p>
        <small style="color:#64748b">
          Anticipación configurada: <strong>${this.formatMinutos(cfg.tiempoNotificacionAnticipada)}</strong>
        </small>
      `,
      confirmButtonColor: '#6366f1',
      confirmButtonText: 'Entendido'
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
      // El navegador puede bloquear AudioContext sin interacción previa
    }
  }
}
