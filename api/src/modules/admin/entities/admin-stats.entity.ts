import { ApiProperty } from '@nestjs/swagger';

export class SignupsByDayEntity {
  @ApiProperty() date: string;
  @ApiProperty() count: number;
}

export class AdminStatsEntity {
  @ApiProperty() total_users: number;
  @ApiProperty() new_users_this_week: number;
  @ApiProperty() new_users_this_month: number;
  @ApiProperty() active_agent_sessions: number;
  @ApiProperty({ type: SignupsByDayEntity, isArray: true })
  signups_last_30_days: SignupsByDayEntity[];
}
