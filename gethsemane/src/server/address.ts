import "server-only";
import { z } from "zod";

const addressSchema = z.object({
  name: z.string().trim().min(1).max(100),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200),
  city: z.string().trim().min(1).max(100),
  region: z.string().trim().max(100),
  postalCode: z.string().trim().max(20),
  country: z.string().trim().toUpperCase().length(2),
  phone: z.string().trim().max(30),
});
export type AddressInput = z.infer<typeof addressSchema>;

/** A shipping address from a form (account address book or checkout). `prefix` selects e.g. "ship_" fields. */
export function readAddress(data: FormData, prefix = "") {
  const get = (key: string) => String(data.get(`${prefix}${key}`) ?? "").trim();
  return addressSchema.safeParse({
    name: get("name"),
    line1: get("line1"),
    line2: get("line2"),
    city: get("city"),
    region: get("region"),
    postalCode: get("postalCode"),
    country: get("country"),
    phone: get("phone"),
  });
}
