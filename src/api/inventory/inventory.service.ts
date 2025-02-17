import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { FabricInventory, Supplier } from '@prisma/client';
import { prisma } from 'src/lib/prisma';

@Injectable()
export class InventoryService {

    async getInventory() {
        const inventory = await prisma.productInventory.findMany();
        return inventory;
    }

    async GetProductInventory() {
        return await prisma.productInventory.findMany();
    }

    async getFabricsInventory() {
        return await prisma.fabricInventory.findMany()
    }

    async getFabricsMovements(id: string) {
        return await prisma.fabricMovement.findMany({ where: { inventoryId: id } })
    }

    async getProductMovement(id: string) {
        const productMovement = await prisma.productMovement.findMany({
            where: {
                inventoryId: id
            }
        });
        return productMovement;
    }

    async getReservedFabrics() {
        return await prisma.fabric.findMany({
            where: {
                order: {
                    status: {
                        in: ["confirmed", "processing"]
                    }
                }
            }
        })
    }

    async restockProduct(inventoryId: string, quantity: number, supplierName: string, movementDate: Date, reorderPoint: number) {


        const supplier = await prisma.supplier.findFirst({
            where: {
                name: supplierName
            }
        })

        if (!supplier) {
            throw new HttpException({ type: 'error', message: 'Supplier not found' }, HttpStatus.NOT_FOUND);
        }

        const inventory = await prisma.productInventory.findFirst({
            where: {
                id: inventoryId
            }
        });


        const product = await prisma.productInventory.update({
            where: {
                id: inventory.id
            },
            data: {
                quantityAvailable: { increment: quantity },
                reorderPoint: reorderPoint
            }

        });

        await prisma.productMovement.create({
            data: {
                productName: product.productName,
                quantity: quantity,
                movementType: 'RESTOCK',
                inventoryId: inventory.id,
                movementDate: new Date(movementDate),
            }
        });

        return {
            type: 'success',
            message: 'Product restocked successfully'
        };

    }
    async restockFabric(inventoryId: string, quantity: number, supplierName: string, movementDate: Date, reorderPoint: number) {


        const supplier = await prisma.supplier.findFirst({
            where: {
                name: supplierName
            }
        })

        if (!supplier) {
            throw new HttpException({ type: 'error', message: 'Supplier not found' }, HttpStatus.NOT_FOUND);
        }

        const inventory = await prisma.fabricInventory.findFirst({
            where: {
                id: inventoryId
            }
        });

        await prisma.fabricInventory.update({
            where: {
                id: inventory.id
            },
            data: {
                quantityAvailable: { increment: quantity },
                reorderPoint: reorderPoint
            }
        });

        await prisma.fabricMovement.create({
            data: {
                quantity: quantity,
                movementType: 'RESTOCK',
                inventoryId: inventory.id,
                movementDate: new Date(movementDate),
            }
        });

        return {
            type: 'success',
            message: 'Fabric restocked successfully'
        };

    }

    async addFabric(data: FabricInventory) {

        const fabric = await prisma.fabricInventory.findFirst({
            where: {
                fabricName: data.fabricName
            }
        })

        if(fabric) {
            throw new HttpException({type: 'error', message: 'Fabric already exists'}, HttpStatus.NOT_ACCEPTABLE)
        }

        await prisma.fabricInventory.create({
            data
        })
        
        return {type: 'message', message: 'Fabric succesfully added to the inventory!'}
    }

    async addSupplier(data: Supplier) {
        const supplier = await prisma.supplier.findFirst({
            where: {
                name: data.name
            }
        });

        if(supplier) {
            throw new HttpException({type: 'error', message: 'Supplier already exists'}, HttpStatus.NOT_ACCEPTABLE)
        }

        await prisma.supplier.create({
            data
        });

        return {type: 'message', message: 'Supplier added succesfully'}
    }

    async getAllSuppliers() {
        return await prisma.supplier.findMany();
    }
}

