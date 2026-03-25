import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../../environments/environment';

@Pipe({
  name: 'imagen',
  standalone: true
})
export class ImagenPipe implements PipeTransform {
  transform(value: string, defaultImage: string = 'assets/images/default-doctor.png'): string {
    if (!value) {
      return defaultImage;
    }
    
    // Si ya es una URL completa, devolverla
    if (value.startsWith('http')) {
      return value;
    }
    
    // Si es data URL (base64), devolverla
    if (value.startsWith('data:')) {
      return value;
    }
    
    // Construir URL completa al backend
    const baseUrl = environment.apiUrl.replace('/api', '');
    const fullUrl = `${baseUrl}${value}`;
    
    // Log para debug (solo en desarrollo)
    if (!environment.production) {
      console.log('🖼️ Imagen pipe:', { original: value, fullUrl });
    }
    
    return fullUrl;
  }
}