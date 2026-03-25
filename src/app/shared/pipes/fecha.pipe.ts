// fecha.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'fecha',
  standalone: true
})
export class FechaPipe implements PipeTransform {
 transform(value: string | Date, formato: string = 'dd/MM/yyyy'): string {
  if (!value) return '';
  
  // Detectar si es una fecha pura (YYYY-MM-DD) - como fecha_limite
  const esFechaPura = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  
  let fecha: Date;
  let usarUTC = false;
  
  if (esFechaPura) {
    // Para fechas puras, usar UTC para evitar desplazamiento
    const [year, month, day] = value.split('-').map(Number);
    fecha = new Date(Date.UTC(year, month - 1, day));
    usarUTC = true;
  } else {
    // Para fechas con hora, usar el constructor normal (respetará la zona horaria local)
    fecha = new Date(value);
    usarUTC = false;
  }
  
  // Verificar si la fecha es válida
  if (isNaN(fecha.getTime())) {
    return '';
  }
  
  // Función para obtener valores según si usamos UTC o local
  const getDia = () => usarUTC ? fecha.getUTCDate() : fecha.getDate();
  const getMes = () => usarUTC ? fecha.getUTCMonth() + 1 : fecha.getMonth() + 1;
  const getAño = () => usarUTC ? fecha.getUTCFullYear() : fecha.getFullYear();
  const getHoras = () => usarUTC ? fecha.getUTCHours() : fecha.getHours();
  const getMinutos = () => usarUTC ? fecha.getUTCMinutes() : fecha.getMinutes();
  
  const dia = getDia().toString().padStart(2, '0');
  const mes = getMes().toString().padStart(2, '0');
  const año = getAño();
  
  // Función para formatear hora en AM/PM
  const formatearHoraAMPM = (): string => {
    let horas = getHoras();
    const minutos = getMinutos().toString().padStart(2, '0');
    const ampm = horas >= 12 ? 'PM' : 'AM';
    horas = horas % 12;
    horas = horas ? horas : 12;
    return `${horas}:${minutos} ${ampm}`;
  };
  
  // Función para formatear hora en 24h
  const formatearHora24 = (): string => {
    const horas = getHoras().toString().padStart(2, '0');
    const minutos = getMinutos().toString().padStart(2, '0');
    return `${horas}:${minutos}`;
  };
  
  switch(formato) {
    case 'dd/MM/yyyy':
      return `${dia}/${mes}/${año}`;
    case 'yyyy-MM-dd':
      return `${año}-${mes}-${dia}`;
    case 'HH:mm':
      return formatearHora24();
    case 'h:mm a':
      return formatearHoraAMPM();
    case 'dd/MM/yyyy HH:mm':
      return `${dia}/${mes}/${año} ${formatearHora24()}`;
    case 'dd/MM/yyyy h:mm a':
      return `${dia}/${mes}/${año} ${formatearHoraAMPM()}`;
    default:
      return `${dia}/${mes}/${año}`;
  }
 }
}