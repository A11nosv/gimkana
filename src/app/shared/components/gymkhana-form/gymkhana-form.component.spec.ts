import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { GymkhanaFormComponent } from './gymkhana-form.component';

describe('GymkhanaFormComponent', () => {
  let component: GymkhanaFormComponent;
  let fixture: ComponentFixture<GymkhanaFormComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [GymkhanaFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GymkhanaFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
