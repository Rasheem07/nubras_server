import { Controller, Get, Module } from "@nestjs/common";
import { prisma } from "./lib/prisma";
import { endOfMonth, startOfMonth, subMonths } from "date-fns";

@Controller('dashboard')
export class DashboardController {
  private readonly prisma = prisma;

  @Get('overview')
  async getDashboardData() {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const previousMonthStart = startOfMonth(subMonths(now, 1));
    const previousMonthEnd = endOfMonth(subMonths(now, 1));

    // Sales Data
    const [currentSales, previousSales] = await Promise.all([
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { createdAt: { gte: currentMonthStart, lte: currentMonthEnd }, status: 'delivered' },
      }),
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { createdAt: { gte: previousMonthStart, lte: previousMonthEnd }, status: 'delivered' },
      }),
    ]);

    // Orders Count
    const [currentOrders, previousOrders] = await Promise.all([
      this.prisma.order.count({ where: { createdAt: { gte: currentMonthStart, lte: currentMonthEnd } } }),
      this.prisma.order.count({ where: { createdAt: { gte: previousMonthStart, lte: previousMonthEnd } } }),
    ]);

    // New Customers Count
    const [currentCustomers, previousCustomers] = await Promise.all([
      this.prisma.customer.count({ where: { createdAt: { gte: currentMonthStart, lte: currentMonthEnd } } }),
      this.prisma.customer.count({ where: { createdAt: { gte: previousMonthStart, lte: previousMonthEnd } } }),
    ]);

    // Recent 5 Orders
    const recentOrders = await this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        InvoiceId: true,
        totalAmount: true,
        status: true,
        createdAt: true,
        customerName: true,
      },
    });

    // Sales by Month for Chart
    const monthlySalesData = await this.prisma.order.groupBy({
      by: ['createdAt'],
      _sum: { totalAmount: true },
      where: { createdAt: { gte: previousMonthStart, lte: currentMonthEnd } },
      orderBy: { createdAt: 'asc' },
    });

    const salespersonPerformance = await this.prisma.$queryRaw<
      { name: string; "Total orders": bigint; "Total sales amount": bigint }[]
    >`SELECT name, SUM("totalOrders") as "Total orders", SUM("totalSalesAmount") as "Total sales amount" from "SalesPerson" GROUP BY name ORDER BY "Total orders" desc`;

    // Customer Insights
    const totalCustomers = await this.prisma.customer.count();
    const returningCustomers = await this.prisma.customer.count({
      where: { orders: { some: { createdAt: { lt: currentMonthStart } } } },
    });
    const newCustomerRatio = ((currentCustomers / totalCustomers) * 100).toFixed(2);

    // Product Category Performance
    const categoryPerformance = await this.prisma.$queryRaw<
      { name: string; "Total quantity sold": bigint; "Total sales amount": bigint }[]
    >`SELECT name, SUM("totalQuantitySold") as "Total quantity sold", SUM("totalSalesAmount") as "Total sales amount" from "Section" GROUP BY name ORDER BY "Total quantity sold" desc`;

    // Percentage Change Utility
    const calcPercentageChange = (current: number, previous: number) =>
      previous === 0 ? 100 : (((current - previous) / previous) * 100).toFixed(2);

    return {
      trendCards: {
        sales: {
          current: Number(currentSales._sum.totalAmount) || 0,
          previous: Number(previousSales._sum.totalAmount) || 0,
          percentChange: Number(
            calcPercentageChange(
              Number(currentSales._sum.totalAmount) || 0,
              Number(previousSales._sum.totalAmount) || 0,
            ),
          ),
        },
        orders: {
          current: currentOrders,
          previous: previousOrders,
          percentChange: Number(calcPercentageChange(currentOrders, previousOrders)),
        },
        newCustomers: {
          current: currentCustomers,
          previous: previousCustomers,
          percentChange: Number(calcPercentageChange(currentCustomers, previousCustomers)),
        },
        avgOrderValue: {
          current: Number(currentSales._sum.totalAmount) / (currentOrders || 1),
          previous: Number(previousSales._sum.totalAmount) / (previousOrders || 1),
          percentChange: Number(
            calcPercentageChange(
              Number(currentSales._sum.totalAmount) / (currentOrders || 1),
              Number(previousSales._sum.totalAmount) / (previousOrders || 1),
            ),
          ),
        },
      },
      recentOrders: recentOrders.map((order) => ({
        id: order.InvoiceId,
        customerName: order.customerName,
        totalAmount: Number(order.totalAmount),
        status: order.status,
        date: order.createdAt,
      })),
      charts: {
        monthlySales: monthlySalesData.map((item) => ({
          date: item.createdAt,
          totalSales: Number(item._sum.totalAmount),
        })),
        salespersonPerformance: salespersonPerformance.map((item) => ({
          name: item.name,
          totalOrders: Number(item["Total orders"]),
          totalSalesAmount: Number(item["Total sales amount"]),
        })),
        customerInsights: { totalCustomers, returningCustomers, newCustomerRatio },
        categoryPerformance: categoryPerformance.map((item) => ({
          name: item.name,
          totalQuantitySold: Number(item["Total quantity sold"]),
          totalSalesAmount: Number(item["Total sales amount"]),
        })),
      },
    };
  }
}

// Register the module
@Module({
  controllers: [DashboardController],
})
export class DashboardModule {}
