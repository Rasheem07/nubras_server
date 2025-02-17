import { Injectable, NestMiddleware, HttpStatus } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import * as jwt from "jsonwebtoken";

@Injectable()
export class AuthorizeMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        const token = req.cookies.accessToken || req.accessToken;
        
        if (!token) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: "Unauthorized user", type: "error" });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET) as { id: string; role: string };
            (req as any).userId = decoded.id;
            (req as any).role = decoded.role;
            next();
        } catch (error) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: "Invalid token", type: "error" });
        }
    }
}
