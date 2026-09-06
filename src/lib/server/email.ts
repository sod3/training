import type { ClientSession } from "mongoose";
import { Notification } from "@/models";
export async function notifyUser(
  userId: string | import("mongoose").Types.ObjectId,
  title: string,
  body: string,
  href: string,
  session?: ClientSession,
) {
  await Notification.create([{ userId, title, body, href }], { session });
}
