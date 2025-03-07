import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Section, Service, ServiceType } from '@prisma/client';
import { prisma } from 'src/lib/prisma';


interface ServiceWithCosting {
    name: string,
    type: ServiceType,
    costingPrice: number,
    price: number,
    sectionName: string
}

@Injectable()
export class ServiceService {

    async addSection(data: Section) {

        const section = await prisma.section.findFirst({
            where: {
                name: data.name
            }
        })

        if(section) {
            throw new HttpException({type: 'error', message: 'Section already exists!'}, HttpStatus.FORBIDDEN)
        }

        await prisma.section.create({
            data
        })

        return {type: 'error', message: 'Section added successfully! continue adding services within the section'}
    }


    async getSections() {
        return await prisma.section.findMany({include: {products: true}});
    }


    async addService(data: ServiceWithCosting) {
        console.log('service: ', data)
        const service = await prisma.service.findFirst({
            where: {
                sectionName: data.sectionName,
                name: data.name
            }
        })

        if(service) {
            throw new HttpException({type: 'error', message: 'Service is already available!'}, HttpStatus.FORBIDDEN);
        }
        

        await prisma.service.create({
            data: {
                name: data.name,
                type: data.type,
                price: data.price,
                sectionName: data.sectionName
            }
        });

        if(data.type == "READY_MADE" || data.type == "BOTH") {
            await prisma.productInventory.create({
                data: {
                    productName: data.name,
                    costingPrice: data.costingPrice,
                    sellingPrice: data.price
                }
              })
        }
        
        return {type: 'message', message: 'Service added successfully!'}
    }

    async getAllServices(sectionName: string) {
        return await prisma.service.findMany({
             where: {sectionName}
        })
    }
}
