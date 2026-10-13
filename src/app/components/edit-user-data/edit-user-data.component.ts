import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BannerService } from '../../services/banner.service';

@Component({
  selector: 'app-edit-user-data',
  templateUrl: './edit-user-data.component.html',
  styleUrls: ['./edit-user-data.component.css'],
})
export class EditUserDataComponent {
  userBackground: string;
  userColor: string;
  userPosition: string;
  id: string;

  constructor(
    public dialogRef: MatDialogRef<EditUserDataComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private bannerService: BannerService
  ) {
    // Cargar los valores actuales
    this.id = data.id;
    this.userBackground = data.userBackground;
    this.userColor = data.userColor;
    this.userPosition = data.userPosition;
  }

  updateBanner() {
    const newData = {
      userBackground: this.userBackground,
      userColor: this.userColor,
      userPosition: this.userPosition,
    };

    this.bannerService.editBanner(this.id, newData).subscribe(() => {
      // this.dialogRef.close(true); // Cerrar el diálogo después de actualizar
    });
  }

  closeDialog() {
    this.dialogRef.close();
  }
}
