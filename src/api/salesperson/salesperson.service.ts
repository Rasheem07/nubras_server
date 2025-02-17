import { HttpStatus, HttpException, Injectable } from '@nestjs/common';
import { SalesPerson } from '@prisma/client';
import { prisma } from 'src/lib/prisma';

@Injectable()
export class SalespersonService {

    async getSalesperson() {
        const salesperson = await prisma.salesPerson.findMany();
        return salesperson;
    };


    
    async createSalesperson(salesperson: SalesPerson) {
        const existingSalesperson = await prisma.salesPerson.findFirst({
            where: { name: salesperson.name },
        });

        if (existingSalesperson) {
            throw new HttpException({type: 'error', message: 'Salesperson already exists'}, HttpStatus.BAD_REQUEST);
        }

        const newSalesPerson = await prisma.salesPerson.create({
            data: salesperson,
        });

        return {type: 'success', message: 'Salesperson created successfully'};
    };

    async updateSalesperson(salespersonId: string, salesperson: SalesPerson) {
        const existingSalesperson = await prisma.salesPerson.findUnique({
            where: { id: salespersonId },
        });
        if (!existingSalesperson) {
            throw new HttpException({type: 'error', message: 'Salesperson not found'}, HttpStatus.NOT_FOUND);
        }
        const updatedSalesperson = await prisma.salesPerson.update({
            where: { id: salespersonId },
            data: salesperson,
        });
        return {type: 'success', message: 'Salesperson updated successfully'};
    };


    async deleteSalesperson(salespersonId: string) {
        const salesperson = await prisma.salesPerson.findUnique({
            where: { id: salespersonId },
        });
        if (!salesperson) {
            throw new HttpException({type: 'error', message: 'Salesperson not found'}, HttpStatus.NOT_FOUND);
        }
        const deletedSalesperson = await prisma.salesPerson.delete({
            where: { id: salespersonId },
        });
        return {type: 'success', message: 'Salesperson deleted successfully'};
    };

    
}
