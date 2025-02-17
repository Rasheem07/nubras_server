import { Controller, Get, UseGuards, Post, Body } from '@nestjs/common';
import { AdminService } from './admin.service';
import { RolesGuard } from 'src/guards/Role.guard';
import { Employee } from '@prisma/client';

@UseGuards(new RolesGuard(['ADMIN']))
@Controller('admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) {}

    @Get()
    adminAccess() {
        return this.adminService.adminAccess();
    }

    @Post('add-employee')
    addEmployee(@Body() employee: Employee) {
        return this.adminService.addEmployee(employee);
    }
}

