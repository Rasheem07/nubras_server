import { Test, TestingModule } from '@nestjs/testing';
import { SalespersonController } from './salesperson.controller';

describe('SalespersonController', () => {
  let controller: SalespersonController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalespersonController],
    }).compile();

    controller = module.get<SalespersonController>(SalespersonController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
