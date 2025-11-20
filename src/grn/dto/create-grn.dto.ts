import { IsArray, IsDateString, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { GrnDetailDto } from './grn-detail.dto';

export class CreateGrnDto {

  @IsString()
  po_id: string;            

  @IsString()
  grn_no: string;           
  @IsDateString()
  grn_date: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GrnDetailDto)
  details: GrnDetailDto[];
}
