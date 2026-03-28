import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImagenPipe } from '../../pipes/imagen.pipe';

@Component({
  selector: 'app-image-zoom',
  standalone: true,
  imports: [CommonModule, ImagenPipe],
  template: `
    <div class="image-wrapper" (click)="openZoom()" [class.has-image]="src" [class.no-image]="!src">
      <img [src]="src | imagen:defaultImage" 
           [alt]="alt"
           class="thumbnail-image"
           loading="lazy"
           (error)="onImageError()">
      <div class="image-overlay" *ngIf="src">
        <i class="fas fa-search-plus"></i>
        <span>Ampliar</span>
      </div>
    </div>

    <!-- Modal para zoom - Mejorado para pantalla completa -->
    <div class="zoom-modal" *ngIf="showZoom" (click)="closeZoom()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <button class="close-button" (click)="closeZoom()">
          <i class="fas fa-times"></i>
        </button>
        <div class="image-container">
          <img [src]="src | imagen:defaultImage" 
               [alt]="alt"
               class="zoomed-image"
               (load)="onImageLoaded()"
               [class.portrait]="isPortrait">
        </div>
        <div class="image-caption" *ngIf="alt">
          {{ alt }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .image-wrapper {
      position: relative;
      width: 100%;
      height: 100%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--in, #f8fafc);
      border-radius: inherit;
      overflow: hidden;
    }

    .image-wrapper.has-image {
      background: transparent;
    }

    .image-wrapper.no-image {
      background: var(--in, #f1f5f9);
    }

    .thumbnail-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.3s ease;
    }

    .image-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      opacity: 0;
      transition: opacity 0.3s ease;
      color: white;
      font-size: 0.85rem;
    }

    .image-overlay i {
      font-size: 1.5rem;
    }

    .image-wrapper:hover .image-overlay {
      opacity: 1;
    }

    .image-wrapper:hover .thumbnail-image {
      transform: scale(1.05);
    }

    /* Modal styles - MEJORADO PARA PANTALLA COMPLETA */
    .zoom-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.95);
      z-index: 100000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.2s ease;
    }

    .modal-content {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .close-button {
      position: absolute;
      top: 20px;
      right: 20px;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      border: 2px solid rgba(255, 255, 255, 0.5);
      color: white;
      font-size: 1.5rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      backdrop-filter: blur(8px);
      z-index: 100001;
    }

    .close-button:hover {
      background: rgba(255, 255, 255, 0.4);
      border-color: white;
      transform: scale(1.1);
    }

    .close-button:active {
      transform: scale(0.95);
    }

    .image-container {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 60px 20px 80px 20px;
    }

    .zoomed-image {
      max-width: 95%;
      max-height: 90vh;
      width: auto;
      height: auto;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
      transition: transform 0.2s ease;
    }

    .zoomed-image.portrait {
      max-height: 85vh;
      width: auto;
    }

    .image-caption {
      position: absolute;
      bottom: 20px;
      left: 20px;
      right: 20px;
      color: white;
      font-size: 0.9rem;
      text-align: center;
      padding: 8px 16px;
      background: rgba(0, 0, 0, 0.6);
      border-radius: 20px;
      backdrop-filter: blur(8px);
      margin: 0 auto;
      width: fit-content;
      max-width: 90%;
      pointer-events: none;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* Responsive para móvil */
    @media (max-width: 768px) {
      .close-button {
        top: 15px;
        right: 15px;
        width: 44px;
        height: 44px;
        font-size: 1.2rem;
        background: rgba(0, 0, 0, 0.7);
        border: 2px solid white;
      }

      .image-container {
        padding: 70px 16px 70px 16px;
      }

      .zoomed-image {
        max-width: 100%;
        max-height: 85vh;
      }

      .zoomed-image.portrait {
        max-height: 80vh;
      }

      .image-caption {
        font-size: 0.8rem;
        bottom: 15px;
        padding: 6px 12px;
      }
      
      .image-overlay span {
        display: none;
      }
      
      .image-overlay i {
        font-size: 1.2rem;
      }
    }

    @media (max-width: 480px) {
      .close-button {
        top: 10px;
        right: 10px;
        width: 40px;
        height: 40px;
        font-size: 1rem;
      }

      .image-container {
        padding: 60px 12px 60px 12px;
      }

      .zoomed-image {
        max-height: 80vh;
      }
    }
  `]
})
export class ImageZoomComponent {
  @Input() src: string = '';
  @Input() alt: string = '';
  @Input() defaultImage: string = 'assets/images/default-image.png';
  
  showZoom = false;
  isPortrait = false;

  openZoom() {
    if (this.src) {
      this.showZoom = true;
      document.body.style.overflow = 'hidden';
    }
  }

  closeZoom() {
    this.showZoom = false;
    document.body.style.overflow = '';
  }

  onImageLoaded() {
    const img = document.querySelector('.zoomed-image') as HTMLImageElement;
    if (img) {
      this.isPortrait = img.naturalHeight > img.naturalWidth;
    }
  }

  onImageError() {
    console.log('Error cargando imagen:', this.src);
  }
}