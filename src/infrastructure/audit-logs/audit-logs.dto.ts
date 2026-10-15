import { ENFeature } from '@prisma/client';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateAuditLogDto {
  @IsEnum(ENFeature, { message: '' })
  category!: ENFeature;

  @IsString()
  action!: string;

  @IsString()
  entityType!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
