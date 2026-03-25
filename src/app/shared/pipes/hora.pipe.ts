// hora.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'hora',
  standalone: true
})
export class HoraPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    
    // Si viene en formato HH:MM:SS
    const match = value.match(/^(\d{2}):(\d{2})/);
    if (match) {
      const horas = parseInt(match[1]);
      const minutos = match[2];
      const ampm = horas >= 12 ? 'PM' : 'AM';
      const horas12 = horas % 12 || 12;
      return `${horas12}:${minutos} ${ampm}`;
    }
    
    return value;
  }
}