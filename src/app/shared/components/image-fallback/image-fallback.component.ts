import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-image-fallback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <img 
      [src]="src" 
      [alt]="alt"
      [class]="className"
      (error)="onError()"
      *ngIf="!error"
    >
    <div *ngIf="error" class="fallback-image" [class]="className">
      <i class="fas fa-user-doctor"></i>
    </div>
  `,
  styles: [`
    .fallback-image {
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--in, #f1f5f9);
      color: var(--mut, #64748b);
      font-size: 2rem;
      border-radius: 50%;
    }
    
    .doctor-logo.fallback-image {
      width: 70px;
      height: 70px;
    }
    
    .doctor-logo-large.fallback-image {
      width: 120px;
      height: 120px;
      font-size: 3rem;
    }
  `]
})
export class ImageFallbackComponent {
  @Input() src: string = '';
  @Input() alt: string = '';
  @Input() className: string = '';
  
  error = false;

  onError() {
    this.error = true;
  }
}