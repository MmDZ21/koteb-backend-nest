import { PartialType } from '@nestjs/mapped-types';
import { CreateEditionDto } from './create-edition.dto';

export class UpdateEditionDto extends PartialType(CreateEditionDto) {}
