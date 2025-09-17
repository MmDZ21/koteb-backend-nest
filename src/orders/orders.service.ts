import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(userId: string, createOrderDto: CreateOrderDto) {
    // Verify all listings exist and are approved
    const listingIds = createOrderDto.items.map(item => item.listingId);
    const listings = await this.prisma.listing.findMany({
      where: {
        id: { in: listingIds },
        status: 'APPROVED',
      },
      include: {
        edition: true,
      },
    });

    if (listings.length !== listingIds.length) {
      throw new BadRequestException('Some listings are not available or not approved');
    }

    // Calculate totals
    let subtotal = 0;
    const orderItems: any[] = [];

    for (const item of createOrderDto.items) {
      const listing = listings.find(l => l.id === item.listingId);
      if (!listing) {
        throw new BadRequestException(`Listing ${item.listingId} not found`);
      }

      if (listing.quantity < item.quantity) {
        throw new BadRequestException(`Insufficient quantity for listing ${item.listingId}`);
      }

      const unitPrice = Number(listing.price);
      const lineTotal = unitPrice * item.quantity;
      const platformFee = lineTotal * 0.05; // 5% platform fee
      const sellerPayout = lineTotal - platformFee;

      subtotal += lineTotal;

      orderItems.push({
        listingId: item.listingId,
        editionId: item.editionId,
        sellerId: item.sellerId,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
        sellerPayout,
        platformFee,
      });
    }

    const totalAmount = subtotal + (createOrderDto.shippingAmount || 0) + (createOrderDto.platformFee || 0);

    // Create order with items
    const order = await this.prisma.order.create({
      data: {
        buyerId: userId,
        subtotal,
        shippingAmount: createOrderDto.shippingAmount || 0,
        platformFee: createOrderDto.platformFee || 0,
        totalAmount,
        shippingAddrId: createOrderDto.shippingAddrId,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: {
            listing: {
              include: {
                edition: true,
              },
            },
            seller: {
              select: {
                id: true,
                name: true,
                isSellerVerified: true,
              },
            },
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        shippingAddr: true,
      },
    });

    return order;
  }

  async getAllOrders(page: number = 1, limit: number = 10, status?: OrderStatus) {
    const skip = (page - 1) * limit;
    
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          items: {
            include: {
              listing: {
                include: {
                  edition: true,
                },
              },
              seller: {
                select: {
                  id: true,
                  name: true,
                  isSellerVerified: true,
                },
              },
            },
          },
          buyer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          shippingAddr: true,
        },
        orderBy: { placedAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getOrderById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            listing: {
              include: {
                edition: true,
              },
            },
            seller: {
              select: {
                id: true,
                name: true,
                isSellerVerified: true,
              },
            },
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        shippingAddr: true,
        payment: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async getUserOrders(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { buyerId: userId },
        skip,
        take: limit,
        include: {
          items: {
            include: {
              listing: {
                include: {
                  edition: true,
                },
              },
              seller: {
                select: {
                  id: true,
                  name: true,
                  isSellerVerified: true,
                },
              },
            },
          },
          shippingAddr: true,
          payment: true,
        },
        orderBy: { placedAt: 'desc' },
      }),
      this.prisma.order.count({ where: { buyerId: userId } }),
    ]);

    return {
      data: orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getSellerOrders(sellerId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          items: {
            some: {
              sellerId: sellerId,
            },
          },
        },
        skip,
        take: limit,
        include: {
          items: {
            where: {
              sellerId: sellerId,
            },
            include: {
              listing: {
                include: {
                  edition: true,
                },
              },
            },
          },
          buyer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          shippingAddr: true,
          payment: true,
        },
        orderBy: { placedAt: 'desc' },
      }),
      this.prisma.order.count({
        where: {
          items: {
            some: {
              sellerId: sellerId,
            },
          },
        },
      }),
    ]);

    return {
      data: orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateOrderStatus(orderId: string, status: OrderStatus, userId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true, buyerId: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check permissions
    if (userId && order.buyerId !== userId) {
      throw new ForbiddenException('You can only update your own orders');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        items: {
          include: {
            listing: {
              include: {
                edition: true,
              },
            },
            seller: {
              select: {
                id: true,
                name: true,
                isSellerVerified: true,
              },
            },
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        shippingAddr: true,
        payment: true,
      },
    });

    return updatedOrder;
  }

  async cancelOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true, buyerId: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.buyerId !== userId) {
      throw new ForbiddenException('You can only cancel your own orders');
    }

    if (order.status !== 'CREATED' && order.status !== 'PAID') {
      throw new BadRequestException('Order cannot be cancelled in current status');
    }

    return this.updateOrderStatus(orderId, 'CANCELLED', userId);
  }
}
