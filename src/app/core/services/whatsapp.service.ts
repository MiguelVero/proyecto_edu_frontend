import { Injectable, Injector } from '@angular/core';
import Swal from 'sweetalert2';
import { MonedaPipe } from '../../shared/pipes/moneda.pipe';

export interface WhatsAppOptions {
  telefono: string;
  nombre: string;
  tipo: 'doctor' | 'orden';
  datos: any;
}

@Injectable({
  providedIn: 'root'
})
export class WhatsAppService {
  private monedaPipe: MonedaPipe;

  constructor(private injector: Injector) {
    this.monedaPipe = new MonedaPipe();
  }

  enviarMensajePersonalizado(options: WhatsAppOptions) {
    if (!options.telefono) {
      Swal.fire('Error', 'No hay número de teléfono registrado', 'error');
      return;
    }

    let mensajePredefinido = '';

    if (options.tipo === 'doctor') {
      mensajePredefinido = this.generarMensajeDoctor(options.datos);
    } else if (options.tipo === 'orden') {
      mensajePredefinido = this.generarMensajeOrden(options.datos);
    }

    Swal.fire({
      title: 'Personalizar mensaje',
      html: `
        <div class="whatsapp-modal">
          <textarea id="mensaje-whatsapp" class="whatsapp-textarea" 
                    placeholder="Escribe tu mensaje..." 
                    style="min-height: 200px;">${mensajePredefinido}</textarea>
          
          <div class="variables-info">
            <div class="variables-header">
              <i class="fas fa-code"></i>
              <span>Variables disponibles</span>
            </div>
            <div class="variables-grid">
              ${this.obtenerVariablesHTML(options.tipo)}
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '<i class="fab fa-whatsapp"></i> Enviar por WhatsApp',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#25D366',
      cancelButtonColor: '#64748b',
      customClass: {
        popup: 'whatsapp-popup',
        confirmButton: 'btn-whatsapp-confirm',
        cancelButton: 'btn-cancel'
      },
      preConfirm: () => {
        const mensaje = (document.getElementById('mensaje-whatsapp') as HTMLTextAreaElement).value;
        if (!mensaje || mensaje.trim() === '') {
          Swal.showValidationMessage('El mensaje no puede estar vacío');
          return false;
        }
        return mensaje;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const telefonoLimpio = options.telefono.replace(/\D/g, '');
        // Usar el método mejorado para abrir WhatsApp con soporte de emojis
        this.abrirWhatsAppConMensaje(telefonoLimpio, result.value);
      }
    });
  }

  /**
   * Método mejorado para abrir WhatsApp con soporte de emojis
   * Adaptado de tu implementación anterior que funciona correctamente
   */
  private abrirWhatsAppConMensaje(numeroTelefono: string, mensaje: string): void {
    // Normalizar el mensaje para manejar correctamente los emojis
    const mensajeLimpio = mensaje.normalize('NFC');
    const mensajeCodificado = encodeURIComponent(mensajeLimpio);
    
    // Usar la URL de WhatsApp Web que ha demostrado funcionar
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${numeroTelefono}&text=${mensajeCodificado}`;
    
    console.log('📤 Abriendo WhatsApp en nueva pestaña');
    
    // Abrir en nueva pestaña para no abandonar la aplicación
    window.open(whatsappUrl, '_blank');
  }

  private generarMensajeDoctor(doctor: any): string {
    const totalOrdenes = doctor.ordenes?.length || 0;
    const pendientes = doctor.ordenes?.filter((o: any) => o.estado === 'pendiente').length || 0;
    const deudaTotal = doctor.ordenes?.reduce((sum: number, o: any) => {
      const pagado = o.pagos?.reduce((s: number, p: any) => s + Number(p.monto), 0) || 0;
      return sum + (Number(o.total) - pagado);
    }, 0) || 0;

    return `Hola Dr(a). ${doctor.nombre}, le informo sobre su cuenta:

📊 *RESUMEN DE CUENTA*
━━━━━━━━━━━━━━━━━━
• Total órdenes: ${totalOrdenes}
• Pendientes: ${pendientes}
• Deuda total: ${this.monedaPipe.transform(deudaTotal)}
━━━━━━━━━━━━━━━━━━

Saludos cordiales,
LabTrack Pro`;
  }

 private generarMensajeOrden(orden: any): string {
  const totalPagado = orden.pagos?.reduce((sum: number, p: any) => sum + Number(p.monto), 0) || 0;
  const saldo = Number(orden.total) - totalPagado;

  // Formatear fecha límite
  const fechaLimite = orden.fecha_limite ? new Date(orden.fecha_limite).toLocaleDateString('es-PE') : '';
  const hora = orden.hora_limite ? this.formatearHora(orden.hora_limite) : '';

  // Generar historial de pagos
  let historialPagos = '';
  if (orden.pagos && orden.pagos.length > 0) {
    // Ordenar pagos por fecha (más reciente primero)
    const pagosOrdenados = [...orden.pagos].sort((a, b) => 
      new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime()
    );
    
    historialPagos = '\n\n📆 *HISTORIAL DE PAGOS*\n';
    historialPagos += '━━━━━━━━━━━━━━━━━━\n';
    
    pagosOrdenados.forEach((pago: any, index: number) => {
      const fecha = new Date(pago.creado_en).toLocaleString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      historialPagos += `${index + 1}. ${fecha}\n`;
      historialPagos += `   💰 ${this.monedaPipe.transform(pago.monto)} - ${pago.metodo_pago}\n`;
      if (pago.referencia) {
        historialPagos += `   📝 Ref: ${pago.referencia}\n`;
      }
    });
    
    historialPagos += '━━━━━━━━━━━━━━━━━━';
  }

  return `Hola Dr(a). ${orden.doctor?.nombre}, le comparto el estado de su trabajo:

📋 *DETALLE DE LA ORDEN #${orden.id_externo}*
━━━━━━━━━━━━━━━━━━
• Servicio: ${orden.servicio?.nombre || 'No especificado'}
• Cliente: ${orden.cliente_nombre || 'No especificado'}
• Total: ${this.monedaPipe.transform(orden.total)}
• Abonado: ${this.monedaPipe.transform(totalPagado)}
• Saldo: ${this.monedaPipe.transform(saldo)}
• Fecha límite: ${fechaLimite} ${hora}
━━━━━━━━━━━━━━━━━━${historialPagos}

Gracias por su preferencia.`;
}

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

  private obtenerVariablesHTML(tipo: 'doctor' | 'orden'): string {
    if (tipo === 'doctor') {
      return `
        <div class="variable-item">
          <span class="variable-name">{nombre}</span>
          <span class="variable-desc">Nombre del doctor</span>
        </div>
        <div class="variable-item">
          <span class="variable-name">{total_ordenes}</span>
          <span class="variable-desc">Total de órdenes</span>
        </div>
        <div class="variable-item">
          <span class="variable-name">{pendientes}</span>
          <span class="variable-desc">Órdenes pendientes</span>
        </div>
        <div class="variable-item">
          <span class="variable-name">{deuda}</span>
          <span class="variable-desc">Deuda total</span>
        </div>
      `;
    } else {
      return `
        <div class="variable-item">
          <span class="variable-name">{nombre}</span>
          <span class="variable-desc">Nombre del doctor</span>
        </div>
        <div class="variable-item">
          <span class="variable-name">{orden}</span>
          <span class="variable-desc">Número de orden</span>
        </div>
        <div class="variable-item">
          <span class="variable-name">{servicio}</span>
          <span class="variable-desc">Nombre del servicio</span>
        </div>
        <div class="variable-item">
          <span class="variable-name">{total}</span>
          <span class="variable-desc">Total de la orden</span>
        </div>
        <div class="variable-item">
          <span class="variable-name">{abonado}</span>
          <span class="variable-desc">Monto abonado</span>
        </div>
        <div class="variable-item">
          <span class="variable-name">{saldo}</span>
          <span class="variable-desc">Saldo pendiente</span>
        </div>
        <div class="variable-item">
          <span class="variable-name">{fecha}</span>
          <span class="variable-desc">Fecha límite</span>
        </div>
      `;
    }
  }
}