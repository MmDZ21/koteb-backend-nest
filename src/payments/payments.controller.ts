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
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.createPayment(createPaymentDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('gateway') gateway?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.paymentsService.getAllPayments(pageNum, limitNum, status, gateway);
  }

  @Get('my-payments')
  @UseGuards(JwtAuthGuard)
  getMyPayments(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.paymentsService.getUserPayments(req.user.userId, pageNum, limitNum);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  getStats() {
    return this.paymentsService.getPaymentStats();
  }

  @Get('order/:orderId')
  @UseGuards(JwtAuthGuard)
  getPaymentByOrderId(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.paymentsService.getPaymentByOrderId(orderId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.getPaymentById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
  ) {
    return this.paymentsService.updatePayment(id, updatePaymentDto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
    @Body('paidAt') paidAt?: string,
  ) {
    const paidAtDate = paidAt ? new Date(paidAt) : undefined;
    return this.paymentsService.updatePaymentStatus(id, status, paidAtDate);
  }

  @Patch(':id/success')
  @UseGuards(JwtAuthGuard)
  processSuccess(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.processPaymentSuccess(id);
  }

  @Patch(':id/failure')
  @UseGuards(JwtAuthGuard)
  processFailure(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason?: string,
  ) {
    return this.paymentsService.processPaymentFailure(id, reason);
  }

  @Patch(':id/refund')
  @UseGuards(JwtAuthGuard)
  refundPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('amount') amount?: number,
  ) {
    return this.paymentsService.refundPayment(id, amount);
  }
}
