import { Injectable } from '@angular/core';
import { Geolocation, Position, WatchPositionCallback } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private positionSubject = new BehaviorSubject<Position | null>(null);
  public position$: Observable<Position | null> = this.positionSubject.asObservable();
  private watchId: string | any = null;

  constructor() { }

  async requestPermissions(): Promise<boolean> {
    const platform = Capacitor.getPlatform();
    console.log(`[LocationService] Verificando permisos. Plataforma: ${platform}`);

    if (platform === 'web') {
      if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        console.error('[LocationService] Geolocalización bloqueada: No se está usando un contexto seguro (HTTPS).');
        return false;
      }

      if (!('geolocation' in navigator)) {
        console.error('El navegador no soporta geolocalización.');
        return false;
      }

      // En web, no hay una forma directa de "solicitar" permiso sin llamar a una función de obtención.
      // Chequeamos el estado si el navegador soporta la API de permisos.
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const status = await navigator.permissions.query({ name: 'geolocation' as any });
          console.log('[LocationService] Estado de permiso en web:', status.state);
          if (status.state === 'denied') return false;
          if (status.state === 'granted') return true;
          // Si es 'prompt', devolvemos true para que la siguiente llamada a getCurrentPosition dispare el diálogo.
          return true;
        }
      } catch (e) {
        console.warn('[LocationService] No se pudo consultar la API de permisos, continuando...', e);
      }
      return true;
    }

    // Lógica nativa (Android/iOS)
    try {
      const status = await Geolocation.checkPermissions();
      if (status.location === 'granted') return true;
      if (status.location === 'denied') return false;

      const requestStatus = await Geolocation.requestPermissions({
        permissions: ['location', 'coarseLocation']
      });
      return requestStatus.location === 'granted';
    } catch (error) {
      console.error('[LocationService] Error en solicitud nativa:', error);
      return false;
    }
  }

  async checkWebPermissionState(): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> {
    if (Capacitor.getPlatform() !== 'web') return 'unknown';
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const status = await navigator.permissions.query({ name: 'geolocation' as any });
        return status.state;
      }
    } catch (e) {
      console.warn('[LocationService] Error checking web permission state:', e);
    }
    return 'unknown';
  }

  async getCurrentPosition(): Promise<Position | null> {
    const platform = Capacitor.getPlatform();
    console.log('[LocationService] Obteniendo posición actual...');

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.warn('[LocationService] Sin permisos para obtener ubicación');
      return null;
    }

    if (platform === 'web') {
      return new Promise((resolve) => {
        if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
          console.error('[LocationService] ERROR: La geolocalización requiere HTTPS (Contexto Seguro).');
          resolve(null);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const position: any = {
              coords: {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                altitude: pos.coords.altitude,
                altitudeAccuracy: pos.coords.altitudeAccuracy,
                heading: pos.coords.heading,
                speed: pos.coords.speed
              },
              timestamp: pos.timestamp
            };
            this.positionSubject.next(position);
            resolve(position);
          },
          (err) => {
            let errorMsg = '';
            switch (err.code) {
              case err.PERMISSION_DENIED:
                errorMsg = 'El usuario denegó la solicitud de geolocalización.';
                break;
              case err.POSITION_UNAVAILABLE:
                errorMsg = 'La información de ubicación no está disponible.';
                break;
              case err.TIMEOUT:
                errorMsg = 'La solicitud para obtener la ubicación expiró.';
                break;
              default:
                errorMsg = 'Ocurrió un error desconocido.';
                break;
            }
            console.error(`[LocationService] Error en getCurrentPosition (${err.code}): ${errorMsg}`, err);
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      });
    }

    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
      this.positionSubject.next(position);
      return position;
    } catch (error) {
      console.error('[LocationService] Error en Geolocation.getCurrentPosition:', error);
      return null;
    }
  }

  async startWatching(): Promise<void> {
    const platform = Capacitor.getPlatform();
    const hasPermission = await this.requestPermissions();
    if (!hasPermission || this.watchId) return;

    console.log('[LocationService] Iniciando seguimiento de posición...');

    if (platform === 'web') {
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const position: any = {
            coords: {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              altitude: pos.coords.altitude,
              altitudeAccuracy: pos.coords.altitudeAccuracy,
              heading: pos.coords.heading,
              speed: pos.coords.speed
            },
            timestamp: pos.timestamp
          };
          this.positionSubject.next(position);
        },
        (err) => console.error('[LocationService] Error en watchPosition web:', err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
      return;
    }

    try {
      this.watchId = await Geolocation.watchPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }, (position, err) => {
        if (err) {
          console.error('[LocationService] Error en watchPosition nativo:', err);
          return;
        }
        if (position) this.positionSubject.next(position);
      });
    } catch (error) {
      console.error('[LocationService] Error al iniciar watchPosition:', error);
    }
  }

  async stopWatching(): Promise<void> {
    if (!this.watchId) return;

    if (Capacitor.getPlatform() === 'web') {
      navigator.geolocation.clearWatch(this.watchId);
    } else {
      await Geolocation.clearWatch({ id: this.watchId });
    }
    this.watchId = null;
  }
}
