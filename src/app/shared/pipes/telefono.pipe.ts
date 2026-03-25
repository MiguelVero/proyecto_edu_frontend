// src/app/shared/pipes/telefono.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'telefono',
  standalone: true
})
export class TelefonoPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';
    // Limpiar solo números
    return value.replace(/\D/g, '');
  }
}