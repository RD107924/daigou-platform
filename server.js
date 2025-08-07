import express from "express";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const adapter = new JSONFile("/data/db.json" || "db.json");
const defaultData = { products: [], orders: [], users: [] };
const db = new Low(adapter, defaultData);
await db.read();

db.data = db.data || defaultData;
db.data.products = db.data.products || [];
db.data.orders = db.data.orders || [];
db.data.users = db.data.users || [];

const app = express();
const port = 3000;
const JWT_SECRET = "your_super_secret_key_12345_and_make_it_long";

app.use(cors());
app.use(express.json());

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Public Routes
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = db.data.users.find((u) => u.username === username);
    if (!user) return res.status(401).json({ message: "帳號或密碼錯誤" });
    const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordMatch)
      return res.status(401).json({ message: "帳號或密碼錯誤" });
    const payload = { username: user.username };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
    res.json({ message: "登入成功", token: token });
  } catch (error) {
    res.status(500).json({ message: "伺服器內部錯誤" });
  }
});
app.get("/api/products", (req, res) => res.json(db.data.products));
app.get("/api/products/:id", (req, res) => {
  const product = db.data.products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ message: "找不到該商品" });
  res.json(product);
});
app.post("/api/orders", async (req, res) => {
  try {
    const orderData = req.body;
    if (
      !orderData.paopaohuId ||
      !orderData.lastFiveDigits ||
      !orderData.items ||
      orderData.items.length === 0
    )
      return res.status(400).json({ message: "訂單資料不完整" });
    const newOrder = {
      orderId: `ord_${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: "待處理",
      ...orderData,
    };
    db.data.orders.push(newOrder);
    await db.write();
    res.status(201).json({ message: "訂單建立成功", order: newOrder });
  } catch (error) {
    res.status(500).json({ message: "伺服器內部錯誤" });
  }
});

// Protected Routes
app.patch("/api/user/password", authenticateToken, async (req, res) => {
  try {
    const { username } = req.user;
    const { currentPassword, newPassword } = req.body;
    const user = db.data.users.find((u) => u.username === username);
    if (!user) return res.status(404).json({ message: "找不到使用者" });
    const isPasswordMatch = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );
    if (!isPasswordMatch)
      return res.status(401).json({ message: "目前的密碼不正確" });
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = newPasswordHash;
    await db.write();
    res.json({ message: "密碼更新成功！" });
  } catch (error) {
    console.error("更新密碼時發生錯誤:", error);
    res.status(500).json({ message: "伺服器內部錯誤" });
  }
});
app.post("/api/products", authenticateToken, async (req, res) => {
  const newProduct = { id: `p${Date.now()}`, ...req.body };
  db.data.products.push(newProduct);
  await db.write();
  res.status(201).json(newProduct);
});
app.put("/api/products/:id", authenticateToken, async (req, res) => {
  const i = db.data.products.findIndex((p) => p.id === req.params.id);
  if (i === -1) return res.status(404).json({ message: "找不到該商品" });
  db.data.products[i] = { ...db.data.products[i], ...req.body };
  await db.write();
  res.json({ message: "商品更新成功", product: db.data.products[i] });
});
app.delete("/api/products/:id", authenticateToken, async (req, res) => {
  const i = db.data.products.findIndex((p) => p.id === req.params.id);
  if (i === -1) return res.status(404).json({ message: "找不到該商品" });
  db.data.products.splice(i, 1);
  await db.write();
  res.status(200).json({ message: "商品刪除成功" });
});
app.get("/api/orders", authenticateToken, (req, res) => {
  const sortedOrders = [...db.data.orders].reverse();
  res.json(sortedOrders);
});
app.patch(
  "/api/orders/:orderId/status",
  authenticateToken,
  async (req, res) => {
    try {
      const { orderId } = req.params;
      const { status } = req.body;
      const allowedStatus = [
        "待處理",
        "已通知廠商發貨",
        "已發貨",
        "已完成",
        "訂單取消",
      ];
      if (!status || !allowedStatus.includes(status))
        return res.status(400).json({ message: "無效的訂單狀態" });
      const orderToUpdate = db.data.orders.find((o) => o.orderId === orderId);
      if (!orderToUpdate)
        return res.status(404).json({ message: "找不到該訂單" });
      orderToUpdate.status = status;
      await db.write();
      res.json({ message: "訂單狀態更新成功", order: orderToUpdate });
    } catch (error) {
      res.status(500).json({ message: "伺服器內部錯誤" });
    }
  }
);

app.listen(port, () => {
  console.log(`伺服器成功啟動！正在監聽 http://localhost:${port}`);
});
