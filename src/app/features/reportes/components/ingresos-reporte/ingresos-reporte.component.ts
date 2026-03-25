import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { ReporteService } from '../../../../core/services/reporte.service';
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';
import { FechaPipe } from '../../../../shared/pipes/fecha.pipe';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { Chart, registerables } from 'chart.js';
import Swal from 'sweetalert2';

Chart.register(...registerables);

@Component({
  selector: 'app-ingresos-reporte',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MonedaPipe, FechaPipe, LoadingSpinnerComponent],
  templateUrl: './ingresos-reporte.component.html',
  styleUrls: ['./ingresos-reporte.component.css']
})
export class IngresosReporteComponent implements OnInit, OnDestroy {
  fechaInicio: string;
  fechaFin: string;
  grupo: string = 'mes';
  cargando = true;
  
  totalIngresos = 0;
  totalEfectivo = 0;
  totalTarjeta = 0;
  totalDigital = 0;
  
  datosTabla: any[] = [];
  chart: Chart | null = null;
private subscriptions: Subscription[] = [];
  constructor(
    private reporteService: ReporteService,
    private router: Router
  ) {
    const hoy = new Date();
    const hace6Meses = new Date();
    hace6Meses.setMonth(hace6Meses.getMonth() - 6);
    
    this.fechaInicio = hace6Meses.toISOString().split('T')[0];
    this.fechaFin = hoy.toISOString().split('T')[0];
  }

  ngOnInit() {
    this.cargarDatos();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => {
      if (sub && typeof sub.unsubscribe === 'function') {
        sub.unsubscribe();
      }
    });
    
    if (this.chart) {
      this.chart.destroy();
    }
    
    console.log('🧹 IngresosReporteComponent destruido');
  }

   cargarDatos() {
    this.cargando = true;
    this.subscriptions.push(
      this.reporteService.getReporteIngresos(this.fechaInicio, this.fechaFin, this.grupo).subscribe({
        next: (data) => {
          this.datosTabla = data.detalle;
          this.totalIngresos = data.total;
          this.totalEfectivo = data.porMetodo.efectivo || 0;
          this.totalTarjeta = data.porMetodo.tarjeta || 0;
          this.totalDigital = (data.porMetodo.transferencia || 0) + 
                             (data.porMetodo.yape || 0) + 
                             (data.porMetodo.plin || 0);
          
          this.crearGrafico(data);
          this.cargando = false;
        },
        error: (error) => {
          console.error('Error cargando reporte:', error);
          this.cargando = false;
          Swal.fire('Error', 'No se pudo cargar el reporte', 'error');
        }
      })
    );
  }

  crearGrafico(data: any) {
    if (this.chart) {
      this.chart.destroy();
    }

    const ctx = document.getElementById('ingresosChart') as HTMLCanvasElement;
    
    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.detalle.map((d: any) => d.periodo),
        datasets: [
          {
            label: 'Efectivo',
            data: data.detalle.map((d: any) => d.efectivo),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4
          },
          {
            label: 'Tarjeta',
            data: data.detalle.map((d: any) => d.tarjeta),
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            tension: 0.4
          },
          {
            label: 'Digital',
            data: data.detalle.map((d: any) => d.digital),
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom'
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                return `${context.dataset.label}: S/ ${context.raw}`;
              }
            }
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

  exportarExcel() {
    this.subscriptions.push(
      this.reporteService.exportarExcel('ingresos', {
        fechaInicio: this.fechaInicio,
        fechaFin: this.fechaFin,
        grupo: this.grupo
      }).subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `ingresos_${this.fechaInicio}_${this.fechaFin}.csv`;
          link.click();
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error('Error exportando:', error);
          Swal.fire('Error', 'No se pudo exportar el reporte', 'error');
        }
      })
    );
  }
 limpiarFiltros() {
    const hoy = new Date();
    const hace6Meses = new Date();
    hace6Meses.setMonth(hace6Meses.getMonth() - 6);
    
    this.fechaInicio = hace6Meses.toISOString().split('T')[0];
    this.fechaFin = hoy.toISOString().split('T')[0];
    this.grupo = 'mes';
    
    this.cargarDatos();
  }

}