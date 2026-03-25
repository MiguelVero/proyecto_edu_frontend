import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { OrdenService } from '../../core/services/orden.service';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Chart, registerables } from 'chart.js';
import { MonedaPipe } from '../../shared/pipes/moneda.pipe';
import { FechaPipe } from '../../shared/pipes/fecha.pipe';
import { environment } from '../../../environments/environment';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MonedaPipe,
    FechaPipe
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  stats: any = {};
  ingresosMensuales: any[] = [];
  private refreshSubscription?: Subscription;
  private chartEstados: Chart | null = null;
  private chartIngresos: Chart | null = null;

  constructor(
    private ordenService: OrdenService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.cargarEstadisticas();
    this.cargarIngresosMensuales();
    
    this.refreshSubscription = interval(30000).pipe(
      switchMap(() => this.ordenService.getEstadisticas())
    ).subscribe(data => {
      this.stats = data;
      this.actualizarGraficos();
    });
  }

  cargarEstadisticas() {
    this.ordenService.getEstadisticas().subscribe(data => {
      this.stats = data;
      setTimeout(() => {
        this.inicializarGraficos();
      }, 0);
    });
  }

  cargarIngresosMensuales() {
    this.http.get(`${environment.apiUrl}/ordenes/ingresos/mensuales`).subscribe({
      next: (data: any) => {
        this.ingresosMensuales = data;
        this.actualizarGraficoIngresos();
      },
      error: (error) => {
        console.error('Error cargando ingresos mensuales:', error);
      }
    });
  }

  inicializarGraficos() {
    this.crearGraficoEstados();
    this.crearGraficoIngresos();
  }

  crearGraficoEstados() {
    const canvas = document.getElementById('estadosChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.chartEstados) {
      this.chartEstados.destroy();
    }

    this.chartEstados = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Activas', 'Vencidas', 'Terminadas'],
        datasets: [{
          data: [
            this.stats.ordenes_activas || 0,
            this.stats.ordenes_vencidas || 0,
            this.stats.ordenes_terminadas || 0
          ],
          backgroundColor: ['#10b981', '#f43f5e', '#6366f1'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: getComputedStyle(document.body).getPropertyValue('--txt')
            }
          }
        }
      }
    });
  }

  crearGraficoIngresos() {
    const canvas = document.getElementById('ingresosChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.chartIngresos) {
      this.chartIngresos.destroy();
    }

    const meses = this.ingresosMensuales.map(i => i.mes);
    const valores = this.ingresosMensuales.map(i => i.total);

    this.chartIngresos = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: meses,
        datasets: [{
          label: 'Ingresos',
          data: valores,
          backgroundColor: '#6366f1',
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => `S/ ${value}`
            }
          }
        }
      }
    });
  }

  actualizarGraficos() {
    if (this.chartEstados) {
      this.chartEstados.data.datasets[0].data = [
        this.stats.ordenes_activas || 0,
        this.stats.ordenes_vencidas || 0,
        this.stats.ordenes_terminadas || 0
      ];
      this.chartEstados.update();
    }
    this.actualizarGraficoIngresos();
  }

  actualizarGraficoIngresos() {
    if (this.chartIngresos && this.ingresosMensuales.length > 0) {
      this.chartIngresos.data.labels = this.ingresosMensuales.map(i => i.mes);
      this.chartIngresos.data.datasets[0].data = this.ingresosMensuales.map(i => i.total);
      this.chartIngresos.update();
    }
  }

  ngOnDestroy() {
    this.refreshSubscription?.unsubscribe();
    if (this.chartEstados) {
      this.chartEstados.destroy();
    }
    if (this.chartIngresos) {
      this.chartIngresos.destroy();
    }
  }
}