import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  it('should return the backend health status', () => {
    expect(controller.getHealth()).toEqual({
      status: 'ok',
      application: 'NEXORA Backend',
      message: 'The backend is running successfully.',
    });
  });
});
