import { TestBed } from '@angular/core/testing';

import { Gymkhana } from './gymkhana';

describe('Gymkhana', () => {
  let service: Gymkhana;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Gymkhana);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
