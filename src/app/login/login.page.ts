import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar, 
  IonItem, 
  IonLabel, 
  IonInput, 
  IonButton, 
  IonText,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonIcon
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { addIcons } from 'ionicons';
import { lockClosedOutline, personOutline } from 'ionicons/icons';

import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    IonContent, 
    IonHeader, 
    IonTitle, 
    IonToolbar, 
    IonItem, 
    IonLabel, 
    IonInput, 
    IonButton, 
    IonText,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonIcon
  ]
})
export class LoginPage implements OnInit {
  user = '';
  pass = '';
  errorMessage = '';

  constructor(
    private authService: AuthService, 
    private router: Router,
    private titleService: Title
  ) {
    addIcons({ personOutline, lockClosedOutline });
  }

  ngOnInit() {
    this.titleService.setTitle('Iniciar Sesión - Gimkana A11y');
  }

  login() {
    this.errorMessage = '';
    if (this.authService.login(this.user, this.pass)) {
      this.router.navigate(['/tabs/tab2']);
    } else {
      this.errorMessage = 'Usuario o contraseña incorrectos. Por favor, inténtelo de nuevo.';
    }
  }

  cancel() {
    this.router.navigate(['/tabs/tab1']);
  }
}
