import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import {
  BehaviorSubject,
  catchError,
  finalize,
  from,
  map,
  Observable,
  of,
  switchMap,
  take,
  tap,
} from 'rxjs';
import { Product } from '../models/product-model';
import { AgrupacionProducto } from '../models/group-product.model';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  constructor(
    private firestore: AngularFirestore,
    //AGREGAMOS STORAGE Y HTTP (PARA ALMACENAR EL JSON DE LOS PRODUCTOS 29/01/25)
    private storage: AngularFireStorage,
    private http: HttpClient
  ) {}

  // METODO ORIGINAL
  // obtenerProductos(): Observable<any> {
  //   return this.firestore
  //     .collection('products', (ref) => ref.orderBy('cantidad', 'desc'))
  //     .snapshotChanges();
  // }

  obtenerProductos(): Observable<Product[]> {
    return this.firestore
      .collection('products', (ref) => ref.orderBy('cantidad', 'desc'))
      .snapshotChanges()
      .pipe(
        map((actions) =>
          actions.map((a) => {
            const { id, ...data } = a.payload.doc.data() as Product;
            return { id, ...data };
          })
        )
      );
  }

  // MODIFICACION 15/01/25 PRODUCTOS POR LOTES PAGINADOS 🟩

  obtenerProductosPaginados(limit: number, lastDoc?: any): Observable<any> {
    let query = this.firestore.collection('products', (ref) =>
      ref.orderBy('cantidad', 'desc').limit(limit)
    );

    if (lastDoc) {
      query = this.firestore.collection('products', (ref) =>
        ref.orderBy('cantidad', 'desc').startAfter(lastDoc).limit(limit)
      );
    }

    return query.snapshotChanges();
  }

  // //NUEVO METODO (SE CREO LA COLECCION METADATA/COUNTERS/COUNT QUE OBTIENE LA CANTIDAD DE PRODUCTOS DESDE LA COLECCION, EL ANTERIOR METODO REALIZABA LECTURAS CONSTANTEMENTE) 🟩
  contarProductos(): Observable<number> {
    return this.firestore
      .doc<{ count: number }>('metadata/counters')
      .valueChanges()
      .pipe(map((data) => data?.count || 0));
  }

  // //BUSQUEDA OPTIMIZADA CON MENORES LECTURAS 🟩 ANTERIOR A MODIFICACIÓN 13/3/2025 (MÁS RECIENTE)
  // buscarProductos(termino: string): Observable<any> {
  //   const terminoNormalizado = termino.toLowerCase();

  //   return this.firestore
  //     .collection('products', (ref) =>
  //       ref.where('keywords', 'array-contains', terminoNormalizado)
  //     )
  //     .valueChanges({ idField: 'id' })
  //     .pipe(
  //       catchError((error) => {
  //         console.error('Error en buscarProductos:', error);
  //         return of([]); // Devuelve un array vacío en caso de error
  //       })
  //     );
  // }

  //Se traen todos los productos y se filtran en el frontend, lo que puede ser ineficiente si tienes muchos productos. ❌
  buscarProductos(termino: string): Observable<any> {
    const terminoNormalizado = termino.toLowerCase();

    return this.firestore
      .collection('products')
      .valueChanges({ idField: 'id' })
      .pipe(
        map((productos: any[]) =>
          productos.filter((producto) =>
            producto.keywords?.some((kw: string) =>
              kw.includes(terminoNormalizado)
            )
          )
        ),
        catchError((error) => {
          console.error('Error en buscarProductos:', error);
          return of([]);
        })
      );
  }

  //Solo por nombre
  // buscarProductos(termino: string): Observable<any> {
  //   const terminoNormalizado = termino.toLowerCase();
  //   // console.log(`Buscando productos con término: ${terminoNormalizado}`);

  //   return this.firestore
  //     .collection('products', (ref) =>
  //       ref
  //         .orderBy('nombre')
  //         .startAt(terminoNormalizado)
  //         .endAt(terminoNormalizado + '\uf8ff')
  //     )
  //     .valueChanges({ idField: 'id' })
  //     .pipe(
  //       // tap((data) => console.log('Productos encontrados:', data)),
  //       catchError((error) => {
  //         console.error('Error en buscarProductos:', error);
  //         return of([]); // Devuelve un array vacío en caso de error
  //       })
  //     );
  // }

  //BUSCA EN TODA LA BD
  // buscarProductos(termino: string): Observable<any> {
  //   return this.firestore
  //     .collection('products')
  //     .snapshotChanges()
  //     .pipe(
  //       map((actions) =>
  //         actions.map((a) => {
  //           const data = a.payload.doc.data() as any;
  //           const id = a.payload.doc.id;
  //           return { id, ...data };
  //         })
  //       ),
  //       map((products) =>
  //         products.filter((product) => {
  //           const lowerTerm = termino.toLowerCase();
  //           return Object.keys(product).some((key) => {
  //             const value = product[key];
  //             return (
  //               typeof value === 'string' &&
  //               value.toLowerCase().includes(lowerTerm)
  //             );
  //           });
  //         })
  //       )
  //     );
  // }

  // METODO ORIGINAL
  // crearProducto(content: any): Observable<any> {
  //   return from(this.firestore.collection('products').add(content));
  // }

  //25/01/25 METODO CON ACTUALIZACION DE CONTADOR 🟩

  crearProducto(content: any): Observable<any> {
    // Primero, crear el producto
    const createProduct$ = from(
      this.firestore.collection('products').add(content)
    );

    // Luego, obtener el contador actual de productos
    const updateCounter$ = this.contarProductos().pipe(
      take(1), // Tomamos solo el primer valor del contador (evitar suscripción infinita)
      switchMap((currentCount) => {
        const newCount = currentCount + 1; // Incrementar el contador
        return this.firestore
          .doc('metadata/counters')
          .update({ count: newCount });
      })
    );

    // Combinar ambos flujos en secuencia
    return createProduct$.pipe(switchMap(() => updateCounter$));
  }

  //////////////////////////////////
  ///////////////////////////////
  ///////////////

  editarProducto(id: string, data: any): Observable<void> {
    return from(this.firestore.collection('products').doc(id).update(data));
  }

  // METODO ORIGINAL CON CONTADOR EN FUNCION SIGUIENTE 🟩
  eliminarProducto(id: string): Promise<any> {
    return this.firestore.collection('products').doc(id).delete();
  }

  decrementarContador(cantidad: number): Promise<void> {
    const contadorRef = this.firestore.doc('metadata/counters');
    return this.firestore.firestore.runTransaction(async (transaction) => {
      const contadorDoc = await transaction.get(contadorRef.ref);
      if (contadorDoc.exists) {
        const contadorData = contadorDoc.data() as { count: number };
        const newCount = (contadorData?.count || 0) - cantidad;
        transaction.update(contadorRef.ref, { count: newCount });
      }
    });
  }

  //25/01/25 METODO CON ACTUALIZACION DE CONTADOR
  // eliminarProducto(id: string): Promise<any> {
  //   // Primero, eliminar el producto
  //   const deleteProduct = this.firestore
  //     .collection('products')
  //     .doc(id)
  //     .delete();

  //   // Luego, obtener el contador actual de productos y actualizarlo
  //   const updateCounter = this.contarProductos()
  //     .pipe(
  //       take(1), // Tomamos solo el primer valor del contador
  //       switchMap((currentCount = 0) => {
  //         const newCount = currentCount > 0 ? currentCount - 1 : 0; // Decrementar el contador (evitar número negativo)
  //         return this.firestore
  //           .doc('metadata/counters')
  //           .update({ count: newCount });
  //       })
  //     )
  //     .toPromise(); // Convertimos el observable en promesa para que se ejecute correctamente

  //   // Esperar a que ambos procesos se completen (eliminación del producto y actualización del contador)
  //   return Promise.all([deleteProduct, updateCounter]);
  // }

  //////////////////////
  ////////////
  /////
  ///

  updateProductStock(productId: string, newStock: number): Promise<void> {
    return this.firestore
      .collection('products')
      .doc(productId)
      .update({ cantidad: newStock });
  }

  obtenerId(id: string): Observable<any> {
    return this.firestore.collection('products').doc(id).snapshotChanges();
  }

  // METODO ANTERIOR (ORIGINAL) A MODIFICACION 24/01/25
  groupProductsByName(): Observable<AgrupacionProducto[]> {
    return this.firestore
      .collection<Product>('products', (ref) => ref.orderBy('nombre'))
      .snapshotChanges()
      .pipe(
        map((actions: any[]) => {
          const productos: Product[] = actions.map((a) => {
            const data = a.payload.doc.data() as Product;
            const id = a.payload.doc.id;
            return { ...data, id };
          });

          const groupedProducts: Record<string, AgrupacionProducto> = {};

          productos.forEach((producto) => {
            // Limpiar espacios y convertir a minúsculas
            const nombreLimpio = producto.nombre.trim().toLowerCase();
            const { cantidad, imagen, categoria } = producto;

            if (!groupedProducts[nombreLimpio]) {
              groupedProducts[nombreLimpio] = {
                nombre: producto.nombre.trim(), // Mantén la capitalización original para mostrar
                productos: [],
                totalCantidad: 0,
                imagen,
                categoria,
              };
            }

            groupedProducts[nombreLimpio].productos.push(producto);
            groupedProducts[nombreLimpio].totalCantidad += cantidad;
          });

          return Object.values(groupedProducts);
        }),
        catchError((error: any) => {
          console.error('Error al agrupar productos:', error);
          return [];
        })
      );
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////////

  //METODO DE AGRUPACION DE PRODUCTOS CON JSON EN FIRESTORAGE 29/01/2025
  // groupProductsByName(): Observable<{
  //   data: AgrupacionProducto[];
  //   fromCache: boolean;
  // }> {
  //   const fileRef = this.storage.ref('productosAgrupados.json');

  //   // Intentar cargar desde Firebase Storage
  //   return from(fileRef.getDownloadURL()).pipe(
  //     switchMap((url) => this.http.get(url)), // Descargar el archivo JSON
  //     map((data: any) => ({
  //       data,
  //       fromCache: true,
  //     })),
  //     catchError(() => {
  //       // Si no hay caché, obtener datos desde Firestore
  //       return this.firestore
  //         .collection<Product>('products', (ref) => ref.orderBy('nombre'))
  //         .snapshotChanges()
  //         .pipe(
  //           map((actions) => {
  //             const productos: Product[] = actions.map((a) => {
  //               const data = a.payload.doc.data() as Product;
  //               const id = a.payload.doc.id;
  //               return { ...data, id };
  //             });

  //             const groupedProducts: Record<string, AgrupacionProducto> = {};

  //             productos.forEach((producto) => {
  //               const nombreLimpio = producto.nombre.trim().toLowerCase();
  //               const { cantidad, imagen, categoria } = producto;

  //               if (!groupedProducts[nombreLimpio]) {
  //                 groupedProducts[nombreLimpio] = {
  //                   nombre: producto.nombre.trim(),
  //                   productos: [],
  //                   totalCantidad: 0,
  //                   imagen,
  //                   categoria,
  //                 };
  //               }

  //               groupedProducts[nombreLimpio].productos.push(producto);
  //               groupedProducts[nombreLimpio].totalCantidad += cantidad;
  //             });

  //             const agrupados = Object.values(groupedProducts);

  //             // Guardar JSON en Firebase Storage
  //             this.saveToFirebaseStorage(agrupados);

  //             return {
  //               data: agrupados,
  //               fromCache: false,
  //             };
  //           }),
  //           catchError((error) => {
  //             console.error('Error al agrupar productos:', error);
  //             return of({ data: [], fromCache: false });
  //           })
  //         );
  //     })
  //   );
  // }

  // private saveToFirebaseStorage(data: any): Promise<void> {
  //   const jsonData = JSON.stringify(data);
  //   const fileRef = this.storage.ref('productosAgrupados.json');
  //   return fileRef
  //     .putString(jsonData, 'raw', { contentType: 'application/json' })
  //     .then(() => {
  //       console.log('Archivo JSON guardado en Firebase Storage');
  //     });
  // }

  /////////////////////////////////////////////////////////////////////////////////
  //OBTENER PRODUCTOS DESDE JSON EN FIRESTORAGE

  // obtenerProductosFireStorage(): Observable<any> {
  //   const productosFileUrl = 'productos.json'; // Ruta del archivo JSON con los productos en Firebase Storage

  //   // Intentar obtener el archivo JSON de productos desde Firebase Storage
  //   return this.storage
  //     .ref(productosFileUrl)
  //     .getDownloadURL()
  //     .pipe(
  //       switchMap((url: string) => this.http.get(url)), // Descargar el archivo JSON desde Firebase Storage
  //       catchError(() => {
  //         // Si el archivo no está disponible en Firebase Storage, obtener los productos desde Firestore
  //         return this.firestore
  //           .collection('products', (ref) => ref.orderBy('cantidad', 'desc'))
  //           .snapshotChanges()
  //           .pipe(
  //             map((actions: any[]) => {
  //               // Mapear los productos desde Firestore
  //               const productos = actions.map((a) => {
  //                 const data = a.payload.doc.data() as Product;
  //                 const id = a.payload.doc.id;
  //                 return { ...data, id };
  //               });

  //               // Subir los productos obtenidos desde Firestore a Firebase Storage en formato JSON
  //               this.uploadProductosToStorage(productos);

  //               return productos;
  //             })
  //           );
  //       })
  //     );
  // }

  // private uploadProductosToStorage(productos: Product[]): void {
  //   const productosFileUrl = 'productos.json';
  //   const jsonData = JSON.stringify(productos);

  //   // Subir los productos a Firebase Storage
  //   this.storage
  //     .ref(productosFileUrl)
  //     .putString(jsonData, 'raw', { contentType: 'application/json' })
  //     .then(() => {
  //       console.log('Productos subidos correctamente a Firebase Storage.');
  //     })
  //     .catch((error) => {
  //       console.error('Error al subir productos a Firebase Storage:', error);
  //     });
  // }

  /////////////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////////////

  generateSKU(product: Product): string {
    // Asegúrate de que las propiedades existen antes de acceder a ellas
    // const idOriginal = product.id.substring(16, 20).toUpperCase(); Valor por defecto
    const marca = product.nombre
      ? product.nombre.toString().substring(0, 3).toUpperCase()
      : 'N/A'; // Valor por defecto
    const modelo = product.modelo
      ? product.modelo.toString().substring(0, 3).toUpperCase()
      : 'N/A'; // Valor por defecto
    const color = product.color
      ? product.color.substring(0, 3).toUpperCase()
      : 'N/A'; // Valor por defecto
    const talle = product.talle || 'N/A'; // Valor por defecto

    // Combinar para crear el SKU
    // const sku = `${modelo}-${color}-${talle}-${idOriginal}`;
    const sku = `${marca}-${modelo}-${talle}-${color}`;
    return sku;
  }

  getProductByCode(scannedCode: string): Observable<Product | null> {
    return this.firestore
      .collection<Product>('products', (ref) =>
        ref.where('barcode', '==', scannedCode)
      )
      .snapshotChanges()
      .pipe(
        map((actions: any[]) => {
          if (actions.length > 0) {
            const product = actions[0].payload.doc.data() as Product;
            product.id = actions[0].payload.doc.id; // Añadir el ID del producto
            return product;
          } else {
            return null; // Producto no encontrado
          }
        }),
        catchError((error: any) => {
          console.error('Error al obtener el producto por código:', error);
          return of(null); // Manejo de error
        })
      );
  }
}
