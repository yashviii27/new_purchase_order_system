import { Body, Controller, Post } from '@nestjs/common';
import { GrnService } from './grn.service';
import { CreateGrnDto } from './dto/create-grn.dto';

@Controller('api/grn')
export class GrnController {
  constructor(private readonly grnService: GrnService) {}

  @Post()
  async create(@Body() dto: CreateGrnDto) {
    return this.grnService.createGrn(dto);
  }
}
