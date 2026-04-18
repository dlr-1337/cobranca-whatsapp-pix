import { loadNodeEnv } from '@cobrazap/config';
import {
  createAppRepository,
  createDatabase,
  createTestAuthDatabase,
  type AppRepository,
  type TestAuthDatabase,
} from '@cobrazap/db';
import { Injectable, OnModuleDestroy } from '@nestjs/common';

interface AuthRepositoryBundle {
  repository: AppRepository;
  close: () => Promise<void>;
}

@Injectable()
export class AuthStorageService implements OnModuleDestroy {
  private bundlePromise?: Promise<AuthRepositoryBundle>;

  async getRepository() {
    const bundle = await this.getBundle();
    return bundle.repository;
  }

  async onModuleDestroy() {
    if (!this.bundlePromise) {
      return;
    }

    const bundle = await this.bundlePromise;
    await bundle.close();
  }

  private getBundle() {
    if (!this.bundlePromise) {
      this.bundlePromise = this.createBundle();
    }

    return this.bundlePromise;
  }

  private async createBundle(): Promise<AuthRepositoryBundle> {
    if (process.env.NODE_ENV === 'test') {
      const harness: TestAuthDatabase = await createTestAuthDatabase();

      return {
        repository: harness.repository,
        close: harness.close,
      };
    }

    const env = loadNodeEnv(process.env);
    const { db, pool } = createDatabase(env.DATABASE_URL);

    return {
      repository: createAppRepository(db),
      close: async () => {
        await pool.end();
      },
    };
  }
}
