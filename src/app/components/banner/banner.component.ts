import { Component } from '@angular/core';
import { EditUserDataComponent } from '../edit-user-data/edit-user-data.component';
import { MatDialog } from '@angular/material/dialog';
import { BannerService } from '../../services/banner.service';

@Component({
  selector: 'app-banner',
  templateUrl: './banner.component.html',
  styleUrls: ['./banner.component.css'],
})
export class BannerComponent {
  imagenCargada: boolean = false;
  datosUser: any[] = [];

  constructor(private bannerService: BannerService, public dialog: MatDialog) {}

  ngOnInit(): void {
    this.cargarDesdeLocalStorage();
    this.getUserData();
  }

  cargarDesdeLocalStorage() {
    const datosGuardados = localStorage.getItem('datosUser');
    if (datosGuardados) {
      this.datosUser = JSON.parse(datosGuardados);
      this.imagenCargada = true;
    }
  }

  getUserData() {
    this.bannerService.getBanner().subscribe((data) => {
      this.datosUser = data.map((element: any) => ({
        id: element.payload.doc.id,
        ...element.payload.doc.data(),
      }));

      // Almacenar en Session Storage

      this.imagenCargada = true;

      localStorage.setItem('datosUser', JSON.stringify(this.datosUser));
    });
  }

  openEditDialog(user: any) {
    const dialogRef = this.dialog.open(EditUserDataComponent, {
      width: '600px',
      data: user,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        console.log('Datos actualizados');
      }
    });
  }
}
