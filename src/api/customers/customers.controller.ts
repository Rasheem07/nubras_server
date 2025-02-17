import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { Customer } from '@prisma/client';


@Controller('customers')
export class CustomersController {
    
    constructor(private readonly customersService: CustomersService) {}

    @Get()
    getCustomers() {
        return this.customersService.getCustomers();
    }

    @Post('/create')
    addCustomer(@Body() customer: Customer) {
        console.log(customer);
        return this.customersService.addCustomer(customer);
    }

    @Get('/:name')
    searchCustomer(@Param('name') name: string) {
        return this.customersService.searchCustomer(name);
    }

}
