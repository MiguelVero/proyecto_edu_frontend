// orden-form.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { OrdenService } from '../../../../core/services/orden.service';
import { DoctorService } from '../../../../core/services/doctor.service';
import { ServicioService } from '../../../../core/services/servicio.service';
import Swal from 'sweetalert2';
import { SearchableSelectComponent } from '../../../../shared/components/searchable-select/searchable-select.component';
import { ImagenPipe } from '../../../../shared/pipes/imagen.pipe';
import { HoraPipe } from 'src/app/shared/pipes/hora.pipe';

@Component({
  selector: 'app-orden-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, SearchableSelectComponent, ImagenPipe, HoraPipe],
  templateUrl: './orden-form.component.html',
  styleUrls: ['./orden-form.component.css']
})
export class OrdenFormComponent implements OnInit {
  ordenForm: FormGroup;
  doctores: any[] = [];
  servicios: any[] = [];
  esEdicion = false;
  ordenId?: number;

  constructor(
    private fb: FormBuilder,
    private ordenService: OrdenService,
    private doctorService: DoctorService,
    private servicioService: ServicioService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.ordenForm = this.fb.group({
      doctor_id: ['', Validators.required],
      servicio_id: ['', Validators.required],
      total: ['', [Validators.required, Validators.min(0)]],
      pago_inicial: [0, [Validators.min(0)]],
      prioridad: ['normal'],
      fecha_limite: [''],
      hora_limite: [''],
      cliente_nombre: ['']
    });
  }

  ngOnInit() {
    this.cargarDoctores();
    this.cargarServicios();

    this.route.params.subscribe(params => {
      if (params['id']) {
        this.esEdicion = true;
        this.ordenId = +params['id'];
        this.cargarOrden();
      }
    });
  }

  cargarDoctores() {
    this.doctorService.getDoctores().subscribe(data => {
      this.doctores = data;
    });
  }

  cargarServicios() {
    this.servicioService.getServicios().subscribe(data => {
      this.servicios = data;
    });
  }

  cargarOrden() {
    if (this.ordenId) {
      this.ordenService.getOrden(this.ordenId).subscribe(orden => {
        const totalPagado = orden.pagos?.reduce((sum, pago) => sum + Number(pago.monto), 0) || 0;
        
        // Formatear fecha_limite para el input date (YYYY-MM-DD)
        let fechaLimiteFormateada = '';
        if (orden.fecha_limite) {
          const fecha = new Date(orden.fecha_limite);
          fechaLimiteFormateada = this.formatearFechaParaInput(fecha);
        }
        
        this.ordenForm.patchValue({
          doctor_id: orden.doctor_id,
          servicio_id: orden.servicio_id,
          total: orden.total,
          pago_inicial: totalPagado,
          prioridad: orden.prioridad,
          fecha_limite: fechaLimiteFormateada,
          hora_limite: orden.hora_limite,
          cliente_nombre: orden.cliente_nombre
        });
      });
    }
  }

  /**
   * Formatea una fecha para el input type="date"
   * Recibe un objeto Date y devuelve YYYY-MM-DD
   */
  private formatearFechaParaInput(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Formatea una fecha para enviar al backend (YYYY-MM-DD)
   */
  private formatearFechaParaBackend(fecha: string): string {
    if (!fecha) return '';
    // Si ya viene en formato YYYY-MM-DD, devolverlo directamente
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return fecha;
    }
    // Si es otro formato, convertirlo
    const date = new Date(fecha);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  onSubmit() {
    if (this.ordenForm.valid) {
      const formValue = { ...this.ordenForm.value };
      
      // 🔥 IMPORTANTE: Formatear fecha_limite para el backend
      if (formValue.fecha_limite) {
        formValue.fecha_limite = this.formatearFechaParaBackend(formValue.fecha_limite);
      } else {
        formValue.fecha_limite = null;
        formValue.hora_limite = null;
      }
      
      // Asegurar que pago_inicial es un número
      if (formValue.pago_inicial === '' || formValue.pago_inicial === null) {
        formValue.pago_inicial = 0;
      }
      
      if (this.esEdicion && this.ordenId) {
        this.ordenService.actualizarOrden(this.ordenId, formValue).subscribe({
          next: () => {
            Swal.fire('¡Éxito!', 'Orden actualizada correctamente', 'success');
            this.router.navigate(['/ordenes']);
          },
          error: (error) => {
            console.error('Error actualizando orden:', error);
            Swal.fire('Error', 'No se pudo actualizar la orden', 'error');
          }
        });
      } else {
        this.ordenService.crearOrden(formValue).subscribe({
          next: () => {
            Swal.fire('¡Éxito!', 'Orden creada correctamente', 'success');
            this.router.navigate(['/ordenes']);
          },
          error: (error) => {
            console.error('Error creando orden:', error);
            Swal.fire('Error', 'No se pudo crear la orden', 'error');
          }
        });
      }
    } else {
      // Mostrar errores de validación
      Object.keys(this.ordenForm.controls).forEach(key => {
        const control = this.ordenForm.get(key);
        if (control?.invalid) {
          console.log(`Campo inválido: ${key}`, control.errors);
        }
      });
      Swal.fire('Error', 'Por favor complete todos los campos requeridos', 'error');
    }
  }
}