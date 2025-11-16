import prisma from "@/libs/prisma";
import { ForbiddenError, NotFoundError, ConflictError } from "@/libs/error";

export const cartService = {
  getOrCreateCart: async (userId: string) => {
    const includeClause = {
      items: {
        include: {
          battery: {
            include: {
              seller: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: {
          createdAt: "asc" as const,
        },
      },
    };

    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: includeClause,
    });

    if (!cart) {
      // Khi tạo mới, giỏ hàng sẽ trống.
      // Chúng ta tạo nó và trả về một đối tượng có cấu trúc tương tự.
      const newCart = await prisma.cart.create({
        data: { userId },
      });
      // Gán lại cho cart với kiểu dữ liệu đúng và một mảng items rỗng
      cart = { ...newCart, items: [] };
    }

    return cart;
  },

  addToCart: async (userId: string, batteryId: string) => {
    const battery = await prisma.battery.findUnique({
      where: { id: batteryId },
    });

    if (!battery || battery.status !== "AVAILABLE") {
      throw new NotFoundError("Battery is not available for purchase.");
    }

    if (battery.sellerId === userId) {
      throw new ForbiddenError("You cannot add your own item to the cart.");
    }

    const cart = await cartService.getOrCreateCart(userId);

    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        batteryId: batteryId,
      },
    });

    if (existingItem) {
      throw new ConflictError("This item is already in your cart.");
    }

    return prisma.cartItem.create({
      data: {
        cartId: cart.id,
        batteryId: batteryId,
      },
      include: { battery: true },
    });
  },

  removeFromCart: async (userId: string, itemId: string) => {
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });

    if (!cartItem) {
      throw new NotFoundError("Item not found in cart.");
    }

    // Kiểm tra cartItem.cart tồn tại trước khi truy cập
    if (!cartItem.cart || cartItem.cart.userId !== userId) {
      throw new ForbiddenError("You are not authorized to remove this item.");
    }

    await prisma.cartItem.delete({
      where: { id: itemId },
    });
  },
};
