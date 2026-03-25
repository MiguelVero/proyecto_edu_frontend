import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { DoctorService } from '../../core/services/doctor.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { ImagenPipe } from '../../shared/pipes/imagen.pipe';
import { TelefonoPipe } from '../../shared/pipes/telefono.pipe';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-doctores',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LoadingSpinnerComponent,
    ImagenPipe,
    TelefonoPipe
  ],
  templateUrl: './doctores.component.html',
  styleUrls: ['./doctores.component.css']
})
export class DoctoresComponent implements OnInit, OnDestroy {
  doctores: any[] = [];
  doctoresFiltrados: any[] = [];
  doctoresPaginados: any[] = [];
  busqueda: string = '';
  cargando = true;
  
  // Paginación
  paginaActual: number = 1;
  itemsPorPagina: number = 5;
  totalPaginas: number = 1;
  
  private subscriptions: Subscription[] = [];

  constructor(private doctorService: DoctorService) {}

  ngOnInit() {
    this.cargarDoctores();
  }

  cargarDoctores() {
    this.cargando = true;
    this.subscriptions.push(
      this.doctorService.getDoctores().subscribe({
        next: (data) => {
          this.doctores = data;
          this.filtrarDoctores();
          this.cargando = false;
        },
        error: (error) => {
          console.error('Error cargando doctores:', error);
          this.cargando = false;
          Swal.fire('Error', 'No se pudieron cargar los doctores', 'error');
        }
      })
    );
  }

  filtrarDoctores() {
    if (!this.busqueda) {
      this.doctoresFiltrados = [...this.doctores];
    } else {
      const busquedaLower = this.busqueda.toLowerCase();
      this.doctoresFiltrados = this.doctores.filter(doctor =>
        doctor.nombre.toLowerCase().includes(busquedaLower) ||
        (doctor.telefono_whatsapp && doctor.telefono_whatsapp.includes(busquedaLower))
      );
    }
    this.paginaActual = 1;
    this.actualizarPaginacion();
  }

  actualizarPaginacion() {
    this.totalPaginas = Math.ceil(this.doctoresFiltrados.length / this.itemsPorPagina);
    if (this.paginaActual > this.totalPaginas && this.totalPaginas > 0) {
      this.paginaActual = this.totalPaginas;
    } else if (this.totalPaginas === 0) {
      this.paginaActual = 1;
    }
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    this.doctoresPaginados = this.doctoresFiltrados.slice(inicio, fin);
  }

  cambiarPagina(pagina: number) {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
      this.actualizarPaginacion();
    }
  }

  anteriorPagina() {
    if (this.paginaActual > 1) {
      this.paginaActual--;
      this.actualizarPaginacion();
    }
  }

  siguientePagina() {
    if (this.paginaActual < this.totalPaginas) {
      this.paginaActual++;
      this.actualizarPaginacion();
    }
  }

  cambiarItemsPorPagina(cantidad: string | number) {
    this.itemsPorPagina = typeof cantidad === 'string' ? parseInt(cantidad, 10) : cantidad;
    this.paginaActual = 1;
    this.actualizarPaginacion();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => {
      if (sub && typeof sub.unsubscribe === 'function') {
        sub.unsubscribe();
      }
    });
    console.log('🧹 DoctoresComponent destruido');
  }

  eliminarDoctor(doctor: any) {
    Swal.fire({
      title: '¿Eliminar doctor?',
      text: `¿Está seguro de eliminar al doctor ${doctor.nombre}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.subscriptions.push(
          this.doctorService.eliminarDoctor(doctor.id).subscribe({
            next: () => {
              Swal.fire('¡Eliminado!', 'Doctor eliminado correctamente', 'success');
              this.cargarDoctores();
            },
            error: (error) => {
              console.error('Error eliminando doctor:', error);
              Swal.fire('Error', 'No se pudo eliminar el doctor', 'error');
            }
          })
        );
      }
    });
  }
}