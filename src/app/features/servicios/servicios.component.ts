import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { ServicioService } from '../../core/services/servicio.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { MonedaPipe } from '../../shared/pipes/moneda.pipe';
import { ImagenPipe } from '../../shared/pipes/imagen.pipe';
import { ImageZoomComponent } from '../../shared/components/image-zoom/image-zoom.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-servicios',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LoadingSpinnerComponent,
    MonedaPipe,
    ImagenPipe,
    ImageZoomComponent
  ],
  templateUrl: './servicios.component.html',
  styleUrls: ['./servicios.component.css']
})
export class ServiciosComponent implements OnInit, OnDestroy {
  servicios: any[] = [];
  serviciosFiltrados: any[] = [];
  serviciosPaginados: any[] = [];
  busqueda: string = '';
  cargando = true;
  
  // Paginación
  paginaActual: number = 1;
  itemsPorPagina: number = 5;
  totalPaginas: number = 1;
  
  private subscriptions: Subscription[] = [];

  constructor(private servicioService: ServicioService) {}

  ngOnInit() {
    this.cargarServicios();
  }

  cargarServicios() {
    this.cargando = true;
    this.subscriptions.push(
      this.servicioService.getServicios().subscribe({
        next: (data) => {
          this.servicios = data;
          this.filtrarServicios();
          this.cargando = false;
        },
        error: (error) => {
          console.error('Error cargando servicios:', error);
          this.cargando = false;
          Swal.fire('Error', 'No se pudieron cargar los servicios', 'error');
        }
      })
    );
  }

  filtrarServicios() {
    if (!this.busqueda) {
      this.serviciosFiltrados = [...this.servicios];
    } else {
      const busquedaLower = this.busqueda.toLowerCase();
      this.serviciosFiltrados = this.servicios.filter(servicio =>
        servicio.nombre.toLowerCase().includes(busquedaLower)
      );
    }
    this.paginaActual = 1;
    this.actualizarPaginacion();
  }

  actualizarPaginacion() {
    this.totalPaginas = Math.ceil(this.serviciosFiltrados.length / this.itemsPorPagina);
    if (this.paginaActual > this.totalPaginas && this.totalPaginas > 0) {
      this.paginaActual = this.totalPaginas;
    } else if (this.totalPaginas === 0) {
      this.paginaActual = 1;
    }
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    this.serviciosPaginados = this.serviciosFiltrados.slice(inicio, fin);
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
    console.log('🧹 ServiciosComponent destruido');
  }

  eliminarServicio(servicio: any) {
    Swal.fire({
      title: '¿Eliminar servicio?',
      text: `¿Está seguro de eliminar el servicio ${servicio.nombre}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.subscriptions.push(
          this.servicioService.eliminarServicio(servicio.id).subscribe({
            next: () => {
              Swal.fire('¡Eliminado!', 'Servicio eliminado correctamente', 'success');
              this.cargarServicios();
            },
            error: (error) => {
              console.error('Error eliminando servicio:', error);
              Swal.fire('Error', 'No se pudo eliminar el servicio', 'error');
            }
          })
        );
      }
    });
  }
}