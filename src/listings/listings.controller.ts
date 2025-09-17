import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ListingsService } from './listings.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(@Request() req, @Body() createListingDto: CreateListingDto) {
    return this.listingsService.createListing(req.user.userId, createListingDto);
  }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.listingsService.getAllListings(pageNum, limitNum, search, status as any);
  }

  @Get('my-listings')
  @UseGuards(JwtAuthGuard)
  getMyListings(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.listingsService.getUserListings(req.user.userId, pageNum, limitNum);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.listingsService.getListingById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  update(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateListingDto: UpdateListingDto,
  ) {
    return this.listingsService.updateListing(req.user.userId, id, updateListingDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.listingsService.deleteListing(req.user.userId, id);
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard)
  approve(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('adminNote') adminNote?: string,
  ) {
    return this.listingsService.approveListing(req.user.userId, id, adminNote);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard)
  reject(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('adminNote') adminNote: string,
  ) {
    return this.listingsService.rejectListing(req.user.userId, id, adminNote);
  }
}
