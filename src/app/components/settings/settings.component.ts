import { Component } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import * as XLSX from 'xlsx';
import { SnackbarService } from '../../services/snackbar.service';
import { Product } from '../../models/product-model';
import { ProductService } from '../../services/product.service';
import { take } from 'rxjs';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
})
export class SettingsComponent {
  nuevoUmbral: number = 5;
  subtitle = 'Preferencias';
  constructor(
    private firestore: AngularFirestore,
    private snackBar: SnackbarService,
    private productService: ProductService
  ) {}

  ngOnInit(): void {
    // Obtener el umbral actual desde Firestore
    this.firestore
      .doc<{ stockThreshold: number }>('config/stockAlert')
      .valueChanges()
      .subscribe((config) => {
        this.nuevoUmbral = config?.stockThreshold || 5;
      });
  }

  guardarUmbral() {
    // Guardar el nuevo umbral en Firestore
    this.firestore
      .doc('config/stockAlert')
      .set({ stockThreshold: this.nuevoUmbral })
      .then((result) => {
        this.snackBar.showSuccess('Se ha modificado el limite de stock');
      })
      .catch((error) => {
        this.snackBar.showError('Se ha producido un error');
      });
  }

  downloadTemplate() {
    // Definimos los datos de la plantilla
    const worksheetData = [
      [
        'nombre',
        'modelo',
        'categoria',
        'proveedor',
        'talle',
        'color',
        'cantidad',
        'costo',
        'precio',
        'sku',
        'imagen',
      ], // Encabezados
      ['', '', '', '', '', '', '', '', '', ''], // Fila vacía como ejemplo
      // [
      //   'EJEMPLO',
      //   'AIR MAX 4',
      //   'ZAPATILLAS',
      //   'JUAN',
      //   '37',
      //   'AZUL',
      //   '4',
      //   '15000',
      //   'EJE-RET-37-AZU',
      //   'https://media2.solodeportes.com.ar/media/catalog/product/cache/7c4f9b393f0b8cb75f2b74fe5e9e52aa/s/a/sandalias-topper-kai-unisex-coral-800010026380001-1.jpg',
      // ],
    ];

    // Creamos la hoja de trabajo
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');

    // Convertimos el workbook a un blob binario
    const excelBuffer: any = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    // Creamos un enlace temporal para la descarga
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla-productos.xlsx';
    a.click();

    // Limpiamos la URL del blob después de la descarga
    URL.revokeObjectURL(url);
  }

  exportExcelAll(): void {
    this.productService
      .obtenerProductos()
      .pipe(take(1))
      .subscribe((productos) => {
        if (!productos || productos.length === 0) {
          this.snackBar.showError('No hay productos para exportar');
          return;
        }

        const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(
          productos.map((product: Product) => ({
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
            // imagen: product.imagen,
          }))
        );

        const wb: XLSX.WorkBook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Todos los Productos');
        XLSX.writeFile(wb, 'Productos_Todos.xlsx');
      });
  }
}
