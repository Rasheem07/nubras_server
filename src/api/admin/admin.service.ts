import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { prisma } from 'src/lib/prisma';
import { Employee, User } from '@prisma/client';
import { UploadService } from 'src/upload/upload.service';

@Injectable()
export class AdminService {
    constructor(private readonly uploadService: UploadService) { }

    adminAccess() {
        return 'Hello Admin';
    }

    async getUsers() {
        return await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
    }

    async  addUser(data: User, file: Express.Multer.File) {
        const user = await prisma.user.findUnique({
            where: {
                username: data.username
            }
        })

        if (user) {
            throw new HttpException({ type: 'error', message: 'user already exists!' }, HttpStatus.CONFLICT);
        }

        const profilePicture = (await this.uploadService.saveFile(file)).url;

        await prisma.user.create({
            data: {
                username: data.username,
                contact: data.contact,
                profilePicture,
                role: data.role
            }
        })

        return { type: 'message', message: 'User added successfully!' }
    }

    async EditUser(data: User, id: string) {
        const user = await prisma.user.findFirst({
            where: { id: id }
        })

        if (!user) {
            throw new HttpException({ type: 'error', message: 'User not found' }, HttpStatus.NOT_FOUND)
        }

        await prisma.user.update({
            where: {
                id: id
            },
            data: {
                username: data.username,
                contact: data.contact,
                role: data.role
            }
        })

        return { type: 'message', message: 'user edited successfully' }
    }

    async RevokeUser(id: string) {
        const user = await prisma.user.findFirst({
            where: { id }
        })

        if (!user) {
            throw new HttpException({ type: 'error', message: 'User not found' }, HttpStatus.NOT_FOUND)
        }

        if (user.status === "Revoked") {
            throw new HttpException({ type: 'error', message: 'User is already revoked!' }, HttpStatus.CONFLICT)
        }

        await prisma.user.update({
            where: { id },
            data: {
                status: "Revoked"
            }
        })

        return {type: 'message', message: `User with ID - ${id} revoked succesfully!`}
    }

    async reactivate(id: string) {
        const user = await prisma.user.findFirst({
            where: { id }
        })

        if (!user) {
            throw new HttpException({ type: 'error', message: 'User not found' }, HttpStatus.NOT_FOUND)
        }

        await prisma.user.update({
            where: { id },
            data: {
                status: "Offline"
            }
        })

        return {type: 'message', message: `User with ID - ${id} reactivated succesfully!`}
    }
    addEmployee(employee: Employee) {
        return prisma.employee.create({
            data: employee
        });
    }

}
