import { Component, Input, Output, EventEmitter, forwardRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { ImagenPipe } from '../../pipes/imagen.pipe';

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [CommonModule, FormsModule, ImagenPipe],
  template: `
    <div class="searchable-select">
      <!-- Campo de visualización/búsqueda -->
      <div class="select-display" [class.open]="abierto" (click)="toggleDropdown()">
        <input
          type="text"
          [(ngModel)]="textoBusqueda"
          (ngModelChange)="filtrarOpciones()"
          (focus)="abrirDropdown()"
          (blur)="onInputBlur()"
          [placeholder]="placeholder"
          [disabled]="disabled"
          class="select-input"
          #inputElement
        >
        <i class="fas fa-chevron-down" [class.rotated]="abierto"></i>
      </div>

      <!-- Dropdown con opciones -->
      <div class="select-dropdown" *ngIf="abierto" (mousedown)="$event.preventDefault()">
        <div class="dropdown-header">
          <span class="result-count">{{ opcionesFiltradas.length }} resultados</span>
          <button *ngIf="textoBusqueda" class="btn-clear-search" (click)="limpiarBusqueda($event)">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="dropdown-options">
          <!-- Opción "Todos" si es para filtros -->
          <div *ngIf="incluirTodos" 
               class="dropdown-option" 
               [class.selected]="!valorSeleccionado"
               (click)="seleccionarOpcion(null)">
            <span>Todos</span>
            <i *ngIf="!valorSeleccionado" class="fas fa-check"></i>
          </div>

          <!-- Opciones filtradas -->
          <div *ngFor="let opcion of opcionesFiltradas" 
               class="dropdown-option" 
               [class.selected]="valorSeleccionado?.id === opcion.id"
               (click)="seleccionarOpcion(opcion)">
            <div class="option-content">
              <span *ngIf="mostrarIcono && opcion.logo_url" class="option-icon">
                <img [src]="opcion.logo_url | imagen:'assets/images/default-doctor.png'" alt="">
              </span>
              <span class="option-text">{{ opcion.nombre }}</span>
            </div>
            <i *ngIf="valorSeleccionado?.id === opcion.id" class="fas fa-check"></i>
          </div>

          <!-- Mensaje si no hay resultados -->
          <div *ngIf="opcionesFiltradas.length === 0" class="dropdown-empty">
            No se encontraron resultados
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .searchable-select {
      position: relative;
      width: 100%;
    }

    .select-display {
      position: relative;
      cursor: pointer;
    }

    .select-input {
      width: 100%;
      padding: 12px;
      padding-right: 35px;
      border: 1px solid var(--border-color, #e2e8f0);
      border-radius: 12px;
      background: var(--input-bg, #f8fafc);
      color: var(--text-primary, #0f172a);
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .select-input:focus {
      outline: none;
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
    }

    .select-input:disabled {
      background: var(--disabled-bg, #e2e8f0);
      cursor: not-allowed;
      opacity: 0.6;
    }

    .fa-chevron-down {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-secondary, #64748b);
      transition: transform 0.2s;
      pointer-events: none;
    }

    .fa-chevron-down.rotated {
      transform: translateY(-50%) rotate(180deg);
    }

    .select-dropdown {
      position: absolute;
      top: calc(100% + 5px);
      left: 0;
      right: 0;
      max-height: 350px;
      background: var(--bg-primary, #ffffff);
      border: 1px solid var(--border-color, #e2e8f0);
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      display: flex;
      flex-direction: column;
      animation: slideDown 0.2s ease;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .dropdown-header {
      padding: 10px 15px;
      border-bottom: 1px solid var(--border-color, #e2e8f0);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--bg-primary, #ffffff);
      border-radius: 12px 12px 0 0;
    }

    .result-count {
      font-size: 0.875rem;
      color: var(--text-secondary, #64748b);
    }

    .btn-clear-search {
      background: none;
      border: none;
      color: var(--text-secondary, #64748b);
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .btn-clear-search:hover {
      background: var(--hover-bg, #f1f5f9);
      color: var(--text-primary, #0f172a);
    }

    .dropdown-options {
      overflow-y: auto;
      max-height: 250px;
      padding: 5px 0;
    }

    .dropdown-option {
      padding: 12px 15px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: all 0.2s;
      border-left: 3px solid transparent;
    }

    .dropdown-option:hover {
      background: var(--hover-bg, #f1f5f9);
      border-left-color: #6366f1;
    }

    .dropdown-option.selected {
      background: rgba(99,102,241,0.1);
      color: #6366f1;
      border-left-color: #6366f1;
    }

    .option-content {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
    }

    .option-icon {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      overflow: hidden;
      flex-shrink: 0;
    }

    .option-icon img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .option-text {
      font-weight: 500;
    }

    .option-detail {
      font-size: 0.875rem;
      color: var(--text-secondary, #64748b);
      margin-left: 5px;
    }

    .dropdown-empty {
      padding: 20px;
      text-align: center;
      color: var(--text-secondary, #64748b);
      font-style: italic;
    }

    [data-theme="dark"] .select-dropdown {
      background: #1e293b;
      border-color: #334155;
    }

    [data-theme="dark"] .dropdown-option:hover {
      background: #334155;
    }

    [data-theme="dark"] .dropdown-header {
      background: #1e293b;
      border-color: #334155;
    }
  `],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableSelectComponent),
      multi: true
    }
  ]
})
export class SearchableSelectComponent implements ControlValueAccessor {
  @Input() opciones: any[] = [];
  @Input() placeholder: string = 'Seleccionar...';
  @Input() incluirTodos: boolean = false;
  @Input() mostrarIcono: boolean = false;
  @Input() mostrarDetalle: boolean = false;
  @Input() disabled: boolean = false;

  @Output() selectionChange = new EventEmitter<any>();

  valorSeleccionado: any = null;
  textoBusqueda: string = '';
  opcionesFiltradas: any[] = [];
  abierto: boolean = false;
  private ignoreBlur = false;

  private onChange: any = () => {};
  private onTouched: any = () => {};

  ngOnInit() {
    this.filtrarOpciones();
  }

  ngOnChanges() {
    this.filtrarOpciones();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.abierto) return;
    
    const target = event.target as HTMLElement;
    if (!target.closest('.searchable-select')) {
      this.cerrarDropdown();
    }
  }

  filtrarOpciones() {
    if (!this.textoBusqueda) {
      this.opcionesFiltradas = [...this.opciones];
    } else {
      const busqueda = this.textoBusqueda.toLowerCase();
      this.opcionesFiltradas = this.opciones.filter(opcion => 
        opcion.nombre.toLowerCase().includes(busqueda) ||
        (opcion.telefono_whatsapp && opcion.telefono_whatsapp.includes(busqueda))
      );
    }
  }

  toggleDropdown() {
    if (!this.disabled) {
      this.abierto = !this.abierto;
      if (this.abierto) {
        this.filtrarOpciones();
      }
    }
  }

  abrirDropdown() {
    if (!this.disabled && !this.abierto) {
      this.abierto = true;
      this.filtrarOpciones();
    }
  }

  cerrarDropdown() {
    this.abierto = false;
    this.onTouched();
  }

  onInputBlur() {
    if (!this.ignoreBlur) {
      setTimeout(() => {
        this.cerrarDropdown();
      }, 200);
    }
  }

  seleccionarOpcion(opcion: any) {
    this.ignoreBlur = true;
    
    this.valorSeleccionado = opcion;
    
    // Actualizar el texto de búsqueda con el nombre seleccionado
    if (opcion) {
      this.textoBusqueda = opcion.nombre;
    } else {
      this.textoBusqueda = '';
    }
    
    // IMPORTANTE: Cerrar el dropdown inmediatamente
    this.abierto = false;
    
    // Notificar el cambio
    this.onChange(opcion ? opcion.id : null);
    this.selectionChange.emit(opcion);
    
    // Resetear el flag después de un breve momento
    setTimeout(() => {
      this.ignoreBlur = false;
    }, 300);
  }

  limpiarBusqueda(event: Event) {
    event.stopPropagation();
    this.textoBusqueda = '';
    this.filtrarOpciones();
  }

  writeValue(value: any): void {
    if (value === null || value === undefined) {
      this.valorSeleccionado = null;
      this.textoBusqueda = '';
    } else {
      const opcion = this.opciones.find(o => o.id === value);
      this.valorSeleccionado = opcion || null;
      this.textoBusqueda = opcion ? opcion.nombre : '';
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}