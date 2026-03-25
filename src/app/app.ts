import { Component, OnInit, HostListener, Renderer2 } from '@angular/core';
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
    private http: HttpClient,
    private renderer: Renderer2
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
      this.renderer.addClass(document.body, 'menu-open');
    } else {
      this.renderer.removeClass(document.body, 'menu-open');
    }
  }

  closeMenu() {
    if (this.menuOpen) {
      this.menuOpen = false;
      this.renderer.removeClass(document.body, 'menu-open');
    }
  }

  // Método para cerrar el menú si se hace clic fuera
  closeMenuIfClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    // Si el clic no fue en el menú ni en el botón hamburguesa
    if (!target.closest('.nav-menu') && !target.closest('.menu-toggle')) {
      this.closeMenu();
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    if (window.innerWidth > 768) {
      this.closeMenu();
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapePress() {
    this.closeMenu();
  }

  // HostListener para detectar clics en el documento
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    // Solo cerrar si el menú está abierto y estamos en móvil
    if (this.menuOpen && window.innerWidth <= 768) {
      this.closeMenuIfClickOutside(event);
    }
  }

  get isDarkTheme(): boolean {
    return this.currentTheme === 'dark';
  }
}