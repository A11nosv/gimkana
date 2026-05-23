import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular/standalone';
import { MapComponent } from '../shared/components/map/map.component';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, MapComponent, CommonModule]
})
export class Tab2Page implements OnInit {
  isCreatorMode = true;

  constructor(private titleService: Title) {}

  ngOnInit() {
    this.titleService.setTitle('Modo Creador - Gimkana A11y');
  }

}
