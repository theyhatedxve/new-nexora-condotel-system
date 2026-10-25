import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      application: 'NEXORA Backend',
      message: 'The backend is running successfully.',
    }
  }
}
