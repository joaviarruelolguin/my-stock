import { Component, OnInit } from '@angular/core';

import { Observable } from 'rxjs';
import {
  Appointment,
  AppointmentService,
} from '../../services/appointment.service';

@Component({
  selector: 'app-appointment-list',
  templateUrl: './appointment-list.component.html',
  styleUrls: ['./appointment-list.component.css'],
})
export class AppointmentListComponent implements OnInit {
  appointments$: Observable<Appointment[]>;

  constructor(private appointmentService: AppointmentService) {
    this.appointments$ = this.appointmentService.getAppointments();
  }

  ngOnInit(): void {}

  deleteAppointment(id: string) {
    this.appointmentService
      .deleteAppointment(id)
      .catch((error) => console.error('Error al eliminar cita:', error));
  }
}
