import { Injectable } from '@nestjs/common';
import { prisma } from 'src/lib/prisma';
import { Employee } from '@prisma/client';

@Injectable()
export class AdminService {
    
    adminAccess() {
        return 'Hello Admin';
    }

    addEmployee(employee: Employee) {
        return prisma.employee.create({
            data: employee
        });
    }

}
