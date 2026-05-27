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
      console.log('Iniciando solicitud de permisos de ubicación...');
      
      // En entorno web, checkPermissions puede devolver 'prompt'.
      // Intentamos solicitar permisos directamente.
      const status = await Geolocation.checkPermissions();
      console.log('Estado actual de permisos (Capacitor):', status);

      if (status.location === 'granted') {
        return true;
      }

      if (status.location === 'denied' || status.coarseLocation === 'denied') {
        console.warn('Los permisos han sido denegados previamente.');
        return false;
      }

      // Solicitar permisos de forma explícita
      console.log('Solicitando permisos al sistema...');
      const requestStatus = await Geolocation.requestPermissions({
        permissions: ['location', 'coarseLocation']
      });
      console.log('Resultado de la solicitud de permisos:', requestStatus);
      
      return requestStatus.location === 'granted';
    } catch (error) {
      console.error('Error crítico al solicitar permisos:', error);
      // Fallback para web si Capacitor falla en el navegador
      return new Promise((resolve) => {
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            () => resolve(true),
            (err) => {
              console.error('Error en fallback de geolocalización web:', err);
              resolve(false);
            },
            { enableHighAccuracy: true, timeout: 5000 }
          );
        } else {
          resolve(false);
        }
      });
    }
  }

  async getCurrentPosition(): Promise<Position | null> {
    console.log('Solicitando posición actual...');
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.warn('Permisos de ubicación no concedidos');
      return null;
    }

    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
      console.log('Posición recibida con éxito:', position);
      this.positionSubject.next(position);
      return position;
    } catch (error) {
      console.error('Error al obtener la posición actual:', error);
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
