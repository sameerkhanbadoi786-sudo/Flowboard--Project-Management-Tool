import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  listNotifications,
  unreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "../store.js";

export default function notificationRoutes() {
  const router = Router();
  router.use(requireAuth);

  router.get("/", (req, res) => {
    res.json(listNotifications(req.user.username));
  });

  router.get("/unread-count", (req, res) => {
    res.json({ count: unreadNotificationCount(req.user.username) });
  });

  router.post("/:id/read", (req, res) => {
    markNotificationRead(req.params.id, req.user.username);
    res.status(204).end();
  });

  router.post("/read-all", (req, res) => {
    markAllNotificationsRead(req.user.username);
    res.status(204).end();
  });

  return router;
}
