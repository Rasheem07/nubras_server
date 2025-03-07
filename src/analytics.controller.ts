import { Controller, Get, Module } from "@nestjs/common";
import { prisma } from "./lib/prisma";
import { endOfMonth, startOfMonth, subMonths } from "date-fns";

@Controller('dashboard')
export class DashboardController {
  private readonly prisma = prisma;

  @Get('overview')
  async getData() {
    try {
      // Summary statistics
      const totalOrders = await prisma.order.count();
      const totalSales = await prisma.order.aggregate({
        _sum: { totalAmount: true }
      });
      
      const totalCustomers = await prisma.customer.count();
      
      const pendingOrders = await prisma.order.count({
        where: {
          status: { 
            in: ['confirmed', 'processing', 'tailoring'] 
          }
        }
      });
      
      const reorderPoints = await prisma.fabricInventory.findMany({
        select: { reorderPoint: true }
      });
      
      // Extract the reorder points as an array of numbers
      const reorderPointValues = reorderPoints.map(fabric => fabric.reorderPoint);
      
      const lteFabric = Math.min(...reorderPointValues) | 0;
      // Get the count of low stock fabrics
      const lowStockFabrics = await prisma.fabricInventory.count({
        where: {
          quantityAvailable: {
            lte: lteFabric
          }
        }
      });
      

      const reorderPointsForProducts = await prisma.productInventory.findMany({
        select: { reorderPoint: true }
      });

      const reorderPointValuesForProd = reorderPointsForProducts.map(item => item.reorderPoint)

      const lteProd = Math.min(...reorderPointValuesForProd) | 0;

      const lowStockProducts = await prisma.productInventory.count({
        where: {
          quantityAvailable: {
            lte: lteProd
          }
        }
      });
      
      // Recent orders
      const recentOrders = await prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          Customer: true,
          SalesPerson: true,
          items: {
            include: {
              product: true,
              section: true
            }
          }
        }
      });
      
      // Top selling products
      const topProducts = await prisma.service.findMany({
        take: 5,
        orderBy: { totalSalesAmount: 'desc' },
        include: { Section: true }
      });
      
      // Top sales persons
      const topSalesPersons = await prisma.salesPerson.findMany({
        take: 5,
        orderBy: { totalSalesAmount: 'desc' }
      });
      
      // Top customers
      const topCustomers = await prisma.customer.findMany({
        take: 5,
        orderBy: { totalSpent: 'desc' }
      });
      
      // Inventory insights
      const fabricInventory = await prisma.fabricInventory.findMany({
        take: 10,
        orderBy: { quantityAvailable: 'asc' },
        include: { supplier: true }
      });
      
      const productInventory = await prisma.productInventory.findMany({
        take: 10,
        orderBy: { quantityAvailable: 'asc' },
        include: { product: true }
      });
      
      // Sales by type
      const readyMadeSales = await prisma.item.aggregate({
        where: { type: 'READY_MADE' },
        _sum: { productPrice: true }
      });
      
      const customTailoredSales = await prisma.item.aggregate({
        where: { type: 'CUSTOM_TAILORED' },
        _sum: { productPrice: true }
      });
      
      // Payment insights
      const paymentStats = await prisma.order.groupBy({
        by: ['paymentStatus'],
        _count: { InvoiceId: true },
        _sum: { totalAmount: true }
      });
      
      // Section performance
      const sectionPerformance = await prisma.section.findMany({
        orderBy: { totalSalesAmount: 'desc' },
      });
      
      // Tailors performance
      const tailorPerformance = await prisma.employee.findMany({
        where: { role: { in: ['MASTER_TAILOR', 'TAILOR'] } },
        include: { 
          orders: true,
          salary: true 
        }
      });
      
      return {
        summary: {
          totalOrders,
          totalSales: totalSales._sum.totalAmount || 0,
          totalCustomers,
          pendingOrders,
          lowStockFabrics,
          lowStockProducts,
          readyMadeSales: readyMadeSales._sum.productPrice || 0,
          customTailoredSales: customTailoredSales._sum.productPrice || 0
        },
        recentOrders,
        topProducts,
        topSalesPersons,
        topCustomers,
        fabricInventory,
        productInventory,
        paymentStats,
        sectionPerformance,
        tailorPerformance
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  }
}

// Register the module
@Module({
  controllers: [DashboardController],
})
export class DashboardModule {}
