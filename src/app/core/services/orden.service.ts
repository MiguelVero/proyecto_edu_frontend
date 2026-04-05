import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { retry, timeout, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Orden {
  id: number;
  id_externo: string;
  doctor_id: number;
  servicio_id: number;
  total: number;
  estado: 'pendiente'  | 'terminado';
  prioridad: 'normal' | 'urgente' | 'emergencia';
  fecha_inicio?: string;
  hora_inicio?: string;
  fecha_limite?: string;
  hora_limite?: string;
  cliente_nombre?: string;
  imagen_referencia_url?: string;
  doctor?: any;
  servicio?: any;
  pagos?: Array<{
    id: number;
    monto: number;
    metodo_pago: string;
    fecha_pago?: string;
    creado_en?: string;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class OrdenService {
  private apiUrl = `${environment.apiUrl}/ordenes`;

  constructor(private http: HttpClient) {}

  // Obtener todas las órdenes
  getOrdenes(): Observable<Orden[]> {
    return this.http.get<Orden[]>(this.apiUrl).pipe(
      timeout(10000), // 10 segundos de timeout
      retry(2), // Reintentar 2 veces si falla
      catchError(error => {
        console.error('Error en getOrdenes:', error);
        return throwError(() => error);
      })
    );
  }

  // Obtener una orden por ID
  getOrden(id: number): Observable<Orden> {
    return this.http.get<Orden>(`${this.apiUrl}/${id}`).pipe(
      timeout(10000),
      retry(2),
      catchError(error => {
        console.error(`Error en getOrden(${id}):`, error);
        return throwError(() => error);
      })
    );
  }

  // Obtener estadísticas
  getEstadisticas(): Observable<any> {
    return this.http.get(`${this.apiUrl}/estadisticas`).pipe(
      timeout(10000),
      retry(2),
      catchError(error => {
        console.error('Error en getEstadisticas:', error);
        return throwError(() => error);
      })
    );
  }

  // Crear nueva orden
  crearOrden(orden: Partial<Orden>): Observable<any> {
    return this.http.post(this.apiUrl, orden).pipe(
      timeout(10000),
      catchError(error => {
        console.error('Error en crearOrden:', error);
        return throwError(() => error);
      })
    );
  }

  // Actualizar orden
  actualizarOrden(id: number, orden: Partial<Orden>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, orden).pipe(
      timeout(10000),
      catchError(error => {
        console.error(`Error en actualizarOrden(${id}):`, error);
        return throwError(() => error);
      })
    );
  }

  // Eliminar orden (soft delete)
  eliminarOrden(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      timeout(10000),
      catchError(error => {
        console.error(`Error en eliminarOrden(${id}):`, error);
        return throwError(() => error);
      })
    );
  }
  getFechaServidor(): Observable<{ fecha: string }> {
  return this.http.get<{ fecha: string }>(`${this.apiUrl}/server-time`); // Necesitas crear este endpoint en el backend
}
// Agregar este método a OrdenService
actualizarImagenReferencia(id: number, formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/imagen-referencia`, formData).pipe(
        timeout(10000),
        catchError(error => {
            console.error(`Error en actualizarImagenReferencia(${id}):`, error);
            return throwError(() => error);
        })
    );
}
crearOrdenConImagen(formData: FormData): Observable<any> {
    return this.http.post(this.apiUrl, formData).pipe(
        timeout(10000),
        catchError(error => {
            console.error('Error en crearOrdenConImagen:', error);
            return throwError(() => error);
        })
    );
}

actualizarOrdenConImagen(id: number, formData: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, formData).pipe(
        timeout(10000),
        catchError(error => {
            console.error(`Error en actualizarOrdenConImagen(${id}):`, error);
            return throwError(() => error);
        })
    );
}
}