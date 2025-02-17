import { Role } from '@prisma/client';
import { UUID } from 'crypto';

declare global {
  namespace Express {
    interface Request {
      userId: UUID;
      role: Role;
    }
  }
}

export {}; 