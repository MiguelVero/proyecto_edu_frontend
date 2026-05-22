import { Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';

export const configuracionRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./configuracion.component').then(m => m.ConfiguracionComponent),
    canActivate: [AuthGuard]
  }
];
