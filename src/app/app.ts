import { Component, OnInit, HostListener, Renderer2, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from './core/services/auth.service';

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
export class AppComponent implements OnInit, OnDestroy {
  title = 'frontend';
  currentTheme: string = 'dark';
  menuOpen: boolean = false;
  private authSubscription?: Subscription;
  
  constructor(
    public authService: AuthService,
    private renderer: Renderer2,
    private router: Router
  ) {
    this.currentTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', this.currentTheme);
  }

  ngOnInit() {
    // Redirigir si el token es inválido después de la verificación
    this.authSubscription = this.authService.authLoading$.subscribe((loading) => {
      if (!loading && !this.authService.isAuthenticated() && this.router.url !== '/login') {
        this.router.navigate(['/login']);
      }
    });
  }

  ngOnDestroy() {
    this.authSubscription?.unsubscribe();
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

  closeMenuIfClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.menuOpen && window.innerWidth <= 768) {
      this.closeMenuIfClickOutside(event);
    }
  }

  get isDarkTheme(): boolean {
    return this.currentTheme === 'dark';
  }
}