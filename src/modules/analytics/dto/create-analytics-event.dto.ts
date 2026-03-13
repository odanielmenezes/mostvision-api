import { IsIn, IsNotEmpty, IsObject, IsString } from 'class-validator';

const ALLOWED_EVENT_TYPES = [
  'page_view',
  'cta_click',
  'form_view',
  'form_submit',
] as const;

export class CreateAnalyticsEventDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(ALLOWED_EVENT_TYPES)
  eventType: (typeof ALLOWED_EVENT_TYPES)[number];

  @IsObject()
  payload: Record<string, unknown>;
}