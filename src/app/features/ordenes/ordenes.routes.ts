import { Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';

export const ordenesRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./ordenes.component').then(m => m.OrdenesComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'nueva',
    loadComponent: () => import('./components/orden-form/orden-form.component').then(m => m.OrdenFormComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'editar/:id',
    loadComponent: () => import('./components/orden-form/orden-form.component').then(m => m.OrdenFormComponent),
    canActivate: [AuthGuard]
  },
  {
    path: ':id',
    loadComponent: () => import('./components/orden-detalle/orden-detalle.component').then(m => m.OrdenDetalleComponent),
    canActivate: [AuthGuard]
  }
];