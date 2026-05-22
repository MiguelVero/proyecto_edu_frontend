// orden-form.component.ts
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { OrdenService } from '../../../../core/services/orden.service';
import { DoctorService } from '../../../../core/services/doctor.service';
import { ServicioService } from '../../../../core/services/servicio.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ConfigService } from '../../../../core/services/config.service';
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

  // Propiedades para manejo de imágenes
  imagenSeleccionada: File | null = null;
  previewUrl: string | null = null;
  subiendoImagen = false;
   @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  constructor(
    private fb: FormBuilder,
    private ordenService: OrdenService,
    private doctorService: DoctorService,
    private servicioService: ServicioService,
    private route: ActivatedRoute,
    private router: Router,
    private notificationService: NotificationService,
    private configService: ConfigService
  ) {
    this.ordenForm = this.fb.group({
      doctor_id: ['', Validators.required],
      servicio_id: ['', Validators.required],
      total: ['', [Validators.required, Validators.min(0)]],
      pago_inicial: [0, [Validators.min(0)]],
      prioridad: ['normal'],
      fecha_limite: [''],
      hora_limite: [''],
      cliente_nombre: [''],
       detalle_cliente: [''],  // <-- NUEVO CAMPO
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
          cliente_nombre: orden.cliente_nombre,
           detalle_cliente: orden.detalle_cliente  // <-- NUEVO
        });

  // Si la orden tiene imagen de referencia, mostrarla
        if (orden.imagen_referencia_url) {
          this.previewUrl = orden.imagen_referencia_url;
        }

      });
    }
  }

// Reemplaza el método onFileSelected con esta versión
onFileSelected(event: any) {
  const file = event.target.files[0];
  if (file) {
    // Mostrar información del archivo para depuración
    console.log('📁 Archivo seleccionado:', {
      nombre: file.name,
      tamaño: (file.size / 1024 / 1024).toFixed(2) + ' MB',
      tipo: file.type
    });
    
    // Validar tamaño - Aumentado a 10MB (10000 * 1024 = 10,485,760 bytes)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      Swal.fire({
        icon: 'error',
        title: 'Imagen muy grande',
        text: `La imagen no puede superar los 10MB. Actualmente pesa ${(file.size / 1024 / 1024).toFixed(2)}MB. Por favor, comprime la imagen o usa una más pequeña.`,
        confirmButtonColor: '#f43f5e'
      });
      // Limpiar el input
      this.fileInput.nativeElement.value = '';
      return;
    }
    
    // Validar tipo - formatos comunes de móvil
    const allowedTypes = [
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'image/gif', 
      'image/webp',
      'image/avif',
      'image/heic',  // Formato de iPhone
      'image/heif'   // Formato de iPhone
    ];
    
    // También validar por extensión
    const extension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'heic', 'heif'];
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(extension || '')) {
      Swal.fire({
        icon: 'error',
        title: 'Formato no soportado',
        text: 'Formatos permitidos: JPG, JPEG, PNG, GIF, WEBP, AVIF, HEIC',
        confirmButtonColor: '#f43f5e'
      });
      // Limpiar el input
      this.fileInput.nativeElement.value = '';
      return;
    }

    this.imagenSeleccionada = file;
    
    // Crear preview
    const reader = new FileReader();
    reader.onload = (e) => {
      this.previewUrl = e.target?.result as string;
    };
    reader.onloadend = () => {
      console.log('✅ Preview de imagen creado');
    };
    reader.onerror = (error) => {
      console.error('❌ Error leyendo archivo:', error);
      Swal.fire('Error', 'No se pudo leer la imagen', 'error');
    };
    reader.readAsDataURL(file);
  }
}

  removerImagen() {
    this.imagenSeleccionada = null;
    this.previewUrl = null;
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
        // Actualizar orden (incluyendo imagen si se seleccionó)
        const updateData = { ...formValue };
        
        if (this.imagenSeleccionada) {
          const formData = new FormData();
          Object.keys(updateData).forEach(key => {
            if (updateData[key] !== null && updateData[key] !== undefined) {
              formData.append(key, updateData[key]);
            }
          });
          formData.append('imagen_referencia', this.imagenSeleccionada);
          
          this.ordenService.actualizarOrdenConImagen(this.ordenId, formData).subscribe({
            next: (ordenActualizada: any) => {
              this.subiendoImagen = false;
              this.programarNotificacionSiCorresponde(ordenActualizada || { ...formValue, id: this.ordenId });
              Swal.fire('¡Éxito!', 'Orden actualizada correctamente', 'success');
              this.router.navigate(['/ordenes']);
            },
            error: (error: any) => {
              this.subiendoImagen = false;
              console.error('Error actualizando orden:', error);
              Swal.fire('Error', 'No se pudo actualizar la orden', 'error');
            }
          });
        } else {
          this.ordenService.actualizarOrden(this.ordenId, updateData).subscribe({
            next: (ordenActualizada: any) => {
              this.subiendoImagen = false;
              this.programarNotificacionSiCorresponde(ordenActualizada || { ...formValue, id: this.ordenId });
              Swal.fire('¡Éxito!', 'Orden actualizada correctamente', 'success');
              this.router.navigate(['/ordenes']);
            },
            error: (error: any) => {
              this.subiendoImagen = false;
              console.error('Error actualizando orden:', error);
              Swal.fire('Error', 'No se pudo actualizar la orden', 'error');
            }
          });
        }
      } else {
        // Crear nueva orden con imagen
        const formData = new FormData();
        Object.keys(formValue).forEach(key => {
          if (formValue[key] !== null && formValue[key] !== undefined && formValue[key] !== '') {
            formData.append(key, formValue[key]);
          }
        });
        
        if (this.imagenSeleccionada) {
          formData.append('imagen_referencia', this.imagenSeleccionada);
        }
        
        this.ordenService.crearOrdenConImagen(formData).subscribe({
          next: (ordenCreada: any) => {
            this.subiendoImagen = false;
            this.programarNotificacionSiCorresponde(ordenCreada || formValue);
            Swal.fire('¡Éxito!', 'Orden creada correctamente', 'success');
            this.router.navigate(['/ordenes']);
          },
          error: (error: any) => {
            this.subiendoImagen = false;
            console.error('Error creando orden:', error);
            Swal.fire('Error', 'No se pudo crear la orden', 'error');
          }
        });
      }
    } else {
      Object.keys(this.ordenForm.controls).forEach(key => {
        const control = this.ordenForm.get(key);
        if (control?.invalid) {
          console.log(`Campo inválido: ${key}`, control.errors);
        }
      });
      Swal.fire('Error', 'Por favor complete todos los campos requeridos', 'error');
    }
  }

  /**
   * Programa notificaciones para la orden si tiene fecha/hora límite.
   * - A la hora exacta de vencimiento
   * - Con la anticipación configurada en Configuración (ej: 30 min, 1 h)
   * Muestra un toast informativo con el resultado.
   */
  private programarNotificacionSiCorresponde(orden: any): void {
    if (!orden?.fecha_limite) return;

    // Solicitar permiso si aún no se tiene
    this.notificationService.solicitarPermiso().then(tienePermiso => {
      if (!tienePermiso) {
        console.warn('⚠️ Sin permiso para notificaciones — no se programará alerta');
        Swal.fire({
          icon: 'warning',
          title: 'Notificaciones bloqueadas',
          html: `Para recibir alertas en tu celular, permite las notificaciones en la configuración del navegador.<br><small style="color:#64748b">Configuración → Privacidad → Notificaciones</small>`,
          confirmButtonColor: '#6366f1',
          confirmButtonText: 'Entendido',
          toast: false
        });
        return;
      }

      const resultado = this.notificationService.programarNotificacionOrden({
        id: orden.id ?? orden.id_externo ?? 'nueva',
        id_externo: orden.id_externo ?? `#${orden.id}`,
        fecha_limite: orden.fecha_limite,
        hora_limite: orden.hora_limite,
        doctor: orden.doctor,
        servicio: orden.servicio,
        cliente_nombre: orden.cliente_nombre
      });

      if (resultado.programadas > 0) {
        console.log(`🔔 ${resultado.mensaje}`);

        // Obtener anticipación configurada para mostrar en el toast
        const minutos = this.configService.config.tiempoNotificacionAnticipada;
        const anticipacionTexto = minutos < 60
          ? `${minutos} min`
          : `${Math.floor(minutos / 60)} h`;

        // Toast no bloqueante
        const Toast = Swal.mixin({
          toast: true,
          position: 'bottom-end',
          showConfirmButton: false,
          timer: 5000,
          timerProgressBar: true,
          didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer);
            toast.addEventListener('mouseleave', Swal.resumeTimer);
          }
        });
        Toast.fire({
          icon: 'success',
          title: '🔔 Notificaciones programadas',
          html: resultado.programadas === 2
            ? `A la hora exacta y <strong>${anticipacionTexto} antes</strong>`
            : resultado.mensaje
        });
      }
    });
  }
}
