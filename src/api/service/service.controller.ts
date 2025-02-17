import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ServiceService } from './service.service';
import { Section, Service, ServiceType } from '@prisma/client';

interface ServiceWithCosting {
    name: string,
    type: ServiceType,
    costingPrice: number,
    price: number,
    sectionName: string
}

@Controller('service')
export class ServiceController {

    constructor(private readonly Service: ServiceService){}

    @Post('add-section')
    async addSection(@Body() data: Section) {
        return this.Service.addSection(data);
    }

    @Get('sections') 
    async getSections() {
        return this.Service.getSections();
    }

    @Get(':section')
    async getAllServices(@Param('section') section: string) {
        return this.Service.getAllServices(section);
    }

    @Post('add')
    async AddService(@Body() data: ServiceWithCosting) {
        return this.Service.addService(data);
    }
}
