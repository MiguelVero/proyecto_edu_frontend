import { Component, OnInit, OnDestroy  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { DoctorService } from '../../../../core/services/doctor.service';
import { WhatsAppService } from '../../../../core/services/whatsapp.service'; // <-- IMPORTAR
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { ImagenPipe } from '../../../../shared/pipes/imagen.pipe';
import { FechaPipe } from 'src/app/shared/pipes/fecha.pipe';
import Swal from 'sweetalert2';
@Component({
  selector: 'app-doctor-detalle',
  standalone: true,
  imports: [CommonModule, RouterModule, MonedaPipe, LoadingSpinnerComponent, ImagenPipe, FechaPipe],
   templateUrl: './doctor-detalle.component.html',
  styleUrls: ['./doctor-detalle.component.css'],
   providers: [MonedaPipe] // <-- AGREGAR ESTO
})
export class DoctorDetalleComponent implements OnInit, OnDestroy  {
  doctor: any;
  resumen: any;
  cargando = true;
 private subscriptions: Subscription[] = [];
  constructor(
    private route: ActivatedRoute,
    private doctorService: DoctorService,
    private whatsAppService: WhatsAppService, // <-- INYECTAR
    private monedaPipe: MonedaPipe // <-- AGREGAR ESTO
  ) {}

    ngOnInit() {
    this.subscriptions.push(
      this.route.params.subscribe(params => {
        if (params['id']) {
          this.cargarDoctor(params['id']);
        }
      })
    );
  }

   cargarDoctor(id: number) {
    this.cargando = true;
    
    // Cargar datos del doctor
    this.subscriptions.push(
      this.doctorService.getDoctor(id).subscribe({
        next: (data) => {
          this.doctor = data;
          this.cargando = false;
        },
        error: (error) => {
          console.error('Error cargando doctor:', error);
          this.cargando = false;
          Swal.fire('Error', 'No se pudo cargar el doctor', 'error');
        }
      })
    );
     // Cargar resumen del doctor
    this.subscriptions.push(
      this.doctorService.getResumenDoctor(id).subscribe({
        next: (data) => {
          this.resumen = data;
        },
        error: (error) => {
          console.error('Error cargando resumen:', error);
        }
      })
    );
  }
enviarWhatsApp() {
    this.whatsAppService.enviarMensajePersonalizado({
      telefono: this.doctor?.telefono_whatsapp,
      nombre: this.doctor?.nombre,
      tipo: 'doctor',
      datos: this.doctor
    });
  }
   ngOnDestroy() {
    this.subscriptions.forEach(sub => {
      if (sub && typeof sub.unsubscribe === 'function') {
        sub.unsubscribe();
      }
    });
    console.log('🧹 DoctorDetalleComponent destruido');
  }

}