/**
 * Node modules
 */
import request from "supertest";
import prisma from "@/libs/prisma";
import redisClient from "@/libs/redis";

/**
 * Import app
 */
import app from "../app";

describe("Auth flow", () => {
  let accessToken: string;
  const email = `testuser${Date.now()}@example.com`;
  const password = "TestPassword123!";

  it("should register a new user", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "Test User", email, password });
    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe(email);
  });

  it("should not register with duplicate email", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "Test User", email, password });
    expect(res.status).toBe(409); // Conflict
  });

  it("should not login with wrong password", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password: "WrongPassword123!" });
    expect(res.status).toBe(401); // Unauthorized
  });

  it("should login with the new user", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    accessToken = res.body.data.accessToken;
  });

  it("should get user profile with valid token", async () => {
    const res = await request(app)
      .get("/api/v1/users/me")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(email);
  });

  it("should not get user profile without token", async () => {
    const res = await request(app).get("/api/v1/users/me");
    expect(res.status).toBe(401);
  });

  it("should not login with a locked account", async () => {
    await prisma.user.update({
      where: { email },
      data: { isLocked: true, lockReason: "Test lock" },
    });
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password });
    expect(res.status).toBe(403);
  });
});

afterAll(async () => {
  await prisma.$disconnect();
  await redisClient.quit();
});
