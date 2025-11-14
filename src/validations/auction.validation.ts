/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Node modules
 */
import { z } from "zod";

export const auctionValidation = {
  createVehicleAuction: z.object({
    body: z
      .object({
        title: z.string().min(5).max(100),
        description: z.string().min(20).max(5000),
        brand: z.string().min(2),
        location: z.string().optional(),
        model: z.string().min(1),
        year: z.coerce
          .number()
          .int()
          .min(1990)
          .max(new Date().getFullYear() + 1),
        mileage: z.coerce.number().int().min(0),
        specifications: z.preprocess(
          (val) => {
            if (typeof val === "string") {
              try {
                return JSON.parse(val);
              } catch (_error) {
                return val;
              }
            }
            return val;
          },
          z.object({
            performance: z
              .object({
                topSpeed: z.string(),
                acceleration: z.string(),
                motorType: z.string(),
                horsepower: z.string(),
              })
              .partial(),
            dimensions: z
              .object({
                length: z.string(),
                width: z.string(),
                height: z.string(),
                curbWeight: z.string(),
              })
              .partial(),
            batteryAndCharging: z
              .object({
                batteryCapacity: z.string(),
                range: z.string(),
                chargingSpeed: z.string(),
                chargeTime: z.string(),
              })
              .partial(),
            warranty: z
              .object({
                basic: z.string(),
                battery: z.string(),
                drivetrain: z.string(),
              })
              .partial(),
          }),
        ),
        startingPrice: z.coerce.number().positive(),
        bidIncrement: z.coerce.number().positive(),
        depositAmount: z.coerce.number().positive().optional(),
        buyNowPrice: z.coerce.number().positive().optional(),
      })
      .refine(
        (data) => {
          if (data.buyNowPrice && data.buyNowPrice <= data.startingPrice) {
            return false;
          }
          return true;
        },
        {
          message: "Buy Now price must be greater than the starting price.",
          path: ["buyNowPrice"],
        },
      ),
  }),
  createBatteryAuction: z.object({
    body: z
      .object({
        title: z.string().min(5).max(100),
        description: z.string().min(20).max(5000),
        brand: z.string().min(2),
        location: z.string().optional(),
        year: z.coerce
          .number()
          .int()
          .min(1990)
          .max(new Date().getFullYear() + 1),
        capacity: z.coerce.number().positive(),
        health: z.coerce.number().min(0).max(100).optional(),
        specifications: z.preprocess(
          (val) => {
            if (typeof val === "string") {
              try {
                return JSON.parse(val);
              } catch (error) {
                return val;
              }
            }
            return val;
          },
          z
            .object({
              weight: z.string(),
              voltage: z.string(),
              warrantyPeriod: z.string(),
              chargingTime: z.string(),
              chemistry: z.string(),
              temperatureRange: z.string(),
              degradation: z.string(),
              installation: z.string(),
            })
            .partial(),
        ),
        startingPrice: z.coerce.number().positive(),
        bidIncrement: z.coerce.number().positive(),
        depositAmount: z.coerce.number().positive().optional(),
        buyNowPrice: z.coerce.number().positive().optional(),
      })
      .refine(
        (data) => {
          if (data.buyNowPrice && data.buyNowPrice <= data.startingPrice) {
            return false;
          }
          return true;
        },
        {
          message: "Buy Now price must be greater than the starting price.",
          path: ["buyNowPrice"],
        },
      ),
  }),
  requestAuction: z.object({
    body: z
      .object({
        startingPrice: z.coerce
          .number()
          .positive("Starting price must be positive"),
        bidIncrement: z.coerce
          .number()
          .positive("Bid increment must be positive"),
        depositAmount: z.coerce
          .number()
          .positive("Deposit amount must be positive")
          .optional(),
        buyNowPrice: z.coerce.number().positive().optional(),
      })
      .refine(
        (data) => {
          if (data.buyNowPrice && data.buyNowPrice <= data.startingPrice) {
            return false;
          }
          return true;
        },
        {
          message: "Buy Now price must be greater than the starting price.",
          path: ["buyNowPrice"],
        },
      ),
    params: z.object({
      listingId: z.cuid("Invalid listing ID"),
      listingType: z.enum(["VEHICLE", "BATTERY"]),
    }),
  }),
  getLiveAuctions: z.object({
    query: z.object({
      time: z.enum(["future", "present", "past"]).default("present"),
      sortBy: z.string().optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(10),
    }),
  }),
  getAuctionDetails: z.object({
    params: z.object({
      listingId: z.cuid("Invalid listing ID"),
      listingType: z.enum(["VEHICLE", "BATTERY"]),
    }),
  }),
  placeBid: z.object({
    body: z.object({
      amount: z.coerce.number().positive("Bid amount must be positive"),
    }),
    params: z.object({
      listingId: z.cuid("Invalid listing ID"),
      listingType: z.enum(["VEHICLE", "BATTERY"]),
    }),
  }),
  depositParams: z.object({
    params: z.object({
      listingId: z.cuid("Invalid listing ID"),
      listingType: z.enum(["VEHICLE", "BATTERY"]),
    }),
  }),
};

export type GetLiveAuctionsQuery = z.infer<
  typeof auctionValidation.getLiveAuctions
>["query"];
