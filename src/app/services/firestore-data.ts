import { Injectable, inject } from '@angular/core';
import { 
  Firestore, 
  collection, 
  collectionData, 
  doc, 
  docData, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  arrayUnion,
  arrayRemove
} from '@angular/fire/firestore';
import { Observable, firstValueFrom, of } from 'rxjs';
import { AuthService } from './auth';
import { Gymkhana, Waypoint, Group, GroupAssignment } from './gymkhana';

@Injectable({
  providedIn: 'root'
})
export class FirestoreDataService {
  private firestore: Firestore = inject(Firestore);
  private authService: AuthService = inject(AuthService);
  private gymkhanasCollection = collection(this.firestore, 'gymkhanas');

  constructor() {}

  async getGymkhanaByName(name: string): Promise<Gymkhana | null> {
    const q = query(this.gymkhanasCollection, where('name', '==', name));
    const querySnapshot = await firstValueFrom(collectionData(q, { idField: 'id' }));
    if (querySnapshot && querySnapshot.length > 0) {
      return querySnapshot[0] as Gymkhana;
    }
    return null;
  }

  // Permisos: Solo el creador puede escribir
  private checkCreatorPermission(): void {
    if (!this.authService.isAuthenticated) {
      throw new Error('No tienes permisos para realizar esta acción. Solo el creador puede modificar datos.');
    }
  }

  // --- Gymkhanas ---

  getGymkhanas(): Observable<Gymkhana[]> {
    return collectionData(this.gymkhanasCollection, { idField: 'id' }) as Observable<Gymkhana[]>;
  }

  getGymkhanaById(id: string): Observable<Gymkhana | undefined> {
    const gymDocRef = doc(this.firestore, `gymkhanas/${id}`);
    return docData(gymDocRef, { idField: 'id' }) as Observable<Gymkhana | undefined>;
  }

  async createGymkhana(gymData: Omit<Gymkhana, 'id'>): Promise<string> {
    this.checkCreatorPermission();
    const docRef = await addDoc(this.gymkhanasCollection, gymData);
    return docRef.id;
  }

  async updateGymkhana(id: string, data: Partial<Gymkhana>): Promise<void> {
    this.checkCreatorPermission();
    const gymDocRef = doc(this.firestore, `gymkhanas/${id}`);
    await updateDoc(gymDocRef, data);
  }

  async deleteGymkhana(id: string): Promise<void> {
    this.checkCreatorPermission();
    const gymDocRef = doc(this.firestore, `gymkhanas/${id}`);
    await deleteDoc(gymDocRef);
  }

  async publishGymkhana(id: string): Promise<void> {
    this.checkCreatorPermission();
    const gymDocRef = doc(this.firestore, `gymkhanas/${id}`);
    await updateDoc(gymDocRef, { published: true });
  }

  getPublishedGymkhanas(): Observable<Gymkhana[]> {
    const q = query(this.gymkhanasCollection, where('published', '==', true));
    return collectionData(q, { idField: 'id' }) as Observable<Gymkhana[]>;
  }

  async saveResultAndGetRank(gymId: string, result: any): Promise<number> {
    const resultsCollection = collection(this.firestore, `gymkhanas/${gymId}/results`);
    
    // Guardar el resultado de este grupo
    await addDoc(resultsCollection, result);

    // Obtener todos los resultados para calcular el ranking
    const querySnapshot = await firstValueFrom(collectionData(resultsCollection));
    
    // El ranking se basa en cuántos grupos terminaron antes (por tiempo o por orden de llegada si empatan)
    // Para simplificar, contaremos cuántos resultados hay en total incluyendo el actual
    return querySnapshot.length;
  }

  // --- Puntos (Waypoints) ---

  async addWaypoint(gymId: string, waypoint: Waypoint): Promise<void> {
    this.checkCreatorPermission();
    const gymDocRef = doc(this.firestore, `gymkhanas/${gymId}`);
    await updateDoc(gymDocRef, {
      waypoints: arrayUnion(waypoint)
    });
  }

  async removeWaypoint(gymId: string, waypoint: Waypoint): Promise<void> {
    this.checkCreatorPermission();
    const gymDocRef = doc(this.firestore, `gymkhanas/${gymId}`);
    await updateDoc(gymDocRef, {
      waypoints: arrayRemove(waypoint)
    });
  }

  async updateWaypoint(gymId: string, oldWaypoint: Waypoint, newWaypoint: Waypoint): Promise<void> {
    this.checkCreatorPermission();
    const gymDocRef = doc(this.firestore, `gymkhanas/${gymId}`);
    // En Firestore, para actualizar un elemento específico de un array, a menudo es más seguro
    // recuperar el documento, modificar el array localmente y volver a subirlo.
    const gym = await firstValueFrom(this.getGymkhanaById(gymId));
    if (gym) {
      const updatedWaypoints = gym.waypoints.map(wp => wp.id === oldWaypoint.id ? newWaypoint : wp);
      await updateDoc(gymDocRef, { waypoints: updatedWaypoints });
    }
  }

  // --- Grupos ---

  async addGroup(gymId: string, group: Group): Promise<void> {
    this.checkCreatorPermission();
    const gymDocRef = doc(this.firestore, `gymkhanas/${gymId}`);
    // Al añadir un grupo, también debemos inicializar su asignación
    const gym = await firstValueFrom(this.getGymkhanaById(gymId));
    if (gym) {
      const newAssignment: GroupAssignment = {
        groupId: gym.groups.length, // Usando el índice como ID simple
        waypointIds: []
      };
      await updateDoc(gymDocRef, {
        groups: arrayUnion(group),
        assignments: arrayUnion(newAssignment)
      });
    }
  }

  async removeGroup(gymId: string, group: Group, groupIndex: number): Promise<void> {
    this.checkCreatorPermission();
    const gymDocRef = doc(this.firestore, `gymkhanas/${gymId}`);
    const gym = await firstValueFrom(this.getGymkhanaById(gymId));
    if (gym) {
      const updatedGroups = gym.groups.filter((_, i) => i !== groupIndex);
      const updatedAssignments = gym.assignments
        .filter(a => a.groupId !== groupIndex)
        .map((a, i) => ({ ...a, groupId: i })); // Re-indexar IDs si es necesario
      
      await updateDoc(gymDocRef, {
        groups: updatedGroups,
        assignments: updatedAssignments
      });
    }
  }

  async updateGroup(gymId: string, groupIndex: number, newName: string): Promise<void> {
    this.checkCreatorPermission();
    const gymDocRef = doc(this.firestore, `gymkhanas/${gymId}`);
    const gym = await firstValueFrom(this.getGymkhanaById(gymId));
    if (gym) {
      const updatedGroups = [...gym.groups];
      updatedGroups[groupIndex] = { name: newName };
      await updateDoc(gymDocRef, { groups: updatedGroups });
    }
  }
}
