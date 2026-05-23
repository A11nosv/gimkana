import { Component, OnInit, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent, 
  IonButtons, 
  IonButton, 
  IonList, 
  IonItem, 
  IonLabel, 
  IonNote,
  IonSpinner
} from '@ionic/angular/standalone';
import { ModalController } from '@ionic/angular/standalone';
import { GymkhanaService, Gymkhana } from '../../../services/gymkhana';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-gymkhana-list',
  standalone: true,
  imports: [
    CommonModule, 
    IonHeader, 
    IonToolbar, 
    IonTitle, 
    IonContent, 
    IonButtons, 
    IonButton, 
    IonList, 
    IonItem, 
    IonLabel, 
    IonNote,
    IonSpinner
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ showOnlyPublished ? 'Gimkanas Disponibles' : 'Mis Gimkanas' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()" aria-label="Cerrar listado de gimkanas">Cerrar</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-list *ngIf="gymkhanas$ | async as gymkhanas; else loading">
        <ion-item *ngIf="gymkhanas.length === 0">
          <ion-label class="ion-text-center">
            {{ showOnlyPublished ? 'No hay gimkanas publicadas actualmente' : 'No hay gimkanas creadas todavía' }}
          </ion-label>
        </ion-item>
        
        <ion-item *ngFor="let gym of gymkhanas" button (click)="selectGymkhana(gym)" [aria-label]="'Seleccionar gimkana ' + gym.name">
          <ion-label>
            <h2>{{ gym.name }}</h2>
            <p>{{ gym.waypoints.length }} puntos • {{ gym.groups.length }} grupos</p>
          </ion-label>
          <ion-note slot="end" aria-hidden="true">{{ showOnlyPublished ? 'Jugar' : 'Seleccionar' }}</ion-note>
        </ion-item>
      </ion-list>

      <ng-template #loading>
        <div class="ion-text-center ion-padding" role="status" aria-live="polite">
          <ion-spinner name="crescent" aria-hidden="true"></ion-spinner>
          <p>Cargando gimkanas...</p>
        </div>
      </ng-template>
    </ion-content>
  `
})
export class GymkhanaListComponent implements OnInit {
  private gymkhanaService = inject(GymkhanaService);
  private modalCtrl = inject(ModalController);
  
  @Input() showOnlyPublished = false;
  gymkhanas$!: Observable<Gymkhana[]>;

  ngOnInit() {
    if (this.showOnlyPublished) {
      this.gymkhanas$ = this.gymkhanaService.getPublishedGymkhanas();
    } else {
      this.gymkhanas$ = this.gymkhanaService.getGymkhanas();
    }
  }

  selectGymkhana(gym: Gymkhana) {
    this.modalCtrl.dismiss(gym);
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }
}
