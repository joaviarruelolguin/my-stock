import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { from, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GastosService {
  constructor(private firestore: AngularFirestore) {}

  obtenerGastos(): Observable<any> {
    return this.firestore
      .collection('gastos', (ref) => ref.orderBy('fecha', 'desc')) // Ordenar por fecha en orden descendente
      .snapshotChanges();
  }

  nuevoGasto(content: any): Observable<any> {
    return from(this.firestore.collection('gastos').add(content));
  }

  editarGasto(id: string, data: any): Observable<void> {
    return from(this.firestore.collection('gastos').doc(id).update(data));
  }

  eliminarGasto(id: string): Promise<any> {
    return this.firestore.collection('gastos').doc(id).delete();
  }
}
