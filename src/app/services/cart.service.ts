import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { firstValueFrom, map, Observable } from 'rxjs';
import { Product } from '../models/product-model';
import { Cart } from '../models/cart.model';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { AgrupacionProducto } from '../models/group-product.model';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  constructor(
    private firestore: AngularFirestore,
    private storage: AngularFireStorage
  ) {}

  getCartCollection(): Observable<any> {
    return this.firestore
      .collection('cart', (ref) => ref.orderBy('cantidad', 'desc'))
      .snapshotChanges();
  }

  //MODIFICACIÓN 13/01/25 - AGREGAMOS MÉTODO DE ACTUALIZACIÓN DE STOCK ENCAPSULADO
  private async actualizarStock(
    productId: string,
    nuevoStock: number
  ): Promise<void> {
    try {
      await this.firestore
        .collection('products')
        .doc(productId)
        .update({ cantidad: nuevoStock });
    } catch (error) {
      console.error('Error al actualizar el stock:', error);
      throw new Error('No se pudo actualizar el stock');
    }
  }

  // MODIFICACION 29-01-25 ALMACENANDO JSON EN FIRESTORE
  // async agregarAlCarrito(product: Product, qty: number) {
  //   try {
  //     // Validar si la cantidad solicitada excede el stock disponible
  //     if (qty > product.cantidad) {
  //       throw new Error('No hay suficiente stock disponible.');
  //     }

  //     // Buscar si el producto ya está en el carrito
  //     const cartItemsSnapshot = await firstValueFrom(
  //       this.firestore
  //         .collection('cart', (ref) =>
  //           ref.where('idOriginal', '==', product.id)
  //         )
  //         .get()
  //     );

  //     const nuevoStock = product.cantidad - qty;

  //     if (!cartItemsSnapshot.empty) {
  //       // El producto ya está en el carrito, actualizar la cantidad
  //       const cartItem = cartItemsSnapshot.docs[0];
  //       const currentCartItem = cartItem.data() as Cart;

  //       // Calcular la nueva cantidad y el subtotal
  //       const nuevaCantidad = currentCartItem.cantidad + qty;
  //       const nuevoSubtotal = product.precio * nuevaCantidad;

  //       // Actualizar el producto en el carrito con la nueva cantidad y subtotal
  //       await this.firestore.collection('cart').doc(cartItem.id).update({
  //         cantidad: nuevaCantidad,
  //         subtotal: nuevoSubtotal,
  //       });
  //     } else {
  //       // El producto no está en el carrito, agregarlo como nuevo
  //       const productToCart: Cart = {
  //         ...product, // Copia todas las propiedades del producto
  //         id: this.firestore.createId(),
  //         cantidad: qty,
  //         idOriginal: product.id,
  //         subtotal: product.precio * qty,
  //       };

  //       // Agregar el producto al carrito
  //       await this.firestore
  //         .collection('cart')
  //         .doc(productToCart.id)
  //         .set(productToCart);
  //     }

  //     // Actualizar el stock del producto original
  //     await this.actualizarStock(product.id, nuevoStock);

  //     // 🔹 Nuevo método para actualizar el JSON en Firebase Storage
  //     await this.actualizarArchivoEnStorage();
  //   } catch (error) {
  //     console.error('Error al agregar al carrito:', error);
  //   }
  // }

  // async actualizarArchivoEnStorage() {
  //   try {
  //     // Obtener los productos actualizados desde Firestore
  //     const productosSnapshot = await firstValueFrom(
  //       this.firestore.collection<Product>('products').get()
  //     );

  //     const productos: Product[] = productosSnapshot.docs.map((doc) => {
  //       const data = doc.data() as Product;
  //       return data.id ? data : { ...data, id: doc.id };
  //     });

  //     // Agrupar productos por nombre
  //     const groupedProducts: Record<string, AgrupacionProducto> = {};

  //     productos.forEach((producto) => {
  //       const nombreLimpio = producto.nombre.trim().toLowerCase();
  //       const { cantidad, imagen, categoria } = producto;

  //       if (!groupedProducts[nombreLimpio]) {
  //         groupedProducts[nombreLimpio] = {
  //           nombre: producto.nombre.trim(),
  //           productos: [],
  //           totalCantidad: 0,
  //           imagen,
  //           categoria,
  //         };
  //       }

  //       groupedProducts[nombreLimpio].productos.push(producto);
  //       groupedProducts[nombreLimpio].totalCantidad += cantidad;
  //     });

  //     const agrupados = Object.values(groupedProducts);
  //     const jsonData = JSON.stringify(agrupados);

  //     // Subir el nuevo archivo JSON a Firebase Storage
  //     const fileRef = this.storage.ref('productosAgrupados.json');
  //     await fileRef.putString(jsonData, 'raw', {
  //       contentType: 'application/json',
  //     });

  //     console.log('Archivo JSON actualizado en Firebase Storage.');
  //   } catch (error) {
  //     console.error(
  //       'Error al actualizar el archivo JSON en Firebase Storage:',
  //       error
  //     );
  //   }
  // }
  /////////////////////////////////////////////////////////////////////////////////////

  //MODIFICACIÓN 25/01/25 - NUEVO MÉTODO agregarAlCarrito (Con actualizarStock y actualizarCache incluido)

  async agregarAlCarrito(product: Product, qty: number) {
    try {
      // Validar si la cantidad solicitada excede el stock disponible
      if (qty > product.cantidad) {
        throw new Error('No hay suficiente stock disponible.');
      }

      // Buscar si el producto ya está en el carrito
      const cartItemsSnapshot = await firstValueFrom(
        this.firestore
          .collection('cart', (ref) =>
            ref.where('idOriginal', '==', product.id)
          )
          .get()
      );

      const nuevoStock = product.cantidad - qty;

      if (!cartItemsSnapshot.empty) {
        // El producto ya está en el carrito, actualizar la cantidad
        const cartItem = cartItemsSnapshot.docs[0];
        const currentCartItem = cartItem.data() as Cart;

        // Calcular la nueva cantidad y el subtotal
        const nuevaCantidad = currentCartItem.cantidad + qty;
        const nuevoSubtotal = product.precio * nuevaCantidad;

        // Actualizar el producto en el carrito con la nueva cantidad y subtotal
        await this.firestore.collection('cart').doc(cartItem.id).update({
          cantidad: nuevaCantidad,
          subtotal: nuevoSubtotal,
        });
      } else {
        // El producto no está en el carrito, agregarlo como nuevo
        const productToCart: Cart = {
          ...product, // Copia todas las propiedades del producto
          id: this.firestore.createId(),
          cantidad: qty,
          idOriginal: product.id,
          subtotal: product.precio * qty,
        };

        // Agregar el producto al carrito
        await this.firestore
          .collection('cart')
          .doc(productToCart.id)
          .set(productToCart);
      }

      // Actualizar el stock del producto original
      await this.actualizarStock(product.id, nuevoStock);

      // Actualizar el caché SI ELIMINAMOS LA ESTRATEGIA DE CACHE EN SU TOTALIDAD A ESTE METODO SOLO HAY QUE BORRAR  el método del servicio actualizarCache)
      // this.actualizarCache(product.id, nuevoStock);
    } catch (error) {
      console.error('Error al agregar al carrito:', error);
    }
  }

  // Guardar los datos actualizados en el caché
  // private actualizarCache(productId: string, nuevoStock: number): void {
  //   const cachedData = localStorage.getItem('productosAgrupados');
  //   if (cachedData) {
  //     const productosAgrupados = JSON.parse(cachedData);

  //     for (const grupo of productosAgrupados) {
  //       for (const producto of grupo.productos) {
  //         if (producto.id === productId) {
  //           producto.cantidad = nuevoStock; // Actualizar el stock
  //           grupo.totalCantidad -= producto.cantidad; // Ajustar el total del grupo
  //           break;
  //         }
  //       }
  //     }

  //     localStorage.setItem(
  //       'productosAgrupados',
  //       JSON.stringify(productosAgrupados)
  //     );
  //   }
  // }

  //Método anterior a 25/01/25 //
  // async agregarAlCarrito(product: Product, qty: number) {
  //   try {
  //     // Buscar si el producto ya está en el carrito
  //     const cartItemsSnapshot = await firstValueFrom(
  //       this.firestore
  //         .collection('cart', (ref) =>
  //           ref.where('idOriginal', '==', product.id)
  //         )
  //         .get()
  //     );

  //     if (!cartItemsSnapshot.empty) {
  //       // El producto ya está en el carrito, actualizar la cantidad
  //       const cartItem = cartItemsSnapshot.docs[0];
  //       const currentCartItem = cartItem.data() as Cart;

  //       // Sumar la nueva cantidad a la existente
  //       const nuevaCantidad = currentCartItem.cantidad + qty;

  //       // Actualizar el stock del producto original
  //       const nuevoStock = product.cantidad - qty;

  //       await this.firestore
  //         .collection('products')
  //         .doc(product.id)
  //         .update({ cantidad: nuevoStock });

  //       // Actualizar el producto en el carrito con la nueva cantidad
  //       await this.firestore
  //         .collection('cart')
  //         .doc(cartItem.id)
  //         .update({
  //           cantidad: nuevaCantidad,
  //           subtotal: product.precio * nuevaCantidad,
  //         });
  //     } else {
  //       // El producto no está en el carrito, agregarlo como nuevo
  //       const nuevoStock = product.cantidad - qty;

  //       // Actualizar el stock del producto original
  //       await this.firestore
  //         .collection('products')
  //         .doc(product.id)
  //         .update({ cantidad: nuevoStock });

  //       // Crear una copia del producto con la cantidad específica para el carrito
  //       const productToCart: Cart = {
  //         ...product, // Copia todas las propiedades del producto
  //         id: this.firestore.createId(),
  //         cantidad: qty,
  //         idOriginal: product.id,
  //         subtotal: product.precio * qty,
  //       };

  //       // Agregar el producto al carrito
  //       await this.firestore
  //         .collection('cart')
  //         .doc(productToCart.id)
  //         .set(productToCart);
  //     }
  //   } catch (error) {
  //     console.error('Error al agregar al carrito:', error);
  //   }
  // }

  //

  async eliminarDelCarrito(cartItemId: string, cantidadEliminar?: number) {
    try {
      const cartItemSnapshot = await firstValueFrom(
        this.firestore.collection('cart').doc(cartItemId).get()
      );
      const cartItem = cartItemSnapshot.data() as Cart;

      if (cartItem && cartItem.idOriginal) {
        const productSnapshot = await firstValueFrom(
          this.firestore.collection('products').doc(cartItem.idOriginal).get()
        );

        if (!productSnapshot.exists) {
          // Si el producto original no existe, eliminar directamente del carrito
          await this.firestore.collection('cart').doc(cartItemId).delete();
          console.log(
            `Producto ${cartItem.nombre} eliminado del carrito porque no existe en la colección 'products'.`
          );
          return;
        }

        const product = productSnapshot.data() as Product;

        if (product) {
          if (!cantidadEliminar || cantidadEliminar >= cartItem.cantidad) {
            // Si no se especifica cantidad o se elimina todo, actualiza el stock y elimina el item del carrito
            const nuevoStock = product.cantidad + cartItem.cantidad;
            await this.firestore
              .collection('products')
              .doc(cartItem.idOriginal)
              .update({ cantidad: nuevoStock });
            await this.firestore.collection('cart').doc(cartItemId).delete();
          } else {
            // Actualiza el stock y la cantidad en el carrito
            const nuevoStock = product.cantidad + cantidadEliminar;
            const nuevaCantidad = cartItem.cantidad - cantidadEliminar;
            await this.firestore
              .collection('products')
              .doc(cartItem.idOriginal)
              .update({ cantidad: nuevoStock });
            await this.firestore
              .collection('cart')
              .doc(cartItemId)
              .update({
                cantidad: nuevaCantidad,
                subtotal: product.precio * nuevaCantidad,
              });
          }
        }
      }
    } catch (error) {
      console.error('Error eliminando del carrito:', error);
    }
  }

  getTotalProductosEnCarrito(): Observable<number> {
    return this.firestore
      .collection('cart')
      .valueChanges()
      .pipe(
        map((productos: any[]) => {
          return productos.reduce(
            (total, producto) => total + producto.cantidad,
            0
          );
        })
      );
  }

  async clearCart(cartItems: Cart[]): Promise<void> {
    const batch = this.firestore.firestore.batch();

    for (const item of cartItems) {
      const productRef = this.firestore
        .collection('products')
        .doc(item.idOriginal).ref;
      const cartRef = this.firestore.collection('cart').doc(item.id).ref;

      try {
        // Actualizar la cantidad del producto en su ID original
        const productSnapshot = await productRef.get();
        if (productSnapshot.exists) {
          const productData = productSnapshot.data() as Product;
          const newStock = productData.cantidad + item.cantidad;

          batch.update(productRef, { cantidad: newStock });
        }
        // Eliminar el producto del carrito
        batch.delete(cartRef);
      } catch (error) {
        console.error('Error al devolver el producto:', error);
      }
    }

    try {
      // Ejecutar el batch
      await batch.commit();
    } catch (error) {
      console.error('Error al limpiar el carrito:', error);
    }
  }

  deleteCartProducts(cartItems: Cart[]): Promise<void> {
    const batch = this.firestore.firestore.batch();
    cartItems.forEach((item) => {
      const docRef = this.firestore.collection('cart').doc(item.id).ref;
      batch.delete(docRef);
    });
    return batch.commit(); // Elimina todos los documentos en una operación por lotes
  }
}
//ORIGINAL
//  agregarAlCarrito(product: Product, qty: number) {
//   const nuevoStock = product.cantidad - qty;

//   // Actualizar el stock del producto original
//   this.firestore
//     .collection('products')
//     .doc(product.id)
//     .update({ cantidad: nuevoStock });

//   this.firestore.collection('cart').doc(product.id).update({ cantidad: qty });

//   // Crear una copia del producto con la cantidad específica para el carrito
//   const productToCart = {
//     ...product,
//     //id: product.id,
//     id: this.firestore.createId(),
//     cantidad: qty,
//   };

//   // Agregar el producto al carrito
//   this.firestore.collection('cart').doc(productToCart.id).set(productToCart);
// }
