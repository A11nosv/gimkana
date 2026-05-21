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
  IonCardContent
} from '@ionic/angular/standalone';
import { ModalController } from '@ionic/angular/standalone';
import { Gymkhana, GroupAssignment } from '../../../services/gymkhana';

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
    IonCardContent
  ],
  templateUrl: './assignment-form.component.html',
  styleUrls: ['./assignment-form.component.scss']
})
export class AssignmentFormComponent implements OnInit {
  @Input() gymkhana!: Gymkhana;
  
  tempAssignments: GroupAssignment[] = [];

  constructor(private modalCtrl: ModalController) {}

  ngOnInit() {
    // Clone existing assignments or initialize
    this.tempAssignments = JSON.parse(JSON.stringify(this.gymkhana.assignments));
  }

  isWaypointSelected(groupId: number, waypointId: string): boolean {
    const assignment = this.tempAssignments.find(a => a.groupId === groupId);
    return assignment ? assignment.waypointIds.includes(waypointId) : false;
  }

  toggleWaypoint(groupId: number, waypointId: string, checked: boolean) {
    const assignment = this.tempAssignments.find(a => a.groupId === groupId);
    if (assignment) {
      if (checked) {
        if (!assignment.waypointIds.includes(waypointId)) {
          assignment.waypointIds.push(waypointId);
        }
      } else {
        assignment.waypointIds = assignment.waypointIds.filter(id => id !== waypointId);
      }
    }
  }

  save() {
    this.modalCtrl.dismiss(this.tempAssignments);
  }

  cancel() {
    this.modalCtrl.dismiss();
  }
}
