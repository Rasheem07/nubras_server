import { Injectable } from '@nestjs/common';
import { Measurement } from '@prisma/client';
import { prisma } from 'src/lib/prisma';

@Injectable()
export class MeasurementService {

    async createMeasurement(measurement: Measurement) {
        return prisma.measurement.create({
            data: measurement
        });
    }

    async getAllMeasurements() {
        return prisma.measurement.findMany();
    }
}

