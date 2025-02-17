import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { prisma } from 'src/lib/prisma';
import * as jwt from 'jsonwebtoken';
import { Twilio } from 'twilio';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TailorService {

    async getAllTailors() {
        return await prisma.employee.findMany()
    }
    async getOrders(id: string) {
        const orders = await prisma.order.findMany({
            where: {
                assignedTo: id
            },
            select: {
                InvoiceId: true,
                branch: true,
                status: true,
                productName: true,
                productPrice: true, // Add price for reference
                quantity: true, // Add quantity
                totalAmount: true, // Add total amount for the order
                PendingAmount: true,
                PaidAmount: true, // Add paid amount for tracking
                dueDate: true,
                Customer: true,
                Measurement: true, // Include measurements
                Fabric: true, // Include fabric details
                assignedTo: true, // To track which tailor is assigned
            }
        });
        return orders;
    }
    

    async getOrderDetails(id: string) {
        const order = await prisma.order.findUnique({
            where: {
                InvoiceId: id,
            },
            select: {
                InvoiceId: true,
                branch: true,
                status: true,
                productName: true,
                dueDate: true,
                Customer: {
                    select: {
                        name: true,
                        phone: true,
                    }
                },
                Measurement:true, 
                Fabric: true,
                Transactions: true   
            }
        });
        return order;

    }

}


