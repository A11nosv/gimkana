import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom, map, combineLatest } from 'rxjs';
import { FirestoreDataService } from './firestore-data';

export interface Group {
  name: string;
}

export interface Waypoint {
  id: string;
  name: string;
  comments: string;
  lat: number;
  lng: number;
}

export interface GroupAssignment {
  groupId: number;
  waypointIds: string[];
}

export interface Gymkhana {
  id: string;
  name: string;
  groups: Group[];
  waypoints: Waypoint[];
  assignments: GroupAssignment[];
  published?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class GymkhanaService {
  private firestoreData = inject(FirestoreDataService);
  private activeGymkhanaSubject = new BehaviorSubject<Gymkhana | null>(null);
  public activeGymkhana$: Observable<Gymkhana | null> = this.activeGymkhanaSubject.asObservable();
  
  private playerGroupIndexSubject = new BehaviorSubject<number | null>(null);
  public playerGroupIndex$ = this.playerGroupIndexSubject.asObservable();

  public isGameActive$ = combineLatest([
    this.activeGymkhana$,
    this.playerGroupIndex$
  ]).pipe(
    map(([gym, groupIndex]) => !!(gym && groupIndex !== null))
  );

  private currentWaypointIndexSubject = new BehaviorSubject<number>(0);
  public currentWaypointIndex$ = this.currentWaypointIndexSubject.asObservable();

  private startTime: number | null = null;

  constructor() {}

  async createGymkhana(name: string, groups: Group[]): Promise<Gymkhana> {
    const newGymData: Omit<Gymkhana, 'id'> = {
      name,
      groups,
      waypoints: [],
      assignments: groups.map((_, index) => ({ groupId: index, waypointIds: [] })),
      published: false
    };
    
    const id = await this.firestoreData.createGymkhana(newGymData);
    const newGym: Gymkhana = { ...newGymData, id };
    
    this.activeGymkhanaSubject.next(newGym);
    return newGym;
  }

  setPlayerGroup(index: number) {
    this.playerGroupIndexSubject.next(index);
    this.currentWaypointIndexSubject.next(0);
    this.startTime = Date.now();
  }

  nextWaypoint() {
    this.currentWaypointIndexSubject.next(this.currentWaypointIndexSubject.value + 1);
  }

  async completeGymkhana(): Promise<{ rank: number, totalTime: string }> {
    const gym = this.activeGymkhanaSubject.value;
    const groupIdx = this.playerGroupIndexSubject.value;
    
    if (!gym || groupIdx === null || !this.startTime) {
      throw new Error('No se pudo completar la gimkana: faltan datos de sesión.');
    }

    const endTime = Date.now();
    const durationMs = endTime - this.startTime;
    
    const result = {
      groupId: groupIdx,
      groupName: gym.groups[groupIdx].name,
      durationMs: durationMs,
      timestamp: endTime
    };

    const rank = await this.firestoreData.saveResultAndGetRank(gym.id, result);
    
    return {
      rank,
      totalTime: this.formatDuration(durationMs)
    };
  }

  private formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes} min y ${seconds} seg`;
  }

  resetProgress() {
    this.currentWaypointIndexSubject.next(0);
  }

  getCurrentWaypointId(): string | null {
    const gym = this.activeGymkhanaSubject.value;
    const groupIdx = this.playerGroupIndexSubject.value;
    const wpIdx = this.currentWaypointIndexSubject.value;

    if (gym && groupIdx !== null) {
      const assignment = gym.assignments.find(a => a.groupId === groupIdx);
      if (assignment && wpIdx < assignment.waypointIds.length) {
        return assignment.waypointIds[wpIdx];
      }
    }
    return null;
  }

  async addWaypointToActive(waypointData: Omit<Waypoint, 'id'>) {
    const current = this.activeGymkhanaSubject.value;
    if (current) {
      const waypoint: Waypoint = {
        ...waypointData,
        id: Date.now().toString()
      };
      
      await this.firestoreData.addWaypoint(current.id, waypoint);
      
      const updated = {
        ...current,
        waypoints: [...current.waypoints, waypoint]
      };
      this.activeGymkhanaSubject.next(updated);
    }
  }

  async updateAssignments(assignments: GroupAssignment[]) {
    const current = this.activeGymkhanaSubject.value;
    if (current) {
      await this.firestoreData.updateGymkhana(current.id, { assignments });
      
      const updated = {
        ...current,
        assignments
      };
      this.activeGymkhanaSubject.next(updated);
    }
  }

  async deleteGymkhana(id: string) {
    await this.firestoreData.deleteGymkhana(id);
    if (this.activeGymkhanaSubject.value?.id === id) {
      this.clearActive();
    }
  }

  async publishGymkhana(id: string) {
    await this.firestoreData.publishGymkhana(id);
  }

  async loadGymkhana(id: string) {
    const gym = await firstValueFrom(this.firestoreData.getGymkhanaById(id));
    if (gym) {
      this.activeGymkhanaSubject.next(gym);
    }
  }

  getGymkhanas(): Observable<Gymkhana[]> {
    return this.firestoreData.getGymkhanas();
  }

  getPublishedGymkhanas(): Observable<Gymkhana[]> {
    return this.firestoreData.getPublishedGymkhanas();
  }

  getActiveGymkhana(): Gymkhana | null {
    return this.activeGymkhanaSubject.value;
  }

  clearActive() {
    this.activeGymkhanaSubject.next(null);
    this.playerGroupIndexSubject.next(null);
    this.currentWaypointIndexSubject.next(0);
    this.startTime = null;
  }
}
