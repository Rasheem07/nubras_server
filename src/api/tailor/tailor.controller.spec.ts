import { Test, TestingModule } from '@nestjs/testing';
import { TailorController } from './tailor.controller';

describe('TailorController', () => {
  let controller: TailorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TailorController],
    }).compile();

    controller = module.get<TailorController>(TailorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
