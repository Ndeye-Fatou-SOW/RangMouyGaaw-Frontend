import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionBus } from './gestion-bus';

describe('GestionBus', () => {
  let component: GestionBus;
  let fixture: ComponentFixture<GestionBus>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionBus],
    }).compileComponents();

    fixture = TestBed.createComponent(GestionBus);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
