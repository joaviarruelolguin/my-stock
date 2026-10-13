// create-product-dialog.component.ts

import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogRef,
} from '@angular/material/dialog';
import { SnackbarService } from '../../services/snackbar.service';
import { Provider } from '../../models/provider';
import { ProviderService } from '../../services/provider.service';
import { ApiBarcodeComponent } from '../api-barcode/api-barcode.component';

@Component({
  selector: 'app-create-product-dialog',
  templateUrl: './create-product-dialog.component.html',
  styleUrls: ['./create-product-dialog.component.css'],
})
export class CreateProductDialogComponent implements OnInit {
  creacionProducto: FormGroup;
  providers: Provider[] = [];
  id: string | null;
  loading = false;
  titulo: string = 'Crear Producto';
  submitted = false;

  //NEW
  lastScanResult: string | null = null;

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private providerService: ProviderService,
    private snackBar: SnackbarService,
    private dialogRef: MatDialogRef<CreateProductDialogComponent>,
    private dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.creacionProducto = this.fb.group({
      nombre: ['', Validators.required],
      modelo: ['', Validators.required],
      categoria: [''],
      proveedor: [''],
      imagen: [''],
      cantidad: [1, [Validators.required, Validators.min(0)]],
      precio: [0],
      talle: [''],
      costo: [0],
      color: [''],
      barcode: [''],
    });
    this.id = data ? data.id : null;
  }

  ngOnInit(): void {
    this.esEditar();
    this.obtenerProveedores();
  }

  onEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    keyboardEvent.preventDefault(); // Previene la acción predeterminada del "Enter"
    // Tu lógica aquí
  }

  abrirEscanerCodigoBarras() {
    const dialogRef = this.dialog.open(ApiBarcodeComponent, {
      width: '600px',
    });

    dialogRef.afterClosed().subscribe((resultado) => {
      if (resultado) {
        this.creacionProducto.patchValue({ barcode: resultado });

        //NEW
        this.clearPreviousScanData();
      }
    });
  }

  //NEW
  clearPreviousScanData() {
    this.lastScanResult = null; // Borra el resultado anterior
    console.log('Datos del escaneo anterior eliminados');
  }

  agregarEditarProducto() {
    this.submitted = true;
    if (this.creacionProducto.invalid) {
      return;
    }
    if (this.id) {
      this.modificarProducto(this.id);
    } else {
      this.nuevoProducto();
    }
  }

  // ORIGINAL PREVIO A BUSQUEDA OPTIMIZADA

  nuevoProducto() {
    const fechaActual = new Date();
    const producto: any = {
      nombre: this.creacionProducto.value.nombre.toString().toLowerCase(),
      modelo: this.creacionProducto.value.modelo.toString().toLowerCase(),
      categoria: this.creacionProducto.value.categoria.toString().toLowerCase(),
      proveedor: this.creacionProducto.value.proveedor,
      cantidad: this.creacionProducto.value.cantidad,
      precio: this.creacionProducto.value.precio,
      talle: this.creacionProducto.value.talle,
      costo: this.creacionProducto.value.costo,
      color: this.creacionProducto.value.color.toString().toLowerCase(),
      imagen: this.creacionProducto.value.imagen,
      fechaCreacion: fechaActual,
      fechaActualizacion: fechaActual,

      // Asegúrate de tener el campo sku en el modelo Product
      sku: '', // Inicialmente vacío, lo vamos a generar
      barcode: this.creacionProducto.value.barcode,
    };

    // Generar el SKU usando el método del servicio
    producto.sku = this.productService.generateSKU(producto);

    // Generar keywords asegurando que sean strings, minúsculas y sin valores vacíos
    producto.keywords = [
      producto.nombre.toString(),
      producto.modelo.toString(),
      producto.categoria,
      producto.barcode,
      producto.talle?.toString(), // Convierte a string si es número
      producto.color,
    ]
      .filter((item) => item) // Elimina valores nulos, undefined o vacíos
      .map((item) => item.toLowerCase()); // Convierte todo a minúsculas

    this.loading = true;
    const nombreProducto = this.creacionProducto.value.nombre
      .toString()
      .toUpperCase();
    const modeloProducto = this.creacionProducto.value.modelo
      .toString()
      .toUpperCase();
    const mensaje = `Producto creado: ${nombreProducto} - ${modeloProducto}`;
    this.crearProducto(producto, mensaje);
  }

  // METODO CON LOWERCASE PARA BUSQUEDA OPTIMIZADA

  // nuevoProducto() {
  //   const fechaActual = new Date();
  //   const nombreOriginal = this.creacionProducto.value.nombre.toString();
  //   const modeloOriginal = this.creacionProducto.value.modelo.toString();
  //   const proveedorOriginal = this.creacionProducto.value.proveedor.toString();
  //   const categoriaOriginal = this.creacionProducto.value.categoria.toString();

  //   const producto: any = {
  //     nombre: nombreOriginal.toUpperCase(), // Mantiene el nombre en mayúsculas para visualización
  //     modelo: modeloOriginal.toUpperCase(),
  //     proveedor: proveedorOriginal.toUpperCase(),
  //     categoria: categoriaOriginal,
  //     cantidad: this.creacionProducto.value.cantidad,
  //     precio: this.creacionProducto.value.precio,
  //     talle: this.creacionProducto.value.talle,
  //     color: this.creacionProducto.value.color.toUpperCase(),
  //     imagen: this.creacionProducto.value.imagen,
  //     fechaCreacion: fechaActual,
  //     fechaActualizacion: fechaActual,
  //     sku: '',
  //     barcode: this.creacionProducto.value.barcode,

  //     // 🔹 Campo extra para mejorar la búsqueda 🔹
  //     nombreBusqueda: nombreOriginal.toLowerCase(),
  //   };

  //   // Generar el SKU usando el método del servicio
  //   producto.sku = this.productService.generateSKU(producto);

  //   this.loading = true;
  //   const mensaje = `Producto creado: ${producto.nombre} - ${producto.modelo}`;
  //   this.crearProducto(producto, mensaje);
  // }

  private crearProducto(producto: any, mensaje: string) {
    this.productService.crearProducto(producto).subscribe(
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

  // ORIGINAL PREVIO A BUSQUEDA OPTIMIZADA
  modificarProducto(id: string) {
    const fechaActual = new Date();
    const producto: any = {
      nombre: this.creacionProducto.value.nombre.toLowerCase(),
      modelo: this.creacionProducto.value.modelo.toString().toLowerCase(),
      categoria: this.creacionProducto.value.categoria.toString().toLowerCase(),
      proveedor: this.creacionProducto.value.proveedor,
      cantidad: this.creacionProducto.value.cantidad,
      precio: this.creacionProducto.value.precio,
      talle: this.creacionProducto.value.talle,
      costo: this.creacionProducto.value.costo,
      color: this.creacionProducto.value.color.toString().toLowerCase(),
      imagen: this.creacionProducto.value.imagen,
      fechaActualizacion: fechaActual,

      // Asegúrate de tener el campo sku en el modelo Product
      sku: '', // Nuevamente vacío, por si hay modificación en los campos
      barcode: this.creacionProducto.value.barcode,
    };
    // Generar el SKU usando el método del servicio
    producto.sku = this.productService.generateSKU(producto);

    // Generar keywords asegurando que sean strings, minúsculas y sin valores vacíos
    producto.keywords = [
      producto.nombre.toString(),
      producto.modelo.toString(),
      producto.categoria,
      producto.barcode,
      producto.talle?.toString(), // Convierte a string si es número
      producto.color,
    ]
      .filter((item) => item) // Elimina valores nulos, undefined o vacíos
      .map((item) => item.toLowerCase()); // Convierte todo a minúsculas

    this.loading = true;
    const nombreProducto = this.creacionProducto.value.nombre
      .toString()
      .toUpperCase();
    const modeloProducto = this.creacionProducto.value.modelo
      .toString()
      .toUpperCase();
    const mensaje = `Producto modificado: ${nombreProducto} - ${modeloProducto}`;

    this.productService.editarProducto(id, producto).subscribe(
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

  // modificarProducto(id: string) {
  //   const fechaActual = new Date();
  //   const nombreOriginal = this.creacionProducto.value.nombre
  //     .toString()
  //     .toUpperCase();
  //   const nombreBusqueda = this.creacionProducto.value.nombre
  //     .toString()
  //     .toLowerCase();

  //   const producto: any = {
  //     nombreOriginal, // 🔹 Guardar el nombre en mayúsculas
  //     nombreBusqueda, // 🔹 Guardar el nombre en minúsculas para búsqueda
  //     modelo: this.creacionProducto.value.modelo.toString().toUpperCase(),
  //     categoria: this.creacionProducto.value.categoria.toUpperCase(),
  //     proveedor: this.creacionProducto.value.proveedor.toUpperCase(),
  //     cantidad: this.creacionProducto.value.cantidad,
  //     precio: this.creacionProducto.value.precio,
  //     talle: this.creacionProducto.value.talle,
  //     color: this.creacionProducto.value.color.toUpperCase(),
  //     imagen: this.creacionProducto.value.imagen,
  //     fechaActualizacion: fechaActual,
  //     sku: '', // Se regenerará si hay cambios
  //     barcode: this.creacionProducto.value.barcode,
  //   };

  //   // Generar el SKU usando el método del servicio
  //   producto.sku = this.productService.generateSKU(producto);

  //   this.loading = true;
  //   const mensaje = `Producto modificado: ${nombreOriginal} - ${producto.modelo}`;

  //   this.productService.editarProducto(id, producto).subscribe(
  //     () => {
  //       this.snackBar.showSuccess(mensaje);
  //       this.loading = false;
  //       this.dialogRef.close();
  //     },
  //     (error) => {
  //       this.snackBar.showError('Se ha producido un error');
  //       console.log(error);
  //       this.loading = false;
  //     }
  //   );
  // }

  // ORIGINAL PREVIO A BUSQUEDA OPTIMIZADA

  esEditar() {
    if (this.data) {
      this.creacionProducto.setValue({
        nombre: this.data.nombre || '',
        modelo: this.data.modelo || '',
        categoria: this.data.categoria || '',
        proveedor: this.data.proveedor || '',
        imagen: this.data.imagen || '',
        cantidad: this.data.cantidad || '',
        precio: this.data.precio || '',
        talle: this.data.talle || '',
        costo: this.data.costo || '',
        color: this.data.color || '',
        barcode: this.data.barcode || '',
      });
      this.titulo = 'Editar Producto';
    }
  }

  // esEditar() {
  //   if (this.data) {
  //     this.creacionProducto.setValue({
  //       nombre: this.data.nombreOriginal || this.data.nombre, // 🔹 Mostrar el nombre en mayúsculas
  //       modelo: this.data.modelo || '',
  //       categoria: this.data.categoria || '',
  //       proveedor: this.data.proveedor || '',
  //       imagen: this.data.imagen || '',
  //       cantidad: this.data.cantidad || '',
  //       precio: this.data.precio || '',
  //       talle: this.data.talle || '',
  //       color: this.data.color || '',
  //       barcode: this.data.barcode || '',
  //     });
  //     this.titulo = 'Editar Producto';
  //   }
  // }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.agregarEditarProducto();
    }
  }

  eliminarProducto(): void {
    if (this.id) {
      this.loading = true;
      const nombreProducto = this.creacionProducto.value.nombre.toUpperCase();
      const mensaje = `Producto eliminado: ${nombreProducto}`;

      this.productService
        .eliminarProducto(this.id)
        .then(() => {
          this.snackBar.showSuccess(mensaje);
          this.loading = false;
          this.dialogRef.close();
        })
        .catch((error) => {
          this.snackBar.showError(
            'Se ha producido un error al eliminar el producto'
          );
          console.log(error);
          this.loading = false;
        });
    }
  }

  obtenerProveedores() {
    this.providerService.getProviders().subscribe((data) => {
      this.providers = [];
      data.forEach((element: any) => {
        const providerData = {
          id: element.payload.doc.id,
          ...element.payload.doc.data(),
        };
        this.providers.push(providerData);
      });
    });
  }
}
