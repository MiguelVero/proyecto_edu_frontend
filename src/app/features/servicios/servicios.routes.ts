import { Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';

export const serviciosRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./servicios.component').then(m => m.ServiciosComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'nuevo',
    loadComponent: () => import('./components/servicio-form/servicio-form.component').then(m => m.ServicioFormComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'editar/:id',
    loadComponent: () => import('./components/servicio-form/servicio-form.component').then(m => m.ServicioFormComponent),
    canActivate: [AuthGuard]
  }
];