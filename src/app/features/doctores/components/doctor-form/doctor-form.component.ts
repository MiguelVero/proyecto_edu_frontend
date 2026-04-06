import { Component, OnInit, OnDestroy  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { DoctorService } from '../../../../core/services/doctor.service';
import Swal from 'sweetalert2';
import { ImagenPipe } from '../../../../shared/pipes/imagen.pipe';


@Component({
  selector: 'app-doctor-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ImagenPipe],
  templateUrl: './doctor-form.component.html',
  styleUrls: ['./doctor-form.component.css']
})
export class DoctorFormComponent implements OnInit, OnDestroy  {
  doctorForm: FormGroup;
  esEdicion = false;
  doctorId?: number;
  imagenPreview?: string;
  archivoSeleccionado?: File;
 private subscriptions: Subscription[] = [];
  constructor(
    private fb: FormBuilder,
    private doctorService: DoctorService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.doctorForm = this.fb.group({
      nombre: ['', Validators.required],
      telefono_whatsapp: [''],
      direccion: ['']
    });
  }

   ngOnInit() {
    this.subscriptions.push(
      this.route.params.subscribe(params => {
        if (params['id']) {
          this.esEdicion = true;
          this.doctorId = +params['id'];
          this.cargarDoctor();
        }
      })
    );
  }


    cargarDoctor() {
    if (this.doctorId) {
      this.subscriptions.push(
        this.doctorService.getDoctor(this.doctorId).subscribe({
          next: (doctor) => {
            this.doctorForm.patchValue(doctor);
            if (doctor.logo_url) {
              this.imagenPreview = doctor.logo_url;
            }
          },
          error: (error) => {
            console.error('Error cargando doctor:', error);
            Swal.fire('Error', 'No se pudo cargar el doctor', 'error');
          }
        })
      );
    }
  }

// En doctor-form.component.ts, actualiza la validación
onFileSelected(event: any) {
  this.archivoSeleccionado = event.target.files[0];
  if (this.archivoSeleccionado) {
    // Validar tamaño (15MB)
    if (this.archivoSeleccionado.size > 15 * 1024 * 1024) {
      Swal.fire({
        icon: 'error',
        title: 'Imagen muy grande',
        text: 'La imagen no puede superar los 15MB',
        confirmButtonColor: '#f43f5e'
      });
      this.archivoSeleccionado = undefined;
      return;
    }
    
    // Validar tipo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'image/heic', 'image/heif'];
    if (!allowedTypes.includes(this.archivoSeleccionado.type)) {
      Swal.fire({
        icon: 'error',
        title: 'Formato no soportado',
        text: 'Formatos permitidos: JPG, PNG, GIF, WEBP, AVIF, HEIC',
        confirmButtonColor: '#f43f5e'
      });
      this.archivoSeleccionado = undefined;
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => this.imagenPreview = e.target?.result as string;
    reader.readAsDataURL(this.archivoSeleccionado);
  }
}

   onSubmit() {
    if (this.doctorForm.valid) {
      const formData = new FormData();
      
      Object.keys(this.doctorForm.value).forEach(key => {
        formData.append(key, this.doctorForm.value[key]);
      });

      if (this.archivoSeleccionado) {
        formData.append('logo', this.archivoSeleccionado);
      }

      if (this.esEdicion && this.doctorId) {
        this.subscriptions.push(
          this.doctorService.actualizarDoctor(this.doctorId, formData).subscribe({
            next: () => {
              Swal.fire('¡Éxito!', 'Doctor actualizado correctamente', 'success');
              this.router.navigate(['/doctores']);
            },
            error: (error) => {
              console.error('Error actualizando doctor:', error);
              Swal.fire('Error', 'No se pudo actualizar el doctor', 'error');
            }
          })
        );
      } else {
        this.subscriptions.push(
          this.doctorService.crearDoctor(formData).subscribe({
            next: () => {
              Swal.fire('¡Éxito!', 'Doctor creado correctamente', 'success');
              this.router.navigate(['/doctores']);
            },
            error: (error) => {
              console.error('Error creando doctor:', error);
              Swal.fire('Error', 'No se pudo crear el doctor', 'error');
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
    console.log('🧹 DoctorFormComponent destruido');
  }
}