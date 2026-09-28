export type CustomerInfo = {
  name: string;
  phone: string;
  email: string;
};

type UserLike = {
  name?: string;
  phone?: string;
  email?: string;
} | null;

type OrderLike = {
  userId?: string | UserLike;
  deliveryAddress?: {
    fullName?: string;
    phone?: string;
  } | null;
};

/**
 * Order theke customer info ber kore.
 * 1. userId populated hole (object) -> user er name/phone/email
 * 2. na hole (string ID ba null, jemon user delete hoye gele) -> deliveryAddress fallback
 */
export const getCustomer = (order?: OrderLike | null): CustomerInfo => {
  const user =
    order?.userId && typeof order.userId === "object" ? order.userId : null;

  return {
    name: user?.name || order?.deliveryAddress?.fullName || "N/A",
    phone: user?.phone || order?.deliveryAddress?.phone || "",
    email: user?.email || "",
  };
};