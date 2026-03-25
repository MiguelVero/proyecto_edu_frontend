import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ReporteService } from '../../../../core/services/reporte.service';
import { Subscription } from 'rxjs';
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';
import { FechaPipe } from '../../../../shared/pipes/fecha.pipe';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-morosidad-reporte',
  standalone: true,
  imports: [CommonModule, RouterModule, MonedaPipe, FechaPipe, LoadingSpinnerComponent],
  templateUrl: './morosidad-reporte.component.html',
  styleUrls: ['./morosidad-reporte.component.css']
})
export class MorosidadReporteComponent implements OnInit, OnDestroy  {
  deuda: any[] = [];
  resumen = {
    deudaTotal: 0,
    clientesMorosos: 0,
    ordenesVencidas: 0
  };
  cargando = true;
  private subscriptions: Subscription[] = [];
  constructor(
    private reporteService: ReporteService,
    private router: Router
  ) {}

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.cargando = true;
    this.subscriptions.push(
      this.reporteService.getReporteMorosidad().subscribe({
        next: (data) => {
          this.deuda = data.detalle;
          this.resumen = data.resumen;
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

 exportarExcel() {
    this.subscriptions.push(
      this.reporteService.exportarExcel('morosidad').subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `reporte_morosidad_${new Date().toISOString().split('T')[0]}.csv`;
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
  ngOnDestroy() {
    this.subscriptions.forEach(sub => {
      if (sub && typeof sub.unsubscribe === 'function') {
        sub.unsubscribe();
      }
    });
    console.log('🧹 MorosidadReporteComponent destruido');
  }
}