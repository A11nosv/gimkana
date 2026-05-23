import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { LocationService } from '../../../services/location';
import { Subscription } from 'rxjs';

import { ModalController, IonFab, IonFabButton, IonIcon, IonFabList, IonButton, IonText, AlertController, IonCard, IonCardContent } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  locateOutline, 
  addOutline, 
  mapOutline, 
  phonePortraitOutline, 
  keypadOutline,
  trophyOutline,
  trashOutline,
  saveOutline,
  listOutline,
  playOutline,
  exitOutline
} from 'ionicons/icons';

import { GymkhanaService, Gymkhana, Waypoint } from '../../../services/gymkhana';
import { GymkhanaFormComponent } from '../gymkhana-form/gymkhana-form.component';
import { LocationFormComponent } from '../location-form/location-form.component';
import { AssignmentFormComponent } from '../assignment-form/assignment-form.component';
import { GymkhanaListComponent } from '../gymkhana-list/gymkhana-list.component';
import { RadarService } from '../../../services/radar';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, IonFab, IonFabButton, IonIcon, IonFabList, IonButton, IonText, IonCard, IonCardContent],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('mapContainer') mapContainer!: ElementRef;
  @Input() isCreatorMode = false;
  
  private map!: L.Map;
  private userMarker!: L.Marker;
  private accuracyCircle!: L.Circle;
  private locationSubscription!: Subscription;
  private gymkhanaSubscription!: Subscription;
  private isMapInitialized = false;
  private markers: L.Marker[] = [];
  public isMapSelectionActive = false;
  public activeGymkhana: Gymkhana | null = null;
  public distance$ = this.radarService.distance$;

  constructor(
    private locationService: LocationService,
    private modalCtrl: ModalController,
    private gymkhanaService: GymkhanaService,
    private alertCtrl: AlertController,
    private radarService: RadarService
  ) {
    addIcons({ 
      locateOutline, 
      addOutline, 
      mapOutline, 
      phonePortraitOutline, 
      keypadOutline,
      trophyOutline,
      trashOutline,
      saveOutline,
      listOutline,
      playOutline,
      exitOutline
    });
  }

  get canSaveGymkhana(): boolean {
    return !!(this.activeGymkhana && this.activeGymkhana.waypoints.length >= 3);
  }

  getRadarOpacity(distance: number): number {
    const maxDistance = 200;
    if (distance >= maxDistance) return 0.1;
    if (distance <= 10) return 1;
    // Inverse mapping: closer = more opaque
    return 1 - (distance / maxDistance);
  }

  ngOnInit() {
    this.locationSubscription = this.locationService.position$.subscribe(position => {
      if (position && this.isMapInitialized) {
        this.updateUserLocation(
          position.coords.latitude, 
          position.coords.longitude,
          position.coords.accuracy
        );
      }
    });

    this.gymkhanaSubscription = this.gymkhanaService.activeGymkhana$.subscribe(gym => {
      this.activeGymkhana = gym;
      if (this.isMapInitialized) {
        this.renderWaypoints();
        if (gym) {
          this.centerMapOnWaypoints();
        }
      }
    });
  }

  private centerMapOnWaypoints() {
    if (this.activeGymkhana && this.activeGymkhana.waypoints.length > 0) {
      const latlngs = this.activeGymkhana.waypoints.map(wp => L.latLng(wp.lat, wp.lng));
      const bounds = L.latLngBounds(latlngs);
      this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });
    }
  }

  ngAfterViewInit() {
    this.initMap();
  }

  ngOnDestroy() {
    if (this.locationSubscription) {
      this.locationSubscription.unsubscribe();
    }
    if (this.gymkhanaSubscription) {
      this.gymkhanaSubscription.unsubscribe();
    }
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap() {
    const iconRetinaUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png';
    const iconUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png';
    const shadowUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png';
    const iconDefault = L.icon({
      iconRetinaUrl,
      iconUrl,
      shadowUrl,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      tooltipAnchor: [16, -28],
      shadowSize: [41, 41]
    });
    L.Marker.prototype.options.icon = iconDefault;

    this.map = L.map(this.mapContainer.nativeElement, {
      zoomControl: true,
      keyboard: true
    }).setView([0, 0], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);

    this.isMapInitialized = true;
    this.renderWaypoints();

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (this.isMapSelectionActive) {
        this.openLocationForm('map', e.latlng.lat, e.latlng.lng);
        this.isMapSelectionActive = false;
      }
    });

    this.locationService.startWatching();
    
    this.locationService.getCurrentPosition().then(position => {
      if (position) {
        this.updateUserLocation(
          position.coords.latitude, 
          position.coords.longitude,
          position.coords.accuracy
        );
        if (!this.activeGymkhana || this.activeGymkhana.waypoints.length === 0) {
          this.map.setView([position.coords.latitude, position.coords.longitude], 17);
        }
      }
    });

    setTimeout(() => {
      this.map.invalidateSize();
    }, 200);
  }

  private renderWaypoints() {
    this.markers.forEach(m => m.remove());
    this.markers = [];

    if (this.activeGymkhana && this.isCreatorMode) {
      this.activeGymkhana.waypoints.forEach(wp => {
        const marker = L.marker([wp.lat, wp.lng], {
          title: `Punto de control: ${wp.name}`,
          alt: `Punto de control: ${wp.name}`
        })
          .addTo(this.map)
          .bindPopup(`<b>${wp.name}</b><br>${wp.comments}`);
        this.markers.push(marker);
      });
    }
  }

  async centerOnUser() {
    const position = await this.locationService.getCurrentPosition();
    if (position && this.map) {
      const { latitude, longitude, accuracy } = position.coords;
      this.map.setView([latitude, longitude], 17, { animate: true });
      this.updateUserLocation(latitude, longitude, accuracy);
      
      if (this.userMarker) {
        this.userMarker.openPopup();
      }
    }
  }

  startMapSelection() {
    this.isMapSelectionActive = true;
  }

  async createFromDevice() {
    const position = await this.locationService.getCurrentPosition();
    if (position) {
      this.openLocationForm('device', position.coords.latitude, position.coords.longitude);
    }
  }

  async openGymkhanaForm() {
    const modal = await this.modalCtrl.create({
      component: GymkhanaFormComponent
    });
    return await modal.present();
  }

  async openGymkhanaList() {
    const modal = await this.modalCtrl.create({
      component: GymkhanaListComponent,
      componentProps: { showOnlyPublished: false }
    });

    modal.onDidDismiss().then((result) => {
      if (result.data) {
        this.gymkhanaService.loadGymkhana(result.data.id);
      }
    });

    return await modal.present();
  }

  async openPublishedGymkhanaList() {
    const modal = await this.modalCtrl.create({
      component: GymkhanaListComponent,
      componentProps: { showOnlyPublished: true }
    });

    modal.onDidDismiss().then(async (result) => {
      if (result.data) {
        const gym = result.data as Gymkhana;
        await this.gymkhanaService.loadGymkhana(gym.id);
        this.openGroupSelection(gym);
      }
    });

    return await modal.present();
  }

  async openGroupSelection(gym: Gymkhana) {
    const alert = await this.alertCtrl.create({
      header: 'Selecciona tu Grupo',
      message: 'Elige el grupo al que perteneces para comenzar el recorrido.',
      inputs: gym.groups.map((group, index) => ({
        name: 'group',
        type: 'radio',
        label: group.name,
        value: index,
        checked: index === 0
      })),
      buttons: [
        {
          text: 'Comenzar',
          handler: (index) => {
            this.gymkhanaService.setPlayerGroup(index);
          }
        }
      ],
      backdropDismiss: false
    });

    await alert.present();
  }

  async openLocationForm(mode: 'gps' | 'map' | 'device', lat?: number, lng?: number) {
    const modal = await this.modalCtrl.create({
      component: LocationFormComponent,
      componentProps: {
        mode,
        initialLat: lat,
        initialLng: lng
      }
    });

    modal.onDidDismiss().then(async (result) => {
      if (result.data) {
        try {
          await this.gymkhanaService.addWaypointToActive(result.data);
        } catch (error: any) {
          console.error('Error al añadir punto:', error);
          alert(error.message || 'Error al añadir el punto a la gimkana');
        }
      }
    });

    return await modal.present();
  }

  async openAssignmentForm() {
    if (!this.activeGymkhana) return;

    const modal = await this.modalCtrl.create({
      component: AssignmentFormComponent,
      componentProps: {
        gymkhana: this.activeGymkhana
      }
    });

    modal.onDidDismiss().then(async (result) => {
      if (result.data) {
        try {
          const { assignments, publish } = result.data;
          await this.gymkhanaService.updateAssignments(assignments);
          
          if (publish) {
            await this.gymkhanaService.publishGymkhana(this.activeGymkhana!.id);
            alert('Gimkana publicada con éxito y cerrada.');
            this.gymkhanaService.clearActive();
          } else {
            alert('Progreso guardado correctamente.');
          }
        } catch (error: any) {
          console.error('Error al guardar asignaciones:', error);
          alert(error.message || 'Error al procesar la solicitud');
        }
      }
    });

    return await modal.present();
  }

  async confirmDelete() {
    if (!this.activeGymkhana) return;

    const alert = await this.alertCtrl.create({
      header: 'Eliminar Gimkana',
      message: `¿Estás seguro de que deseas eliminar permanentemente la gimkana "${this.activeGymkhana.name}"? Esta acción no se puede deshacer.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            try {
              await this.gymkhanaService.deleteGymkhana(this.activeGymkhana!.id);
            } catch (error: any) {
              console.error('Error al eliminar la gimkana:', error);
              window.alert(error.message || 'Error al eliminar la gimkana');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async confirmExitGame() {
    if (!this.activeGymkhana) return;

    const alert = await this.alertCtrl.create({
      header: 'Salir del Juego',
      message: '¿Estás seguro de que deseas abandonar la gimkana actual? Se perderá tu progreso.',
      buttons: [
        {
          text: 'Continuar Jugando',
          role: 'cancel'
        },
        {
          text: 'Abandonar',
          role: 'destructive',
          handler: () => {
            this.gymkhanaService.clearActive();
          }
        }
      ]
    });

    await alert.present();
  }

  private updateUserLocation(lat: number, lng: number, accuracy: number) {
    const customIcon = L.divIcon({
      className: 'user-location-marker',
      html: '<div class="user-location-dot"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    if (!this.userMarker) {
      this.userMarker = L.marker([lat, lng], { icon: customIcon }).addTo(this.map)
        .bindPopup('Tu ubicación actual');
      
      this.accuracyCircle = L.circle([lat, lng], {
        radius: accuracy,
        color: '#4285F4',
        fillColor: '#4285F4',
        fillOpacity: 0.15,
        weight: 1
      }).addTo(this.map);
    } else {
      this.userMarker.setLatLng([lat, lng]);
      this.accuracyCircle.setLatLng([lat, lng]);
      this.accuracyCircle.setRadius(accuracy);
    }
  }
}
