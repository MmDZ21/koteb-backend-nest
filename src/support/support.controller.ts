import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  ParseUUIDPipe,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SupportService } from './support.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TicketStatus, TicketPriority } from '@prisma/client';

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('tickets')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  createTicket(@Request() req, @Body() createTicketDto: CreateTicketDto) {
    return this.supportService.createTicket(req.user.userId, createTicketDto);
  }

  @Get('tickets')
  @UseGuards(JwtAuthGuard)
  getAllTickets(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: TicketStatus,
    @Query('priority') priority?: TicketPriority,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.supportService.getAllTickets(pageNum, limitNum, status, priority);
  }

  @Get('my-tickets')
  @UseGuards(JwtAuthGuard)
  getMyTickets(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.supportService.getUserTickets(req.user.userId, pageNum, limitNum);
  }

  @Get('tickets/:id')
  @UseGuards(JwtAuthGuard)
  getTicketById(@Param('id', ParseUUIDPipe) id: string) {
    return this.supportService.getTicketById(id);
  }

  @Patch('tickets/:id/status')
  @UseGuards(JwtAuthGuard)
  updateTicketStatus(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: TicketStatus,
  ) {
    return this.supportService.updateTicketStatus(id, status, req.user.userId);
  }

  @Patch('tickets/:id/assign')
  @UseGuards(JwtAuthGuard)
  assignTicket(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('assigneeId') assigneeId: string,
  ) {
    return this.supportService.assignTicket(id, assigneeId);
  }

  @Post('tickets/:id/messages')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  addMessage(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createMessageDto: CreateMessageDto,
  ) {
    return this.supportService.addMessage(req.user.userId, id, createMessageDto);
  }

  @Get('tickets/:id/messages')
  @UseGuards(JwtAuthGuard)
  getTicketMessages(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.supportService.getTicketMessages(id, pageNum, limitNum);
  }
}
