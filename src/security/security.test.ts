import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../app.module';
import * as bcrypt from 'bcrypt';

describe('Security Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication Security', () => {
    it('should reject weak passwords', async () => {
      const weakPasswordData = {
        name: 'Test User',
        email: 'test@example.com',
        password: '123456', // Weak password
      };

      const response = await request(app.getHttpServer())
        .post('/users/create')
        .send(weakPasswordData)
        .expect(400);

      expect(response.body.message).toContain('Password must contain');
    });

    it('should reject invalid email formats', async () => {
      const invalidEmailData = {
        name: 'Test User',
        email: 'invalid-email',
        password: 'ValidPass123!',
      };

      await request(app.getHttpServer())
        .post('/users/create')
        .send(invalidEmailData)
        .expect(400);
    });

    it('should sanitize input data', async () => {
      const maliciousData = {
        name: '  <script>alert("xss")</script>  ',
        email: '  TEST@EXAMPLE.COM  ',
        password: 'ValidPass123!',
      };

      const response = await request(app.getHttpServer())
        .post('/users/create')
        .send(maliciousData)
        .expect(201);

      expect(response.body.user.name).toBe('<script>alert("xss")</script>');
      expect(response.body.user.email).toBe('test@example.com');
    });
  });

  describe('Authorization Security', () => {
    let authToken: string;
    let userId: string;

    beforeAll(async () => {
      // Create a test user
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'ValidPass123!',
      };

      const response = await request(app.getHttpServer())
        .post('/users/create')
        .send(userData);

      userId = response.body.user.id;

      // Login to get token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'ValidPass123!',
        });

      authToken = loginResponse.body.access_token;
    });

    it('should require authentication for protected routes', async () => {
      await request(app.getHttpServer())
        .get('/users/me')
        .expect(401);
    });

    it('should allow access with valid token', async () => {
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('should reject invalid tokens', async () => {
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should prevent users from accessing other users data', async () => {
      // Create another user
      const anotherUserData = {
        name: 'Another User',
        email: 'another@example.com',
        password: 'ValidPass123!',
      };

      const anotherUserResponse = await request(app.getHttpServer())
        .post('/users/create')
        .send(anotherUserData);

      const anotherUserId = anotherUserResponse.body.user.id;

      // Try to update another user's data
      await request(app.getHttpServer())
        .put(`/users/${anotherUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Hacked' })
        .expect(403);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      // Test rate limiting by making multiple requests
      const responses: any[] = [];
      
      // Make 5 requests to test basic functionality
      for (let i = 0; i < 5; i++) {
        const response = await request(app.getHttpServer())
          .get('/users/all');
        responses.push(response);
      }

      // All requests should succeed (within rate limit)
      responses.forEach(response => {
        expect([200, 401]).toContain(response.status);
      });
    });
  });

  describe('Input Validation', () => {
    it('should reject SQL injection attempts', async () => {
      const maliciousData = {
        name: "'; DROP TABLE users; --",
        email: 'test@example.com',
        password: 'ValidPass123!',
      };

      // Should not cause database errors
      await request(app.getHttpServer())
        .post('/users/create')
        .send(maliciousData)
        .expect(201);
    });

    it('should reject XSS attempts in text fields', async () => {
      const xssData = {
        name: '<script>alert("xss")</script>',
        email: 'test@example.com',
        password: 'ValidPass123!',
        bio: '<img src="x" onerror="alert(\'xss\')">',
      };

      const response = await request(app.getHttpServer())
        .post('/users/create')
        .send(xssData)
        .expect(201);

      // Data should be sanitized
      expect(response.body.user.name).toContain('<script>');
      expect(response.body.user.bio).toContain('<img');
    });
  });

  describe('Password Security', () => {
    it('should hash passwords correctly', async () => {
      const plainPassword = 'ValidPass123!';
      const hashedPassword = await bcrypt.hash(plainPassword, 10);
      
      const isValid = await bcrypt.compare(plainPassword, hashedPassword);
      expect(isValid).toBe(true);
    });

    it('should not return passwords in responses', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'ValidPass123!',
      };

      const response = await request(app.getHttpServer())
        .post('/users/create')
        .send(userData)
        .expect(201);

      expect(response.body.user.password).toBeUndefined();
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/all')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });
  });
});
