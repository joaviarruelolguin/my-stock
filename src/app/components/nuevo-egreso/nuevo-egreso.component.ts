import { Component, Inject } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { SnackbarService } from '../../services/snackbar.service';
import { GastosService } from '../../services/gastos.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-nuevo-egreso',
  templateUrl: './nuevo-egreso.component.html',
  styleUrl: './nuevo-egreso.component.css',
})
export class NuevoEgresoComponent {
  formGasto: FormGroup;
  id: string | null;
  loading = false;
  titulo: string = 'Crear Egreso';
  submitted = false;

  constructor(
    private fb: FormBuilder,
    private gastosService: GastosService,
    private snackBar: SnackbarService,
    private dialogRef: MatDialogRef<NuevoEgresoComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.formGasto = this.fb.group({
      tipo: ['', Validators.required],
      monto: [0, Validators.required],
      fecha: [[new Date(), Validators.required]],
      descripcion: ['', Validators.maxLength(25)],
    });
    this.id = data ? data.id : null;
  }

  ngOnInit(): void {
    this.esEditar();
  }

  // get fechaNoValido() {
  //   return (
  //     this.formGasto.get('fecha')?.invalid &&
  //     this.formGasto.get('fecha')?.touched
  //   );
  // }

  agregarEditarGasto() {
    this.submitted = true;
    if (this.formGasto.invalid) {
      return;
    }
    if (this.id) {
      this.modificarGasto(this.id);
    } else {
      this.nuevoGasto();
    }
  }

  nuevoGasto() {
    const fechaActual = new Date();
    const fechaInput = new Date(this.formGasto.value.fecha);
    const gasto: any = {
      tipo: this.formGasto.value.tipo.toUpperCase(),
      monto: this.formGasto.value.monto,
      fecha: fechaInput,
      descripcion: this.formGasto.value.descripcion,
      fechaCreacion: fechaActual,
      fechaActualizacion: fechaActual,
    };

    this.loading = true;
    const nombreGasto = this.formGasto.value.tipo.toUpperCase();
    const mensaje = `Registro creado: ${nombreGasto}`;
    this.crearGasto(gasto, mensaje);
  }

  private crearGasto(gasto: any, mensaje: string) {
    this.gastosService.nuevoGasto(gasto).subscribe(
      () => {
        this.snackBar.showSuccess(mensaje);
        this.loading = false;
        this.dialogRef.close();
      },
      (error) => {
        this.snackBar.showError('Se ha producido un error');
        console.log(error);
        this.loading = false;
      }
    );
  }

  modificarGasto(id: string) {
    const fechaActual = new Date();
    const fechaInput = new Date(this.formGasto.value.fecha);
    const gasto: any = {
      tipo: this.formGasto.value.tipo.toUpperCase(),
      monto: this.formGasto.value.monto,
      fecha: fechaInput,
      descripcion: this.formGasto.value.descripcion,
      fechaActualizacion: fechaActual,
    };

    this.loading = true;
    const nombreGasto = this.formGasto.value.tipo.toUpperCase();
    const mensaje = `Gasto modificado: ${nombreGasto}`;

    this.gastosService.editarGasto(id, gasto).subscribe(
      () => {
        this.snackBar.showSuccess(mensaje);
        this.loading = false;
        this.dialogRef.close();
      },
      (error) => {
        this.snackBar.showError('Se ha producido un error');
        console.log(error);
        this.loading = false;
      }
    );
  }

  esEditar() {
    if (this.data) {
      this.formGasto.setValue({
        tipo: this.data.tipo || '',
        monto: this.data.monto || '',
        fecha: this.data.fecha || '',
        descripcion: this.data.descripcion || '',
      });

      this.titulo = 'Editar Egreso';
    }
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.agregarEditarGasto();
    }
  }

  eliminarGasto(): void {
    if (this.id) {
      this.loading = true;
      const nombreGasto = this.formGasto.value.tipo.toUpperCase();
      const mensaje = `Gasto eliminado: ${nombreGasto}`;

      this.gastosService
        .eliminarGasto(this.id)
        .then(() => {
          this.snackBar.showSuccess(mensaje);
          this.loading = false;
          this.dialogRef.close();
        })
        .catch((error) => {
          this.snackBar.showError(
            'Se ha producido un error al eliminar el registro'
          );
          console.log(error);
          this.loading = false;
        });
    }
  }
}
