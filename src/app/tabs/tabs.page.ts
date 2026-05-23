import { Component, EnvironmentInjector, inject } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { triangle, ellipse, square, play, addCircle } from 'ionicons/icons';
import { GymkhanaService } from '../services/gymkhana';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, CommonModule],
})
export class TabsPage {
  public environmentInjector = inject(EnvironmentInjector);
  private gymkhanaService = inject(GymkhanaService);
  
  public isGameActive$ = this.gymkhanaService.isGameActive$;

  constructor() {
    addIcons({ triangle, ellipse, square, play, addCircle });
  }
}
