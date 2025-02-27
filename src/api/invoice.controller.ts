import { Controller, Get, Module, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import * as PdfPrinter from 'pdfmake';
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from 'src/lib/prisma';
import { Order } from '@prisma/client';

@Controller('invoices')
export class InvoiceController {
    @Get('pdf/:id')
    async generateInvoicePdf(@Param('id') id: number, @Res() res: Response) {
        try {
            // Fetch invoice data from your database using the id
            // For this example, we'll use the provided data
            const invoiceData = await this.getInvoiceData(id);

            // Generate PDF
            const pdfDoc = this.createInvoicePdf(invoiceData);

            // Set response headers
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoiceData.InvoiceId}.pdf`);

            // Pipe the PDF document to the response
            pdfDoc.pipe(res);
            pdfDoc.end();
        } catch (error) {
            console.error('Error generating invoice PDF:', error);
            res.status(500).send('Error generating invoice PDF');
        }
    }

    private async getInvoiceData(id: number): Promise<Order> {
        // In a real app, fetch from database
        // For demo, return the mock data
        return prisma.order.findUnique({
            where: {
                InvoiceId: Number(id)
            },
            include: {
                items: true,
                Customer: true,
                Transactions: true,
                SalesPerson: true
            }
        })     
    }

    private createInvoicePdf(invoice: any) {
        // Define SVG icons as base64 strings
   
        // Format dates
        const formatDate = (dateString) => {
            if (!dateString) return 'N/A';
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        };

        // Define fonts 
        const fonts = {
            Roboto: {
                normal: "C:/Users/LENOVO/OneDrive/Desktop/tech/nubras/server/fonts/Roboto-Regular.ttf",
                bold: "C:/Users/LENOVO/OneDrive/Desktop/tech/nubras/server/fonts/Roboto-Medium.ttf",
                italics: "C:/Users/LENOVO/OneDrive/Desktop/tech/nubras/server/fonts/Roboto-Italic.ttf",
                bolditalics: "C:/Users/LENOVO/OneDrive/Desktop/tech/nubras/server/fonts/Roboto-MediumItalic.ttf"
            },
        };

        // Create printer instance
        const printer = new PdfPrinter(fonts);

        // Define document definition
        const docDefinition = {
            pageSize: 'A4',
            pageMargins: [40, 40, 40, 40],
            content: [
                // Header with logo and invoice info
                {
                    columns: [
                        {
                            width: '50%',
                            stack: [
                                { text: 'INVOICE', style: 'headerTitle' },
                                {
                                    columns: [
                                        // {
                                        //     width: 20,
                                        //     image: icons.receipt,
                                        //     fit: [18, 18]
                                        // },
                                        {
                                            text: `Invoice #${invoice.InvoiceId}`,
                                            margin: [5, 0, 0, 0]
                                        }
                                    ],
                                    margin: [0, 10, 0, 5]
                                },
                                {
                                    columns: [
                                        // {
                                        //     width: 20,
                                        //     image: icons.tag,
                                        //     fit: [18, 18]
                                        // },
                                        {
                                            text: `Reference: ${invoice.trackingToken}`,
                                            margin: [5, 0, 0, 0]
                                        }
                                    ],
                                    margin: [0, 0, 0, 5]
                                },
                                {
                                    columns: [
                                        // {
                                        //     width: 20,
                                        //     image: icons.calendar,
                                        //     fit: [18, 18]
                                        // },
                                        {
                                            text: `Date: ${formatDate(invoice.createdAt)}`,
                                            margin: [5, 0, 0, 0]
                                        }
                                    ],
                                    margin: [0, 0, 0, 5]
                                }
                            ]
                        },
                        {
                            width: '50%',
                            stack: [
                                { text: 'Payment Details', style: 'subheader', alignment: 'right' },
                                { text: `Status: ${invoice.paymentStatus}`, alignment: 'right', margin: [0, 10, 0, 5] },
                                { text: `Payment Due: ${formatDate(invoice.PaymentdueDate)}`, alignment: 'right', margin: [0, 0, 0, 5] },
                                { text: `Delivery Date: ${formatDate(invoice.deliveryDate)}`, alignment: 'right', margin: [0, 0, 0, 5] }
                            ]
                        }
                    ],
                    margin: [0, 0, 0, 20]
                },

                // Customer and Sales Info
                {
                    columns: [
                        {
                            width: '50%',
                            stack: [
                                { text: 'Customer Details', style: 'subheader' },
                                {
                                    columns: [
                                        // {
                                        //     width: 20,
                                        //     image: icons.user,
                                        //     fit: [18, 18]
                                        // },
                                        {
                                            text: invoice.Customer.name,
                                            margin: [5, 0, 0, 0]
                                        }
                                    ],
                                    margin: [0, 10, 0, 5]
                                },
                                {
                                    columns: [
                                        // {
                                        //     width: 20,
                                        //     image: icons.phone,
                                        //     fit: [18, 18]
                                        // },
                                        {
                                            text: invoice.Customer.phone,
                                            margin: [5, 0, 0, 0]
                                        }
                                    ],
                                    margin: [0, 0, 0, 5]
                                },
                                {
                                    columns: [
                                        // {
                                        //     width: 20,
                                        //     image: icons.mapPin,
                                        //     fit: [18, 18]
                                        // },
                                        {
                                            text: invoice.Customer.location,
                                            margin: [5, 0, 0, 0]
                                        }
                                    ],
                                    margin: [0, 0, 0, 5]
                                }
                            ]
                        },
                        {
                            width: '50%',
                            stack: [
                                { text: 'Sales Information', style: 'subheader', alignment: 'right' },
                                { text: `Sales Person: ${invoice.SalesPerson.name}`, alignment: 'right', margin: [0, 10, 0, 5] },
                                { text: `Branch: ${invoice.branch}`, alignment: 'right', margin: [0, 0, 0, 5] },
                                { text: `Ordered From: ${invoice.orderedFrom}`, alignment: 'right', margin: [0, 0, 0, 5] }
                            ]
                        }
                    ],
                    margin: [0, 0, 0, 20]
                },

                // Items Table
                {
                    stack: [
                        { text: 'Order Items', style: 'subheader', margin: [0, 0, 0, 10] },
                        {
                            table: {
                                headerRows: 1,
                                widths: ['*', '*', 'auto', 'auto', 'auto'],
                                body: [
                                    [
                                        { text: 'Product', style: 'tableHeader' },
                                        { text: 'Section', style: 'tableHeader' },
                                        { text: 'Type', style: 'tableHeader' },
                                        { text: 'Quantity', style: 'tableHeader', alignment: 'center' },
                                        { text: 'Price', style: 'tableHeader', alignment: 'right' }
                                    ],
                                    ...invoice.items.map((item) => [
                                        { text: item.productName },
                                        { text: item.sectionName },
                                        { text: item.type.replace('_', ' ').toLowerCase() },
                                        { text: item.quantity.toString(), alignment: 'center' },
                                        { text: `₹${item.productPrice.toFixed(2)}`, alignment: 'right' }
                                    ])
                                ]
                            },
                            layout: {
                                hLineWidth: function (i, node) {
                                    return (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5;
                                },
                                vLineWidth: function (i, node) {
                                    return 0;
                                },
                                hLineColor: function (i, node) {
                                    return (i === 0 || i === 1 || i === node.table.body.length) ? 'black' : '#dddddd';
                                },
                                paddingLeft: function (i) { return 8; },
                                paddingRight: function (i) { return 8; },
                                paddingTop: function (i) { return 8; },
                                paddingBottom: function (i) { return 8; }
                            }
                        }
                    ],
                    margin: [0, 0, 0, 20]
                },

                // Transactions Table
                {
                    stack: [
                        { text: 'Payment Transactions', style: 'subheader', margin: [0, 0, 0, 10] },
                        {
                            table: {
                                headerRows: 1,
                                widths: ['*', 'auto', 'auto', 'auto', 'auto'],
                                body: [
                                    [
                                        { text: 'Date', style: 'tableHeader' },
                                        { text: 'Method', style: 'tableHeader' },
                                        { text: 'Type', style: 'tableHeader' },
                                        { text: 'Status', style: 'tableHeader' },
                                        { text: 'Amount', style: 'tableHeader', alignment: 'right' }
                                    ],
                                    ...invoice.Transactions.map((transaction) => [
                                        { text: formatDate(transaction.paymentDate) },
                                        { text: transaction.paymentMethod },
                                        { text: transaction.paymentType },
                                        { text: transaction.status },
                                        { text: `₹${transaction.amount.toFixed(2)}`, alignment: 'right' }
                                    ])
                                ]
                            },
                            layout: {
                                hLineWidth: function (i, node) {
                                    return (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5;
                                },
                                vLineWidth: function (i, node) {
                                    return 0;
                                },
                                hLineColor: function (i, node) {
                                    return (i === 0 || i === 1 || i === node.table.body.length) ? 'black' : '#dddddd';
                                },
                                paddingLeft: function (i) { return 8; },
                                paddingRight: function (i) { return 8; },
                                paddingTop: function (i) { return 8; },
                                paddingBottom: function (i) { return 8; }
                            }
                        }
                    ],
                    margin: [0, 0, 0, 20]
                },

                // Payment Summary
                {
                    columns: [
                        { width: '*', text: '' },
                        {
                            width: 'auto',
                            table: {
                                widths: ['*', 'auto'],
                                body: [
                                    [
                                        { text: 'Total Amount', style: 'tableHeader', border: [0, 0, 0, 0] },
                                        { text: `₹${invoice.totalAmount.toFixed(2)}`, alignment: 'right', border: [0, 0, 0, 0] }
                                    ],
                                    [
                                        { text: 'Paid Amount', border: [0, 0, 0, 0] },
                                        { text: `₹${invoice.PaidAmount.toFixed(2)}`, alignment: 'right', border: [0, 0, 0, 0] }
                                    ],
                                    [
                                        { text: 'Pending Amount', style: 'strong', border: [0, 0, 0, 0] },
                                        { text: `₹${invoice.PendingAmount.toFixed(2)}`, style: 'strong', alignment: 'right', border: [0, 0, 0, 0] }
                                    ]
                                ]
                            },
                            layout: {
                                hLineWidth: function (i, node) {
                                    return (i === 0 || i === node.table.body.length) ? 0 : 0.5;
                                },
                                vLineWidth: function (i, node) {
                                    return 0;
                                },
                                hLineColor: function (i, node) {
                                    return '#dddddd';
                                },
                                paddingLeft: function (i) { return 8; },
                                paddingRight: function (i) { return 8; },
                                paddingTop: function (i) { return 8; },
                                paddingBottom: function (i) { return 8; }
                            }
                        }
                    ]
                },

                // Footer
                {
                    text: 'Thank you for your business!',
                    alignment: 'center',
                    margin: [0, 30, 0, 0]
                }
            ],
            styles: {
                headerTitle: {
                    fontSize: 24,
                    bold: true
                },
                subheader: {
                    fontSize: 14,
                    bold: true,
                    margin: [0, 10, 0, 5]
                },
                tableHeader: {
                    bold: true,
                    fontSize: 12,
                    color: 'black'
                },
                strong: {
                    bold: true
                }
            },
            defaultStyle: {
                fontSize: 10,
                color: '#333333'
            }
        };

        // Create PDF
        // Create PDF 
        const pdfDoc = printer.createPdfKitDocument(docDefinition);

        return pdfDoc;
    }
}
// Register the module
@Module({
    controllers: [InvoiceController],
})

export class InvoiceModule { }