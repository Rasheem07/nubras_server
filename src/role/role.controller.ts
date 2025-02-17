import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';
import { prisma } from 'src/lib/prisma';
@Controller('role')
export class RoleController {

    @Get('user-type')
    async getUserType(@Req() req: Request) {
        console.log('req.userId', req.userId);
        const user = await prisma.user.findFirst({
            where: {
                id: req.userId
            }
        });

        if (user) {
            return { userType: "admin" }
        }


        const employee = await prisma.employee.findFirst({
            where: {
                id: req.userId
            }
        });

        if (employee) {
            return { userType: "tailor" }
        }
    }

    @Get()
    async getRole(@Req() req: Request) {
        const role = req.role;
        return { role: req.role }
    }

}
