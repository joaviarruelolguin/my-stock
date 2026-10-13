import { Component, Input, OnChanges } from '@angular/core';

@Component({
  selector: 'app-count-up',
  template: `<div>{{ prefix }}{{ displayCount }}</div>`,
  styles: [
    `
      div {
        font-size: 2rem;
        text-align: center;
      }
    `,
  ],
})
export class CountUpComponent implements OnChanges {
  @Input() target: number = 0;
  @Input() duration: number = 2000; // Duración en milisegundos
  @Input() prefix: string = ''; // Prefijo para el valor (e.g., "$")

  displayCount: string = '0';

  private startCountUp() {
    const absoluteTarget = Math.abs(this.target); // Usamos el valor absoluto
    const start = 0;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / this.duration, 1);
      const currentCount = Math.floor(progress * absoluteTarget); // Objetivo absoluto
      this.displayCount = currentCount.toLocaleString();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  ngOnChanges() {
    this.startCountUp();
  }
}
