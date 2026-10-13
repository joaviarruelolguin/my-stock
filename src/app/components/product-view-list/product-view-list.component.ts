import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { Product } from '../../models/product-model';
import { MatSort } from '@angular/material/sort';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { CartService } from '../../services/cart.service';
import { MatDialog } from '@angular/material/dialog';
import { SnackbarService } from '../../services/snackbar.service';
import { ProductService } from '../../services/product.service';
import { QtyDialogComponent } from '../qty-dialog/qty-dialog.component';
import { UserService } from '../../services/user.service';
import { DeleteDialogComponent } from '../delete-dialog/delete-dialog.component';
import { CreateProductDialogComponent } from '../create-product-dialog/create-product-dialog.component';
import * as XLSX from 'xlsx';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { StockAlertService } from '../../services/stock-alert.service';
import { ApiBarcodeComponent } from '../api-barcode/api-barcode.component';

@Component({
  selector: 'app-product-view-list',
  templateUrl: './product-view-list.component.html',
  styleUrl: './product-view-list.component.css',
})
export class ProductViewListComponent implements OnInit {
  stockThreshold: number = 5; // Valor por defecto
  loading: boolean = false;
  isAdmin: boolean = false;
  fileName = 'ExcelSheet.xlsx'; // Nombre del archivo Excel a exportar.
  productos: Product[] = [];

  // 15/01/25 🟩
  pageSize = 25;
  lastDoc: any = null;
  totalProductos: number = 0;
  //

  displayedColumns: string[] = [
    'select',
    'acciones',
    'imagen',
    'modelo',
    // 'nombreOriginal',
    //  ORIGINAL PREVIO A BUSQUEDA OPTIMIZADA  ⬇
    'nombre',
    // 'categoria',
    'talle',

    'color',
    'cantidad',
    'proveedor',
    'costo',
    'precio',
    'sku',
  ];
  dataSource = new MatTableDataSource<Product>();
  selectedProducts: Set<string> = new Set<string>(); // IDs de productos seleccionados

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  //NEW
  @ViewChild('barcodeCanvas', { static: false }) barcodeCanvas!: ElementRef;
  @ViewChild('input') input!: ElementRef;

  constructor(
    private productService: ProductService,
    private userService: UserService,
    private cartService: CartService,
    private dialog: MatDialog,
    private stockAlertService: StockAlertService,
    private snackBar: SnackbarService
  ) {}

  //PARA METODO ORIGINAL DE GETPRODUCTS
  // ngOnInit() {
  //   this.loading = true;
  //   this.getProductos();
  //   this._isUserAdmin();
  //   this.obtenerUmbralStock();
  // }

  // ngAfterViewInit() {
  //   this.dataSource.paginator = this.paginator;
  //   this.dataSource.sort = this.sort;
  // }

  clearInput(input: HTMLInputElement) {
    input.value = '';
    this.applyFilter({ target: input } as unknown as Event); // Convierte primero a 'unknown' y luego a 'Event'
  }

  // 15/01/25 🟩
  ngOnInit() {
    this.loading = true;
    this.productService.contarProductos().subscribe((total) => {
      this.totalProductos = total;
    });
    this.getProductos(this.pageSize);
    this._isUserAdmin();
    this.obtenerUmbralStock();
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
  }

  cambiarPagina(event: PageEvent) {
    const pageSize = event.pageSize; // Tamaño de página
    const pageIndex = event.pageIndex; // Índice de la página actual

    // Calcular el desplazamiento y actualizar la lista de productos
    this.getProductos(pageSize, pageIndex === 0 ? undefined : this.lastDoc);
  }

  // //MODIFICACION 15/01/25 PRODUCTOS POR LOTES PAGINADOS 🟩
  getProductos(limit: number, lastDoc?: any): void {
    this.loading = true;

    this.productService
      .obtenerProductosPaginados(limit, lastDoc)
      .subscribe((data) => {
        const productos = data.map((element: any) => ({
          id: element.payload.doc.id,
          ...element.payload.doc.data(),
        }));

        // Actualiza el dataSource para sincronizar con la tabla
        this.dataSource.data = productos;

        // Actualiza la referencia al último documento para la paginación
        this.lastDoc =
          data.length > 0 ? data[data.length - 1].payload.doc : null;

        // Cambia el estado de carga
        this.loading = false;
      });
  }

  /////////////////////////////////////////
  //////////////////////////////////////
  /////////////////////////

  generateSku(product: Product) {
    this.loading = true;
    const newSku = this.productService.generateSKU(product);
    this.productService.editarProducto(product.id, { sku: newSku });
    setTimeout(() => {
      this.loading = false;
    }, 500);
  }

  _isUserAdmin() {
    this.userService.isUserAdmin().subscribe((isAdmin) => {
      this.isAdmin = isAdmin;
    });
  }

  obtenerUmbralStock() {
    this.stockAlertService.getStockThreshold().subscribe((threshold) => {
      this.stockThreshold = threshold;
    });
  }

  openBarcodeScanner(): void {
    const dialogRef = this.dialog.open(ApiBarcodeComponent, {
      width: '600px',
      height: '500px',
      data: {}, // Puedes pasar data si lo necesitas
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.input.nativeElement.value = result; // Inserta el código en el input
        this.applyFilter({ target: this.input.nativeElement } as Event); // Aplica el filtro
      }
    });
  }

  //APPLY FILTER CON PAGINACIÓN 🟩
  applyFilter(event: Event) {
    this.loading = true;
    const filterValue = (event.target as HTMLInputElement).value
      .trim()
      .toLowerCase();
    if (filterValue) {
      this.productService.buscarProductos(filterValue).subscribe(
        (data) => {
          this.productos = data;
          this.dataSource.data = this.productos;
          if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
          }
          this.loading = false;
        },
        (error) => {
          console.error('Error searching products:', error);
          this.loading = false;
        }
      );
    } else {
      this.getProductos(this.pageSize);
      if (this.dataSource.paginator) {
        this.dataSource.paginator.firstPage();
      }
      this.loading = false;
    }
  }

  // APPLY FILTER ORIGINAL
  // applyFilter(event: Event) {
  //   const filterValue = (event.target as HTMLInputElement).value;
  //   this.dataSource.filter = filterValue.trim().toLowerCase();

  //   if (this.dataSource.paginator) {
  //     this.dataSource.paginator.firstPage();
  //   }
  // }

  // METODO ORIGINAL, OBTIENE LA TOTALIDAD DE LOS PRODUCTOS DESDE LA BASE DE DATOS
  // getProductos() {
  //   setTimeout(() => {
  //     this.productService.obtenerProductos().subscribe((data) => {
  //       this.productos = [];
  //       data.forEach((element: any) => {
  //         this.productos.push({
  //           id: element.payload.doc.id,
  //           ...element.payload.doc.data(),
  //         });
  //       });
  //       this.dataSource.data = this.productos;
  //       this.loading = false;
  //     });
  //   }, 500);
  // }

  //VERSION CON JSON EN FIRESTORAGE
  // getProductos() {
  //   setTimeout(() => {
  //     this.productService.obtenerProductosFireStorage().subscribe((data) => {
  //       this.productos = [];

  //       // Verificar si los productos provienen de Firebase Storage o Firestore
  //       if (data === null) {
  //         console.log('Los productos fueron obtenidos desde Firestore(BD).');
  //       } else {
  //         console.log('Los productos fueron obtenidos desde Firebase Storage.');
  //       }

  //       // Llenar el array de productos con los datos obtenidos
  //       data.forEach((producto: any) => {
  //         this.productos.push(producto);
  //       });

  //       // Actualizar la tabla con los productos
  //       this.dataSource.data = this.productos;
  //       this.loading = false;
  //     });
  //   }, 500);
  // }

  eliminarProducto(id: string): void {
    this.productService
      .eliminarProducto(id) // Pasa ambos argumentos
      .then(
        () => this.snackBar.showSuccess('Se ha eliminado el producto'),
        (error) => {
          console.log('Error eliminando producto:', error);
          this.snackBar.showError('Se ha producido un error');
        }
      );
  }

  openDialog(content?: any): void {
    const dialogRef = this.dialog.open(CreateProductDialogComponent, {
      width: '600px',
      data: content, // Pasa datos a través del diálogo si estás en modo de edición
      autoFocus: false,
    });
    // Al cerrar el diálogo, limpiamos los productos seleccionados
    dialogRef.afterClosed().subscribe(() => {
      this.limpiarSeleccionProductos(); // Limpiar selección
    });
  }

  openDeleteDialog(product: { id: string }): void {
    const dialogRef = this.dialog.open(DeleteDialogComponent, {
      width: '450px',
      data: { id: product.id }, // Pasar los datos al diálogo
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'confirm') {
        // Llama a eliminarProducto con ambos argumentos
        this.eliminarProducto(product.id);
      } else {
        this.limpiarSeleccionProductos();
      }
    });
  }

  //MODIFICACIÓN 13/01/25 - AGREGAMOS SPINNER AL MOVER PRODCUTO AL CARRITO
  async moveProductToCart(product: Product) {
    const dialogRef = this.dialog.open(QtyDialogComponent, {
      width: '450px',
      data: { cantidad: 1, title: 'Agregar al Carrito' }, // Valor inicial
    });

    const result = await dialogRef.afterClosed().toPromise();
    this.loading = true; // Activar loading antes de ejecutar la lógica
    if (result === null || result === undefined) {
      // El usuario canceló la operación
      this.loading = false; // Desactivar loading
      return;
    }
    const upperName = product.nombre.toUpperCase();
    const cantidadNumerica = parseInt(result || '0', 10);
    if (cantidadNumerica > 0 && cantidadNumerica <= product.cantidad) {
      try {
        await this.cartService.agregarAlCarrito(product, cantidadNumerica);
        product.cantidad -= cantidadNumerica; // Actualiza la cantidad en el arreglo original
        this.snackBar.showSuccess(
          `Se agregó ${upperName} - ${product.modelo} al carrito`
        );
      } catch (error) {
        this.snackBar.showError('Error al agregar el producto al carrito');
      }
    } else {
      this.snackBar.showError('Cantidad inválida');
    }

    this.loading = false; // Desactivar loading al finalizar la operación
  } //

  agregarStock(product: Product): void {
    // Abrir el diálogo para ingresar la cantidad
    const dialogRef = this.dialog.open(QtyDialogComponent, {
      width: '450px',
      data: { cantidad: null, title: 'Agregar Stock' },
    });

    // Cuando el diálogo se cierra, obtenemos la cantidad seleccionada
    dialogRef.afterClosed().subscribe((cantidadAgregar: number | undefined) => {
      if (cantidadAgregar !== undefined && cantidadAgregar > 0) {
        const cantidadNueva = product.cantidad + cantidadAgregar;

        // Actualizamos el producto en Firestore
        this.productService
          .editarProducto(product.id, { cantidad: cantidadNueva })
          .subscribe(() => {
            this.snackBar.showSuccess(
              `Se agregaron ${cantidadAgregar} unidades a ${product.nombre} - ${product.modelo}`
            );

            // Actualizar la cantidad en la lista local
            product.cantidad = cantidadNueva;
            this.limpiarSeleccionProductos();
          });
      } else if (cantidadAgregar === undefined || cantidadAgregar === null) {
        // No hacer nada si el diálogo se cerró sin ingresar una cantidad válida
        return this.limpiarSeleccionProductos();
      } else {
        this.snackBar.showError('Cantidad inválida');
        this.limpiarSeleccionProductos();
      }
    });
  }

  restarStock(product: Product): void {
    // Abrir el diálogo para ingresar la cantidad
    const dialogRef = this.dialog.open(QtyDialogComponent, {
      width: '450px',
      data: { cantidad: null, title: 'Restar Stock' },
    });

    // Cuando el diálogo se cierra, obtenemos la cantidad seleccionada
    dialogRef.afterClosed().subscribe((cantidadAgregar: number | undefined) => {
      if (cantidadAgregar !== undefined && cantidadAgregar > 0) {
        const cantidadNueva = product.cantidad - cantidadAgregar;

        // Verificar si el stock resultante sería menor a 0
        if (cantidadNueva < 0) {
          this.snackBar.showError(
            `No se pueden restar ${cantidadAgregar} unidades, el stock actual es ${product.cantidad}`
          );
          return this.limpiarSeleccionProductos(); // Detener el proceso si la cantidad excede el stock
        }

        // Actualizamos el producto en Firestore
        this.productService
          .editarProducto(product.id, { cantidad: cantidadNueva })
          .subscribe(() => {
            this.snackBar.showSuccess(
              `Se restaron ${cantidadAgregar} unidades a ${product.nombre} - ${product.modelo}`
            );

            // Actualizar la cantidad en la lista local
            product.cantidad = cantidadNueva;
            this.limpiarSeleccionProductos();
          });
      } else if (cantidadAgregar === undefined || cantidadAgregar === null) {
        return this.limpiarSeleccionProductos(); // Si no se seleccionó una cantidad válida, no hacer nada
      } else {
        this.snackBar.showError('Cantidad inválida');
        this.limpiarSeleccionProductos();
      }
    });
  }

  //ORIGINAL
  // toggleSelection(id: string): void {
  //   this.selectedProducts.has(id)
  //     ? this.selectedProducts.delete(id)
  //     : this.selectedProducts.add(id);
  // }

  // toggleSelectAll(event: MatCheckboxChange): void {
  //   if (event.checked) {
  //     this.dataSource.filteredData.forEach((row) =>
  //       this.selectedProducts.add(row.id)
  //     );
  //   } else {
  //     this.selectedProducts.clear();
  //   }
  // }

  // isSelected(id: string): boolean {
  //   return this.selectedProducts.has(id);
  // }

  //
  /////////////////////////////////////////////////////////////////

  //CON PAGINACIÓN ⬇ 🟩

  allSelectedProducts: any[] = [];

  toggleSelection(id: string): void {
    if (this.selectedProducts.has(id)) {
      this.selectedProducts.delete(id);
      this.allSelectedProducts = this.allSelectedProducts.filter(
        (product) => product.id !== id
      );
    } else {
      this.selectedProducts.add(id);
      const product = this.dataSource.data.find((product) => product.id === id);
      if (product) {
        this.allSelectedProducts.push(product);
      }
    }
  }

  toggleSelectAll(event: MatCheckboxChange): void {
    if (event.checked) {
      this.dataSource.filteredData.forEach((row) => {
        this.selectedProducts.add(row.id);
        if (
          !this.allSelectedProducts.some((product) => product.id === row.id)
        ) {
          this.allSelectedProducts.push(row);
        }
      });
    } else {
      this.dataSource.filteredData.forEach((row) => {
        this.selectedProducts.delete(row.id);
        this.allSelectedProducts = this.allSelectedProducts.filter(
          (product) => product.id !== row.id
        );
      });
    }
  }

  isSelected(id: string): boolean {
    return this.selectedProducts.has(id);
  }

  isAnyProductSelected(): boolean {
    return this.selectedProducts.size > 0;
  }

  isManyProductSelected(): boolean {
    return this.selectedProducts.size > 1;
  }

  getSelectedProduct(): any | null {
    const selectedIds = Array.from(this.selectedProducts);
    return (
      this.dataSource.filteredData.find(
        (product) => product.id === selectedIds[0]
      ) || null
    );
  }

  // Método para limpiar la selección de productos
  limpiarSeleccionProductos(): void {
    this.selectedProducts.clear();
  }

  async deleteSelectedProducts(): Promise<void> {
    const dialogRef = this.dialog.open(ConfirmDialogComponent);

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result === 'confirm') {
        this.loading = true; // Iniciar el loading antes del if

        try {
          if (this.selectedProducts.size === 1) {
            const id = Array.from(this.selectedProducts)[0];
            await this.productService.eliminarProducto(id);
            //LINEA AGREGADA PARA DECREMENTAR EL CONTADOR DE PRODUCTOS AL ELIMINAR  EN BATCH ⬇ 🟩
            await this.productService.decrementarContador(1);
            //
            this.snackBar.showSuccess('Producto eliminado con éxito');
            this.selectedProducts.clear();
          } else {
            await this.batchDeleteProducts();
          }
        } catch (error) {
          this.snackBar.showError('Error eliminando productos');
        } finally {
          this.loading = false; // Siempre ocultar el loading en el finally
        }
      } else {
        this.limpiarSeleccionProductos();
      }
    });
  }

  async batchDeleteProducts(): Promise<void> {
    const batchOperations = Array.from(this.selectedProducts).map((id) =>
      this.productService.eliminarProducto(id)
    );

    try {
      await Promise.all(batchOperations);
      //LINEA AGREGADA PARA DECREMENTAR EL CONTADOR DE PRODUCTOS AL ELIMINAR  EN BATCH ⬇ 🟩
      await this.productService.decrementarContador(this.selectedProducts.size);
      //
      this.snackBar.showSuccess('Productos eliminados con éxito');
    } catch (error) {
      this.snackBar.showError('Error al eliminar productos');
    } finally {
      this.selectedProducts.clear(); // Limpiar selección después de la eliminación
    }
  }

  // ORIGINAL
  // exportExcelSelection(): void {
  //   const selectedData = this.dataSource.data.filter((product) =>
  //     this.isSelected(product.id)
  //   );

  //   if (selectedData.length === 0) {
  //     this.snackBar.showError('Debe seleccionar al menos un producto');
  //     return;
  //   }

  //   const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(
  //     selectedData.map((product) => ({
  //       nombre: product.nombre,
  //       modelo: product.modelo,
  //       categoria: product.categoria,
  //       proveedor: product.proveedor,
  //       talle: product.talle,
  //       color: product.color,
  //       cantidad: product.cantidad,
  //       precio: product.precio,
  //       sku: product.sku,
  //     }))
  //   );

  //   const wb: XLSX.WorkBook = XLSX.utils.book_new();
  //   XLSX.utils.book_append_sheet(wb, ws, 'Productos Seleccionados');
  //   XLSX.writeFile(wb, 'Productos_Seleccionados.xlsx');
  //   this.selectedProducts.clear();
  // }

  //con paginación ⬇

  exportExcelSelection(): void {
    if (this.allSelectedProducts.length === 0) {
      this.snackBar.showError('Debe seleccionar al menos un producto');
      return;
    }

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(
      this.allSelectedProducts.map((product) => ({
        nombre: product.nombre,
        modelo: product.modelo,
        categoria: product.categoria,
        proveedor: product.proveedor,
        talle: product.talle,
        color: product.color,
        cantidad: product.cantidad,
        costo: product.costo,
        precio: product.precio,
        sku: product.sku,
        imagen: product.imagen,
      }))
    );

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Productos Seleccionados');
    XLSX.writeFile(wb, 'Productos_Seleccionados.xlsx');
    this.selectedProducts.clear();
    this.allSelectedProducts = [];
  }
}
