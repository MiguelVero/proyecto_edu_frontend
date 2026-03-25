import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Servicio {
  id: number;
  nombre: string;
  precio_referencial?: number;
  imagen_url?: string;
  activo: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ServicioService {
  private apiUrl = `${environment.apiUrl}/servicios`;

  constructor(private http: HttpClient) {}

  getServicios(): Observable<Servicio[]> {
    return this.http.get<Servicio[]>(this.apiUrl);
  }

  getServicio(id: number): Observable<Servicio> {
    return this.http.get<Servicio>(`${this.apiUrl}/${id}`);
  }

  getCategorias(): Observable<any> {
    return this.http.get(`${this.apiUrl}/categorias`);
  }

  crearServicio(formData: FormData): Observable<any> {
    return this.http.post(this.apiUrl, formData);
  }

  actualizarServicio(id: number, formData: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, formData);
  }

  eliminarServicio(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}