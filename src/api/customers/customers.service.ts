import { Injectable } from '@nestjs/common';
import { Customer, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class CustomersService {

    getCustomers() {
        return prisma.customer.findMany();
    }

    addCustomer(customer: Customer) {
        console.log(customer);
        return prisma.customer.create({ data: customer });
    }


    async searchCustomer(query: string): Promise<string[]> {
        if (!query || query.length < 2) return []; // Prevent unnecessary queries

        const customers = await prisma.customer.findMany({
            where: {
                name: {
                    contains: query,
                    mode: "insensitive" // Case-insensitive search
                }
            },
            take: 10, // Limit results to 10
            select: {
                name: true
            }
        });

        return customers.map(customer => customer.name); // Extract only names
    }

}
