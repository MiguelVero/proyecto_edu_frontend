import { Component, OnInit } from '@angular/core'; // <-- Agregar OnInit
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient } from '@angular/common/http'; // <-- Agregar HttpClient
import { AuthService } from './core/services/auth.service';
import { environment } from './environments/environment'; // <-- Agregar environment

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent implements OnInit { // <-- Agregar OnInit
  title = 'frontend';
  currentTheme: string = 'dark';
  
  constructor(
    public authService: AuthService,
    private http: HttpClient // <-- Agregar HttpClient
  ) {
    this.currentTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', this.currentTheme);
  }

  // ✅ NUEVO: Verificar token al iniciar
  ngOnInit() {
    if (this.authService.isAuthenticated()) {
      this.verificarToken();
    }
  }

  // ✅ NUEVO: Método para verificar token
  verificarToken() {
    this.http.get(`${environment.apiUrl}/auth/verificar`).subscribe({
      next: (response: any) => {
        console.log('✅ Token válido');
        console.log('👤 Usuario:', response.usuario);
      },
      error: (error) => {
        console.error('❌ Token inválido o expirado');
        this.authService.logout();
      }
    });
  }

  toggleTheme() {
    this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', this.currentTheme);
    localStorage.setItem('theme', this.currentTheme);
  }

  get isDarkTheme(): boolean {
    return this.currentTheme === 'dark';
  }
}