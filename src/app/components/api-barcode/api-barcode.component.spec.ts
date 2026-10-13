import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApiBarcodeComponent } from './api-barcode.component';

describe('ApiBarcodeComponent', () => {
  let component: ApiBarcodeComponent;
  let fixture: ComponentFixture<ApiBarcodeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ApiBarcodeComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ApiBarcodeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
