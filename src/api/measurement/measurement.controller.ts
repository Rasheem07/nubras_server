import { Controller, Get, Post, Body } from '@nestjs/common';                 
import { MeasurementService } from './measurement.service';
import { Measurement } from '@prisma/client';

@Controller('measurement')
export class MeasurementController {
    constructor(private readonly measurementService: MeasurementService) {}

    @Post('create')
    createMeasurement(@Body() measurement: Measurement) {   
        return this.measurementService.createMeasurement(measurement);
    }
    
    @Get()
    getAllMeasurements() {
        return this.measurementService.getAllMeasurements();
    }
    
}
