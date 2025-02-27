import { Injectable, NestMiddleware, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class RefreshTokenMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const refreshToken = req.cookies['refreshToken'];
    const accessToken = req.cookies['accessToken'];

    if (!refreshToken && !accessToken) {
      
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized', type: 'error' });
    }

    if (refreshToken && !accessToken) {
      const payload = jwt.verify(refreshToken, process.env.JWT_SECRET) as any;

      // Remove "exp" and "iat" to avoid conflict
      const { exp, iat, ...cleanPayload } = payload;
      const newAccessToken = jwt.sign(cleanPayload, process.env.JWT_SECRET, { expiresIn: '15m' });
      const newRefreshToken = jwt.sign(cleanPayload, process.env.JWT_SECRET, { expiresIn: '7d' });


        req.accessToken = newAccessToken;
        req.refreshToken = newRefreshToken;
        res.cookie('accessToken', newAccessToken, { httpOnly: true, maxAge: 15 * 60 * 1000 });
        res.cookie('refreshToken', newRefreshToken, { httpOnly: true, maxAge: 24 * 7 * 60 * 60 * 1000 });

    }

    next();
  }
}

declare global {
  namespace Express {
    interface Request {
      accessToken: string;
      refreshToken: string;
    }
  }
} 


