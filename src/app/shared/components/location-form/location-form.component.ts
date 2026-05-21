import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonItem, 
  IonLabel, 
  IonInput, 
  IonButton, 
  IonText,
  IonList,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonContent,
  IonTextarea,
  ModalController
} from '@ionic/angular/standalone';

export interface WaypointData {
  name: string;
  comments: string;
  lat: number;
  lng: number;
}

@Component({
  selector: 'app-location-form',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    IonItem, 
    IonLabel, 
    IonInput, 
    IonButton, 
    IonText,
    IonList,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonContent,
    IonTextarea
  ],
  templateUrl: './location-form.component.html',
  styleUrls: ['./location-form.component.scss']
})
export class LocationFormComponent {
  @Input() mode: 'gps' | 'map' | 'device' = 'gps';
  @Input() initialLat?: number;
  @Input() initialLng?: number;
  
  @Output() onSave = new EventEmitter<WaypointData>();
  @Output() onCancel = new EventEmitter<void>();

  locationName = '';
  comments = '';
  lat: number | null = null;
  lng: number | null = null;

  constructor(private modalCtrl: ModalController) {}

  ngOnInit() {
    if (this.initialLat !== undefined) this.lat = this.initialLat;
    if (this.initialLng !== undefined) this.lng = this.initialLng;
  }

  save() {
    if (this.isFormValid()) {
      const data: WaypointData = {
        name: this.locationName,
        comments: this.comments,
        lat: this.lat!,
        lng: this.lng!
      };
      this.modalCtrl.dismiss(data);
    }
  }

  isFormValid(): boolean {
    const hasName = this.locationName && this.locationName.trim().length > 0;
    const hasCoords = this.lat !== null && this.lng !== null;
    return !!(hasName && hasCoords);
  }

  cancel() {
    this.modalCtrl.dismiss();
  }
}
