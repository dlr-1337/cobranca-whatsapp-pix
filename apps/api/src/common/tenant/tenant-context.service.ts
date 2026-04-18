import { Inject, Injectable } from '@nestjs/common';

import { AuthService } from '../../modules/auth/auth.service';

@Injectable()
export class TenantContextService {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  async resolve(sessionToken: string | null) {
    return this.authService.resolveTenantContext(sessionToken);
  }
}
