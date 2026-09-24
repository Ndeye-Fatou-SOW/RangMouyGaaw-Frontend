import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AchatTicket } from './achat-ticket';

describe('AchatTicket', () => {
  let component: AchatTicket;
  let fixture: ComponentFixture<AchatTicket>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AchatTicket],
    }).compileComponents();

    fixture = TestBed.createComponent(AchatTicket);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
