import { Component } from '@angular/core';
import { SnackbarService } from '../../services/snackbar.service';
import { MatDialog } from '@angular/material/dialog';
import { UserService } from '../../services/user.service';
import { GastosService } from '../../services/gastos.service';
import { DeleteDialogComponent } from '../delete-dialog/delete-dialog.component';
import { NuevoEgresoComponent } from '../nuevo-egreso/nuevo-egreso.component';

@Component({
  selector: 'app-gastos',
  templateUrl: './gastos.component.html',
  styleUrl: './gastos.component.css',
})
export class GastosComponent {
  subtitle = 'Egresos';
  meses = [
    { nombre: 'Enero', num: 1 },
    { nombre: 'Febrero', num: 2 },
    { nombre: 'Marzo', num: 3 },
    { nombre: 'Abril', num: 4 },
    { nombre: 'Mayo', num: 5 },
    { nombre: 'Junio', num: 6 },
    { nombre: 'Julio', num: 7 },
    { nombre: 'Agosto', num: 8 },
    { nombre: 'Septiembre', num: 9 },
    { nombre: 'Octubre', num: 10 },
    { nombre: 'Noviembre', num: 11 },
    { nombre: 'Diciembre', num: 12 },
  ];

  gastos: any[] = [];
  mesSeleccionado: number | null = null; // Almacena el mes seleccionado
  totalGastosPorMes: { [mes: string]: number } = {}; // Nuevo objeto para guardar el total por mes
  isAdmin: boolean = false;
  gastosPaginados: any[] = [];
  pageSize = 5;
  currentPage = 0;

  constructor(
    private snackBar: SnackbarService,
    public dialog: MatDialog,
    private gastosService: GastosService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.obtenerDatos();
    this._isUserAdmin();
  }

  _isUserAdmin() {
    this.userService.isUserAdmin().subscribe((isAdmin) => {
      this.isAdmin = isAdmin;
    });
  }

  filtrarPorMes(event: Event): void {
    // Verificar que el target no sea null y sea un HTMLSelectElement
    const target = event.target as HTMLSelectElement; // Casteo correcto

    if (target) {
      const mesSeleccionado = target.value ? +target.value : null;
      this.mesSeleccionado = mesSeleccionado;
      this.applyPagination();
    } else {
      console.error(
        'El target del evento es null o no es un HTMLSelectElement.'
      );
    }
  }

  // Modificar applyPagination para filtrar antes de paginar
  applyPagination() {
    // Filtrar la lista de gastos según el mes seleccionado
    let gastosFiltrados = this.gastos;
    if (this.mesSeleccionado !== null) {
      gastosFiltrados = this.gastos.filter(
        (gasto) => gasto.fecha.getMonth() + 1 === this.mesSeleccionado
      );
    }

    // Paginación de los gastos filtrados
    const startIndex = this.currentPage * this.pageSize;
    this.gastosPaginados = gastosFiltrados.slice(
      startIndex,
      startIndex + this.pageSize
    );
  }

  onPageChange(event: any) {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex;
    this.applyPagination();
  }

  obtenerDatos() {
    this.gastosService.obtenerGastos().subscribe((data) => {
      this.gastos = [];
      this.totalGastosPorMes = {}; // Reinicia el total de cada mes

      data.forEach((element: any) => {
        const gastoData = {
          id: element.payload.doc.id,
          ...element.payload.doc.data(),
        };
        this.calcularGastosMensuales(gastoData);
        this.gastos.push(gastoData);
      });
      this.applyPagination();
    });
  }

  eliminarGasto(id: string): void {
    this.gastosService.eliminarGasto(id).then(
      () => this.snackBar.showSuccess('Se ha eliminado el registro'),

      (error) => {
        console.log('Error eliminando registro:', error);
        this.snackBar.showError('Se ha producido un error');
      }
    );
    this.applyPagination();
  }

  openDialog(content?: any): void {
    const dialogRef = this.dialog.open(NuevoEgresoComponent, {
      width: '600px',
      data: content,
    });
  }

  openDeleteDialog(gasto: any): void {
    const dialogRef = this.dialog.open(DeleteDialogComponent, {
      width: '450px',
      data: { id: gasto.id },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'confirm') {
        this.eliminarGasto(gasto.id!);
      }
    });
  }

  calcularGastosMensuales(gastoData: any) {
    // Verificar si fecha es un Timestamp o una cadena de texto
    if (gastoData.fecha) {
      if (gastoData.fecha.seconds) {
        // Conversión desde Timestamp (Firebase)
        gastoData.fecha = new Date(gastoData.fecha.seconds * 1000);
      } else if (typeof gastoData.fecha === 'string') {
        // Si es una cadena de texto, convertirla a un objeto Date
        gastoData.fecha = new Date(gastoData.fecha);
      } else {
        console.error('La fecha no es válida:', gastoData.fecha);
      }
    }

    // Obtener el mes del timestamp convertido
    const mesNumero = gastoData.fecha.getMonth() + 1; // El mes es 0-indexado (0 para enero, 11 para diciembre)

    // Buscar el mes por su número
    const mesNombre =
      this.meses.find((m) => m.num === mesNumero)?.nombre || 'Mes desconocido';

    // Formatear el mes en formato YYYY-Mes
    const mes = `${mesNombre}`;

    // Sumar al total del mes correspondiente
    if (!this.totalGastosPorMes[mes]) {
      this.totalGastosPorMes[mes] = 0;
    }
    this.totalGastosPorMes[mes] += gastoData.monto || 0; // Suma el monto del gasto
  }
}
