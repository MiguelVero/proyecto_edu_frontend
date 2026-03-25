import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Pago {
  id: number;
  orden_id: number;
  monto: number;
  metodo_pago: string;
  referencia?: string;
  fecha_pago: string;
  observaciones?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PagoService {
  private apiUrl = `${environment.apiUrl}/pagos`;

  constructor(private http: HttpClient) {}

  registrarPago(pago: Partial<Pago>): Observable<any> {
    return this.http.post(this.apiUrl, pago);
  }

  getPagosPorOrden(ordenId: number): Observable<Pago[]> {
    return this.http.get<Pago[]>(`${this.apiUrl}/orden/${ordenId}`);
  }

  eliminarPago(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
  actualizarPago(id: number, pago: Partial<Pago>): Observable<any> {
  return this.http.put(`${this.apiUrl}/${id}`, pago);
}
}