import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Fabric, item, Measurement, Order, Prisma, Transactions } from '@prisma/client';
import * as crypto from 'crypto';
import { prisma } from 'src/lib/prisma';

@Injectable()
export class OrdersService {
  private prisma = prisma;

  // Basic CRUD operations
  async getOrders(): Promise<Order[]> {
    return this.prisma.order.findMany({
      include: {
        items: true,
        Customer: true,
        SalesPerson: true,
        Transactions: true
      }
    });
  }
  async getOrdersforSalesman(id: string): Promise<Order[]> {
    return this.prisma.order.findMany({
      where: {
        SalesPerson: {
          id
        }
      },
      include: {
        items: true,
        Customer: true,
        Transactions: true
      }
    });
  }

  async getOrdersByCustomerId(customerId: string): Promise<Order[]> {
    return this.prisma.order.findMany({
      where: { customerId },
      include: { items: true }
    });
  }

  async getOrdersBySalespersonId(salespersonId: string): Promise<Order[]> {
    return this.prisma.order.findMany({
      where: { salesPersonId: salespersonId },
      include: { items: true }
    });
  }

  async getOrderById(InvoiceId: number): Promise<Order> {
    return this.prisma.order.findUnique({
      where: { InvoiceId },
      include: { items: true }
    });
  }

  async createOrderWithRelations(data: {
    order: Order,
    items: item[],
    transactions?: Transactions[],
    fabrics?: Fabric[],
    measurements?: Measurement[]
  }): Promise<Order> {
    // Core validation
    const validationErrors = this.validateOrderData(data);
    if (validationErrors.length) {
      throw new HttpException(validationErrors.join(', '), HttpStatus.BAD_REQUEST);
    }
  
    // Start a single Prisma transaction
    const newOrder = await this.prisma.$transaction(async (tx) => {
      // Fetch customer and salesperson in parallel
      const [customer, salesPerson] = await Promise.all([
        tx.customer.findFirst({
          where: { name: data.order.customerName },
          select: { id: true, name: true }
        }),
        tx.salesPerson.findUnique({
          where: { name: data.order.salesPersonName },
          select: { id: true, name: true }
        })
      ]);
  
      if (!customer || !salesPerson) {
        throw new HttpException('Customer or SalesPerson not found', HttpStatus.NOT_FOUND);
      }
  
      const trackingToken = this.generateTrackingTokenSync(customer.name);
      const totalPaid = data.transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
      const paymentStatus = totalPaid >= data.order.totalAmount
        ? "FULL_PAYMENT"
        : totalPaid > 0 ? "PARTIAL_PAYMENT" : "NO_PAYMENT";
  
      // Ensure inventory is available **before** creating order
      const readyMadeItems = data.items.filter(i => i.type === "READY_MADE");
  
      if (readyMadeItems.length) {
        const productGroups = readyMadeItems.reduce((acc, item) => {
          acc[item.productName] = (acc[item.productName] || 0) + item.quantity;
          return acc;
        }, {} as Record<string, number>);
  
        // Check inventory for all required products
        for (const [productName, quantity] of Object.entries(productGroups)) {
          const inventory = await tx.productInventory.findFirst({
            where: { productName },
            select: { id: true, quantityAvailable: true }
          });
  
          if (!inventory || inventory.quantityAvailable < quantity) {
            throw new HttpException({ message: `Insufficient stock for ${productName}`, type: "error" }, HttpStatus.BAD_REQUEST);
          }
  
          // Reserve inventory
          await tx.productInventory.update({
            where: { id: inventory.id },
            data: { quantityAvailable: { decrement: quantity } }
          });
  
          // Record movement
          await tx.productMovement.create({
            data: {
              productName,
              quantity,
              movementType: "SALE",
              movementDate: new Date(),
              inventoryId: inventory.id,
              orderId: data.order.InvoiceId
            }
          });
        }
      }
  
      // Create order record
      const order = await tx.order.create({
        data: {
          ...data.order,
          customerId: customer.id,
          salesPersonId: salesPerson.id,
          trackingToken,
          PendingAmount: data.order.totalAmount - totalPaid,
          PaidAmount: totalPaid,
          paymentStatus,
          ...(paymentStatus === "FULL_PAYMENT" ? { paymentDate: new Date() } : {})
        }
      });
  
      // Create items for the order
      await tx.item.createMany({
        data: data.items.map(item => ({
          ...item,
          orderInvoiceId: order.InvoiceId
        }))
      });
  
      return order;
    }, {
      maxWait: 2000,
      timeout: 5000,
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted
    });
  
    // Process any additional order-related data outside critical transaction path
    await this.processOrderRelatedData(newOrder, data);
  
    return newOrder;
  }
  
  // Decoupled background processing
  private async processOrderRelatedData(newOrder: Order, data: any): Promise<void> {
    try {
      // Process everything in parallel where possible
      await Promise.all([
        this.processOrderItems(newOrder.InvoiceId, data.items),
        this.processFabricsAndMeasurements(newOrder.InvoiceId, data.fabrics, data.measurements),
        this.processTransactions(newOrder.InvoiceId, data.transactions),
        this.updateStatistics(newOrder.InvoiceId, data)
      ]);

      // Log successful completion
      await this.prisma.auditLog.create({
        data: {
          actionType: "Order Relations Processed",
          description: `Order relations for Invoice ID ${newOrder.InvoiceId} successfully processed.`
        }
      });
    } catch (error) {
      // Retry once with sequential processing if parallel fails
      try {
        await this.processFabricsAndMeasurements(newOrder.InvoiceId, data.fabrics, data.measurements);
        await this.processTransactions(newOrder.InvoiceId, data.transactions);
        await this.updateStatistics(newOrder.InvoiceId, data);

        await this.prisma.auditLog.create({
          data: {
            actionType: "Order Relations Processed (Retry)",
            description: `Order relations for Invoice ID ${newOrder.InvoiceId} processed after retry.`
          }
        });
      } catch (retryError) {
        throw retryError; // Let caller handle final failure
      }
    }
  }

  // Strongly typed validation before any DB calls
  private validateOrderData(data: any): string[] {
    const errors: string[] = [];

    if (!data.order?.customerName) errors.push('Customer name is required');
    if (!data.order?.salesPersonName) errors.push('Sales person name is required');
    if (!data.order?.totalAmount || data.order.totalAmount <= 0) errors.push('Valid total amount is required');

    // Validate items have required fields synchronously
    if (data.items?.length) {
      data.items.forEach((item: any, idx: number) => {
        if (!item.productName) errors.push(`Item ${idx + 1} missing product name`);
        if (!item.quantity || item.quantity <= 0) errors.push(`Item ${idx + 1} has invalid quantity`);
      });
    }

    return errors;
  }

  // Process items with optimistic inventory validation
  private async processOrderItems(orderId: number, items?: item[]): Promise<void> {
    if (!items?.length) return;

    // Bulk create items
    await this.prisma.item.createMany({
      data: items.map(item => ({
        ...item,
        orderInvoiceId: orderId
      }))
    });

    // Handle inventory updates only for ready-made items
    const readyMadeItems = items.filter(i => i.type === "READY_MADE");
    if (!readyMadeItems.length) return;

    // Use optimal batch size to balance parallelism
    const BATCH_SIZE = 10;
    const batches = [];

    // Group by product for efficient inventory updates
    const productGroups = readyMadeItems.reduce((acc, item) => {
      acc[item.productName] = (acc[item.productName] || 0) + item.quantity;
      return acc;
    }, {} as Record<string, number>);

    const productEntries = Object.entries(productGroups);

    // Process inventory updates in parallel batches
    for (let i = 0; i < productEntries.length; i += BATCH_SIZE) {
      const batch = productEntries.slice(i, i + BATCH_SIZE);
      batches.push(Promise.all(batch.map(async ([productName, quantity]) => {
        try {
          // Get inventory first
          const inventory = await this.prisma.productInventory.findFirst({
            where: { productName },
            select: { id: true, quantityAvailable: true }
          });

          if (!inventory || inventory.quantityAvailable < quantity) {

            throw new HttpException({ message: `Insufficient stock for ${productName}`, type: "error" }, HttpStatus.NOT_FOUND);
          }

          // Update inventory
          await this.prisma.productInventory.update({
            where: { id: inventory.id },
            data: { quantityAvailable: { decrement: quantity } }
          });

          // Record movement
          await this.prisma.productMovement.create({
            data: {
              productName,
              quantity,
              movementType: "SALE",
              movementDate: new Date(),
              inventoryId: inventory.id,
              orderId
            }
          });
        } catch (error) {
          console.error(`Inventory update failed for ${productName}:`, error);
          // Log issue but continue processing other items
          await this.prisma.auditLog.create({
            data: {
              actionType: "Inventory Update Failed",
              description: `Failed to update inventory for ${productName} in order ${orderId}: ${error.message}`
            }
          });
        }
      })));
    }

    await Promise.all(batches);
  }

  // Optimized fabric and measurement processing
  private async processFabricsAndMeasurements(
    orderId: number,
    fabrics?: Fabric[],
    measurements?: Measurement[]
  ): Promise<void> {
    // Process in parallel
    await Promise.all([
      // Handle fabrics
      (async () => {
        if (!fabrics?.length) return;

        // Create a map for item lookup
        const items = await this.prisma.item.findMany({
          where: { orderInvoiceId: orderId },
          select: { id: true, productName: true }
        });

        const itemMap = new Map(items.map(item => [item.productName, item.id]));

        // Process fabrics in batches
        const BATCH_SIZE = 20;
        for (let i = 0; i < fabrics.length; i += BATCH_SIZE) {
          const batch = fabrics.slice(i, i + BATCH_SIZE);

          // Process each fabric in parallel
          await Promise.all(batch.map(async (fabric) => {
            // Get inventory
            const inventory = await this.prisma.fabricInventory.findFirst({
              where: {
                fabricName: fabric.fabricName,
                type: fabric.type,
                color: fabric.color
              },
              select: { id: true, quantityAvailable: true }
            });

            if (!inventory || inventory.quantityAvailable < fabric.quantity) {
              throw new HttpException(
                `Insufficient fabric stock for ${fabric.fabricName} (${fabric.type}-${fabric.color})`,
                HttpStatus.BAD_REQUEST
              );
            }

            // Update inventory
            await this.prisma.fabricInventory.update({
              where: { id: inventory.id },
              data: { quantityAvailable: { decrement: fabric.quantity } }
            });

            // Find item ID
            const itemId = fabric.itemId || itemMap.get(fabric.itemId || "");

            // Create fabric record
            await this.prisma.fabric.create({
              data: {
                fabricName: fabric.fabricName,
                type: fabric.type,
                color: fabric.color,
                quantity: fabric.quantity,
                orderInvoiceId: orderId,
                itemId
              }
            });
          }));
        }
      })(),

      // Handle measurements
      (async () => {
        if (!measurements?.length) return;

        await this.prisma.measurement.createMany({
          data: measurements.map(measurement => ({
            ...measurement,
            orderInvoiceId: orderId
          }))
        });
      })()
    ]);
  }

  // Process transactions
  private async processTransactions(
    orderId: number,
    transactions?: Transactions[]
  ): Promise<void> {
    if (!transactions?.length) return;

    // Get customer info - needed for transaction records
    const order = await this.prisma.order.findUnique({
      where: { InvoiceId: orderId },
      select: { customerId: true, Customer: { select: { name: true } } }
    });

    if (!order) return;

    // Create transactions
    await this.prisma.transactions.createMany({
      data: transactions.map(transaction => ({
        ...transaction,
        customerId: order.customerId,
        customerName: order.Customer.name,
        orderId
      }))
    });
  }

  // Update statistics in separate transaction
  private async updateStatistics(orderId: number, data: any): Promise<void> {
    // Extract customer and sales info 
    const order = await this.prisma.order.findUnique({
      where: { InvoiceId: orderId },
      select: {
        customerId: true,
        salesPersonId: true,
        totalAmount: true
      }
    });

    if (!order || !data.items?.length) return;

    // Pre-calculate all totals in memory
    const productTotals = new Map<string, { quantity: number, amount: number }>();
    const sectionTotals = new Map<string, { quantity: number, amount: number }>();

    for (const item of data.items) {
      // For products
      const productKey = item.productName;
      const productTotal = productTotals.get(productKey) || { quantity: 0, amount: 0 };
      productTotal.quantity += item.quantity;
      productTotal.amount += item.productPrice * item.quantity;
      productTotals.set(productKey, productTotal);

      // For sections
      if (item.sectionName) {
        const sectionKey = item.sectionName;
        const sectionTotal = sectionTotals.get(sectionKey) || { quantity: 0, amount: 0 };
        sectionTotal.quantity += item.quantity;
        sectionTotal.amount += item.productPrice * item.quantity;
        sectionTotals.set(sectionKey, sectionTotal);
      }
    }

    // Update customer stats
    await this.prisma.customer.update({
      where: { id: order.customerId },
      data: {
        totalOrders: { increment: 1 },
        totalSpent: { increment: order.totalAmount }
      }
    });

    // Update sales person stats
    await this.prisma.salesPerson.update({
      where: { id: order.salesPersonId },
      data: {
        totalOrders: { increment: 1 },
        totalSalesAmount: { increment: order.totalAmount }
      }
    });

    // Update product stats - in batches
    const productBatches = [];
    const productEntries = [...productTotals.entries()];

    for (let i = 0; i < productEntries.length; i += 5) {
      const batch = productEntries.slice(i, i + 5);
      productBatches.push(Promise.all(batch.map(([productName, totals]) =>
        this.prisma.service.update({
          where: { name: productName },
          data: {
            totalQuantitySold: { increment: totals.quantity },
            totalSalesAmount: { increment: totals.amount }
          }
        })
      )));
    }

    // Update section stats - in batches
    const sectionBatches = [];
    const sectionEntries = [...sectionTotals.entries()];

    for (let i = 0; i < sectionEntries.length; i += 5) {
      const batch = sectionEntries.slice(i, i + 5);
      sectionBatches.push(Promise.all(batch.map(([sectionName, totals]) =>
        this.prisma.section.update({
          where: { name: sectionName },
          data: {
            totalQuantitySold: { increment: totals.quantity },
            totalSalesAmount: { increment: totals.amount }
          }
        })
      )));
    }

    // Execute all batches
    await Promise.all([
      ...productBatches,
      ...sectionBatches
    ]);
  }

  private generateTrackingTokenSync(customerName: string): string {
    const prefix = customerName.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 6);
    return `${prefix}-${timestamp}-${randomStr}`;
  }

  // Update order
  async updateOrder(InvoiceId: number, order: Order): Promise<Order> {
    return this.prisma.order.update({
      where: { InvoiceId: Number(InvoiceId) },
      data: order,
      include: { items: true }
    });
  }

  // Cancel order
  async cancelOrder(InvoiceId: number): Promise<Order> {
    return this.prisma.$transaction(async (tx) => {
      // Get the order with items
      const order = await tx.order.findUnique({
        where: { InvoiceId: Number(InvoiceId) },
        include: { items: true }
      });

      if (!order) {
        throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
      }

      // Update order status
      const updatedOrder = await tx.order.update({
        where: { InvoiceId: Number(InvoiceId) },
        data: { status: 'cancelled' },
        include: { items: true }
      });

      // Revert product and inventory changes for each item
      if (order.items && order.items.length > 0) {
        await Promise.all(
          order.items.map(async (item) => {
            // Update product stats
            await tx.service.update({
              where: { name: item.productName },
              data: {
                totalQuantitySold: { decrement: item.quantity },
                totalSalesAmount: { decrement: item.productPrice * item.quantity }
              }
            });

            // Update section stats
            await tx.section.update({
              where: { name: item.sectionName },
              data: {
                totalQuantitySold: { decrement: item.quantity },
                totalSalesAmount: { decrement: item.productPrice * item.quantity }
              }
            });

            // Revert inventory changes for ready-made items
            if (item.type === "READY_MADE") {
              const productInventory = await tx.productInventory.findFirst({
                where: { productName: item.productName }
              });

              if (productInventory) {
                await tx.productInventory.update({
                  where: { id: productInventory.id },
                  data: { quantityAvailable: { increment: item.quantity } }
                });

                // Record movement
                await tx.productMovement.create({
                  data: {
                    product: { connect: { name: item.productName } }, // Connecting by foreign key
                    quantity: item.quantity,
                    movementType: "RETURN",
                    movementDate: new Date(),
                    inventory: { connect: { id: productInventory.id } }, // Assuming inventoryId is available
                    orderId: item.orderInvoiceId, // Optional linking to order if available
                  },
                });

              }
            }

            // Restore fabric inventory
            const fabrics = await tx.fabric.findMany({
              where: { itemId: item.id }
            });

            for (const fabric of fabrics) {
              const fabricInventory = await tx.fabricInventory.findFirst({
                where: {
                  fabricName: fabric.fabricName,
                  type: fabric.type,
                  color: fabric.color
                }
              });

              if (fabricInventory) {
                await tx.fabricInventory.update({
                  where: { id: fabricInventory.id },
                  data: { quantityAvailable: { increment: fabric.quantity } }
                });
              }
            }
          })
        );
      }

      // Update customer stats
      await tx.customer.update({
        where: { id: order.customerId },
        data: {
          totalOrders: { decrement: 1 },
          totalSpent: { decrement: order.totalAmount }
        }
      });

      // Update salesperson stats
      await tx.salesPerson.update({
        where: { id: order.salesPersonId },
        data: {
          totalOrders: { decrement: 1 },
          totalSalesAmount: { decrement: order.totalAmount }
        }
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          actionType: "Order Cancelled",
          description: `Order ${InvoiceId} has been cancelled`
        }
      });

      return updatedOrder;
    });
  }

  // Delete order
  async deleteOrder(InvoiceId: number): Promise<Order> {
    // First cancel to handle all related updates
    // await this.cancelOrder(InvoiceId);
    // Then delete
    return this.prisma.order.delete({ where: { InvoiceId: Number(InvoiceId) } });
  }

  // Generate tracking token
  async generateTrackingToken(customerId: string): Promise<string> {
    return crypto.randomBytes(16).toString('hex');
  }

  // Track order
  async trackingOrder(trackingToken: string): Promise<Order> {
    const order = await this.prisma.order.findFirst({
      where: { trackingToken },
      include: { items: true }
    });

    if (!order) {
      throw new HttpException("Order not found", HttpStatus.NOT_FOUND);
    }

    return order;
  }

  // Get all distinct values for order creation UI
  async getAllDistinctValues() {
    const [products, customers, salesPersons, sections, fabrics, tailors] = await Promise.all([
      this.prisma.service.findMany({
        select: {
          id: true,
          name: true,
          sectionName: true,
          price: true,
          type: true
        }
      }),
      this.prisma.customer.findMany({
        select: {
          id: true,
          name: true,
          phone: true,
          location: true
        }
      }),
      this.prisma.salesPerson.findMany({
        select: {
          id: true,
          name: true,
          contact: true
        }
      }),
      this.prisma.section.findMany({
        select: {
          id: true,
          name: true
        }
      }),
      this.prisma.fabricInventory.findMany({
        select: {
          id: true,
          fabricName: true,
          type: true,
          color: true,
          quantityAvailable: true
        }
      }),
      this.prisma.employee.findMany()
    ]);

    return { products, customers, salesPersons, sections, fabrics, tailors };
  }
}