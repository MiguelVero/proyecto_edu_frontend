import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { ServicioService } from '../../../../core/services/servicio.service';
import { ImagenPipe } from '../../../../shared/pipes/imagen.pipe';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-servicio-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ImagenPipe],
  templateUrl: './servicio-form.component.html',
  styleUrls: ['./servicio-form.component.css']
})
export class ServicioFormComponent implements OnInit, OnDestroy {
  servicioForm: FormGroup;
  esEdicion = false;
  servicioId?: number;
  private subscriptions: Subscription[] = [];
  
  // Propiedades para manejo de imágenes
  imagenSeleccionada: File | null = null;
  previewUrl: string | null = null;
  imagenActual: string | null = null;

  constructor(
    private fb: FormBuilder,
    private servicioService: ServicioService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.servicioForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      precio_referencial: ['']
    });
  }

  ngOnInit() {
    this.subscriptions.push(
      this.route.params.subscribe(params => {
        if (params['id']) {
          this.esEdicion = true;
          this.servicioId = +params['id'];
          this.cargarServicio();
        }
      })
    );
  }

  cargarServicio() {
    if (this.servicioId) {
      this.subscriptions.push(
        this.servicioService.getServicio(this.servicioId).subscribe({
          next: (servicio) => {
            this.servicioForm.patchValue(servicio);
            this.imagenActual = servicio.imagen_url || null;
          },
          error: (error) => {
            console.error('Error cargando servicio:', error);
            Swal.fire('Error', 'No se pudo cargar el servicio', 'error');
          }
        })
      );
    }
  }

 // En servicio-form.component.ts, actualiza onFileSelected
onFileSelected(event: any) {
  const file = event.target.files[0];
  if (file) {
    // Validar tamaño (15MB)
    if (file.size > 15 * 1024 * 1024) {
      Swal.fire({
        icon: 'error',
        title: 'Imagen muy grande',
        text: 'La imagen no puede superar los 15MB',
        confirmButtonColor: '#f43f5e'
      });
      return;
    }
    
    // Validar tipo - incluir HEIC/HEIF
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/avif', 'image/webp', 'image/heic', 'image/heif'];
    if (!allowedTypes.includes(file.type)) {
      Swal.fire({
        icon: 'error',
        title: 'Formato no soportado',
        text: 'Formatos permitidos: JPG, PNG, GIF, AVIF, WEBP, HEIC',
        confirmButtonColor: '#f43f5e'
      });
      return;
    }

    this.imagenSeleccionada = file;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      this.previewUrl = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }
}

  removerImagen() {
    this.imagenSeleccionada = null;
    this.previewUrl = null;
    if (!this.esEdicion) {
      this.imagenActual = null;
    }
  }

  onSubmit() {
    if (this.servicioForm.valid) {
      const formData = new FormData();
      
      // Agregar campos del formulario
      formData.append('nombre', this.servicioForm.get('nombre')?.value);
      formData.append('descripcion', this.servicioForm.get('descripcion')?.value || '');
      
      const precio = this.servicioForm.get('precio_referencial')?.value;
      if (precio !== null && precio !== undefined && precio !== '') {
        formData.append('precio_referencial', precio.toString());
      }
      
      formData.append('categoria', this.servicioForm.get('categoria')?.value || '');

      // Agregar imagen si se seleccionó una nueva
      if (this.imagenSeleccionada) {
        formData.append('imagen', this.imagenSeleccionada);
      }

      if (this.esEdicion && this.servicioId) {
        this.subscriptions.push(
          this.servicioService.actualizarServicio(this.servicioId, formData).subscribe({
            next: () => {
              Swal.fire('¡Éxito!', 'Servicio actualizado correctamente', 'success');
              this.router.navigate(['/servicios']);
            },
            error: (error) => {
              console.error('Error:', error);
              if (error.error && error.error.error) {
                Swal.fire('Error', error.error.error, 'error');
              } else {
                Swal.fire('Error', 'No se pudo actualizar el servicio', 'error');
              }
            }
          })
        );
      } else {
        this.subscriptions.push(
          this.servicioService.crearServicio(formData).subscribe({
            next: () => {
              Swal.fire('¡Éxito!', 'Servicio creado correctamente', 'success');
              this.router.navigate(['/servicios']);
            },
            error: (error) => {
              console.error('Error:', error);
              if (error.error && error.error.error) {
                Swal.fire('Error', error.error.error, 'error');
              } else {
                Swal.fire('Error', 'No se pudo crear el servicio', 'error');
              }
            }
          })
        );
      }
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => {
      if (sub && typeof sub.unsubscribe === 'function') {
        sub.unsubscribe();
      }
    });
  }
}