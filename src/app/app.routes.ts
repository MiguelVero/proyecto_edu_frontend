import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'ordenes',
    loadChildren: () => import('./features/ordenes/ordenes.routes').then(m => m.ordenesRoutes),
    canActivate: [AuthGuard]
  },
  {
    path: 'doctores',
    loadChildren: () => import('./features/doctores/doctores.routes').then(m => m.doctoresRoutes),
    canActivate: [AuthGuard]
  },
  {
    path: 'servicios',
    loadChildren: () => import('./features/servicios/servicios.routes').then(m => m.serviciosRoutes),
    canActivate: [AuthGuard]
  },
  {
    path: 'reportes',
    loadChildren: () => import('./features/reportes/reportes.routes').then(m => m.reportesRoutes),
    canActivate: [AuthGuard]
  },
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];