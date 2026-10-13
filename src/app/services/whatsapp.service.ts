import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Appointment } from './appointment.service';

@Injectable({
  providedIn: 'root',
})
export class WhatsAppService {
  private apiUrl = 'http://localhost:3000'; // Reemplazar con la URL del backend

  constructor(private http: HttpClient) {}

  // Enviar mensaje inmediato al crear una cita
  sendAppointmentNotification(appointment: Appointment): Observable<any> {
    const message = `Hola ${appointment.cliente}, tu cita ha sido agendada para el ${appointment.fecha} a las ${appointment.hora}.`;
    return this.http.post(`${this.apiUrl}/send-whatsapp`, {
      phone: appointment.telefono,
      message,
    });
  }

  // Programar recordatorio de cita
  scheduleReminder(appointment: Appointment): Observable<any> {
    const message = `Hola ${appointment.cliente}, te recordamos tu cita el ${appointment.fecha} a las ${appointment.hora}.`;
    return this.http.post(`${this.apiUrl}/schedule-reminder`, {
      phone: appointment.telefono,
      message,
      datetime: appointment.recordatorio ? appointment.recordatorio : undefined,

      appointmentId: appointment.id,
    });
  }
}
