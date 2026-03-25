import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-login',
   standalone: true,  // <-- AGREGAR ESTO
  imports: [
    CommonModule,
    ReactiveFormsModule,  // <-- IMPORTANTE: Para formGroup
    RouterLink,
    MatFormFieldModule,   // <-- Para mat-form-field
    MatInputModule,       // <-- Para matInput
    MatIconModule,        // <-- Para mat-icon
    MatButtonModule       // <-- Para mat-button
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  hidePassword = true;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      nombre_usuario: ['', Validators.required],
      contrasena: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.authService.login(this.loginForm.value).subscribe({
        next: () => {
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          Swal.fire({
            icon: 'error',
            title: 'Error de autenticación',
            text: error.error?.error || 'Credenciales inválidas'
          });
        }
      });
    }
  }
}