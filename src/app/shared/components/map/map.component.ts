import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { LocationService } from '../../../services/location';
import { Subscription } from 'rxjs';

import { ModalController, IonFab, IonFabButton, IonIcon, IonFabList, IonButton, IonText } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  locateOutline, 
  addOutline, 
  mapOutline, 
  phonePortraitOutline, 
  keypadOutline,
  trophyOutline 
} from 'ionicons/icons';

import { GymkhanaService, Gymkhana, Waypoint } from '../../../services/gymkhana';
import { GymkhanaFormComponent } from '../gymkhana-form/gymkhana-form.component';
import { LocationFormComponent } from '../location-form/location-form.component';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, IonFab, IonFabButton, IonIcon, IonFabList, IonButton, IonText],
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

  constructor(
    private locationService: LocationService,
    private modalCtrl: ModalController,
    private gymkhanaService: GymkhanaService
  ) {
    addIcons({ 
      locateOutline, 
      addOutline, 
      mapOutline, 
      phonePortraitOutline, 
      keypadOutline,
      trophyOutline
    });
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
      }
    });
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
    // Standard Leaflet icon fix for Angular using CDN
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
      keyboard: true // Enhance accessibility
    }).setView([0, 0], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);

    this.isMapInitialized = true;

    // Render initial waypoints if any
    this.renderWaypoints();

    // Map click handler for creator mode
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (this.isMapSelectionActive) {
        this.openLocationForm('map', e.latlng.lat, e.latlng.lng);
        this.isMapSelectionActive = false;
      }
    });

    // Start watching position
    this.locationService.startWatching();
    
    // Initial center if we already have a position
    this.locationService.getCurrentPosition().then(position => {
      if (position) {
        this.updateUserLocation(
          position.coords.latitude, 
          position.coords.longitude,
          position.coords.accuracy
        );
        this.map.setView([position.coords.latitude, position.coords.longitude], 17);
      }
    });

    // Handle resize
    setTimeout(() => {
      this.map.invalidateSize();
    }, 200);
  }

  private renderWaypoints() {
    // Clear existing markers
    this.markers.forEach(m => m.remove());
    this.markers = [];

    if (this.activeGymkhana) {
      this.activeGymkhana.waypoints.forEach(wp => {
        const marker = L.marker([wp.lat, wp.lng])
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
      
      // Accessibility: Announce to screen readers
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

  async openLocationForm(mode: 'gps' | 'map' | 'device', lat?: number, lng?: number) {
    const modal = await this.modalCtrl.create({
      component: LocationFormComponent,
      componentProps: {
        mode,
        initialLat: lat,
        initialLng: lng
      }
    });

    modal.onDidDismiss().then((result) => {
      if (result.data) {
        this.gymkhanaService.addWaypointToActive(result.data);
      }
    });

    return await modal.present();
  }

  private updateUserLocation(lat: number, lng: number, accuracy: number) {
    const customIcon = L.divIcon({
      className: 'user-location-marker',
      html: '<div class="user-location-dot"></div>',
      iconSize: [12, 12],
      iconAnchor: [6, 6]
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
