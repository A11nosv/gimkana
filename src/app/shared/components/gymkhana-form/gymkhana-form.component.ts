import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonItem, 
  IonLabel, 
  IonInput, 
  IonButton, 
  IonList,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonContent,
  IonNote,
  AlertController
} from '@ionic/angular/standalone';
import { ModalController } from '@ionic/angular/standalone';

export interface GroupData {
  name: string;
}

export interface GymkhanaData {
  name: string;
  groups: GroupData[];
}

import { GymkhanaService } from '../../../services/gymkhana';
import { FirestoreDataService } from '../../../services/firestore-data';

@Component({
  selector: 'app-gymkhana-form',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    IonItem, 
    IonLabel, 
    IonInput, 
    IonButton, 
    IonList,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonContent,
    IonNote
  ],
  templateUrl: './gymkhana-form.component.html',
  styleUrls: ['./gymkhana-form.component.scss']
})
export class GymkhanaFormComponent {
  gymkhanaName = '';
  numGroups: number | null = null;
  groups: { name: string }[] = [];

  constructor(
    private modalCtrl: ModalController,
    private gymkhanaService: GymkhanaService,
    private firestoreData: FirestoreDataService,
    private alertCtrl: AlertController
  ) {}

  updateGroups() {
    if (this.numGroups !== null && this.numGroups > 0) {
      const currentLen = this.groups.length;
      if (this.numGroups > currentLen) {
        for (let i = currentLen; i < this.numGroups; i++) {
          this.groups.push({ name: `Grupo ${i + 1}` });
        }
      } else {
        this.groups = this.groups.slice(0, this.numGroups);
      }
    } else {
      this.groups = [];
    }
  }

  async save() {
    const allGroupsNamed = this.groups.every(g => g.name && g.name.trim().length > 0);
    if (this.gymkhanaName && this.gymkhanaName.trim().length > 0 && this.groups.length > 0 && allGroupsNamed) {
      try {
        // Comprobar si ya existe una gimkana con ese nombre
        const existingGym = await this.firestoreData.getGymkhanaByName(this.gymkhanaName.trim());
        
        if (existingGym) {
          const alert = await this.alertCtrl.create({
            header: 'Gimkana duplicada',
            message: `Ya existe una gimkana llamada "${this.gymkhanaName}". ¿Deseas editar la existente?`,
            buttons: [
              {
                text: 'Cancelar',
                role: 'cancel'
              },
              {
                text: 'Editar existente',
                handler: () => {
                  this.gymkhanaService.loadGymkhana(existingGym.id);
                  this.modalCtrl.dismiss(existingGym);
                }
              }
            ]
          });
          await alert.present();
          return;
        }

        const newGym = await this.gymkhanaService.createGymkhana(this.gymkhanaName, this.groups);
        this.modalCtrl.dismiss(newGym);
      } catch (error: any) {
        console.error('Error al gestionar la gimkana:', error);
        alert(error.message || 'Error al procesar la solicitud');
      }
    }
  }

  isFormValid(): boolean {
    const allGroupsNamed = this.groups.length > 0 && this.groups.every(g => g.name && g.name.trim().length > 0);
    return !!(this.gymkhanaName && this.gymkhanaName.trim().length > 0 && allGroupsNamed);
  }

  cancel() {
    this.modalCtrl.dismiss();
  }

  trackByFn(index: number) {
    return index;
  }
}
