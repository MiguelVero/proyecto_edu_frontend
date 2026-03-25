import { Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';

export const doctoresRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./doctores.component').then(m => m.DoctoresComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'nuevo',
    loadComponent: () => import('./components/doctor-form/doctor-form.component').then(m => m.DoctorFormComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'editar/:id',
    loadComponent: () => import('./components/doctor-form/doctor-form.component').then(m => m.DoctorFormComponent),
    canActivate: [AuthGuard]
  },
  {
    path: ':id',
    loadComponent: () => import('./components/doctor-detalle/doctor-detalle.component').then(m => m.DoctorDetalleComponent),
    canActivate: [AuthGuard]
  }
];



