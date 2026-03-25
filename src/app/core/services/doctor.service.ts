import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Doctor {
  id: number;
  nombre: string;
  telefono_whatsapp?: string;
  logo_url?: string;
  direccion?: string;
  activo: boolean;
  
}

@Injectable({
  providedIn: 'root'
})
export class DoctorService {
  private apiUrl = `${environment.apiUrl}/doctores`;

  constructor(private http: HttpClient) {}

  getDoctores(): Observable<Doctor[]> {
    return this.http.get<Doctor[]>(this.apiUrl);
  }

  getDoctor(id: number): Observable<Doctor> {
    return this.http.get<Doctor>(`${this.apiUrl}/${id}`);
  }

  getResumenDoctor(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}/resumen`);
  }

  crearDoctor(doctor: FormData): Observable<any> {
    return this.http.post(this.apiUrl, doctor);
  }

  actualizarDoctor(id: number, doctor: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, doctor);
  }

  eliminarDoctor(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}