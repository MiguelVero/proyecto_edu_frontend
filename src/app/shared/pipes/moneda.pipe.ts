import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'moneda',
  standalone: true
})
export class MonedaPipe implements PipeTransform {
  transform(value: any, simbolo: string = 'S/'): string {
    // Si es null o undefined
    if (value === null || value === undefined) {
      return `${simbolo} 0.00`;
    }
    
    // Si es un string, convertir a número
    if (typeof value === 'string') {
      const numStr = value.replace(/[^0-9.-]/g, '');
      const num = parseFloat(numStr);
      if (isNaN(num)) {
        return `${simbolo} 0.00`;
      }
      // Usar toFixed(2) y luego reemplazar para evitar problemas de redondeo
      return `${simbolo} ${num.toFixed(2)}`;
    }
    
    // Si es un número
    if (typeof value === 'number') {
      // Asegurar que el número se redondea correctamente a 2 decimales
      const rounded = Math.round(value * 100) / 100;
      return `${simbolo} ${rounded.toFixed(2)}`;
    }
    
    return `${simbolo} 0.00`;
  }
}