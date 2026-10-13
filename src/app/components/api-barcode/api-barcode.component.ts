import { Component, ElementRef, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-api-barcode',
  templateUrl: './api-barcode.component.html',
  styleUrl: './api-barcode.component.css',
})
export class ApiBarcodeComponent {
  @ViewChild('video', { static: true }) video!: ElementRef<HTMLVideoElement>;

  barcodeDetector: any;
  detectedBarcode: string = ''; // Propiedad para almacenar el código detectado
  loading: boolean = true;

  constructor(public dialogRef: MatDialogRef<ApiBarcodeComponent>) {}

  ngOnInit() {
    setTimeout(() => {
      this.loading = false;
    }, 1000);
    this.startCamera();
  }

  // async startCamera() {
  //   try {
  //     const stream = await navigator.mediaDevices.getUserMedia({
  //       video: { facingMode: 'environment' },
  //     });
  //     this.video.nativeElement.srcObject = stream;

  //     // Esperar a que el video esté listo
  //     this.video.nativeElement.addEventListener('loadeddata', () => {
  //       this.initializeBarcodeDetector();
  //     });
  //   } catch (error) {
  //     console.error('Error al acceder a la cámara: ', error);
  //   }
  // }

  async startCamera() {
    try {
      // Paso 1: Obtener todos los dispositivos de video disponibles
      const devices = await navigator.mediaDevices.enumerateDevices();

      // Paso 2: Buscar la cámara específica con "camera2 0, facing back"
      const videoDevice = devices.find(
        (device) =>
          device.kind === 'videoinput' && device.label.includes('camera2 0')
      );

      let stream;
      if (videoDevice) {
        // Si se encuentra, utiliza esa cámara
        stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: videoDevice.deviceId },
        });
      } else {
        // Si no se encuentra, utiliza la cámara por defecto con 'environment'
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
      }

      // Asignar el stream al elemento de video
      this.video.nativeElement.srcObject = stream;

      // Esperar a que el video esté listo antes de inicializar el detector de código
      this.video.nativeElement.addEventListener('loadeddata', () => {
        this.initializeBarcodeDetector();
      });
    } catch (error) {
      console.error('Error al acceder a la cámara: ', error);
    }
  }

  initializeBarcodeDetector() {
    // Inicializa la instancia de BarcodeDetector
    if ('BarcodeDetector' in window) {
      // Aquí se coloca la línea para configurar los formatos
      this.barcodeDetector = new (window as any).BarcodeDetector({
        formats: ['qr_code', 'code_128', 'ean_13', 'ean_8', 'upc_a', 'upc_e'],
      });
      this.detectBarcode(); // Llama al método de detección
    } else {
      console.error(
        'Barcode Detector API no está disponible en este navegador.'
      );
    }
  }

  detectBarcode() {
    setInterval(async () => {
      if (!this.video.nativeElement.paused && !this.video.nativeElement.ended) {
        try {
          const barcodes = await this.barcodeDetector.detect(
            this.video.nativeElement
          );
          if (barcodes.length > 0) {
            barcodes.forEach((barcode: any) => {
              const resultString = barcode.rawValue;
              this.onCodeResult(resultString); // Llamada a onCodeResult cuando se detecta un código
            });
          }
        } catch (error) {
          console.error('Error al detectar código de barras: ', error);
        }
      }
    }, 1000);
  }

  onCodeResult(resultString: string) {
    this.detectedBarcode = resultString;
    setTimeout(() => {
      this.dialogRef.close(resultString); // Cierra el diálogo y pasa el resultado
    }, 1000);
  }
}
