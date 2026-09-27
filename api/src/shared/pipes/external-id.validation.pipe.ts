import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

const EXTERNAL_ID_PATTERN = /^[A-Za-z0-9-]{1,100}$/;

/** Validates ids of third-party resources (Linear issue ids, Notion page ids...) used in route params. */
@Injectable()
export class ExternalIdValidationPipe implements PipeTransform<string, string> {
  transform(value: string) {
    if (typeof value !== 'string' || !EXTERNAL_ID_PATTERN.test(value)) {
      throw new BadRequestException('Invalid external id');
    }
    return value;
  }
}
