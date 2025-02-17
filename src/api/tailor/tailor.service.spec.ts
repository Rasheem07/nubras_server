import { Test, TestingModule } from '@nestjs/testing';
import { TailorService } from './tailor.service';

describe('TailorService', () => {
  let service: TailorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TailorService],
    }).compile();

    service = module.get<TailorService>(TailorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
