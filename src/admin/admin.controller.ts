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
import { AdminService } from './admin.service';
import { VerifyUserDto } from './dto/verify-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  @UseGuards(JwtAuthGuard)
  getAllUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('verified') verified?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const isVerified = verified ? verified === 'true' : undefined;
    return this.adminService.getAllUsers(pageNum, limitNum, search, isVerified);
  }

  @Get('verifications/pending')
  @UseGuards(JwtAuthGuard)
  getPendingVerifications(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.adminService.getPendingVerifications(pageNum, limitNum);
  }

  @Patch('verifications/:userId')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  verifyUser(
    @Request() req,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() verifyUserDto: VerifyUserDto,
  ) {
    return this.adminService.verifyUser(req.user.userId, userId, verifyUserDto);
  }

  @Get('listings/pending')
  @UseGuards(JwtAuthGuard)
  getPendingListings(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.adminService.getPendingListings(pageNum, limitNum);
  }

  @Patch('listings/:id/approve')
  @UseGuards(JwtAuthGuard)
  approveListing(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('adminNote') adminNote?: string,
  ) {
    return this.adminService.approveListing(req.user.userId, id, adminNote);
  }

  @Patch('listings/:id/reject')
  @UseGuards(JwtAuthGuard)
  rejectListing(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('adminNote') adminNote: string,
  ) {
    return this.adminService.rejectListing(req.user.userId, id, adminNote);
  }

  @Get('activity')
  @UseGuards(JwtAuthGuard)
  getRecentActivity(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.adminService.getRecentActivity(pageNum, limitNum);
  }
}
