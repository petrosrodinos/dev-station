import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getStatus() {
    return { name: 'Dev Station API', status: 'ok' };
  }
}
