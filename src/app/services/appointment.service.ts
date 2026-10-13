import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';

export interface Appointment {
  id?: string;
  cliente: string;
  fecha: string;
  hora: string;
  telefono: string;
  profesional?: string;
  descripcion?: string;
  recordatorio?: string;
  enviarAviso?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private collectionName = 'appointments';

  constructor(private firestore: AngularFirestore) {}

  getAppointments(): Observable<Appointment[]> {
    return this.firestore
      .collection<Appointment>(this.collectionName)
      .valueChanges({ idField: 'id' });
  }

  getAppointmentById(id: string): Observable<Appointment | undefined> {
    return this.firestore
      .collection<Appointment>(this.collectionName)
      .doc(id)
      .valueChanges();
  }

  addAppointment(appointment: Appointment): Promise<any> {
    return this.firestore.collection(this.collectionName).add(appointment);
  }

  updateAppointment(
    id: string,
    appointment: Partial<Appointment>
  ): Promise<void> {
    return this.firestore
      .collection(this.collectionName)
      .doc(id)
      .update(appointment);
  }

  deleteAppointment(id: string): Promise<void> {
    return this.firestore.collection(this.collectionName).doc(id).delete();
  }
}
