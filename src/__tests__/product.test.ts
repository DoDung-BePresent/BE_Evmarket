/* eslint-disable @typescript-eslint/no-explicit-any */
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

jest.setTimeout(20000);

describe("Product listing & verification flow", () => {
  let accessToken: string;
  let vehicleId: string;
  let batteryId: string;

  beforeAll(async () => {
    const email = `seller${Date.now()}@example.com`;
    const password = "TestPassword123!";
    await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "Seller", email, password });
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password });
    accessToken = loginRes.body.data.accessToken;
  });

  it("should create a new vehicle with isVerified: false", async () => {
    const vehicleData = {
      title: "Test Vehicle",
      description: "A test vehicle with enough description for validation.",
      price: 10000,
      brand: "TestBrand",
      model: "TestModel",
      year: 2023,
      mileage: 100,
      specifications: JSON.stringify({
        performance: {
          topSpeed: "200km/h",
          acceleration: "5s",
          motorType: "Electric",
          horsepower: "150hp",
        },
        dimensions: {
          length: "4m",
          width: "2m",
          height: "1.5m",
          curbWeight: "1500kg",
        },
        batteryAndCharging: {
          batteryCapacity: "80kWh",
          range: "400km",
          chargingSpeed: "100kW",
          chargeTime: "1h",
        },
        warranty: {
          basic: "3 years",
          battery: "8 years",
          drivetrain: "5 years",
        },
      }),
    };

    const res = await request(app)
      .post("/api/v1/vehicles")
      .set("Authorization", `Bearer ${accessToken}`)
      .field("title", vehicleData.title)
      .field("description", vehicleData.description)
      .field("price", vehicleData.price)
      .field("brand", vehicleData.brand)
      .field("model", vehicleData.model)
      .field("year", vehicleData.year)
      .field("mileage", vehicleData.mileage)
      .field("specifications", vehicleData.specifications)
      .attach("images", Buffer.from("test"), "test.png");
    expect(res.status).toBe(201);
    expect(res.body.data.vehicle.isVerified).toBe(false);
    vehicleId = res.body.data.vehicle.id;
  });

  it("should not list unverified vehicles in query", async () => {
    const res = await request(app).get("/api/v1/vehicles");
    expect(res.status).toBe(200);
    const found = res.body.data.vehicles.find((v: any) => v.id === vehicleId);
    expect(found).toBeUndefined();
  });

  it("should verify vehicle by admin and then it appears in query", async () => {
    const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    const adminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: admin?.email, password: "password123" });
    const adminToken = adminLogin.body.data.accessToken;

    const verifyRes = await request(app)
      .patch(`/api/v1/admin/listings/VEHICLE/${vehicleId}/verify`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ isVerified: true });
    expect(verifyRes.status).toBe(200);

    const res = await request(app).get("/api/v1/vehicles");
    const found = res.body.data.vehicles.find((v: any) => v.id === vehicleId);
    expect(found).toBeDefined();
    expect(found.isVerified).toBe(true);
  }, 20000);

  it("should create a new battery with isVerified: false", async () => {
    const batteryData = {
      title: "Test Battery",
      description: "A test battery with enough description for validation.",
      price: 5000,
      brand: "TestBrand",
      year: 2023,
      capacity: 100,
      specifications: JSON.stringify({
        weight: "20kg",
        voltage: "400V",
        warrantyPeriod: "5 years",
        chargingTime: "2h",
        chemistry: "Li-ion",
        temperatureRange: "-20~60C",
        degradation: "5%/year",
        installation: "Standard",
      }),
    };

    const res = await request(app)
      .post("/api/v1/batteries")
      .set("Authorization", `Bearer ${accessToken}`)
      .field("title", batteryData.title)
      .field("description", batteryData.description)
      .field("price", batteryData.price)
      .field("brand", batteryData.brand)
      .field("year", batteryData.year)
      .field("capacity", batteryData.capacity)
      .field("specifications", batteryData.specifications)
      .attach("images", Buffer.from("test"), "test.png");
    expect(res.status).toBe(201);
    expect(res.body.data.battery.isVerified).toBe(false);
    batteryId = res.body.data.battery.id;
  });

  it("should not list unverified batteries in query", async () => {
    const res = await request(app).get("/api/v1/batteries");
    expect(res.status).toBe(200);
    const found = res.body.data.batteries.find((b: any) => b.id === batteryId);
    expect(found).toBeUndefined();
  });

  it("should verify battery by admin and then it appears in query", async () => {
    const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    const adminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: admin?.email, password: "password123" });
    const adminToken = adminLogin.body.data.accessToken;

    const verifyRes = await request(app)
      .patch(`/api/v1/admin/listings/BATTERY/${batteryId}/verify`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ isVerified: true });
    expect(verifyRes.status).toBe(200);

    const res = await request(app).get("/api/v1/batteries");
    const found = res.body.data.batteries.find((b: any) => b.id === batteryId);
    expect(found).toBeDefined();
    expect(found.isVerified).toBe(true);
  }, 20000);
});

afterAll(async () => {
  await prisma.$disconnect();
  await redisClient.quit();
});
