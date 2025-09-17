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
import { WalletService } from './wallet.service';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  getWallet(@Request() req) {
    return this.walletService.getWallet(req.user.userId);
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  getTransactions(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.walletService.getWalletTransactions(req.user.userId, pageNum, limitNum);
  }

  @Post('deposit')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  deposit(@Request() req, @Body() depositDto: DepositDto) {
    return this.walletService.deposit(req.user.userId, depositDto);
  }

  @Post('withdraw')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  withdraw(@Request() req, @Body() withdrawDto: WithdrawDto) {
    return this.walletService.withdraw(req.user.userId, withdrawDto);
  }

  @Get('withdraw-requests')
  @UseGuards(JwtAuthGuard)
  getWithdrawRequests(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.walletService.getWithdrawRequests(pageNum, limitNum, status);
  }

  @Get('my-withdraw-requests')
  @UseGuards(JwtAuthGuard)
  getMyWithdrawRequests(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.walletService.getUserWithdrawRequests(req.user.userId, pageNum, limitNum);
  }

  @Patch('withdraw-requests/:id/process')
  @UseGuards(JwtAuthGuard)
  processWithdrawRequest(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('approved') approved: boolean,
    @Body('adminNote') adminNote?: string,
  ) {
    return this.walletService.processWithdrawRequest(req.user.userId, id, approved, adminNote);
  }
}
