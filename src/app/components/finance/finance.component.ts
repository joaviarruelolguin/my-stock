import { Component } from '@angular/core';
import { GastosService } from '../../services/gastos.service';
import { UserService } from '../../services/user.service';
import ApexCharts from 'apexcharts';
import { SalesService } from '../../services/sales.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-finance',
  templateUrl: './finance.component.html',
  styleUrl: './finance.component.css',
})
export class FinanceComponent {
  subtitle = 'Finanzas';
  meses = [
    { nombre: 'Enero', num: 1 },
    { nombre: 'Febrero', num: 2 },
    { nombre: 'Marzo', num: 3 },
    { nombre: 'Abril', num: 4 },
    { nombre: 'Mayo', num: 5 },
    { nombre: 'Junio', num: 6 },
    { nombre: 'Julio', num: 7 },
    { nombre: 'Agosto', num: 8 },
    { nombre: 'Septiembre', num: 9 },
    { nombre: 'Octubre', num: 10 },
    { nombre: 'Noviembre', num: 11 },
    { nombre: 'Diciembre', num: 12 },
  ];

  loading: boolean = true; // Indica si el spinner está activo
  dataLoaded: boolean = false; // Indica si los datos están listos para mostrarse

  lineChart: ApexCharts | null = null;
  salesByVendorChart: ApexCharts | null = null;

  vendedorColores: { [vendedor: string]: string } = {};

  totalGastosMesActual: number = 0;
  totalVentasMesActual: number = 0;
  balanceMesActual: number = 0;

  totalGastosPorMes: { [mes: string]: number } = {};

  totalVentasPorMes: { [mes: string]: number } = {}; // Nuevo objeto para ventas
  totalVentasDia: number = 0; // Para las ventas del día
  totalVentas: number = 0; // Para el total de todas las ventas

  ventasPorVendedorPorMes: { [vendedor: string]: { [mes: string]: number } } =
    {};

  // isAdmin: boolean = false;

  constructor(
    private gastosService: GastosService,
    private userService: UserService,
    private salesService: SalesService
  ) {}

  ngAfterViewInit(): void {
    this.loading = true; // Activa el spinner al iniciar
    Promise.all([
      this.obtenerGastos(),
      this.obtenerVentas(),
      // this._isUserAdmin(),
      this.initLineChart(),
      this.initSalesByVendorChart(),
    ])
      .then(() => {
        this.dataLoaded = true; // Marca los datos como listos
      })
      .finally(() => {
        this.loading = false; // Desactiva el spinner
      });
  }

  // _isUserAdmin() {
  //   this.userService.isUserAdmin().subscribe((isAdmin) => {
  //     this.isAdmin = isAdmin;
  //   });
  // }

  obtenerGastos(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.gastosService.obtenerGastos().subscribe(
        (data) => {
          this.totalGastosPorMes = {}; // Reinicia el total de cada mes
          data.forEach((element: any) => {
            const gastoData = {
              id: element.payload.doc.id,
              ...element.payload.doc.data(),
            };
            this.calcularGastosMensuales(gastoData);
          });
          this.updateLineChart(); // Actualizar el gráfico después de obtener los datos
          this.calcularTotalesMesActual();
          resolve(); // Resuelve la promesa cuando los datos están listos
        },
        (error) => reject(error)
      );
    });
  }

  obtenerVentas(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.salesService.getVentas().subscribe(
        (data) => {
          this.ventasPorVendedorPorMes = {};
          this.totalVentasPorMes = {};
          this.totalVentasDia = 0;

          data.forEach((element: any) => {
            const ventaData = {
              id: element.payload.doc.id,
              ...element.payload.doc.data(),
            };
            this.calcularVentasMensuales(ventaData);
            this.calcularVentasPorVendedor(ventaData);
            this.calcularTotalesMesActual();
            this.obtenerBalanceMensual();
          });
          this.updateLineChart();
          this.updateSalesByVendorChart();

          resolve(); // Resuelve la promesa cuando los datos están listos
        },
        (error) => reject(error)
      );
    });
  }

  obtenerBalanceMensual() {
    this.balanceMesActual = 0;
    if (this.totalGastosMesActual > 0 && this.totalVentasMesActual > 0) {
      this.balanceMesActual =
        this.totalVentasMesActual - this.totalGastosMesActual;
    }
  }

  private convertirTimestampADate(fecha: any): Date {
    return new Date(fecha.seconds * 1000);
  }

  calcularGastosMensuales(gastoData: any) {
    // Convertimos la fecha utilizando la función convertirTimestampADate
    gastoData.fecha = this.convertirTimestampADate(gastoData.fecha);

    const mesNumero = gastoData.fecha.getMonth() + 1;
    const anio = gastoData.fecha.getFullYear();
    const mesNombre =
      this.meses.find((m) => m.num === mesNumero)?.nombre || 'Mes desconocido';
    const mes = `${mesNombre}-${anio}`; // Incluimos el año en la clave

    if (!this.totalGastosPorMes[mes]) {
      this.totalGastosPorMes[mes] = 0;
    }
    this.totalGastosPorMes[mes] += gastoData.monto || 0;
  }

  calcularVentasMensuales(ventaData: any) {
    // Convertimos la fecha utilizando la función convertirTimestampADate
    ventaData.fecha = this.convertirTimestampADate(ventaData.fecha);

    const mesNumero = ventaData.fecha.getMonth() + 1;
    const anio = ventaData.fecha.getFullYear();
    const mesNombre =
      this.meses.find((m) => m.num === mesNumero)?.nombre || 'Mes desconocido';
    const mes = `${mesNombre}-${anio}`; // Incluimos el año en la clave

    if (!this.totalVentasPorMes[mes]) {
      this.totalVentasPorMes[mes] = 0;
    }

    const montoVenta = ventaData.totalConDescuento || 0;
    this.totalVentasPorMes[mes] += montoVenta;
    this.totalVentas += montoVenta;

    const hoy = new Date();
    if (
      ventaData.fecha.getDate() === hoy.getDate() &&
      ventaData.fecha.getMonth() === hoy.getMonth() &&
      ventaData.fecha.getFullYear() === hoy.getFullYear()
    ) {
      this.totalVentasDia += montoVenta;
    }
  }

  calcularVentasPorVendedor(ventaData: any) {
    if (ventaData.fecha && ventaData.vendedor?.nombre) {
      const anioActual = new Date().getFullYear();
      const anioVenta = ventaData.fecha.getFullYear();

      // Filtrar solo ventas del año actual
      if (anioVenta === anioActual) {
        const mesNumero = ventaData.fecha.getMonth() + 1;
        const mesNombre =
          this.meses.find((m) => m.num === mesNumero)?.nombre || 'Desconocido';
        const mesConAnio = `${mesNombre}-${anioActual}`; // Usamos clave con mes y año
        const vendedor = ventaData.vendedor.nombre;
        const colorVendedor = ventaData.vendedor.color || '#000';

        const colorMapping: { [key: string]: string } = {
          rojo: '#fb0909',
          azul: '#0d09fb',
          amarillo: '#edfe06',
          verde: '#04ff00',
          naranja: '#f97316',
          purple: '#a855f7',
          pink: '#ec4899',
          teal: '#14b8a6',
        };

        const mappedColor =
          colorMapping[colorVendedor.toLowerCase()] || colorVendedor;

        if (!this.ventasPorVendedorPorMes[vendedor]) {
          this.ventasPorVendedorPorMes[vendedor] = {};
        }
        if (!this.ventasPorVendedorPorMes[vendedor][mesConAnio]) {
          this.ventasPorVendedorPorMes[vendedor][mesConAnio] = 0;
        }

        this.ventasPorVendedorPorMes[vendedor][mesConAnio] +=
          ventaData.totalConDescuento || 0;

        if (!this.vendedorColores[vendedor]) {
          this.vendedorColores[vendedor] = mappedColor;
        }
      }
    }
  }

  calcularTotalesMesActual() {
    const fechaActual = new Date();
    const mesActual = fechaActual.getMonth() + 1;
    const anioActual = fechaActual.getFullYear();
    const mesNombre = this.meses.find((m) => m.num === mesActual)?.nombre || '';
    const mesConAnio = `${mesNombre}-${anioActual}`; // Incluimos el año en la clave

    this.totalGastosMesActual = this.totalGastosPorMes[mesConAnio] || 0;
    this.totalVentasMesActual = this.totalVentasPorMes[mesConAnio] || 0;
  }

  initLineChart() {
    const chartConfig: ApexCharts.ApexOptions = {
      series: [
        {
          name: 'Gastos',
          data: this.meses.map((m) => this.totalGastosPorMes[m.nombre] || 0),
        },
        {
          name: 'Ventas',
          data: this.meses.map((m) => this.totalVentasPorMes[m.nombre] || 0),
        },
      ],
      chart: {
        type: 'line',
        height: '400',
        background: '#f9fafb', // Fondo gris claro para un look moderno
        toolbar: {
          show: true,
        },
        zoom: {
          enabled: false,
        },
        animations: {
          enabled: true,
        },
      },
      colors: ['#dc2626', '#16a34a'], // Colores modernos y llamativos
      xaxis: {
        categories: this.meses.map((m) => m.nombre.slice(0, 3)),
        labels: {
          style: {
            colors: '#6b7280', // Texto oscuro para mayor contraste
            fontSize: '13px',
          },
        },
        axisBorder: {
          color: '#E5E7EB',
        },
        axisTicks: {
          color: '#E5E7EB',
        },
      },
      yaxis: {
        labels: {
          formatter: (val) => `$${val.toLocaleString('en-US')}`,
          style: {
            colors: '#6b7280',
            fontSize: '13px',
          },
        },
        axisBorder: {
          color: '#E5E7EB',
        },
      },
      tooltip: {
        theme: 'dark', // Tema oscuro para el tooltip
        y: {
          formatter: (val) => `$${val.toLocaleString('en-US')}`,
        },
      },
      stroke: {
        curve: 'smooth',
        width: 2,
        lineCap: 'round',
      },
      grid: {
        show: true,
        borderColor: '#ddd',
        strokeDashArray: 4,
        xaxis: {
          lines: {
            show: true,
          },
        },
        yaxis: {
          lines: {
            show: true,
          },
        },
        padding: {
          top: 10,
          right: 15,
        },
      },
      legend: {
        show: false,
        fontSize: '13px',
        fontWeight: '600',
        labels: {
          colors: '#374151', // Cambia el color de las letras a blanco
        },
      },
    };

    const chartElement = document.querySelector('#lineChart');
    if (chartElement) {
      this.lineChart = new ApexCharts(chartElement, chartConfig);
      this.lineChart.render();
    } else {
      console.error('El elemento del gráfico no se encuentra en el DOM.');
    }
  }

  updateLineChart() {
    if (this.lineChart) {
      const gastosData = this.meses.map((m) => {
        const mesConAnio = `${m.nombre}-${new Date().getFullYear()}`; // Modificar si se requiere otro año
        return this.totalGastosPorMes[mesConAnio] || 0;
      });

      const ventasData = this.meses.map((m) => {
        const mesConAnio = `${m.nombre}-${new Date().getFullYear()}`; // Modificar si se requiere otro año
        return this.totalVentasPorMes[mesConAnio] || 0;
      });

      this.lineChart.updateSeries([
        { name: 'Gastos', data: gastosData },
        { name: 'Ventas', data: ventasData },
      ]);
    }
  }

  initSalesByVendorChart() {
    const chartConfig: ApexCharts.ApexOptions = {
      series: [],
      chart: {
        type: 'bar',
        height: '400',
        background: '#fff',
        toolbar: {
          show: true,
        },
        zoom: {
          enabled: true, // Desactiva el zoom para evitar problemas de desplazamiento
        },
        animations: {
          enabled: true, // Puedes cambiar esto a `false` si no necesitas animaciones
        },
      },
      colors: ['#FF4560', '#60a563'], // Color para cada línea
      plotOptions: {
        bar: {
          borderRadius: 0, // Bordes redondeados en las barras para darle un toque moderno
          columnWidth: '60%', // Ancho de las barras; aumentar para hacerlas más gruesas
        },
      },
      xaxis: {
        categories: this.meses.map((m) => m.nombre.slice(0, 3)), // Abreviatura de los meses
        labels: {
          style: {
            colors: '#6b7280',
            fontSize: '13px',
          },
        },
      },

      yaxis: {
        labels: {
          formatter: (val) => `$${val.toLocaleString('en-US')}`, // Formato monetario
          style: {
            colors: '#6b7280',
            fontSize: '13px',
          },
        },
      },
      tooltip: {
        theme: 'dark',
        y: {
          formatter: (val) => `$${val.toLocaleString('en-US')}`, // Añadir símbolo de $ en tooltip
        },
      },
      stroke: {
        curve: 'smooth', // Esto le da un estilo de línea más suave
      },
      grid: {
        show: true,
        borderColor: '#ddd',
        strokeDashArray: 5,
        xaxis: {
          lines: {
            show: true,
          },
        },
        padding: {
          top: 5,
          right: 20,
        },
      },
      dataLabels: {
        enabled: false, // Desactivar las etiquetas de datos en las barras
      },
      legend: {
        fontSize: '13px',
        fontWeight: '600',
        labels: {
          colors: '#374151', // Cambia el color de las letras a blanco
        },
      },
    };

    const chartElement = document.querySelector('#salesByVendorChart');
    if (chartElement) {
      this.salesByVendorChart = new ApexCharts(chartElement, chartConfig);
      this.salesByVendorChart.render();
    }
  }

  updateSalesByVendorChart() {
    if (this.salesByVendorChart) {
      const anioActual = new Date().getFullYear();
      const seriesData = Object.keys(this.ventasPorVendedorPorMes).map(
        (vendedor) => {
          return {
            name:
              vendedor.charAt(0).toUpperCase() +
              vendedor.slice(1).toLowerCase(),
            data: this.meses.map((m) => {
              const mesConAnio = `${m.nombre}-${anioActual}`;
              return this.ventasPorVendedorPorMes[vendedor][mesConAnio] || 0;
            }),
          };
        }
      );

      const colors = Object.keys(this.vendedorColores).map(
        (vendedor) => this.vendedorColores[vendedor]
      );

      this.salesByVendorChart.updateOptions({
        series: seriesData,
        colors: colors,
      });
    }
  }

  // exportarTablaExcel() {
  //   const fechaActual = new Date();
  //   const anioActual = fechaActual.getFullYear();

  //   // Preparar las filas con los datos de cada mes
  //   const filas = Object.keys(this.totalGastosPorMes)
  //     .filter((mes) => mes.includes(`-${anioActual}`)) // Filtra solo los meses del año actual
  //     .map((mes) => {
  //       const gastos = this.totalGastosPorMes[mes] || 0;
  //       const ventas = this.totalVentasPorMes[mes] || 0;
  //       const balance = ventas - gastos;

  //       return {
  //         Mes: mes.replace(`-${anioActual}`, ''), // Quitar el año del nombre del mes
  //         Gastos: gastos,
  //         Ventas: ventas,
  //         Balance: balance,
  //       };
  //     })
  //     .reverse(); // Invertir el orden de los meses

  //   // Cálculo de los totales
  //   const totalGastos = filas.reduce((acc, fila) => acc + fila.Gastos, 0);
  //   const totalVentas = filas.reduce((acc, fila) => acc + fila.Ventas, 0);
  //   const balanceTotal = filas.reduce((acc, fila) => acc + fila.Balance, 0);

  //   // Añadir fila de totales
  //   filas.push({
  //     Mes: 'Total',
  //     Gastos: totalGastos,
  //     Ventas: totalVentas,
  //     Balance: balanceTotal,
  //   });

  //   // Crear la hoja de cálculo
  //   const worksheet = XLSX.utils.json_to_sheet(filas);
  //   const workbook = XLSX.utils.book_new();
  //   XLSX.utils.book_append_sheet(workbook, worksheet, 'Balances');

  //   // Descargar el archivo Excel
  //   XLSX.writeFile(workbook, `Balance-${anioActual}.xlsx`);
  // }

  exportarTablaExcel() {
    const fechaActual = new Date();
    const anioActual = fechaActual.getFullYear();

    // Crear un mapa para el orden cronológico de los meses
    const ordenMeses = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];

    // Obtener una lista única de todos los meses relevantes
    const mesesUnicos = new Set([
      ...Object.keys(this.totalGastosPorMes).filter((mes) =>
        mes.includes(`-${anioActual}`)
      ),
      ...Object.keys(this.totalVentasPorMes).filter((mes) =>
        mes.includes(`-${anioActual}`)
      ),
    ]);

    // Preparar las filas con los datos de cada mes
    const filas = Array.from(mesesUnicos)
      .map((mes) => {
        const gastos = this.totalGastosPorMes[mes] || 0;
        const ventas = this.totalVentasPorMes[mes] || 0;
        const balance = ventas - gastos;

        return {
          Mes: mes.replace(`-${anioActual}`, ''), // Quitar el año del nombre del mes
          Gastos: gastos,
          Ventas: ventas,
          Balance: balance,
        };
      })
      // Ordenar los meses de acuerdo al calendario
      .sort((a, b) => ordenMeses.indexOf(a.Mes) - ordenMeses.indexOf(b.Mes));

    // Cálculo de los totales
    const totalGastos = filas.reduce((acc, fila) => acc + fila.Gastos, 0);
    const totalVentas = filas.reduce((acc, fila) => acc + fila.Ventas, 0);
    const balanceTotal = filas.reduce((acc, fila) => acc + fila.Balance, 0);

    // Añadir fila de totales
    filas.push({
      Mes: 'Total',
      Gastos: totalGastos,
      Ventas: totalVentas,
      Balance: balanceTotal,
    });

    // Crear la hoja de cálculo
    const worksheet = XLSX.utils.json_to_sheet(filas);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Balances');

    // Descargar el archivo Excel
    XLSX.writeFile(workbook, `Balance-${anioActual}.xlsx`);
  }
}

// import { Component } from '@angular/core';
// import { GastosService } from '../../services/gastos.service';
// import { UserService } from '../../services/user.service';
// import ApexCharts from 'apexcharts';
// import { SalesService } from '../../services/sales.service';
// import * as XLSX from 'xlsx';

// @Component({
//   selector: 'app-finance',
//   templateUrl: './finance.component.html',
//   styleUrl: './finance.component.css',
// })
// export class FinanceComponent {
//   meses = [
//     { nombre: 'Enero', num: 1 },
//     { nombre: 'Febrero', num: 2 },
//     { nombre: 'Marzo', num: 3 },
//     { nombre: 'Abril', num: 4 },
//     { nombre: 'Mayo', num: 5 },
//     { nombre: 'Junio', num: 6 },
//     { nombre: 'Julio', num: 7 },
//     { nombre: 'Agosto', num: 8 },
//     { nombre: 'Septiembre', num: 9 },
//     { nombre: 'Octubre', num: 10 },
//     { nombre: 'Noviembre', num: 11 },
//     { nombre: 'Diciembre', num: 12 },
//   ];

//   lineChart: ApexCharts | null = null;
//   salesByVendorChart: ApexCharts | null = null;

//   vendedorColores: { [vendedor: string]: string } = {};

//   totalGastosMesActual: number = 0;
//   totalVentasMesActual: number = 0;
//   balanceMesActual: number = 0;

//   totalGastosPorMes: { [mes: string]: number } = {};

//   totalVentasPorMes: { [mes: string]: number } = {}; // Nuevo objeto para ventas
//   totalVentasDia: number = 0; // Para las ventas del día
//   totalVentas: number = 0; // Para el total de todas las ventas

//   ventasPorVendedorPorMes: { [vendedor: string]: { [mes: string]: number } } =
//     {};

//   isAdmin: boolean = false;

//   constructor(
//     private gastosService: GastosService,
//     private userService: UserService,
//     private salesService: SalesService
//   ) {}

//   ngAfterViewInit(): void {
//     this.obtenerGastos();
//     this.obtenerVentas();
//     this._isUserAdmin();
//     this.initLineChart();
//     this.initSalesByVendorChart();
//   }

//   _isUserAdmin() {
//     this.userService.isUserAdmin().subscribe((isAdmin) => {
//       this.isAdmin = isAdmin;
//     });
//   }

//   obtenerGastos() {
//     this.gastosService.obtenerGastos().subscribe((data) => {
//       this.totalGastosPorMes = {}; // Reinicia el total de cada mes

//       data.forEach((element: any) => {
//         const gastoData = {
//           id: element.payload.doc.id,
//           ...element.payload.doc.data(),
//         };
//         this.calcularGastosMensuales(gastoData);
//       });
//       this.updateLineChart();
//       this.calcularTotalesMesActual();
//     });
//   }

//   obtenerVentas() {
//     this.salesService.getVentas().subscribe((data) => {
//       this.ventasPorVendedorPorMes = {};
//       this.totalVentasPorMes = {}; // Reinicia el total de cada mes para ventas
//       this.totalVentasDia = 0; //Reinicia el total de ventas del día

//       data.forEach((element: any) => {
//         const ventaData = {
//           id: element.payload.doc.id,
//           ...element.payload.doc.data(),
//         };
//         this.calcularVentasMensuales(ventaData);
//         this.calcularVentasPorVendedor(ventaData);
//         this.calcularTotalesMesActual();
//       });
//       this.updateLineChart();
//       this.updateSalesByVendorChart();
//       this.obtenerBalanceMensual();
//     });
//   }
