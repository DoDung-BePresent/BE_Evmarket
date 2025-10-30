import request from "supertest";
import prisma from "@/libs/prisma";
import redisClient from "@/libs/redis";
import app from "../app";

jest.setTimeout(20000);

describe("Auction request & admin review flow", () => {
  let accessToken: string;
  let adminToken: string;
  let vehicleId: string;

  beforeAll(async () => {
    const email = `auctionuser${Date.now()}@example.com`;
    const password = "TestPassword123!";
    await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "Auction User", email, password });
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password });
    accessToken = loginRes.body.data.accessToken;

    const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    const adminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: admin?.email, password: "password123" });
    adminToken = adminLogin.body.data.accessToken;
  });

  it("should create a new vehicle for auction request", async () => {
    const vehicleData = {
      title: "Auction Vehicle",
      description: "A vehicle for auction request.",
      price: 10000,
      brand: "TestBrand",
      model: "TestModel",
      year: 2023,
      mileage: 100,
      specifications: JSON.stringify({
        performance: { topSpeed: "200km/h" },
        dimensions: {},
        batteryAndCharging: {},
        warranty: {},
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
    vehicleId = res.body.data.vehicle.id;
  });

  it("should request auction for the vehicle (no bidIncrement in payload)", async () => {
    const startingPrice = 20000;
    const res = await request(app)
      .patch(`/api/v1/auctions/listings/VEHICLE/${vehicleId}/request-auction`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        startingPrice,
        depositAmount: 1000,
        auctionEndsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      });
    expect(res.status).toBe(200);
    expect(res.body.data.bidIncrement).toBe(Math.ceil(startingPrice * 0.05));
  });

  // it("should not allow user to send bidIncrement in payload", async () => {
  //   // Tạo vehicle mới
  //   const vehicleData = {
  //     title: "Auction Vehicle 2",
  //     description: "A vehicle for auction request.",
  //     price: 10000,
  //     brand: "TestBrand",
  //     model: "TestModel",
  //     year: 2023,
  //     mileage: 100,
  //     specifications: JSON.stringify({
  //       performance: { topSpeed: "200km/h" },
  //       dimensions: {},
  //       batteryAndCharging: {},
  //       warranty: {},
  //     }),
  //   };
  //   const createRes = await request(app)
  //     .post("/api/v1/vehicles")
  //     .set("Authorization", `Bearer ${accessToken}`)
  //     .field("title", vehicleData.title)
  //     .field("description", vehicleData.description)
  //     .field("price", vehicleData.price)
  //     .field("brand", vehicleData.brand)
  //     .field("model", vehicleData.model)
  //     .field("year", vehicleData.year)
  //     .field("mileage", vehicleData.mileage)
  //     .field("specifications", vehicleData.specifications)
  //     .attach("images", Buffer.from("test"), "test.png");
  //   expect(createRes.status).toBe(201);
  //   const newVehicleId = createRes.body.data.vehicle.id;

  //   // Gửi request-auction với bidIncrement
  //   const res = await request(app)
  //     .patch(
  //       `/api/v1/auctions/listings/VEHICLE/${newVehicleId}/request-auction`,
  //     )
  //     .set("Authorization", `Bearer ${accessToken}`)
  //     .send({
  //       startingPrice: 25000,
  //       depositAmount: 1000,
  //       bidIncrement: 999,
  //     });
  //   expect([400, 403]).toContain(res.status); // Chấp nhận 400 hoặc 403
  // });

  it("should let admin approve and update bidIncrement", async () => {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });
    expect(vehicle?.status).toBe("AUCTION_PENDING_APPROVAL");

    const newBidIncrement = 1234;
    const res = await request(app)
      .patch(`/api/v1/admin/listings/VEHICLE/${vehicleId}/review-auction`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        approved: true,
        auctionStartsAt: new Date(),
        auctionEndsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        bidIncrement: newBidIncrement,
      });
    expect(res.status).toBe(200);
    expect(res.body.data.bidIncrement).toBe(newBidIncrement);

    const updated = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });
    expect(updated?.bidIncrement).toBe(newBidIncrement);
    expect(updated?.status).toBe("AUCTION_LIVE");
  });
});

afterAll(async () => {
  await prisma.$disconnect();
  await redisClient.quit();
});
