import { Component, Input, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImagenPipe } from '../../pipes/imagen.pipe';

@Component({
  selector: 'app-image-zoom',
  standalone: true,
  imports: [CommonModule, ImagenPipe],
  template: `
    <div class="image-wrapper" (click)="openZoom()" [class.has-image]="src">
      <img [src]="src | imagen:defaultImage" 
           [alt]="alt"
           class="thumbnail-image"
           loading="lazy"
           (error)="onImageError()">
    </div>

    <!-- Modal para zoom -->
    <div class="zoom-modal" *ngIf="showZoom" (click)="closeZoom()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="image-container">
          <img [src]="src | imagen:defaultImage" 
               [alt]="alt"
               class="zoomed-image"
               (load)="onImageLoaded()"
               [class.portrait]="isPortrait">
        </div>
        <button class="close-button" (click)="closeZoom()">
          <i class="fas fa-times"></i>
        </button>
        <div class="image-caption" *ngIf="alt">
          {{ alt }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .image-wrapper {
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

    .thumbnail-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.2s;
    }

    .image-wrapper:hover .thumbnail-image {
      transform: scale(1.05);
    }

    /* Modal styles mejorados */
    .zoom-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.98);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
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
      animation: scaleIn 0.3s ease;
    }

    .image-container {
      width: 100%;
      height: calc(100vh - 120px);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .zoomed-image {
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    }

    .zoomed-image.portrait {
      max-height: 80vh;
      width: auto;
    }

    .close-button {
      position: absolute;
      top: 20px;
      right: 20px;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.15);
      border: 2px solid rgba(255, 255, 255, 0.5);
      color: white;
      font-size: 1.5rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      backdrop-filter: blur(8px);
      z-index: 10001;
    }

    .close-button:hover {
      background: rgba(255, 255, 255, 0.3);
      border-color: white;
      transform: scale(1.1);
    }

    .close-button:active {
      transform: scale(0.95);
    }

    .image-caption {
      margin-top: 16px;
      color: white;
      font-size: 1rem;
      text-align: center;
      padding: 8px 16px;
      background: rgba(0, 0, 0, 0.5);
      border-radius: 20px;
      max-width: 80%;
      text-shadow: 0 2px 4px rgba(0,0,0,0.5);
      backdrop-filter: blur(4px);
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes scaleIn {
      from { 
        opacity: 0;
        transform: scale(0.9);
      }
      to { 
        opacity: 1;
        transform: scale(1);
      }
    }

    /* Responsive para móvil */
    @media (max-width: 768px) {
      .close-button {
        top: 10px;
        right: 10px;
        width: 40px;
        height: 40px;
        font-size: 1.2rem;
        background: rgba(0, 0, 0, 0.7);
        border: 2px solid white;
      }

      .image-container {
        height: calc(100vh - 100px);
      }

      .image-caption {
        font-size: 0.9rem;
        padding: 6px 12px;
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
    this.showZoom = true;
    document.body.style.overflow = 'hidden';
  }

  closeZoom() {
    this.showZoom = false;
    document.body.style.overflow = '';
  }

  onImageLoaded() {
    // Detectar si la imagen es vertical para ajustar el estilo
    const img = document.querySelector('.zoomed-image') as HTMLImageElement;
    if (img) {
      this.isPortrait = img.naturalHeight > img.naturalWidth;
    }
  }

  onImageError() {
    console.log('Error cargando imagen:', this.src);
  }
}