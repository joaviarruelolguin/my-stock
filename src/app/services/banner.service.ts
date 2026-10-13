import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import 'firebase/compat/firestore';
import { from, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class BannerService {
  constructor(private firestore: AngularFirestore) {}

  getBanner(): Observable<any> {
    return this.firestore.collection('banner').snapshotChanges();
  }

  editBanner(id: string, data: any): Observable<void> {
    return from(this.firestore.collection('banner').doc(id).update(data));
  }
}
