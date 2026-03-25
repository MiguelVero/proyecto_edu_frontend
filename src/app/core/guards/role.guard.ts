import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(roles: string[]): boolean {
    // Obtener el usuario actual del BehaviorSubject
    const user = (this.authService as any).currentUserSubject.value;
    
    if (user && roles.includes(user.rol)) {
      return true;
    }

    this.router.navigate(['/dashboard']);
    return false;
  }
}