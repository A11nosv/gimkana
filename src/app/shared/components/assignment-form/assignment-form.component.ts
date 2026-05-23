import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent, 
  IonButtons, 
  IonButton, 
  IonList, 
  IonItem, 
  IonLabel, 
  IonCheckbox,
  IonListHeader,
  IonNote,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonIcon,
  IonReorderGroup,
  IonReorder,
  IonItemDivider,
  AlertController
} from '@ionic/angular/standalone';
import { ModalController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowUpOutline, arrowDownOutline, reorderTwoOutline, shuffleOutline } from 'ionicons/icons';
import { Gymkhana, GroupAssignment, Waypoint } from '../../../services/gymkhana';

@Component({
  selector: 'app-assignment-form',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    IonHeader, 
    IonToolbar, 
    IonTitle, 
    IonContent, 
    IonButtons, 
    IonButton, 
    IonList, 
    IonItem, 
    IonLabel, 
    IonCheckbox,
    IonListHeader,
    IonNote,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonIcon,
    IonReorderGroup,
    IonReorder,
    IonItemDivider
  ],
  templateUrl: './assignment-form.component.html',
  styleUrls: ['./assignment-form.component.scss']
})
export class AssignmentFormComponent implements OnInit {
  @Input() gymkhana!: Gymkhana;
  
  tempAssignments: GroupAssignment[] = [];
  selectedGroupIndex: number | null = null;

  constructor(
    private modalCtrl: ModalController,
    private alertCtrl: AlertController
  ) {
    addIcons({ arrowUpOutline, arrowDownOutline, reorderTwoOutline, shuffleOutline });
  }

  ngOnInit() {
    // Clone existing assignments or initialize
    this.tempAssignments = JSON.parse(JSON.stringify(this.gymkhana.assignments));
    if (this.gymkhana.groups.length > 0) {
      this.selectedGroupIndex = 0;
    }
  }

  get currentAssignment(): GroupAssignment | null {
    if (this.selectedGroupIndex === null) return null;
    return this.tempAssignments.find(a => a.groupId === this.selectedGroupIndex) || null;
  }

  selectGroup(index: number) {
    this.selectedGroupIndex = index;
  }

  isWaypointInAssignment(waypointId: string): boolean {
    if (!this.currentAssignment) return false;
    return this.currentAssignment.waypointIds.includes(waypointId);
  }

  toggleWaypoint(waypointId: string, checked: boolean) {
    if (this.currentAssignment) {
      if (checked) {
        if (!this.currentAssignment.waypointIds.includes(waypointId)) {
          this.currentAssignment.waypointIds.push(waypointId);
        }
      } else {
        this.currentAssignment.waypointIds = this.currentAssignment.waypointIds.filter(id => id !== waypointId);
      }
    }
  }

  shuffleWaypoints() {
    if (this.currentAssignment && this.currentAssignment.waypointIds.length > 1) {
      const array = [...this.currentAssignment.waypointIds];
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      this.currentAssignment.waypointIds = array;
    }
  }

  handleReorder(ev: any) {
    if (this.currentAssignment) {
      const itemMove = this.currentAssignment.waypointIds.splice(ev.detail.from, 1)[0];
      this.currentAssignment.waypointIds.splice(ev.detail.to, 0, itemMove);
      ev.detail.complete();
    }
  }

  moveUp(index: number) {
    if (this.currentAssignment && index > 0) {
      const ids = this.currentAssignment.waypointIds;
      [ids[index], ids[index - 1]] = [ids[index - 1], ids[index]];
    }
  }

  moveDown(index: number) {
    if (this.currentAssignment && index < this.currentAssignment.waypointIds.length - 1) {
      const ids = this.currentAssignment.waypointIds;
      [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
    }
  }

  getWaypointName(id: string): string {
    return this.gymkhana.waypoints.find(wp => wp.id === id)?.name || 'Punto desconocido';
  }

  get isValidToPublish(): boolean {
    return this.tempAssignments.every(a => a.waypointIds.length >= 2);
  }

  async save() {
    this.modalCtrl.dismiss({ assignments: this.tempAssignments, publish: false });
  }

  async publish() {
    if (!this.isValidToPublish) {
      const invalidGroups = this.tempAssignments
        .map((a, i) => ({ assignment: a, index: i }))
        .filter(item => item.assignment.waypointIds.length < 2);

      const groupNames = invalidGroups
        .map(item => this.gymkhana.groups[item.index].name)
        .join(', ');
      
      const alert = await this.alertCtrl.create({
        header: 'Asignación incompleta',
        message: `Cada grupo debe tener al menos 2 puntos asignados para publicar. Grupos pendientes: ${groupNames}`,
        buttons: ['Entendido']
      });
      await alert.present();
      return;
    }

    this.modalCtrl.dismiss({ assignments: this.tempAssignments, publish: true });
  }

  cancel() {
    this.modalCtrl.dismiss();
  }
}
