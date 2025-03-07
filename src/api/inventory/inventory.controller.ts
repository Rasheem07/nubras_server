import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { FabricInventory, Supplier } from '@prisma/client';


@Controller('inventory')
export class InventoryController {

    constructor(private readonly inventoryService: InventoryService) { }

    // @Get()
    // async getInventory() {
    //     return this.inventoryService.getInventory();
    // }

    // @Get(':productName')
    // async getProductMovement(@Param('productName') productName: string) {
    //     return this.inventoryService.getProductMovement(productName);
    // }


    @Post('restock/product')
    async restockProduct(@Body() body: {
        inventoryId: string, quantityAvailable
            : number, supplierName: string, movementDate: Date, reorderPoint: number
    }) {
        return this.inventoryService.restockProduct(body.inventoryId, body.quantityAvailable
            , body.supplierName, body.movementDate, body.reorderPoint);
    }

    @Post('restock/fabric')
    async restockFabric(@Body() body: {
        inventoryId: string, quantityAvailable
            : number, supplierName: string, movementDate: Date, reorderPoint: number
    }) {
        return this.inventoryService.restockFabric(body.inventoryId, body.quantityAvailable
            , body.supplierName, body.movementDate, body.reorderPoint);
    }

    @Get('products')
    async getAllProductInventory() {
        return this.inventoryService.GetProductInventory()
    }

    @Get('reserved-fabrics')
    async getReservedFabrics() {
        return this.inventoryService.getReservedFabrics();
    }

    @Get('fabrics')
    async getAllFabricsInventory() {
        return this.inventoryService.getFabricsInventory();
    }

    @Get('fabrics/:id')
    async getFabricMovement(@Param('id') id: string) {
        return this.inventoryService.getFabricsMovements(id)
    }

    @Get('products/:id')
    async getProductMovements(@Param('id') id: string) {
        return this.inventoryService.getProductMovement(id)
    }

    @Post('fabrics/add')
    async addFabricToInventory(@Body() data: FabricInventory) {
        return this.inventoryService.addFabric(data);
    }

    @Get('suppliers')
    async getSuppliers() {
        return this.inventoryService.getAllSuppliers()
    }

   

    @Post('suppliers/add')
    async addSupplier(@Body() data: Supplier) {
        return this.inventoryService.addSupplier(data);
    }
}
