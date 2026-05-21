import { Injectable } from '@angular/core';
import { Geolocation, Position } from '@capacitor/geolocation';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private positionSubject = new BehaviorSubject<Position | null>(null);
  public position$: Observable<Position | null> = this.positionSubject.asObservable();
  private watchId: string | null = null;

  constructor() { }

  async requestPermissions(): Promise<boolean> {
    try {
      const status = await Geolocation.checkPermissions();
      if (status.location === 'denied') {
        return false;
      }
      if (status.location !== 'granted') {
        const requestStatus = await Geolocation.requestPermissions();
        return requestStatus.location === 'granted';
      }
      return true;
    } catch (error) {
      console.error('Error checking/requesting permissions', error);
      return false;
    }
  }

  async getCurrentPosition(): Promise<Position | null> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return null;

    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
      this.positionSubject.next(position);
      return position;
    } catch (error) {
      console.error('Error getting current position', error);
      return null;
    }
  }

  async startWatching(): Promise<void> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return;

    if (this.watchId) return;

    try {
      this.watchId = await Geolocation.watchPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }, (position, err) => {
        if (err) {
          console.error('Error watching position', err);
          return;
        }
        if (position) {
          this.positionSubject.next(position);
        }
      });
    } catch (error) {
      console.error('Error starting position watch', error);
    }
  }

  async stopWatching(): Promise<void> {
    if (this.watchId) {
      await Geolocation.clearWatch({ id: this.watchId });
      this.watchId = null;
    }
  }
}
