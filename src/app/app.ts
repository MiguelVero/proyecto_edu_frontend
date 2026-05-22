import { Component, OnInit, HostListener, Renderer2, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { SessionService } from './core/services/session.service';
import { NotificationService } from './core/services/notification.service';
import { SessionTimeoutComponent } from './shared/components/session-timeout/session-timeout.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    SessionTimeoutComponent
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'frontend';
  currentTheme: string = 'dark';
  menuOpen: boolean = false;
  private authSubscription?: Subscription;
  private originalOverflow: string = '';
  
  constructor(
    public authService: AuthService,
    private renderer: Renderer2,
    private router: Router,
    private sessionService: SessionService,
    private notificationService: NotificationService
  ) {
    this.currentTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', this.currentTheme);
  }

  ngOnInit() {
    // Registrar Service Worker al iniciar la app (independiente de la autenticación)
    this.registrarServiceWorker();

    // Redirigir si el token es inválido después de la verificación
    this.authSubscription = this.authService.authLoading$.subscribe((loading) => {
      if (!loading) {
        if (this.authService.isAuthenticated()) {
          // Usuario autenticado → iniciar monitoreo de sesión y solicitar permisos
          this.sessionService.iniciar();
          this.notificationService.solicitarPermiso();
        } else if (this.router.url !== '/login') {
          this.sessionService.detener();
          this.router.navigate(['/login']);
        }
      }
    });
  }

  /**
   * Registra el Service Worker para notificaciones push en celular.
   * Se ejecuta al iniciar la app, antes de la autenticación.
   */
  private async registrarServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) return;
    try {
      const existing = await navigator.serviceWorker.getRegistration('/');
      if (!existing) {
        await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
        console.log('✅ Service Worker registrado desde AppComponent');
      }
    } catch (error) {
      console.warn('⚠️ Error registrando Service Worker:', error);
    }
  }

  ngOnDestroy() {
    this.authSubscription?.unsubscribe();
    this.sessionService.detener();
    // Asegurarse de restaurar el scroll si el componente se destruye con el menú abierto
    if (this.menuOpen) {
      this.restoreBodyScroll();
    }
  }

  toggleTheme() {
    this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', this.currentTheme);
    localStorage.setItem('theme', this.currentTheme);
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
    if (this.menuOpen) {
      this.disableBodyScroll();
      this.renderer.addClass(document.body, 'menu-open');
    } else {
      this.restoreBodyScroll();
      this.renderer.removeClass(document.body, 'menu-open');
    }
  }

  closeMenu() {
    if (this.menuOpen) {
      this.menuOpen = false;
      this.restoreBodyScroll();
      this.renderer.removeClass(document.body, 'menu-open');
    }
  }
  
  private disableBodyScroll() {
    this.originalOverflow = document.body.style.overflow;
    this.renderer.setStyle(document.body, 'overflow', 'hidden');
    // Guardar la posición del scroll
    const scrollY = window.scrollY;
    this.renderer.setStyle(document.body, 'position', 'fixed');
    this.renderer.setStyle(document.body, 'top', `-${scrollY}px`);
    this.renderer.setStyle(document.body, 'width', '100%');
  }
  
  private restoreBodyScroll() {
    const scrollY = document.body.style.top;
    this.renderer.setStyle(document.body, 'overflow', this.originalOverflow);
    this.renderer.setStyle(document.body, 'position', '');
    this.renderer.setStyle(document.body, 'top', '');
    this.renderer.setStyle(document.body, 'width', '');
    if (scrollY) {
      window.scrollTo(0, parseInt(scrollY || '0', 10) * -1);
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
    if (window.innerWidth > 768 && this.menuOpen) {
      this.closeMenu();
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapePress() {
    if (this.menuOpen) {
      this.closeMenu();
    }
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