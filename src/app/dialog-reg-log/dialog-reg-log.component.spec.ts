import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogRegLogComponent } from './dialog-reg-log.component';

describe('DialogRegLogComponent', () => {
  let component: DialogRegLogComponent;
  let fixture: ComponentFixture<DialogRegLogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DialogRegLogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DialogRegLogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
