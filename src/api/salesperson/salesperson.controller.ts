import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { SalespersonService } from './salesperson.service';
import { SalesPerson } from '@prisma/client';

@Controller('salesperson')
export class SalespersonController {
    constructor(private readonly salespersonService: SalespersonService) {}

    @Get()
    async getSalesperson() {
        return this.salespersonService.getSalesperson();
    }


    @Post('create')
    async createSalesperson(@Body() salesperson: SalesPerson) {
        return this.salespersonService.createSalesperson(salesperson);
    }   

    @Put(':id')
    async updateSalesperson(@Param('id') id: string, @Body() salesperson: SalesPerson) {
        return this.salespersonService.updateSalesperson(id, salesperson);
    }

    @Delete(':id')
    async deleteSalesperson(@Param('id') id: string) {
        return this.salespersonService.deleteSalesperson(id);
    }
}   
