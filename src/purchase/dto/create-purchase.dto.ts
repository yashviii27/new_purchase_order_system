import { IsArray, IsDateString, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PurchaseDetailDto } from './purchase-detail.dto';

export class CreatePurchaseDto {
  @IsString()
  po_no: string;

  @IsDateString()
  po_date: string;

  @IsNumber()
  @IsOptional()
  po_amount?: number;

  @IsNumber()
  @IsOptional()
  sup_id?: number;

  @IsString()
  @IsOptional()
  transportation?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  po_rev_reason?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseDetailDto)
  details: PurchaseDetailDto[];
}
