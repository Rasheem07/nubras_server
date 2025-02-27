import { Controller, Get, UseGuards, Post, Body, UseInterceptors, UploadedFile, Patch, Param } from '@nestjs/common';
import { AdminService } from './admin.service';
import { RolesGuard } from 'src/guards/Role.guard';
import { Employee, User } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';

@UseGuards(new RolesGuard(['ADMIN']))
@Controller('admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) {}

    @Get()
    adminAccess() {
        return this.adminService.adminAccess();
    }

    @Get('users')
    getUsers() {
        return this.adminService.getUsers();
    }

    @Post('users/add') 
    @UseInterceptors(FileInterceptor('file'))
    async addUser(@Body() user : User, @UploadedFile() file: Express.Multer.File) {
        console.log(user)
        
        return this.adminService.addUser(user, file)
    }

    @Post('revoke/:id') 
    async revokeUser(@Param('id') id: string) {
         return this.adminService.RevokeUser(id)
    }

    @Post('reactivate/:id') 
    async reactivateUser(@Param('id') id: string) {
         return this.adminService.reactivate(id)
    }


    @Patch('users/:id/edit') 
    async editUser(@Body() user : User, @Param('id') id: string) {
        console.log(user)
        return this.adminService.EditUser(user, id)
    }

    @Post('add-employee')
    addEmployee(@Body() employee: Employee) {
        return this.adminService.addEmployee(employee);
    }
}

