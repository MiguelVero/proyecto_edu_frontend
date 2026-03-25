import { Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';

export const reportesRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./reportes.component').then(m => m.ReportesComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'ingresos',
    loadComponent: () => import('./components/ingresos-reporte/ingresos-reporte.component').then(m => m.IngresosReporteComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'doctores',
    loadComponent: () => import('./components/doctores-reporte/doctores-reporte.component').then(m => m.DoctoresReporteComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'servicios',
    loadComponent: () => import('./components/servicios-reporte/servicios-reporte.component').then(m => m.ServiciosReporteComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'morosidad',
    loadComponent: () => import('./components/morosidad-reporte/morosidad-reporte.component').then(m => m.MorosidadReporteComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'productividad',
    loadComponent: () => import('./components/productividad-reporte/productividad-reporte.component').then(m => m.ProductividadReporteComponent),
    canActivate: [AuthGuard]
  }
];