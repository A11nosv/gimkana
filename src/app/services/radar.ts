import { Injectable, inject, OnDestroy } from '@angular/core';
import { LocationService } from './location';
import { GymkhanaService, Waypoint } from './gymkhana';
import { Subscription, combineLatest } from 'rxjs';
import { AlertController } from '@ionic/angular/standalone';

import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RadarService implements OnDestroy {
  private locationService = inject(LocationService);
  private gymkhanaService = inject(GymkhanaService);
  private alertCtrl = inject(AlertController);
  
  private audioCtx: AudioContext | null = null;
  private radarSubscription: Subscription | null = null;
  private beepInterval: any = null;
  private currentTarget: Waypoint | null = null;
  
  // Observables para feedback visual (WCAG 1.1.1, 1.4.1)
  private distanceSubject = new BehaviorSubject<number | null>(null);
  public distance$ = this.distanceSubject.asObservable();

  private isArrivalAlertActive = false;

  // Parámetros del radar
  private readonly MAX_DISTANCE = 200;
  private readonly MIN_BEEP_INTERVAL = 150;
  private readonly MAX_BEEP_INTERVAL = 2000;
  private readonly ARRIVAL_THRESHOLD = 10; // Aumentado ligeramente para mejor usabilidad

  constructor() {
    this.initRadar();
  }

  private initRadar() {
    this.radarSubscription = combineLatest([
      this.locationService.position$,
      this.gymkhanaService.activeGymkhana$,
      this.gymkhanaService.playerGroupIndex$,
      this.gymkhanaService.currentWaypointIndex$
    ]).subscribe(([position, gym, groupIndex, wpIndex]) => {
      if (position && gym && groupIndex !== null && !this.isArrivalAlertActive) {
        const waypointId = this.gymkhanaService.getCurrentWaypointId();
        this.currentTarget = gym.waypoints.find(wp => wp.id === waypointId) || null;
        
        if (this.currentTarget) {
          const dist = this.calculateDistance(
            position.coords.latitude,
            position.coords.longitude,
            this.currentTarget.lat,
            this.currentTarget.lng
          );
          
          this.distanceSubject.next(dist);
          
          if (dist <= this.ARRIVAL_THRESHOLD) {
            this.handleArrival();
          } else {
            this.updateBeepRate(dist);
            // Feedback háptico opcional si se está muy cerca (WCAG 2.5.1)
            if (dist < 30) {
              this.triggerHapticFeedback();
            }
          }
        } else {
          this.stopBeeping();
        }
      } else {
        this.stopBeeping();
      }
    });
  }

  private async triggerHapticFeedback() {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {}
  }

  private async handleArrival() {
    if (this.isArrivalAlertActive) return;
    this.isArrivalAlertActive = true;
    
    this.stopBeeping();
    this.playSuccessMelody();
    
    // Feedback háptico fuerte al llegar
    try { await Haptics.notification({ type: ImpactStyle.Heavy as any }); } catch (e) {}

    const waypointName = this.currentTarget?.name || 'Punto de control';
    
    const gym = this.gymkhanaService.getActiveGymkhana();
    const groupIdx = (this.gymkhanaService as any).playerGroupIndexSubject.value;
    const assignment = gym?.assignments.find(a => a.groupId === groupIdx);
    const wpIdx = (this.gymkhanaService as any).currentWaypointIndexSubject.value;
    
    const isLastWaypoint = assignment && (wpIdx === assignment.waypointIds.length - 1);

    if (isLastWaypoint) {
      try {
        const { rank, totalTime } = await this.gymkhanaService.completeGymkhana();
        
        const alert = await this.alertCtrl.create({
          header: '¡Gimkana Completada!',
          message: `¡Felicidades! Has descubierto el último punto: ${waypointName}.\n\n` +
                   `Posición en el ranking: ${rank}º\n` +
                   `Tiempo total: ${totalTime}`,
          buttons: [
            {
              text: 'Finalizar',
              role: 'cancel',
              handler: () => {
                this.isArrivalAlertActive = false;
                this.gymkhanaService.clearActive();
              }
            }
          ],
          backdropDismiss: false
        });
        await alert.present();
      } catch (error) {
        console.error('Error al finalizar gimkana:', error);
      }
    } else {
      const alert = await this.alertCtrl.create({
        header: '¡Objetivo alcanzado!',
        message: `Has llegado a: ${waypointName}. Prepárate para el siguiente punto.`,
        buttons: [
          {
            text: 'Continuar',
            handler: () => {
              this.isArrivalAlertActive = false;
              this.gymkhanaService.nextWaypoint();
            }
          }
        ],
        backdropDismiss: false
      });
      await alert.present();
    }
  }

  private playSuccessMelody() {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

      const now = this.audioCtx.currentTime;
      const notes = [
        { freq: 523.25, time: 0 },
        { freq: 659.25, time: 0.15 },
        { freq: 783.99, time: 0.3 },
        { freq: 1046.50, time: 0.45 }
      ];

      notes.forEach(note => {
        const osc = this.audioCtx!.createOscillator();
        const gain = this.audioCtx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.freq, now + note.time);
        gain.gain.setValueAtTime(0, now + note.time);
        gain.gain.linearRampToValueAtTime(0.1, now + note.time + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + note.time + 0.3);
        osc.connect(gain);
        gain.connect(this.audioCtx!.destination);
        osc.start(now + note.time);
        osc.stop(now + note.time + 0.3);
      });
    } catch (e) {}
  }

  private updateBeepRate(distance: number) {
    this.stopBeepInterval();

    if (distance <= this.MAX_DISTANCE) {
      const ratio = Math.max(0, Math.min(1, distance / this.MAX_DISTANCE));
      const interval = this.MIN_BEEP_INTERVAL + (ratio * (this.MAX_BEEP_INTERVAL - this.MIN_BEEP_INTERVAL));
      this.startBeepInterval(interval);
    }
  }

  private startBeepInterval(ms: number) {
    this.beepInterval = setInterval(() => {
      this.playBeep();
    }, ms);
  }

  private stopBeepInterval() {
    if (this.beepInterval) {
      clearInterval(this.beepInterval);
      this.beepInterval = null;
    }
  }

  private stopBeeping() {
    this.stopBeepInterval();
    this.currentTarget = null;
    this.distanceSubject.next(null);
  }

  private playBeep() {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

      const oscillator = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, this.audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0, this.audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, this.audioCtx.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.1);
      oscillator.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);
      oscillator.start();
      oscillator.stop(this.audioCtx.currentTime + 0.1);
    } catch (e) {}
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  ngOnDestroy() {
    if (this.radarSubscription) this.radarSubscription.unsubscribe();
    this.stopBeepInterval();
    if (this.audioCtx) this.audioCtx.close();
  }
}
