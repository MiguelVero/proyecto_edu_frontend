import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { OrdenService } from '../../../../core/services/orden.service';
import { PagoService } from '../../../../core/services/pago.service';
import { TicketService } from '../../../../core/services/ticket.service';
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';
import { FechaPipe } from '../../../../shared/pipes/fecha.pipe';
import { HoraPipe } from '../../../../shared/pipes/hora.pipe';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import Swal from 'sweetalert2';
import { ImagenPipe } from '../../../../shared/pipes/imagen.pipe';
import { WhatsAppService } from '../../../../core/services/whatsapp.service';
import { ImageZoomComponent } from '../../../../shared/components/image-zoom/image-zoom.component';
import { ServicioService } from '../../../../core/services/servicio.service';

@Component({
  selector: 'app-orden-detalle',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    MonedaPipe, 
    FechaPipe, 
    LoadingSpinnerComponent, 
    ImagenPipe, 
    HoraPipe,
    ImageZoomComponent
  ],
  templateUrl: './orden-detalle.component.html',
  styleUrls: ['./orden-detalle.component.css'],
  providers: [MonedaPipe]
})
export class OrdenDetalleComponent implements OnInit, OnDestroy {
  orden: any;
  cargando = true;
  totalPagado = 0;
  saldo = 0;
  fechaServidorHoy: string = '';
  subiendoImagen = false;
  private subscriptions: Subscription[] = [];
  
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor(
    private route: ActivatedRoute,
    private ordenService: OrdenService,
    private pagoService: PagoService,
    private ticketService: TicketService,
    private monedaPipe: MonedaPipe,
    private whatsAppService: WhatsAppService,
    private servicioService: ServicioService
  ) {}

  ngOnInit() {
    // Primero obtener la fecha del servidor
    this.subscriptions.push(
      this.ordenService.getFechaServidor().subscribe({
        next: (fechaRespuesta) => {
          this.fechaServidorHoy = fechaRespuesta.fecha;
          console.log('📅 Detalle - Fecha del servidor:', this.fechaServidorHoy);
          this.cargarOrdenDesdeParams();
        },
        error: (error) => {
          console.error('Error obteniendo fecha del servidor:', error);
          const hoy = new Date();
          this.fechaServidorHoy = hoy.toISOString().split('T')[0];
          console.log('📅 Detalle - Usando fecha local:', this.fechaServidorHoy);
          this.cargarOrdenDesdeParams();
        }
      })
    );
  }

  private cargarOrdenDesdeParams() {
    this.subscriptions.push(
      this.route.params.subscribe(params => {
        if (params['id']) {
          this.cargarOrden(params['id']);
        }
      })
    );
  }

  cargarOrden(id: number) {
    this.cargando = true;
    this.subscriptions.push(
      this.ordenService.getOrden(id).subscribe({
        next: (data) => {
          this.orden = data;
          this.calcularPagos();
          this.cargando = false;
        },
        error: (error) => {
          console.error('Error cargando orden:', error);
          this.cargando = false;
          Swal.fire('Error', 'No se pudo cargar la orden', 'error');
        }
      })
    );
  }

  isVencida(): boolean {
    if (!this.orden?.fecha_limite || this.orden.estado === 'terminado') return false;
    const saldo = this.saldo;
    if (saldo <= 0) return false;
    const hoyStr = this.fechaServidorHoy;
    const limiteStr = this.orden.fecha_limite;
    if (!hoyStr) {
      const hoyLocal = new Date();
      const hoyLocalStr = hoyLocal.toISOString().split('T')[0];
      return limiteStr <= hoyLocalStr;
    }
    return limiteStr <= hoyStr;
  }

  calcularPagos() {
    if (this.orden?.pagos) {
      this.totalPagado = Number(this.orden.pagos.reduce((sum: number, p: any) => sum + Number(p.monto), 0)) || 0;
      this.saldo = Number(Number(this.orden.total) - this.totalPagado) || 0;
    }
  }

  // Método para abrir selector de archivos (con soporte para cámara y galería)
  abrirSelectorImagen() {
    if (!this.orden?.servicio?.id) {
      Swal.fire('Error', 'No se pudo identificar el servicio', 'error');
      return;
    }
    
    // Usar el input oculto en lugar de crear uno dinámico
    if (this.fileInput) {
      this.fileInput.nativeElement.click();
    }
  }

  // Método para cuando se selecciona un archivo
// Actualiza onImagenSeleccionada para usar el nuevo método
onImagenSeleccionada(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
        this.subirImagenReferencia(input.files[0]);
        input.value = '';
    }
}

  // Subir imagen del servicio
// Reemplaza el método subirImagenServicio por:
subirImagenReferencia(file: File) {
    if (file.size > 5 * 1024 * 1024) {
        Swal.fire('Error', 'La imagen no puede ser mayor a 5MB', 'error');
        return;
    }
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        Swal.fire('Error', 'Formato no soportado. Use JPG, PNG, GIF o WEBP', 'error');
        return;
    }

    this.subiendoImagen = true;

    const formData = new FormData();
    formData.append('imagen', file);

    this.subscriptions.push(
        this.ordenService.actualizarImagenReferencia(this.orden.id, formData).subscribe({
            next: (response) => {
                this.subiendoImagen = false;
                this.orden.imagen_referencia_url = response.imagen_url;
                
                Swal.fire({
                    icon: 'success',
                    title: '¡Imagen actualizada!',
                    text: 'La imagen de referencia para esta orden se ha actualizado correctamente',
                    timer: 2000,
                    showConfirmButton: false
                });
            },
            error: (error) => {
                this.subiendoImagen = false;
                console.error('Error subiendo imagen:', error);
                Swal.fire('Error', 'No se pudo subir la imagen. Intente nuevamente.', 'error');
            }
        })
    );
}

  // Métodos de acciones (mantener los existentes)
  enviarWhatsApp() {
    this.whatsAppService.enviarMensajePersonalizado({
      telefono: this.orden?.doctor?.telefono_whatsapp,
      nombre: this.orden?.doctor?.nombre,
      tipo: 'orden',
      datos: this.orden
    });
  }

  vistaPreviaTicket() {
    this.ticketService.abrirVistaPrevia(this.orden);
  }

  descargarTicket() {
    Swal.fire({
      title: 'Descargando ticket...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });
    
    this.ticketService.descargarTicketPDF(this.orden)
      .then(() => {
        Swal.fire({
          icon: 'success',
          title: '¡Descargado!',
          text: 'El PDF se ha guardado correctamente',
          timer: 1500,
          showConfirmButton: false
        });
      })
      .catch(error => {
        console.error(error);
        Swal.fire('Error', 'No se pudo descargar el ticket', 'error');
      });
  }

  agregarPago() {
    const saldoActual = this.saldo;
    
    if (saldoActual <= 0) {
      Swal.fire('Info', 'Esta orden ya está pagada', 'info');
      return;
    }

    Swal.fire({
      title: 'Registrar Pago',
      html: `
        <input type="number" id="monto" class="swal2-input" 
               placeholder="Monto (S/)" step="0.01" min="0.01" 
               max="${saldoActual}" value="${saldoActual.toFixed(2)}">
        <select id="metodo" class="swal2-select" style="width: 100%; margin-bottom: 10px;">
          <option value="efectivo">Efectivo</option>
          <option value="tarjeta">Tarjeta</option>
          <option value="transferencia">Transferencia</option>
          <option value="yape">Yape</option>
          <option value="plin">Plin</option>
        </select>
        <input type="text" id="referencia" class="swal2-input" placeholder="Referencia (opcional)">
        <div class="swal2-text" style="font-size:0.9rem; color:#64748b; margin-top:10px;">
          Saldo pendiente: ${this.monedaPipe.transform(saldoActual)}
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Registrar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const monto = (document.getElementById('monto') as HTMLInputElement).value;
        const metodo = (document.getElementById('metodo') as HTMLSelectElement).value;
        const referencia = (document.getElementById('referencia') as HTMLInputElement).value;
        
        if (!monto || monto.trim() === '') {
          Swal.showValidationMessage('Ingrese un monto');
          return false;
        }
        
        const montoNumerico = parseFloat(monto);
        
        if (isNaN(montoNumerico) || montoNumerico <= 0) {
          Swal.showValidationMessage('Ingrese un monto válido mayor a 0');
          return false;
        }
        
        if (montoNumerico > saldoActual) {
          Swal.showValidationMessage(`El monto no puede exceder el saldo pendiente (${this.monedaPipe.transform(saldoActual)})`);
          return false;
        }
        
        return { monto: montoNumerico, metodo_pago: metodo, referencia };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.subscriptions.push(
          this.pagoService.registrarPago({
            orden_id: this.orden.id,
            monto: result.value.monto,
            metodo_pago: result.value.metodo_pago,
            referencia: result.value.referencia
          }).subscribe({
            next: () => {
              Swal.fire({
                icon: 'success',
                title: '¡Éxito!',
                text: 'Pago registrado correctamente',
                timer: 1500,
                showConfirmButton: false
              });
              this.cargarOrden(this.orden.id);
            },
            error: (error) => {
              console.error('Error registrando pago:', error);
              if (error.error && error.error.error) {
                Swal.fire('Error', error.error.error, 'error');
              } else {
                Swal.fire('Error', 'No se pudo registrar el pago', 'error');
              }
            }
          })
        );
      }
    });
  }

  editarPago(pago: any) {
    const saldoActual = Number(this.saldo) + Number(pago.monto);

    Swal.fire({
      title: 'Editar Pago',
      html: `
        <input type="number" id="monto" class="swal2-input" 
               value="${pago.monto}" step="0.01" min="0.01" 
               max="${saldoActual}" placeholder="Monto (S/)">
        <select id="metodo" class="swal2-select" style="width: 100%; margin-bottom: 10px;">
          <option value="efectivo" ${pago.metodo_pago === 'efectivo' ? 'selected' : ''}>Efectivo</option>
          <option value="tarjeta" ${pago.metodo_pago === 'tarjeta' ? 'selected' : ''}>Tarjeta</option>
          <option value="transferencia" ${pago.metodo_pago === 'transferencia' ? 'selected' : ''}>Transferencia</option>
          <option value="yape" ${pago.metodo_pago === 'yape' ? 'selected' : ''}>Yape</option>
          <option value="plin" ${pago.metodo_pago === 'plin' ? 'selected' : ''}>Plin</option>
        </select>
        <input type="text" id="referencia" class="swal2-input" 
               value="${pago.referencia || ''}" placeholder="Referencia (opcional)">
        <div class="swal2-text" style="font-size:0.9rem; color:#64748b; margin-top:10px;">
          Monto máximo permitido: ${this.monedaPipe.transform(saldoActual)}
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Actualizar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const monto = (document.getElementById('monto') as HTMLInputElement).value;
        const metodo = (document.getElementById('metodo') as HTMLSelectElement).value;
        const referencia = (document.getElementById('referencia') as HTMLInputElement).value;
        
        if (!monto || monto.trim() === '') {
          Swal.showValidationMessage('Ingrese un monto');
          return false;
        }
        
        const montoNumerico = parseFloat(monto);
        
        if (isNaN(montoNumerico) || montoNumerico <= 0) {
          Swal.showValidationMessage('Ingrese un monto válido mayor a 0');
          return false;
        }
        
        if (montoNumerico > saldoActual) {
          Swal.showValidationMessage(`El monto no puede exceder el saldo actual (${this.monedaPipe.transform(saldoActual)})`);
          return false;
        }
        
        return { id: pago.id, monto: montoNumerico, metodo_pago: metodo, referencia };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.subscriptions.push(
          this.pagoService.actualizarPago(result.value.id, {
            monto: result.value.monto,
            metodo_pago: result.value.metodo_pago,
            referencia: result.value.referencia
          }).subscribe({
            next: () => {
              Swal.fire({
                icon: 'success',
                title: '¡Éxito!',
                text: 'Pago actualizado correctamente',
                timer: 1500,
                showConfirmButton: false
              });
              this.cargarOrden(this.orden.id);
            },
            error: (error) => {
              console.error('Error actualizando pago:', error);
              if (error.error && error.error.error) {
                Swal.fire('Error', error.error.error, 'error');
              } else {
                Swal.fire('Error', 'No se pudo actualizar el pago', 'error');
              }
            }
          })
        );
      }
    });
  }

  eliminarPago(pagoId: number) {
    Swal.fire({
      title: '¿Eliminar pago?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.subscriptions.push(
          this.pagoService.eliminarPago(pagoId).subscribe({
            next: () => {
              Swal.fire('¡Eliminado!', 'Pago eliminado correctamente', 'success');
              this.cargarOrden(this.orden.id);
            },
            error: (error) => {
              console.error('Error eliminando pago:', error);
              Swal.fire('Error', 'No se pudo eliminar el pago', 'error');
            }
          })
        );
      }
    });
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => {
      if (sub && typeof sub.unsubscribe === 'function') {
        sub.unsubscribe();
      }
    });
    console.log('🧹 OrdenDetalleComponent destruido');
  }
}