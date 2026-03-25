import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { ReporteService } from '../../../../core/services/reporte.service';
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { Chart, registerables } from 'chart.js';
import Swal from 'sweetalert2';

Chart.register(...registerables);

@Component({
  selector: 'app-servicios-reporte',
  standalone: true,
  imports: [CommonModule, RouterModule, MonedaPipe, LoadingSpinnerComponent],
  templateUrl: './servicios-reporte.component.html',
  styleUrls: ['./servicios-reporte.component.css']
})
export class ServiciosReporteComponent implements OnInit, OnDestroy {
  servicios: any[] = [];
  cargando = true;
  chart1: Chart | null = null;
  chart2: Chart | null = null;
  private subscriptions: Subscription[] = [];
  constructor(
    private reporteService: ReporteService,
    private router: Router
  ) {}

  ngOnInit() {
    this.cargarDatos();
  }

    ngOnDestroy() {
    this.subscriptions.forEach(sub => {
      if (sub && typeof sub.unsubscribe === 'function') {
        sub.unsubscribe();
      }
    });
    
    if (this.chart1) this.chart1.destroy();
    if (this.chart2) this.chart2.destroy();
    
    console.log('🧹 ServiciosReporteComponent destruido');
  }

    cargarDatos() {
    this.cargando = true;
    this.subscriptions.push(
      this.reporteService.getReporteServicios().subscribe({
        next: (data) => {
          this.servicios = data;
          this.crearGraficos();
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
   crearGraficos() {
    const ctx1 = document.getElementById('serviciosChart') as HTMLCanvasElement;
    const ctx2 = document.getElementById('ingresosChart') as HTMLCanvasElement;

    if (this.chart1) this.chart1.destroy();
    if (this.chart2) this.chart2.destroy();

    const nombres = this.servicios.map(s => s.nombre);
    const cantidades = this.servicios.map(s => s.cantidad);
    const ingresos = this.servicios.map(s => s.total_facturado);

    this.chart1 = new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: nombres,
        datasets: [{
          label: 'Cantidad de órdenes',
          data: cantidades,
          backgroundColor: '#f59e0b'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        }
      }
    });

    this.chart2 = new Chart(ctx2, {
      type: 'doughnut',
      data: {
        labels: nombres,
        datasets: [{
          data: ingresos,
          backgroundColor: ['#f59e0b', '#10b981', '#6366f1', '#8b5cf6', '#ec4899']
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }

   exportarExcel() {
    this.subscriptions.push(
      this.reporteService.exportarExcel('servicios').subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `reporte_servicios_${new Date().toISOString().split('T')[0]}.csv`;
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
}