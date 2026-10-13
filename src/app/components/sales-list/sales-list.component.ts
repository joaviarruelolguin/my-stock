import { Component, OnInit, signal } from '@angular/core';
import { SalesService } from '../../services/sales.service';
import { SnackbarService } from '../../services/snackbar.service';
import { MatDialog } from '@angular/material/dialog';
import { DeleteDialogComponent } from '../delete-dialog/delete-dialog.component';
import { UserService } from '../../services/user.service';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { Product } from '../../models/product-model';
import * as XLSX from 'xlsx'; // Librería para exportar a Excel

pdfMake.vfs = pdfFonts.pdfMake.vfs;

@Component({
  selector: 'app-sales-list',
  templateUrl: './sales-list.component.html',
  styleUrl: './sales-list.component.css',
})
export class SalesListComponent implements OnInit {
  subtitle = 'Ventas';
  ventas: any[] = [];
  ventasFiltradas: any[] = []; // Ventas después de aplicar el filtro
  ventasPorVendedor: {
    vendedor: string;
    totalVentas: number;
    cantidadVentas: number;
  }[] = [];
  isAdmin: boolean = false;
  readonly panelOpenState = signal(false);
  ventasPaginadas: any[] = [];
  pageSize = 5;
  currentPage = 0;

  constructor(
    private salesService: SalesService,
    private snackBar: SnackbarService,
    private userService: UserService,
    public dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this._getVentas();
    this._isUserAdmin();
  }

  _isUserAdmin() {
    this.userService.isUserAdmin().subscribe((isAdmin) => {
      this.isAdmin = isAdmin;
    });
  }

  // Variables para los filtros
  vendedores: string[] = [];
  vendedorSeleccionado: string = '';
  rangoTemporalSeleccionado: string = 'todo';

  _getVentas() {
    this.salesService.getVentas().subscribe((data) => {
      this.ventas = [];
      data.forEach((element: any) => {
        const ventasData = {
          id: element.payload.doc.id,
          ...element.payload.doc.data(),
        };
        this.ventas.push(ventasData);
      });

      // Llenar la lista de vendedores sin duplicados
      this.vendedores = Array.from(
        new Set(
          this.ventas.map((venta) => venta.vendedor?.nombre || 'Desconocido')
        )
      );

      this.ventasFiltradas = this.ventas;
      this._calcularVentasPorVendedor();
      this.applyPagination();
    });
  }

  applyPagination() {
    const startIndex = this.currentPage * this.pageSize;
    this.ventasPaginadas = this.ventasFiltradas.slice(
      startIndex,
      startIndex + this.pageSize
    );
  }

  onPageChange(event: any) {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex;
    this.applyPagination();
  }

  _calcularVentasPorVendedor() {
    const ventasPorVendedor: {
      [key: string]: { totalVentas: number; cantidadVentas: number };
    } = {};

    this.ventas.forEach((venta) => {
      const vendedor = venta.vendedor?.nombre || 'Desconocido';

      // Inicializar si no existe
      if (!ventasPorVendedor[vendedor]) {
        ventasPorVendedor[vendedor] = { totalVentas: 0, cantidadVentas: 0 };
      }

      // Sumar el total de ventas y contar la cantidad
      ventasPorVendedor[vendedor].totalVentas += venta.totalConDescuento;
      ventasPorVendedor[vendedor].cantidadVentas += 1;
    });

    // Convertir el objeto en un array para usarlo en el HTML
    this.ventasPorVendedor = Object.keys(ventasPorVendedor)
      .map((vendedor) => ({
        vendedor,
        totalVentas: ventasPorVendedor[vendedor].totalVentas,
        cantidadVentas: ventasPorVendedor[vendedor].cantidadVentas,
      }))
      .sort((a, b) => b.cantidadVentas - a.cantidadVentas);
  }

  _eliminarVenta(id: string): void {
    this.salesService.eliminarVenta(id).then(
      () => {
        // Eliminar la venta de las listas locales
        this.ventas = this.ventas.filter((venta) => venta.id !== id);
        this.ventasFiltradas = [...this.ventas];

        // Recalcular ventas por vendedor
        this._calcularVentasPorVendedor();
        this.applyPagination();
        // Mostrar notificación de éxito
        this.snackBar.showSuccess('Se ha eliminado el registro');
      },
      (error) => {
        console.log('Error eliminando el registro:', error);
        this.snackBar.showError('Se ha producido un error');
      }
    );
  }

  openDeleteDialog(venta: { id: string }): void {
    const dialogRef = this.dialog.open(DeleteDialogComponent, {
      width: '450px',
      data: { id: venta.id },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'confirm') {
        this._eliminarVenta(venta.id);
      }
    });
  }

  getColor(colorName?: string): string {
    const colors: { [key: string]: string } = {
      rojo: '#fb0909',
      azul: '#0d09fb',
      amarillo: '#edfe06',
      verde: '#04ff00',
      naranja: '#f97316',
      purple: '#a855f7',
      pink: '#ec4899',
      teal: '#14b8a6',
    };
    return colors[colorName?.toLowerCase() || ''] || '#ccc';
  }

  // Método para filtrar por vendedor y rango de fechas
  filtrarVentasCombinado() {
    const hoy = new Date();
    let fechaInicio = new Date();

    // Definir la fecha de inicio según el rango temporal seleccionado
    switch (this.rangoTemporalSeleccionado) {
      case '7d':
        fechaInicio.setDate(hoy.getDate() - 7);
        break;
      case '30d':
        fechaInicio.setDate(hoy.getDate() - 30);
        break;
      case 'todo':
        fechaInicio.setDate(hoy.getDate() - 3650); // Simula "todos" los registros
        break;
      default:
    }

    // Filtrar ventas aplicando ambos criterios
    this.ventasFiltradas = this.ventas.filter((venta) => {
      const fechaVenta = venta.fecha.toDate();
      const coincideVendedor =
        !this.vendedorSeleccionado ||
        venta.vendedor?.nombre === this.vendedorSeleccionado;
      const coincideFecha =
        !fechaInicio || (fechaVenta >= fechaInicio && fechaVenta <= hoy);

      return coincideVendedor && coincideFecha;
    });

    this.applyPagination(); // Aplicar paginación después del filtrado
  }

  // Método para actualizar el filtro de vendedor
  filtrarPorVendedor() {
    this.filtrarVentasCombinado();
  }

  // Método para actualizar el filtro temporal
  filtrarVentas(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.rangoTemporalSeleccionado = target.value;
    this.filtrarVentasCombinado();
  }

  exportarExcel() {
    const datos: any[] = [];

    // Ordenar las ventas por fecha para una mejor numeración (opcional)
    this.ventasFiltradas.sort((a, b) => a.fecha.seconds - b.fecha.seconds);

    // Crear un mapa para asignar IDs
    const idMap = new Map<string, string>();

    this.ventasFiltradas.forEach((venta) => {
      let idVentaFormateado =
        idMap.get(venta.id) ?? `V-${venta.id.slice(-4).toUpperCase()}`; // Agrega "V-" antes del ID

      if (!idMap.has(venta.id)) {
        idMap.set(venta.id, idVentaFormateado);
      }

      venta.productos.forEach((producto: any, index: number) => {
        datos.push({
          'ID Venta': idVentaFormateado, // Usamos el ID formateado
          Fecha: index === 0 ? venta.fecha.toDate().toLocaleDateString() : '', // Solo en la primera fila
          Cantidad: producto.cantidad || 0,
          SKU: producto.sku || '',
          Marca: producto.nombre || '',
          Modelo: producto.modelo || '',
          Talle: producto.talle || '',
          Color: producto.color || '',
          Proveedor: producto.proveedor || '',
          Vendedor: index === 0 ? venta.vendedor?.nombre || '' : '', // Solo en la primera fila
          Costo: producto.costo || '',
          'Precio Unitario': producto.precio || '',
          Subtotal: (producto.precio || 0) * (producto.cantidad || 0), // Cálculo del subtotal,
          'Total Sin Descuento':
            index === 0 ? venta.totalSinDescuento || 0 : '', // Solo en la primera fila
          Descuento: index === 0 ? venta.descuento || 0 : '',
          'Total Venta': index === 0 ? venta.totalConDescuento || 0 : '', // Solo en la primera fila
        });
      });

      // 🔹 Agregar una fila en blanco después de cada venta
      datos.push({
        'ID Venta': '',
        Fecha: '',
        Cantidad: '',
        SKU: '',
        Marca: '',
        Modelo: '',
        Talle: '',
        Color: '',
        Proveedor: '',
        Vendedor: '',
        Costo: '',
        'Precio Unitario': '',
        Subtotal: '',
        Descuento: '',
        'Total Venta': '',
      });
    });

    // Generación del archivo Excel
    const worksheet = XLSX.utils.json_to_sheet(datos);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ventas');

    // Descargar el archivo
    XLSX.writeFile(workbook, 'ventas.xlsx');
  }

  // Método para generar un PDF con desc incluido
  generatePDF(venta: any): void {
    const vendedorNombre =
      venta.vendedor?.nombre.toUpperCase() || 'Desconocido';

    const productos = venta.productos?.map((producto: Product) => [
      {
        text: `${producto.nombre?.toUpperCase() || 'Sin nombre'} - ${
          producto.modelo?.toString().toUpperCase() || 'N/A'
        }`,
        fontSize: 10,
      },
      { text: `${producto.sku?.toUpperCase() || 0}`, fontSize: 10 },
      {
        text: `${producto.cantidad || 0}`,
        fontSize: 10,
        alignment: 'center',
        bold: true,
      },
      {
        text: `$${(producto.precio || 0).toLocaleString('en-US', {
          minimumFractionDigits: 2,
        })}`,
        fontSize: 10,
      },
      {
        text: `$${(
          (producto.precio || 0) * (producto.cantidad || 0)
        ).toLocaleString('en-US', {
          minimumFractionDigits: 2,
        })}`,
        fontSize: 10,
      },
    ]);

    const totalConDescuento =
      venta.totalConDescuento?.toLocaleString('en-US', {
        minimumFractionDigits: 2,
      }) || '0.00';
    const fecha = venta.fecha.toDate()
      ? `${venta.fecha.toDate().toLocaleDateString()} | ${venta.fecha
          .toDate()
          .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      : 'Fecha no disponible';

    const documentDefinition = {
      content: [
        {
          columns: [
            {
              width: '50%',
              text: 'LOGO',
              fit: [120, 80],
              margin: [0, 0, 0, 20],
            },
            {
              width: '50%',
              alignment: 'right',
              text: `\n \n COMPROBANTE\n ID V-${
                venta.id?.slice(-4).toUpperCase() || '12345'
              }`,
              bold: false,
              fontSize: 12,
              margin: [0, 0, 0, 20],
            },
          ],
        },
        {
          columns: [
            {
              width: '*',
              text: `\n \n ${fecha}`,
              fontSize: 12,
            },
            {
              width: '*',
              alignment: 'right', // Alineación a la derecha
              text: `\n \n Vendedor: ${vendedorNombre.toUpperCase()}`,
              fontSize: 12,
            },
          ],
          margin: [0, 0, 0, 10],
        },
        {
          table: {
            headerRows: 1,
            widths: ['*', '*', 'auto', 'auto', 'auto'],
            body: [
              [
                {
                  text: 'PRODUCTOS',
                  bold: true,
                  fillColor: '#001f3f',
                  color: 'white',
                },
                {
                  text: 'SKU',
                  bold: true,
                  fillColor: '#001f3f',
                  color: 'white',
                },
                {
                  text: 'CANT',
                  bold: true,
                  fillColor: '#001f3f',
                  color: 'white',
                },
                {
                  text: 'UNIT',
                  bold: true,
                  fillColor: '#001f3f',
                  color: 'white',
                },
                {
                  text: 'TOTAL',
                  bold: true,
                  fillColor: '#001f3f',
                  color: 'white',
                },
              ],
              [{ text: '', colSpan: 5, margin: [0, 5, 0, 5] }, {}, {}, {}, {}],
              // Filas de productos con márgenes entre ellos
              ...productos.map(
                (fila: Array<{ text: string; fontSize?: number }>) =>
                  fila.map((col) => ({ ...col, margin: [0, 5, 0, 5] }))
              ),
            ],
          },
          margin: [0, 20, 0, 20],
          layout: {
            hLineWidth: (i: number) => (i === 0 ? 1 : 0), // Solo muestra la línea superior
            vLineWidth: () => 0, // Sin líneas verticales
            hLineColor: () => '#001f3f', // Línea superior azul marino
          },
        },
        {
          columns: [
            { width: '*', text: '' },
            { width: '*', text: '' },
            {
              table: {
                widths: ['auto', 'auto'],
                body: [
                  [
                    { text: 'DESCUENTO' },
                    {
                      text: `$${
                        venta.descuento?.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        }) || '0.00'
                      }`,
                      bold: true,
                    },
                  ],
                  [
                    { text: 'TOTAL FINAL' },
                    { text: `$${totalConDescuento}`, bold: true },
                  ],
                ],
              },
              layout: 'noBorders',
            },
          ],
        },
      ],
      footer: (currentPage: number, pageCount: number) => ({
        columns: [
          {
            text: 'metelepatacalzados@gmail.com\nCoronel Mercau 467, Merlo SL\n2664378273 / 2656406178',
            alignment: 'center',
            fontSize: 10,
            margin: [0, 0, 0, 10],
          },
        ],
      }),
      pageMargins: [40, 60, 40, 60],
    };

    pdfMake
      .createPdf(documentDefinition)
      .download(`venta-${venta.id?.toUpperCase()}.pdf`);
  }
}
