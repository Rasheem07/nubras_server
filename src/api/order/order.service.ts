import { Injectable } from '@nestjs/common';
import { prisma } from 'src/lib/prisma';

@Injectable()
export class OrderService {

    async getOrderDetails(trackingToken: string) {
        return await prisma.order.findFirst({
            where: {
                trackingToken
            },
            select: {
                InvoiceId: true,
                type: true,
                branch: true,
                status: true,
                orderedFrom: true,
                Customer: true,
                createdAt: true,
                updatedAt: true,
                salesPersonName: true,
                section: true,
                product: true,
                paymentStatus: true,
                quantity: true,
                totalAmount: true,
                deliveryDate: true,
                paymentDate: true,
                Transactions: true,
                PendingAmount: true, 
                PaidAmount: true,
                assignedTo: true,
                Measurement: true,
            }
        })
    }
}
