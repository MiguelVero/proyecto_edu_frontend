import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './core/services/auth.service';
import { environment } from '../environments/environment';

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
export class AppComponent implements OnInit {
  title = 'frontend';
  currentTheme: string = 'dark';
  menuOpen: boolean = false;
  
  constructor(
    public authService: AuthService,
    private http: HttpClient
  ) {
    this.currentTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', this.currentTheme);
  }

  ngOnInit() {
    if (this.authService.isAuthenticated()) {
      this.verificarToken();
    }
  }

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

 toggleMenu() {
  this.menuOpen = !this.menuOpen;
  if (this.menuOpen) {
    document.body.classList.add('menu-open');
  } else {
    document.body.classList.remove('menu-open');
  }
}


  closeMenu() {
  this.menuOpen = false;
  document.body.classList.remove('menu-open');
}

@HostListener('window:resize', ['$event'])
onResize() {
  if (window.innerWidth > 768) {
    this.menuOpen = false;
    document.body.classList.remove('menu-open');
  }
}

  get isDarkTheme(): boolean {
    return this.currentTheme === 'dark';
  }
}