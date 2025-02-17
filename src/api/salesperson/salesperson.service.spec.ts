import { Test, TestingModule } from '@nestjs/testing';
import { SalespersonService } from './salesperson.service';

describe('SalespersonService', () => {
  let service: SalespersonService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SalespersonService],
    }).compile();

    service = module.get<SalespersonService>(SalespersonService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
