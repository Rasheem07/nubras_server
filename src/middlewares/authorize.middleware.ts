import { Injectable, NestMiddleware, HttpStatus } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import { prisma } from '../lib/prisma'
import { trackUserActivity } from "./trackUserActivity";


@Injectable()
export class AuthorizeMiddleware implements NestMiddleware {
    async use(req: Request, res: Response, next: NextFunction) {
        const token = req.cookies.accessToken || req.accessToken;

        if (!token) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: "Unauthorized user", type: "error" });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET) as { type: string; id: string; role: string | undefined};
            (req as any).userId = decoded.id;
            (req as any).role = decoded.role;
            (req as any).type = decoded.type;


            if(decoded.type == 'user') {

                const user = await prisma.user.findFirst({
                    where: { id: decoded.id },
                    select: { status: true }
            })

            if (user.status === "Revoked") {
                console.log("user is revoked")
                res.clearCookie('refreshToken');
                res.clearCookie('isLogined')
                res.clearCookie('isTailoredLogin')
                res.clearCookie('accessToken');
                return ;
            }

            await prisma.user.update({
                where: {
                    id: decoded.id
                },
                data: {
                    lastActive: new Date(),
                    status: "Active"
                }
            })
            
            await trackUserActivity(decoded.id)
           }

            next();
        } catch (error) {
            console.log(error)
            return res.status(HttpStatus.UNAUTHORIZED).json({ message: "Invalid token", type: "error" });
        }
    }
}
