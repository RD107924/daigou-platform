import express from "express";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const adapter = new JSONFile(
  process.env.NODE_ENV === "production" ? "/data/db.json" : "db.json"
);
const defaultData = { products: [], orders: [], users: [], requests: [] };
const db = new Low(adapter, defaultData);
await db.read();

db.data = db.data || defaultData;
db.data.products = db.data.products || [];
db.data.orders = db.data.orders || [];
db.data.users = db.data.users || [];
db.data.requests = db.data.requests || [];

async function initializeAdminUser() {
  let adminUser = db.data.users.find((u) => u.username === "randy");
  if (!adminUser) {
    console.log(`!!! 找不到管理者 randy，正在建立新的帳號...`);
    const passwordHash = await bcrypt.hash("randy1007", 10);
    adminUser = { username: "randy", passwordHash, role: "admin" };
    db.data.users.push(adminUser);
    await db.write();
    console.log(`!!! 管理者 randy 已成功建立。`);
  } else {
    if (adminUser.role !== "admin") {
      console.log(`!!! 將管理者 ${adminUser.username} 的角色更正為 admin...`);
      adminUser.role = "admin";
      await db.write();
    }
    console.log(`管理者 randy 已存在，無需操作。`);
  }
}
await initializeAdminUser();

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET =
  process.env.JWT_SECRET || "your_super_secret_key_12345_and_make_it_long";

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
function authorizeAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "權限不足" });
  }
  next();
}

// --- Public Routes ---
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = db.data.users.find((u) => u.username === username);
    if (!user) return res.status(401).json({ message: "帳號或密碼錯誤" });
    const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordMatch)
      return res.status(401).json({ message: "帳號或密碼錯誤" });
    const payload = { username: user.username, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
    res.json({ message: "登入成功", token });
  } catch (error) {
    res.status(500).json({ message: "伺服器內部錯誤" });
  }
});
app.get("/api/products", (req, res) => {
  const sortedProducts = [...db.data.products].sort(
    (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)
  );
  res.json(sortedProducts);
});
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
      isNew: true,
      activityLog: [],
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
    )
      return res.status(400).json({ message: "請求資料不完整" });
    const newRequest = {
      requestId: `req_${Date.now()}`,
      receivedAt: new Date().toISOString(),
      status: "待報價",
      isNew: true,
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
app.get("/api/notifications/summary", authenticateToken, (req, res) => {
  const newOrdersCount = db.data.orders.filter((o) => o.isNew).length;
  const newRequestsCount = db.data.requests.filter((r) => r.isNew).length;
  res.json({ newOrdersCount, newRequestsCount });
});
app.get("/api/orders", authenticateToken, async (req, res) => {
  const ordersToReturn = [...db.data.orders].reverse();
  let updated = false;
  db.data.orders.forEach((order) => {
    if (order.isNew) {
      order.isNew = false;
      updated = true;
    }
  });
  if (updated) await db.write();
  res.json(ordersToReturn);
});
app.get("/api/requests", authenticateToken, async (req, res) => {
  const requestsToReturn = [...db.data.requests].reverse();
  let updated = false;
  db.data.requests.forEach((request) => {
    if (request.isNew) {
      request.isNew = false;
      updated = true;
    }
  });
  if (updated) await db.write();
  res.json(requestsToReturn);
});
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
  const maxOrder = db.data.products.reduce(
    (max, p) => Math.max(max, p.sortOrder || 0),
    -1
  );
  const newProduct = {
    id: `p${Date.now()}`,
    sortOrder: maxOrder + 1,
    ...req.body,
  };
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

// **--- 唯一的修改點在這裡 ---**
app.patch(
  "/api/orders/:orderId/status",
  authenticateToken,
  async (req, res) => {
    try {
      const { orderId } = req.params;
      const { status: newStatus } = req.body;
      const operatorUsername = req.user.username; // 從 token 取得當前操作者的 username
      const allowedStatus = [
        "待處理",
        "已通知廠商發貨",
        "已發貨",
        "已完成",
        "訂單取消",
      ];
      if (!newStatus || !allowedStatus.includes(newStatus)) {
        return res.status(400).json({ message: "無效的訂單狀態" });
      }
      const orderToUpdate = db.data.orders.find((o) => o.orderId === orderId);
      if (!orderToUpdate) {
        return res.status(404).json({ message: "找不到該訂單" });
      }
      const oldStatus = orderToUpdate.status;
      if (oldStatus !== newStatus) {
        orderToUpdate.status = newStatus;
        const logEntry = {
          timestamp: new Date().toISOString(),
          updatedBy: operatorUsername,
          action: `狀態由「${oldStatus}」更新為「${newStatus}」`,
        };
        if (!Array.isArray(orderToUpdate.activityLog)) {
          orderToUpdate.activityLog = [];
        }
        orderToUpdate.activityLog.push(logEntry);
        await db.write();
      }
      res.json({ message: "訂單狀態更新成功", order: orderToUpdate });
    } catch (error) {
      console.error("更新訂單狀態時發生錯誤:", error);
      res.status(500).json({ message: "伺服器內部錯誤" });
    }
  }
);

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

// --- Admin Only Routes ---
app.get("/api/users", authenticateToken, authorizeAdmin, (req, res) => {
  const users = db.data.users.map(({ passwordHash, ...user }) => user);
  res.json(users);
});
app.post("/api/users", authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password || !role)
      return res.status(400).json({ message: "帳號、密碼和角色為必填項" });
    const existingUser = db.data.users.find((u) => u.username === username);
    if (existingUser) return res.status(409).json({ message: "此帳號已存在" });
    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = { username, passwordHash, role };
    db.data.users.push(newUser);
    await db.write();
    const { passwordHash: _, ...userToReturn } = newUser;
    res.status(201).json(userToReturn);
  } catch (error) {
    res.status(500).json({ message: "伺服器內部錯誤" });
  }
});
app.delete(
  "/api/users/:username",
  authenticateToken,
  authorizeAdmin,
  async (req, res) => {
    try {
      const { username } = req.params;
      if (username === "randy")
        return res.status(403).json({ message: "無法刪除最高管理員帳號" });
      const userIndex = db.data.users.findIndex((u) => u.username === username);
      if (userIndex === -1)
        return res.status(404).json({ message: "找不到該使用者" });
      db.data.users.splice(userIndex, 1);
      await db.write();
      res.status(200).json({ message: "使用者刪除成功" });
    } catch (error) {
      res.status(500).json({ message: "伺服器內部錯誤" });
    }
  }
);
app.patch(
  "/api/products/order",
  authenticateToken,
  authorizeAdmin,
  async (req, res) => {
    try {
      const { orderedIds } = req.body;
      if (!Array.isArray(orderedIds))
        return res.status(400).json({ message: "資料格式不正確" });
      orderedIds.forEach((id, index) => {
        const product = db.data.products.find((p) => p.id === id);
        if (product) product.sortOrder = index;
      });
      await db.write();
      res.json({ message: "商品順序已更新" });
    } catch (error) {
      res.status(500).json({ message: "伺服器內部錯誤" });
    }
  }
);
app.patch(
  "/api/orders/:orderId/assign",
  authenticateToken,
  authorizeAdmin,
  async (req, res) => {
    try {
      const { orderId } = req.params;
      const { username } = req.body;
      const orderToUpdate = db.data.orders.find((o) => o.orderId === orderId);
      if (!orderToUpdate)
        return res.status(404).json({ message: "找不到該訂單" });
      orderToUpdate.assignedTo = username || null;
      await db.write();
      res.json({ message: "訂單指派成功", order: orderToUpdate });
    } catch (error) {
      res.status(500).json({ message: "伺服器內部錯誤" });
    }
  }
);
app.patch(
  "/api/requests/:requestId/assign",
  authenticateToken,
  authorizeAdmin,
  async (req, res) => {
    try {
      const { requestId } = req.params;
      const { username } = req.body;
      const requestToUpdate = db.data.requests.find(
        (r) => r.requestId === requestId
      );
      if (!requestToUpdate)
        return res.status(404).json({ message: "找不到該請求" });
      requestToUpdate.assignedTo = username || null;
      await db.write();
      res.json({ message: "請求指派成功", request: requestToUpdate });
    } catch (error) {
      res.status(500).json({ message: "伺服器內部錯誤" });
    }
  }
);

// 啟動伺服器
app.listen(port, () => {
  console.log(`伺服器成功啟動！正在監聽 http://localhost:${port}`);
});
