import { Component, OnInit, OnDestroy  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { ReporteService } from '../../../../core/services/reporte.service';
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';
import { FechaPipe } from '../../../../shared/pipes/fecha.pipe';  // <-- AGREGAR ESTA LÍNEA
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import Swal from 'sweetalert2';
import { ImagenPipe } from '../../../../shared/pipes/imagen.pipe';
@Component({
  selector: 'app-doctores-reporte',
  standalone: true,
  imports: [CommonModule, RouterModule, MonedaPipe,FechaPipe,  LoadingSpinnerComponent, ImagenPipe],
  templateUrl: './doctores-reporte.component.html',
  styleUrls: ['./doctores-reporte.component.css']
})
export class DoctoresReporteComponent implements OnInit, OnDestroy  {
  doctores: any[] = [];
  cargando = true;
  
  totalDoctores = 0;
  deudaTotal = 0;
  totalPendientes = 0;
  totalFacturado = 0;
  totalPagado = 0;
  
  topDoctores: any[] = [];
  topDeudores: any[] = [];
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
      this.reporteService.getReporteDoctores().subscribe({
        next: (data) => {
          this.doctores = data.doctores;
          
          this.totalDoctores = data.doctores.length;
          this.deudaTotal = data.doctores.reduce((sum: number, d: any) => sum + (d.deuda_total || 0), 0);
          this.totalPendientes = data.doctores.reduce((sum: number, d: any) => sum + (d.ordenes_pendientes || 0), 0);
          this.totalFacturado = data.doctores.reduce((sum: number, d: any) => sum + (d.total_facturado || 0), 0);
          this.totalPagado = data.doctores.reduce((sum: number, d: any) => sum + (d.total_pagado || 0), 0);
          
          this.topDoctores = [...data.doctores]
            .sort((a, b) => b.total_ordenes - a.total_ordenes)
            .slice(0, 5);
          
          this.topDeudores = [...data.doctores]
            .sort((a, b) => b.deuda_total - a.deuda_total)
            .slice(0, 5);
          
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
      this.reporteService.exportarExcel('doctores').subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `reporte_doctores_${new Date().toISOString().split('T')[0]}.csv`;
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
    console.log('🧹 DoctoresReporteComponent destruido');
  }
}