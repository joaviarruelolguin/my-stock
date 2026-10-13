import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AppointmentService } from '../../services/appointment.service';
import { WhatsAppService } from '../../services/whatsapp.service'; // Importa el servicio de WhatsApp

@Component({
  selector: 'app-appointment-form',
  templateUrl: './appointment-form.component.html',
  styleUrls: ['./appointment-form.component.css'],
})
export class AppointmentFormComponent {
  appointmentForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private appointmentService: AppointmentService,
    private whatsAppService: WhatsAppService // Inyecta el servicio de WhatsApp
  ) {
    this.appointmentForm = this.fb.group({
      cliente: ['', Validators.required],
      fecha: ['', Validators.required],
      hora: ['', Validators.required],
      descripcion: ['', Validators.required],
      telefono: ['', Validators.required], // Asegúrate de tener un campo de teléfono
      profesional: ['', Validators.required],
      recordatorio: [''], // Asegúrate de tener el campo para el recordatorio
      enviarAviso: [false], // Asegúrate de tener el campo para el recordatorio
    });
  }

  submit() {
    if (this.appointmentForm.valid) {
      const appointment = this.appointmentForm.value;

      // Llamar al servicio para agregar la cita
      this.appointmentService
        .addAppointment(appointment)
        .then((id) => {
          appointment.id = id;
          console.log('Cita agregada correctamente');

          // Enviar la notificación por WhatsApp
          this.whatsAppService
            .sendAppointmentNotification(appointment)
            .subscribe(
              (response) => {
                console.log('Notificación enviada:', response);
              },
              (error) => {
                console.error('Error al enviar la notificación:', error);
              }
            );

          // Programar el recordatorio
          this.whatsAppService.scheduleReminder(appointment).subscribe(
            (response) => {
              console.log('Recordatorio programado:', response);
            },
            (error) => {
              console.error('Error al programar el recordatorio:', error);
            }
          );

          this.appointmentForm.reset(); // Restablecer el formulario después de éxito
        })
        .catch((error) => {
          console.error('Error al agregar la cita:', error);
        });
    } else {
      console.error('Formulario no válido');
    }
  }
}
