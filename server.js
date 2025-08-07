import express from "express";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// 部署時使用 /data/db.json，本地開發時使用 db.json
const adapter = new JSONFile(
  process.env.NODE_ENV === "production" ? "/data/db.json" : "db.json"
);
const defaultData = { products: [], orders: [], users: [], requests: [] };
const db = new Low(adapter, defaultData);
await db.read();

// 防呆機制，確保所有資料陣列都存在
db.data = db.data || defaultData;
db.data.products = db.data.products || [];
db.data.orders = db.data.orders || [];
db.data.users = db.data.users || [];
db.data.requests = db.data.requests || [];

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET =
  process.env.JWT_SECRET || "your_super_secret_key_12345_and_make_it_long";

app.use(cors());
app.use(express.json());

// 路由守衛 (認證 Token)
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

// --- Public Routes ---
// (Login, Products, Orders, Requests 的公開 API 維持不變)
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
app.post("/api/requests", async (req, res) => {
  try {
    const requestData = req.body;
    if (
      !requestData.productUrl ||
      !requestData.productName ||
      !requestData.contactInfo
    ) {
      return res.status(400).json({ message: "請求資料不完整" });
    }
    const newRequest = {
      requestId: `req_${Date.now()}`,
      receivedAt: new Date().toISOString(),
      status: "待報價",
      ...requestData,
    };
    db.data.requests.push(newRequest);
    await db.write();
    res.status(201).json({ message: "代採購請求已收到", request: newRequest });
  } catch (error) {
    console.error("建立請求時發生錯誤:", error);
    res.status(500).json({ message: "伺服器內部錯誤" });
  }
});
app.get("/api/orders/lookup", async (req, res) => {
  try {
    const { paopaohuId } = req.query;
    if (!paopaohuId) {
      return res.status(400).json({ message: "請提供跑跑虎會員編號" });
    }
    const foundOrders = db.data.orders.filter(
      (order) => order.paopaohuId === paopaohuId
    );
    res.json(foundOrders.reverse());
  } catch (error) {
    console.error("查詢訂單時發生錯誤:", error);
    res.status(500).json({ message: "伺服器內部錯誤" });
  }
});

// --- Protected Routes ---

// (Password, Products, Orders 的保護 API 維持不變)
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

// **--- 新增的 API 在這裡 ---**
// 取得所有代採購請求
app.get("/api/requests", authenticateToken, (req, res) => {
  const sortedRequests = [...db.data.requests].reverse();
  res.json(sortedRequests);
});

// 更新代採購請求狀態
app.patch(
  "/api/requests/:requestId/status",
  authenticateToken,
  async (req, res) => {
    try {
      const { requestId } = req.params;
      const { status } = req.body;
      const requestToUpdate = db.data.requests.find(
        (r) => r.requestId === requestId
      );
      if (!requestToUpdate) {
        return res.status(404).json({ message: "找不到該請求" });
      }
      requestToUpdate.status = status;
      await db.write();
      res.json({ message: "請求狀態更新成功", request: requestToUpdate });
    } catch (error) {
      console.error("更新請求狀態時發生錯誤:", error);
      res.status(500).json({ message: "伺服器內部錯誤" });
    }
  }
);

// 啟動伺服器
app.listen(port, () => {
  console.log(`伺服器成功啟動！正在監聽 http://localhost:${port}`);
});
