import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$: Observable<boolean> = this.isAuthenticatedSubject.asObservable();

  constructor() {
    // Check local storage on initialization
    const authStatus = localStorage.getItem('isCreatorAuthenticated');
    if (authStatus === 'true') {
      this.isAuthenticatedSubject.next(true);
    }
  }

  login(user: string, pass: string): boolean {
    if (user === 'once' && pass === '11Once11') {
      this.isAuthenticatedSubject.next(true);
      localStorage.setItem('isCreatorAuthenticated', 'true');
      return true;
    }
    return false;
  }

  logout() {
    this.isAuthenticatedSubject.next(false);
    localStorage.removeItem('isCreatorAuthenticated');
  }

  get isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }
}
