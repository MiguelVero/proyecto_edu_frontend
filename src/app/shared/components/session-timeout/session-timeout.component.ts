import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { SessionService, EstadoSesion } from '../../../core/services/session.service';

@Component({
  selector: 'app-session-timeout',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="session-overlay" *ngIf="estado.mostrarAdvertencia" role="dialog" aria-modal="true" aria-labelledby="session-title">
      <div class="session-modal">

        <!-- Icono animado -->
        <div class="session-icon" [class.urgente]="estado.segundosRestantes <= 15">
          <i class="fas fa-shield-alt"></i>
        </div>

        <!-- Título -->
        <h2 id="session-title" class="session-title">
          ¿Sigues ahí?
        </h2>

        <!-- Mensaje -->
        <p class="session-message">
          Tu sesión se cerrará automáticamente por inactividad.
        </p>

        <!-- Contador regresivo -->
        <div class="countdown-container">
          <div class="countdown-ring" [class.urgente]="estado.segundosRestantes <= 15">
            <svg viewBox="0 0 100 100" class="countdown-svg">
              <circle
                class="countdown-track"
                cx="50" cy="50" r="42"
                fill="none"
                stroke-width="8"
              />
              <circle
                class="countdown-progress"
                cx="50" cy="50" r="42"
                fill="none"
                stroke-width="8"
                [style.stroke-dasharray]="circunferencia"
                [style.stroke-dashoffset]="dashOffset"
                stroke-linecap="round"
              />
            </svg>
            <div class="countdown-number">
              <span class="countdown-seconds">{{ estado.segundosRestantes }}</span>
              <span class="countdown-label">seg</span>
            </div>
          </div>
        </div>

        <!-- Barra de progreso lineal -->
        <div class="progress-bar-container">
          <div
            class="progress-bar"
            [class.urgente]="estado.segundosRestantes <= 15"
            [style.width.%]="porcentajeRestante"
          ></div>
        </div>

        <!-- Acciones -->
        <div class="session-actions">
          <button
            class="btn-extend"
            (click)="extenderSesion()"
            autofocus
          >
            <i class="fas fa-check-circle"></i>
            Continuar sesión
          </button>
          <button
            class="btn-logout"
            (click)="cerrarSesion()"
          >
            <i class="fas fa-sign-out-alt"></i>
            Cerrar sesión
          </button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .session-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.25s ease;
      padding: 1rem;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    .session-modal {
      background: var(--surf, #ffffff);
      border-radius: 24px;
      padding: 2.5rem 2rem;
      max-width: 380px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.35);
      animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      border: 1px solid var(--bor, #e2e8f0);
    }

    @keyframes slideUp {
      from { transform: translateY(40px) scale(0.95); opacity: 0; }
      to   { transform: translateY(0)    scale(1);    opacity: 1; }
    }

    /* Icono */
    .session-icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.25rem;
      font-size: 1.75rem;
      color: white;
      transition: background 0.4s ease;
    }

    .session-icon.urgente {
      background: linear-gradient(135deg, #f43f5e, #ef4444);
      animation: pulse 0.8s ease infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50%       { transform: scale(1.08); }
    }

    /* Textos */
    .session-title {
      font-size: 1.4rem;
      font-weight: 800;
      color: var(--txt, #0f172a);
      margin: 0 0 0.5rem;
    }

    .session-message {
      font-size: 0.9rem;
      color: #64748b;
      margin: 0 0 1.5rem;
      line-height: 1.5;
    }

    /* Contador circular */
    .countdown-container {
      display: flex;
      justify-content: center;
      margin-bottom: 1.25rem;
    }

    .countdown-ring {
      position: relative;
      width: 110px;
      height: 110px;
    }

    .countdown-svg {
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
    }

    .countdown-track {
      stroke: var(--bor, #e2e8f0);
    }

    .countdown-progress {
      stroke: #6366f1;
      transition: stroke-dashoffset 1s linear, stroke 0.4s ease;
    }

    .countdown-ring.urgente .countdown-progress {
      stroke: #f43f5e;
    }

    .countdown-number {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .countdown-seconds {
      font-size: 2rem;
      font-weight: 800;
      color: var(--txt, #0f172a);
      line-height: 1;
    }

    .countdown-label {
      font-size: 0.7rem;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* Barra de progreso */
    .progress-bar-container {
      height: 6px;
      background: var(--bor, #e2e8f0);
      border-radius: 99px;
      overflow: hidden;
      margin-bottom: 1.75rem;
    }

    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #6366f1, #8b5cf6);
      border-radius: 99px;
      transition: width 1s linear, background 0.4s ease;
    }

    .progress-bar.urgente {
      background: linear-gradient(90deg, #f43f5e, #ef4444);
    }

    /* Botones */
    .session-actions {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .btn-extend {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      border: none;
      padding: 0.875rem 1.5rem;
      border-radius: 14px;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: all 0.2s ease;
      width: 100%;
    }

    .btn-extend:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
    }

    .btn-extend:active {
      transform: translateY(0);
    }

    .btn-logout {
      background: transparent;
      color: #94a3b8;
      border: 1px solid var(--bor, #e2e8f0);
      padding: 0.75rem 1.5rem;
      border-radius: 14px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: all 0.2s ease;
      width: 100%;
    }

    .btn-logout:hover {
      background: #fef2f2;
      color: #f43f5e;
      border-color: #fecaca;
    }

    /* Dark mode */
    [data-theme="dark"] .session-modal {
      background: #1e293b;
      border-color: #334155;
    }

    [data-theme="dark"] .session-title {
      color: #f1f5f9;
    }

    [data-theme="dark"] .countdown-seconds {
      color: #f1f5f9;
    }

    [data-theme="dark"] .countdown-track {
      stroke: #334155;
    }

    [data-theme="dark"] .progress-bar-container {
      background: #334155;
    }

    [data-theme="dark"] .btn-logout {
      border-color: #334155;
      color: #64748b;
    }

    [data-theme="dark"] .btn-logout:hover {
      background: #2d1b1b;
      color: #f43f5e;
      border-color: #7f1d1d;
    }

    /* Responsive */
    @media (max-width: 480px) {
      .session-modal {
        padding: 2rem 1.5rem;
        border-radius: 20px;
      }
    }
  `]
})
export class SessionTimeoutComponent implements OnInit, OnDestroy {

  estado: EstadoSesion = {
    activa: false,
    mostrarAdvertencia: false,
    segundosRestantes: 60,
    tiempoInactividad: 0
  };

  /** Circunferencia del círculo SVG (r=42) */
  readonly circunferencia = 2 * Math.PI * 42; // ≈ 263.9

  private sub?: Subscription;

  constructor(
    private sessionService: SessionService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.sub = this.sessionService.estado$.subscribe(estado => {
      this.estado = estado;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  // ─── Cálculos para el SVG ─────────────────────────────────────────────────

  get porcentajeRestante(): number {
    const max = 60; // segundos de advertencia
    return Math.min(100, (this.estado.segundosRestantes / max) * 100);
  }

  get dashOffset(): number {
    return this.circunferencia * (1 - this.porcentajeRestante / 100);
  }

  // ─── Acciones ─────────────────────────────────────────────────────────────

  extenderSesion(): void {
    this.sessionService.extenderSesion();
  }

  cerrarSesion(): void {
    this.sessionService.cerrarSesionAhora();
  }
}
