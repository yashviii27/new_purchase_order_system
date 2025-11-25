import {
  IsString,
  IsDateString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber
} from 'class-validator';
import { Type } from 'class-transformer';

class GrnItemDto {

  @IsNumber()
  @Type(() => Number)
  po_sr: number;

  @IsNumber()
  @Type(() => Number)
  pro_id: number;

  @IsNumber()
  @Type(() => Number)
  grn_rec_qty: number;
}

export class CreateGrnDto {

  @IsString()
  po_no: string;

  @IsString()
  grn_no: string;

  @IsDateString()
  grn_date: Date;

  @IsOptional()
  allow_extra_stock?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GrnItemDto)
  details: GrnItemDto[];
}
