import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { TicketStatus, TicketPriority } from '@prisma/client';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async createTicket(userId: string, createTicketDto: CreateTicketDto) {
    const ticket = await this.prisma.supportTicket.create({
      data: {
        ...createTicketDto,
        creatorId: userId,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        messages: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                profilePic: true,
              },
            },
            attachments: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return ticket;
  }

  async getAllTickets(page: number = 1, limit: number = 20, status?: TicketStatus, priority?: TicketPriority) {
    const skip = (page - 1) * limit;
    
    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (priority) {
      where.priority = priority;
    }

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return {
      data: tickets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getUserTickets(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where: { creatorId: userId },
        skip,
        take: limit,
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.supportTicket.count({ where: { creatorId: userId } }),
    ]);

    return {
      data: tickets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getTicketById(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        messages: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                profilePic: true,
              },
            },
            attachments: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  async updateTicketStatus(id: string, status: TicketStatus, userId?: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      select: { creatorId: true, assigneeId: true },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Check permissions
    if (userId && ticket.creatorId !== userId && ticket.assigneeId !== userId) {
      throw new ForbiddenException('You can only update tickets you created or are assigned to');
    }

    const updatedTicket = await this.prisma.supportTicket.update({
      where: { id },
      data: { status },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        messages: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                profilePic: true,
              },
            },
            attachments: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return updatedTicket;
  }

  async assignTicket(ticketId: string, assigneeId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const updatedTicket = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { assigneeId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return updatedTicket;
  }

  async addMessage(userId: string, ticketId: string, createMessageDto: CreateMessageDto) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { creatorId: true, assigneeId: true, status: true },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Check permissions
    if (ticket.creatorId !== userId && ticket.assigneeId !== userId) {
      throw new ForbiddenException('You can only add messages to tickets you created or are assigned to');
    }

    // Check if ticket is closed
    if (ticket.status === 'CLOSED') {
      throw new ForbiddenException('Cannot add messages to closed tickets');
    }

    const message = await this.prisma.supportMessage.create({
      data: {
        ...createMessageDto,
        ticketId,
        authorId: userId,
        isFromAdmin: ticket.assigneeId === userId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            profilePic: true,
          },
        },
        attachments: true,
      },
    });

    // Update ticket status to pending if message is from user
    if (ticket.creatorId === userId) {
      await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: 'PENDING' },
      });
    }

    return message;
  }

  async getTicketMessages(ticketId: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.supportMessage.findMany({
        where: { ticketId },
        skip,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              profilePic: true,
            },
          },
          attachments: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.supportMessage.count({ where: { ticketId } }),
    ]);

    return {
      data: messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
