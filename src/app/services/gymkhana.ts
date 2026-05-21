import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

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
}

@Injectable({
  providedIn: 'root'
})
export class GymkhanaService {
  private activeGymkhanaSubject = new BehaviorSubject<Gymkhana | null>(null);
  public activeGymkhana$: Observable<Gymkhana | null> = this.activeGymkhanaSubject.asObservable();

  constructor() {}

  createGymkhana(name: string, groups: Group[]): Gymkhana {
    const newGym: Gymkhana = {
      id: Date.now().toString(),
      name,
      groups,
      waypoints: [],
      assignments: groups.map((_, index) => ({ groupId: index, waypointIds: [] }))
    };
    this.activeGymkhanaSubject.next(newGym);
    return newGym;
  }

  addWaypointToActive(waypointData: Omit<Waypoint, 'id'>) {
    const current = this.activeGymkhanaSubject.value;
    if (current) {
      const waypoint: Waypoint = {
        ...waypointData,
        id: Date.now().toString()
      };
      const updated = {
        ...current,
        waypoints: [...current.waypoints, waypoint]
      };
      this.activeGymkhanaSubject.next(updated);
    }
  }

  updateAssignments(assignments: GroupAssignment[]) {
    const current = this.activeGymkhanaSubject.value;
    if (current) {
      const updated = {
        ...current,
        assignments
      };
      this.activeGymkhanaSubject.next(updated);
    }
  }

  getActiveGymkhana(): Gymkhana | null {
    return this.activeGymkhanaSubject.value;
  }

  clearActive() {
    this.activeGymkhanaSubject.next(null);
  }
}
