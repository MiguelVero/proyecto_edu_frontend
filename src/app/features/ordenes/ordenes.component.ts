import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { OrdenService } from '../../core/services/orden.service';
import { AuthService } from '../../core/services/auth.service';
import { PagoService } from '../../core/services/pago.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { MonedaPipe } from '../../shared/pipes/moneda.pipe';
import { FechaPipe } from '../../shared/pipes/fecha.pipe';
import { HoraPipe } from 'src/app/shared/pipes/hora.pipe';
import { ImageZoomComponent } from '../../shared/components/image-zoom/image-zoom.component'; // <-- IMPORTAR
import Swal from 'sweetalert2';
import { ImagenPipe } from '../../shared/pipes/imagen.pipe';
import { SearchableSelectComponent } from '../../shared/components/searchable-select/searchable-select.component';
import { TicketService } from '../../core/services/ticket.service';
import { WhatsAppService } from '../../core/services/whatsapp.service';
import { saveAs } from 'file-saver';
import { HttpClient } from '@angular/common/http'; // <-- AGREGAR ESTO
@Component({
  selector: 'app-ordenes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LoadingSpinnerComponent,
    MonedaPipe,
    FechaPipe,
    HoraPipe,
    ImagenPipe,
    SearchableSelectComponent,
     ImageZoomComponent
  ],
  templateUrl: './ordenes.component.html',
  styleUrls: ['./ordenes.component.css'],
  providers: [MonedaPipe] // <-- AGREGAR ESTO
})
export class OrdenesComponent implements OnInit, OnDestroy {
   private subscriptions: Subscription[] = [];
  ordenes: any[] = [];
  ordenesFiltradas: any[] = [];
  // Agregar estas propiedades
doctoresCompleto: any[] = [];
serviciosCompleto: any[] = [];
paginaActual: number = 1;
itemsPorPagina: number = 5;
totalPaginas: number = 1;
ordenesPaginadas: any[] = [];
fechaServidorHoy: string = '';
    // Filtros avanzados
  filtros = {
    busquedaGlobal: '',
    doctor: '',
    servicio: '',
    estado: '',
    prioridad: '',
    cliente: '',
    fechaInicio: '',
    fechaFin: '',
    saldoMin: null as number | null,
    saldoMax: null as number | null,
    vencidas: false as boolean,
     ocultarTerminadas: true as boolean  // <-- AGREGAR ESTA LÍNEA
  };

  // Para los selects de filtros
  doctoresUnicos: string[] = [];
  serviciosUnicos: string[] = [];
  mostrarFiltrosAvanzados = false;
  
  cargando = true;

 // Clave para localStorage
  private readonly FILTROS_STORAGE_KEY = 'ordenes_filtros';
  private readonly FILTROS_VISIBLES_KEY = 'ordenes_filtros_visibles';



// AGREGAR ESTE GETTER (después de las propiedades)
get ordenesActivas(): any[] {
  return this.ordenes.filter(orden => {
    const saldo = this.calcularSaldo(orden);
    return orden.estado === 'pendiente' && saldo > 0;
  });
}


 // Agregar en el constructor:
constructor(
  private ordenService: OrdenService,
  private pagoService: PagoService,  // Agregar esta línea
  private authService: AuthService,
  private monedaPipe: MonedaPipe, // <-- AGREGAR ESTO
  private ticketService: TicketService,
  private whatsAppService: WhatsAppService, // <-- AGREGAR ESTO
   private http: HttpClient  // <-- AGREGAR ESTO
) {}



ngOnInit() {
  // Restaurar filtros guardados
  this.restaurarFiltros();

  // Obtener la fecha del servidor PRIMERO
  this.subscriptions.push(
    this.ordenService.getFechaServidor().subscribe({
      next: (fechaRespuesta) => {
        this.fechaServidorHoy = fechaRespuesta.fecha;
        console.log('📅 Fecha del servidor:', this.fechaServidorHoy);
        
        // AHORA cargar las órdenes
        this.cargarOrdenesConFecha();
      },
      error: (error) => {
        console.error('Error obteniendo fecha del servidor:', error);
        // Usar fecha local como respaldo
        const hoy = new Date();
        this.fechaServidorHoy = hoy.toISOString().split('T')[0];
        console.log('📅 Usando fecha local como respaldo:', this.fechaServidorHoy);
        
        // Cargar órdenes igualmente
        this.cargarOrdenesConFecha();
      }
    })
  );
}

// Nuevo método para cargar órdenes después de tener la fecha
private cargarOrdenesConFecha() {
  this.subscriptions.push(
    this.ordenService.getOrdenes().subscribe({
      next: (data) => {
        this.ordenes = data;
        console.log('📋 Órdenes cargadas:', this.ordenes.length);
        
        // Log para depurar la orden #14
        const orden14 = this.ordenes.find(o => o.id === 14);
        if (orden14) {
          console.log('🔍 Orden #14:', {
            id: orden14.id,
            fecha_limite: orden14.fecha_limite,
            fechaServidor: this.fechaServidorHoy,
            saldo: this.calcularSaldo(orden14),
            isVencida: this.isVencida(orden14),
            estado: orden14.estado
          });
        }
        
        this.extraerOpcionesFiltros();
        this.filtrarOrdenes();
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error cargando órdenes:', error);
        this.cargando = false;
      }
    })
  );
}

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    console.log('🧹 Suscripciones canceladas');
  }

 /**
   * Restaurar filtros desde localStorage
   */
  private restaurarFiltros() {
    try {
      const filtrosGuardados = localStorage.getItem(this.FILTROS_STORAGE_KEY);
      if (filtrosGuardados) {
        const parsed = JSON.parse(filtrosGuardados);
        // Restaurar solo los filtros que existen
        Object.keys(this.filtros).forEach(key => {
          if (parsed[key] !== undefined) {
            (this.filtros as any)[key] = parsed[key];
          }
        });
        console.log('📂 Filtros restaurados:', this.filtros);
      }
      
      // Restaurar estado de visibilidad de filtros avanzados
      const filtrosVisibles = localStorage.getItem(this.FILTROS_VISIBLES_KEY);
      if (filtrosVisibles !== null) {
        this.mostrarFiltrosAvanzados = filtrosVisibles === 'true';
      }
    } catch (error) {
      console.error('Error restaurando filtros:', error);
    }
  }

  /**
   * Guardar filtros en localStorage
   */
private guardarFiltros() {
  try {
    console.log('💾 Guardando filtros - vencidas:', this.filtros.vencidas, 'fechaServidor:', this.fechaServidorHoy);
    localStorage.setItem(this.FILTROS_STORAGE_KEY, JSON.stringify(this.filtros));
    localStorage.setItem(this.FILTROS_VISIBLES_KEY, String(this.mostrarFiltrosAvanzados));
  } catch (error) {
    console.error('Error guardando filtros:', error);
  }
}


// Modificar extraerOpcionesFiltros
extraerOpcionesFiltros() {
  // Para filtros necesitamos objetos completos, no solo strings
  this.doctoresCompleto = this.ordenes
    .map(o => o.doctor)
    .filter((doctor, index, self) => 
      doctor && self.findIndex(d => d?.id === doctor?.id) === index
    );

  this.serviciosCompleto = this.ordenes
    .map(o => o.servicio)
    .filter((servicio, index, self) => 
      servicio && self.findIndex(s => s?.id === servicio?.id) === index
    );

  // Para compatibilidad con código existente
  this.doctoresUnicos = this.doctoresCompleto.map(d => d.nombre);
  this.serviciosUnicos = this.serviciosCompleto.map(s => s.nombre);
}

// Métodos para manejar selección
onDoctorSeleccionado(doctor: any) {
  this.filtros.doctor = doctor ? doctor.nombre : '';
  this.filtrarOrdenes();
   this.guardarFiltros();
}

onServicioSeleccionado(servicio: any) {
  this.filtros.servicio = servicio ? servicio.nombre : '';
  this.filtrarOrdenes();
   this.guardarFiltros();
}


  filtrarOrdenes() {
    this.ordenesFiltradas = this.ordenes.filter(orden => {
      // Búsqueda global (busca en TODOS los campos)
      if (this.filtros.busquedaGlobal) {
        const busqueda = this.filtros.busquedaGlobal.toLowerCase();
        const coincideGlobal = 
          (orden.doctor?.nombre?.toLowerCase() || '').includes(busqueda) ||
          (orden.servicio?.nombre?.toLowerCase() || '').includes(busqueda) ||
          (orden.cliente_nombre?.toLowerCase() || '').includes(busqueda) ||
          (orden.id_externo?.toLowerCase() || '').includes(busqueda) ||
          (orden.estado?.toLowerCase() || '').includes(busqueda) ||
          (orden.prioridad?.toLowerCase() || '').includes(busqueda) ||
          (orden.total?.toString() || '').includes(busqueda) ||
          (this.calcularSaldo(orden)?.toString() || '').includes(busqueda);
        
        if (!coincideGlobal) return false;
      }

      // Filtro por doctor
      if (this.filtros.doctor && orden.doctor?.nombre !== this.filtros.doctor) {
        return false;
      }

      // Filtro por servicio
      if (this.filtros.servicio && orden.servicio?.nombre !== this.filtros.servicio) {
        return false;
      }

      // Filtro por estado
      if (this.filtros.estado && orden.estado !== this.filtros.estado) {
        return false;
      }

      // Filtro por prioridad
      if (this.filtros.prioridad && orden.prioridad !== this.filtros.prioridad) {
        return false;
      }

      // Filtro por cliente
      if (this.filtros.cliente) {
        const cliente = (orden.cliente_nombre || '').toLowerCase();
        if (!cliente.includes(this.filtros.cliente.toLowerCase())) {
          return false;
        }
      }

      // Filtro por fecha límite (rango)
      if (this.filtros.fechaInicio && orden.fecha_limite) {
        if (new Date(orden.fecha_limite) < new Date(this.filtros.fechaInicio)) {
          return false;
        }
      }
      if (this.filtros.fechaFin && orden.fecha_limite) {
        if (new Date(orden.fecha_limite) > new Date(this.filtros.fechaFin)) {
          return false;
        }
      }

      // Filtro por rango de saldo
      const saldo = this.calcularSaldo(orden);
      if (this.filtros.saldoMin !== null && saldo < this.filtros.saldoMin) {
        return false;
      }
      if (this.filtros.saldoMax !== null && saldo > this.filtros.saldoMax) {
        return false;
      }
      // Filtro solo vencidas
if (this.filtros.vencidas) {
  // Log para depurar
  if (orden.id === 14) {
    console.log('🔍 Orden #14 pasando por filtro vencidas');
  }
  
  // Una orden es vencida si: está pendiente, tiene saldo > 0 y la fecha límite es <= hoy
  const saldo = this.calcularSaldo(orden);
  if (orden.estado !== 'pendiente' || saldo <= 0) {
    if (orden.id === 14) {
      console.log('❌ Orden #14 descartada por estado o saldo:', { estado: orden.estado, saldo });
    }
    return false;
  }
  
  // Usamos la función isVencida mejorada con fecha del servidor
  const esVencida = this.isVencida(orden);
  if (orden.id === 14) {
    console.log('📊 Orden #14 esVencida =', esVencida);
  }
  
  if (!esVencida) {
    return false;
  }
}







 // Filtro para ocultar órdenes pagadas/terminadas
    if (this.filtros.ocultarTerminadas) {
      const saldo = this.calcularSaldo(orden);
      const estaTerminada = orden.estado === 'terminado';
      const saldoCero = saldo === 0;
      
      if (estaTerminada || saldoCero) {
        return false;
      }
    }

    return true;
  });
  this.guardarFiltros();
  this.actualizarPaginacion(); // <-- AGREGAR ESTA LÍNEA
}
  // Método para limpiar todos los filtros
limpiarFiltros() {
  this.filtros = {
    busquedaGlobal: '',
    doctor: '',
    servicio: '',
    estado: '',
    prioridad: '',
    cliente: '',
    fechaInicio: '',
    fechaFin: '',
    saldoMin: null,
    saldoMax: null,
    vencidas: false,
    ocultarTerminadas: true  // <-- AGREGAR ESTA LÍNEA
  };
  this.filtrarOrdenes();
  this.guardarFiltros();
}

 // MODIFICAR el método filtrosActivosCount - AGREGAR el conteo
get filtrosActivosCount(): number {
  let count = 0;
  if (this.filtros.doctor) count++;
  if (this.filtros.servicio) count++;
  if (this.filtros.estado) count++;
  if (this.filtros.prioridad) count++;
  if (this.filtros.cliente) count++;
  if (this.filtros.fechaInicio || this.filtros.fechaFin) count++;
  if (this.filtros.saldoMin !== null || this.filtros.saldoMax !== null) count++;
  if (this.filtros.vencidas) count++;
  if (!this.filtros.ocultarTerminadas) count++; // <-- AGREGAR ESTA LÍNEA
  return count;
}



  cargarOrdenes() {
    this.cargando = true;
    this.ordenService.getOrdenes().subscribe({
      next: (data) => {
        this.ordenes = data;
        this.filtrarOrdenes();
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error cargando órdenes:', error);
        this.cargando = false;
      }
    });
  }



  calcularTotalPagado(orden: any): number {
  return Number(orden.pagos?.reduce((sum: number, pago: any) => sum + Number(pago.monto), 0)) || 0;
}

 calcularSaldo(orden: any): number {
  return Number(Number(orden.total) - this.calcularTotalPagado(orden)) || 0;
}

isVencida(orden: any): boolean {
  // Si no tiene fecha límite o ya está terminada, no está vencida
  if (!orden.fecha_limite || orden.estado === 'terminado') return false;
  
  // Calcular saldo pendiente
  const saldo = this.calcularSaldo(orden);
  
  // Si el saldo es 0, no está vencida (está pagada)
  if (saldo <= 0) return false;
  
  // Usar la fecha del servidor (en formato YYYY-MM-DD)
  const hoyStr = this.fechaServidorHoy;
  const limiteStr = orden.fecha_limite;
  
  // Si por alguna razón no tenemos la fecha del servidor, usar la fecha local
  if (!hoyStr) {
    const hoyLocal = new Date();
    const hoyLocalStr = hoyLocal.toISOString().split('T')[0];
    console.warn('⚠️ Usando fecha local como respaldo:', hoyLocalStr);
    return limiteStr <= hoyLocalStr;
  }
  
  // Log para depurar la orden #14
  if (orden.id === 14) {
    console.log(`📊 Comparación orden #14: ${limiteStr} <= ${hoyStr} = ${limiteStr <= hoyStr}`);
  }
  
  // Comparar como strings
  return limiteStr <= hoyStr;
}
  // Método para agregar pago
agregarPago(orden: any) {
  // Calcular el saldo actual de esta orden
  const totalPagado = this.calcularTotalPagado(orden);
  const saldo = Number(orden.total) - totalPagado;
  
  // Si el saldo ya es 0, no permitir agregar más pagos
  if (saldo <= 0) {
    Swal.fire({
      icon: 'info',
      title: 'Saldo cancelado',
      text: 'Esta orden ya tiene el saldo completamente pagado',
      timer: 2000,
      showConfirmButton: false
    });
    return;
  }
  
  Swal.fire({
    title: 'Registrar Pago',
    html: `
      <input type="number" id="monto" class="swal2-input" 
             placeholder="Monto (S/)" step="0.01" min="0.01" 
             max="${saldo}" value="${saldo.toFixed(2)}">
      <select id="metodo" class="swal2-select" style="width: 100%; margin-bottom: 10px;">
        <option value="efectivo">Efectivo</option>
        <option value="tarjeta">Tarjeta</option>
        <option value="transferencia">Transferencia</option>
        <option value="yape">Yape</option>
        <option value="plin">Plin</option>
      </select>
      <input type="text" id="referencia" class="swal2-input" placeholder="Referencia (opcional)">
      <div class="swal2-text" style="font-size:0.9rem; color:#64748b; margin-top:10px;">
        Saldo pendiente: ${this.monedaPipe.transform(saldo)}
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
      
      if (montoNumerico > saldo) {
        Swal.showValidationMessage(`El monto no puede exceder el saldo pendiente (${this.monedaPipe.transform(saldo)})`);
        return false;
      }
      
      return { monto: montoNumerico, metodo, referencia };
    }
  }).then((result) => {
    if (result.isConfirmed) {
      this.pagoService.registrarPago({
        orden_id: orden.id,
        monto: result.value.monto,
        metodo_pago: result.value.metodo,
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
          this.cargarOrdenes(); // Recargar la lista
        },
        error: (error) => {
          console.error('Error registrando pago:', error);
          if (error.error && error.error.error) {
            Swal.fire('Error', error.error.error, 'error');
          } else {
            Swal.fire('Error', 'No se pudo registrar el pago', 'error');
          }
        }
      });
    }
  });
}
// Reemplazar el método enviarWhatsApp
enviarWhatsApp(orden: any) {
  this.whatsAppService.enviarMensajePersonalizado({
    telefono: orden.doctor?.telefono_whatsapp,
    nombre: orden.doctor?.nombre,
    tipo: 'orden',
    datos: orden
  });
}


// Agregar este método después de verTicket
eliminarOrden(orden: any) {
  Swal.fire({
    title: '¿Eliminar orden?',
    text: `¿Está seguro de eliminar la orden #${orden.id_externo}? Esta acción no se puede deshacer.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#f43f5e'
  }).then((result) => {
    if (result.isConfirmed) {
      this.subscriptions.push(
        this.ordenService.eliminarOrden(orden.id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: '¡Eliminada!',
              text: `La orden #${orden.id_externo} ha sido eliminada`,
              timer: 2000,
              showConfirmButton: false
            });
            this.cargarOrdenes(); // Recargar la lista
          },
          error: (error) => {
            console.error('Error eliminando orden:', error);
            Swal.fire('Error', 'No se pudo eliminar la orden', 'error');
          }
        })
      );
    }
  });
}

// Agregar este método auxiliar para formatear hora (si no existe en el componente)
private formatearHora(hora: string): string {
  if (!hora) return '';
  const match = hora.match(/^(\d{2}):(\d{2})/);
  if (match) {
    const horas = parseInt(match[1]);
    const minutos = match[2];
    const ampm = horas >= 12 ? 'PM' : 'AM';
    const horas12 = horas % 12 || 12;
    return `${horas12}:${minutos} ${ampm}`;
  }
  return hora;
}



/**
 * Descargar PDF
 */
private descargarPDF(orden: any, pdfBlob: Blob) {
  const nombreArchivo = `ticket_${orden.id_externo}.pdf`;
  saveAs(pdfBlob, nombreArchivo);
  
  Swal.fire({
    title: 'PDF descargado',
    text: `El archivo ${nombreArchivo} se ha descargado correctamente.`,
    icon: 'success',
    timer: 2000,
    showConfirmButton: false
  });
}

// Reemplaza el método setFiltroEstado
setFiltroEstado(estado: string) {
  // 1. Si estamos seleccionando un estado, desactivamos el filtro de vencidas.
  // Esto asegura que no se mezclen los filtros.
  if (this.filtros.vencidas) {
    this.filtros.vencidas = false;
  }
  // 2. Asignamos el estado
  this.filtros.estado = estado;
  this.paginaActual = 1;
  
  // 3. Si seleccionamos "terminado", aseguramos que ocultarTerminadas sea false.
  if (estado === 'terminado') {
    this.filtros.ocultarTerminadas = false;
  }
  // 4. Si seleccionamos "pendiente", aseguramos que ocultarTerminadas sea true.
  else if (estado === 'pendiente') {
    this.filtros.ocultarTerminadas = true;
  }
  
  this.filtrarOrdenes();
}

// Reemplaza el método toggleFiltroVencidas
toggleFiltroVencidas() {
  // 1. Invertimos el estado del filtro de vencidas
  this.filtros.vencidas = !this.filtros.vencidas;
  this.paginaActual = 1;
  
  // 2. Si activamos el filtro de vencidas, debemos limpiar el filtro de estado.
  // Esto evita que se muestren ambos como activos.
  if (this.filtros.vencidas) {
    this.filtros.estado = '';
  }
  
  // 3. Aseguramos que el filtro ocultarTerminadas se comporte correctamente.
  // Cuando vemos vencidas, solo queremos ver órdenes pendientes con deuda, por lo que ocultamos las terminadas.
  this.filtros.ocultarTerminadas = true;
  
  this.filtrarOrdenes();
}

toggleOcultarTerminadas() {
  this.filtros.ocultarTerminadas = !this.filtros.ocultarTerminadas;
  this.paginaActual = 1; // <-- AGREGAR ESTA LÍNEA
  this.filtrarOrdenes();
}
// AGREGAR ESTE MÉTODO para actualizar la paginación
actualizarPaginacion() {
  this.totalPaginas = Math.ceil(this.ordenesFiltradas.length / this.itemsPorPagina);
  
  // Asegurar que la página actual no exceda el total
  if (this.paginaActual > this.totalPaginas && this.totalPaginas > 0) {
    this.paginaActual = this.totalPaginas;
  } else if (this.totalPaginas === 0) {
    this.paginaActual = 1;
  }
  
  const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
  const fin = inicio + this.itemsPorPagina;
  this.ordenesPaginadas = this.ordenesFiltradas.slice(inicio, fin);
}
// AGREGAR ESTOS MÉTODOS para controlar la paginación
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
}