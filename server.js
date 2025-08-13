import express from "express";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import sgMail from "@sendgrid/mail";
import "dotenv/config"; // 建議使用 dotenv 管理環境變數

// ================================================================
// --- 初始化與設定 (Initialization & Configuration) ---
// ================================================================

const adapter = new JSONFile(
  process.env.NODE_ENV === "production" ? "/data/db.json" : "db.json"
);
const defaultData = {
  products: [],
  orders: [],
  users: [],
  requests: [],
  categories: [],
};
const db = new Low(adapter, defaultData);
await db.read();

db.data ||= defaultData;
for (const key in defaultData) {
  db.data[key] ||= defaultData[key];
}

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET =
  process.env.JWT_SECRET || "your_super_secret_key_12345_and_make_it_long";
const NOTIFICATION_EMAIL =
  process.env.NOTIFICATION_EMAIL || "rruntiger@gmail.com";
const FROM_EMAIL = process.env.FROM_EMAIL || "rruntiger@gmail.com";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// ================================================================
// --- 服務與啟動腳本 (Services & Startup Scripts) ---
// ================================================================

async function sendEmailNotification({ subject, text, html }) {
  if (!process.env.SENDGRID_API_KEY) {
    console.log("SENDGRID_API_KEY 未設定，跳過寄送郵件。");
    return;
  }
  const msg = {
    to: NOTIFICATION_EMAIL,
    from: { email: FROM_EMAIL, name: "代採購大平台通知" },
    subject,
    text,
    html,
  };
  try {
    await sgMail.send(msg);
    console.log("郵件通知已成功寄出至:", NOTIFICATION_EMAIL);
  } catch (error) {
    console.error(
      "!!! 寄送郵件時發生嚴重錯誤 !!!",
      error.response ? error.response.body : error
    );
  }
}

async function initializeAdminUser() {
  const adminUsername = "randy";
  let adminUser = db.data.users.find((u) => u.username === adminUsername);
  if (!adminUser) {
    console.log(`!!! 找不到管理者 ${adminUsername}，正在建立新的帳號...`);
    const passwordHash = await bcrypt.hash("randy1007", 10);
    adminUser = {
      id: `user_${Date.now()}`,
      username: adminUsername,
      passwordHash,
      role: "admin",
    };
    db.data.users.push(adminUser);
    await db.write();
    console.log(`!!! 管理者 ${adminUsername} 已成功建立。`);
  } else if (adminUser.role !== "admin") {
    console.log(`!!! 將管理者 ${adminUser.username} 的角色更正為 admin...`);
    adminUser.role = "admin";
    await db.write();
  }
}

// ================================================================
// --- 中介軟體 (Middleware) ---
// ================================================================

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
    return res.status(403).json({ message: "權限不足，此操作需要管理員身份" });
  }
  next();
}

// ================================================================
// --- API 路由 (Routes) ---
// ================================================================

// --- 公開路由 (Public Routes) ---
app.post("/api/login", async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const user = db.data.users.find((u) => u.username === username);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "帳號或密碼錯誤" });
    }
    const payload = { username: user.username, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
    res.json({ message: "登入成功", token });
  } catch (error) {
    next(error);
  }
});

app.get("/api/products", (req, res) => {
  // 只回傳上架的商品給前台
  const publishedProducts = db.data.products.filter(
    (p) => p.status === "published"
  );
  const sortedProducts = [...publishedProducts].sort(
    (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)
  );
  res.json(sortedProducts);
});

app.get("/api/products/:id", (req, res) => {
  const product = db.data.products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ message: "找不到該商品" });
  res.json(product);
});

app.post("/api/orders", async (req, res, next) => {
  try {
    const orderData = req.body;
    if (
      !orderData.paopaohuId ||
      !orderData.lastFiveDigits ||
      !orderData.email ||
      !orderData.items ||
      orderData.items.length === 0
    ) {
      return res.status(400).json({ message: "訂單資料不完整" });
    }
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
    sendEmailNotification({
      subject: `[新訂單通知] 訂單編號: ${newOrder.orderId}`,
      html: `<h2>新訂單通知</h2><p><strong>訂單編號:</strong> ${newOrder.orderId}</p><p><strong>跑跑虎ID:</strong> ${orderData.paopaohuId}</p><p><strong>總金額:</strong> ${orderData.totalAmount} TWD</p><p>請盡快登入後台處理。</p>`,
    });
    res.status(201).json({ message: "訂單建立成功", order: newOrder });
  } catch (error) {
    next(error);
  }
});

app.post("/api/requests", async (req, res, next) => {
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
      isNew: true,
      ...requestData,
    };
    db.data.requests.push(newRequest);
    await db.write();
    sendEmailNotification({
      subject: `[新代採購請求] 來自: ${requestData.contactInfo}`,
      html: `<h2>新代採購請求</h2><p><strong>聯絡方式:</strong> ${requestData.contactInfo}</p><p><strong>商品名稱:</strong> ${requestData.productName}</p><p>請盡快登入後台處理。</p>`,
    });
    res.status(201).json({ message: "代採購請求已收到", request: newRequest });
  } catch (error) {
    next(error);
  }
});

app.get("/api/orders/lookup", async (req, res, next) => {
  try {
    const { paopaohuId } = req.query;
    if (!paopaohuId)
      return res.status(400).json({ message: "請提供跑跑虎會員編號" });
    const foundOrders = db.data.orders.filter(
      (order) => order.paopaohuId === paopaohuId
    );
    res.json(foundOrders.reverse());
  } catch (error) {
    next(error);
  }
});

app.get("/api/categories", async (req, res, next) => {
  try {
    res.json(db.data.categories);
  } catch (error) {
    next(error);
  }
});

// --- 受保護路由 (Protected Routes, 需登入) ---
app.get("/api/notifications/summary", authenticateToken, (req, res) => {
  const newOrdersCount = db.data.orders.filter((o) => o.isNew).length;
  const newRequestsCount = db.data.requests.filter((r) => r.isNew).length;
  res.json({ newOrdersCount, newRequestsCount });
});

app.get("/api/dashboard-summary", authenticateToken, (req, res, next) => {
  try {
    const now = new Date();
    const todayStart = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Taipei" })
    );
    todayStart.setHours(0, 0, 0, 0);
    const dayOfWeek = todayStart.getDay();
    const diff = todayStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const thisWeekStart = new Date(todayStart.setDate(diff));
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisYearStart = new Date(now.getFullYear(), 0, 1);
    const getStats = (orders, startDate) => {
      const filteredOrders = orders.filter(
        (o) => new Date(o.createdAt) >= startDate
      );
      return {
        count: filteredOrders.length,
        sales: filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      };
    };
    res.json({
      today: getStats(db.data.orders, todayStart),
      thisWeek: getStats(db.data.orders, thisWeekStart),
      thisMonth: getStats(db.data.orders, thisMonthStart),
      thisYear: getStats(db.data.orders, thisYearStart),
    });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/user/password", authenticateToken, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = db.data.users.find((u) => u.username === req.user.username);
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return res.status(401).json({ message: "目前的密碼不正確" });
    }
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await db.write();
    res.json({ message: "密碼更新成功！" });
  } catch (error) {
    next(error);
  }
});

// --- 管理員路由 (Admin Only Routes) ---

// 獲取所有商品 (給後台，包含草稿)
app.get(
  "/api/admin/products",
  authenticateToken,
  authorizeAdmin,
  (req, res) => {
    const sortedProducts = [...db.data.products].sort(
      (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)
    );
    res.json(sortedProducts);
  }
);

// 新增商品
app.post(
  "/api/products",
  authenticateToken,
  authorizeAdmin,
  async (req, res, next) => {
    try {
      const {
        title,
        price,
        category,
        imageUrl,
        serviceFee,
        longDescription,
        stock,
        status,
        tags,
      } = req.body;
      if (!title || price === undefined)
        return res.status(400).json({ message: "商品標題和價格為必填項" });

      const maxOrder = db.data.products.reduce(
        (max, p) => Math.max(max, p.sortOrder || 0),
        -1
      );
      const newProduct = {
        id: `p${Date.now()}`,
        title,
        price: Number(price) || 0,
        category: category || "未分類",
        imageUrl: imageUrl || "",
        serviceFee: Number(serviceFee) || 0,
        longDescription: longDescription || "",
        stock: Number(stock) || 0,
        status: status || "published",
        tags: Array.isArray(tags) ? tags : [],
        sortOrder: maxOrder + 1,
      };
      db.data.products.push(newProduct);
      await db.write();
      res.status(201).json(newProduct);
    } catch (error) {
      next(error);
    }
  }
);

// 更新商品
app.put(
  "/api/products/:id",
  authenticateToken,
  authorizeAdmin,
  async (req, res, next) => {
    try {
      const productIndex = db.data.products.findIndex(
        (p) => p.id === req.params.id
      );
      if (productIndex === -1)
        return res.status(404).json({ message: "找不到該商品" });

      const productToUpdate = db.data.products[productIndex];
      const {
        title,
        price,
        category,
        imageUrl,
        serviceFee,
        longDescription,
        stock,
        status,
        tags,
        sortOrder,
      } = req.body;

      // 使用白名單模式安全地更新欄位
      if (title !== undefined) productToUpdate.title = title;
      if (price !== undefined) productToUpdate.price = Number(price);
      if (category !== undefined) productToUpdate.category = category;
      if (imageUrl !== undefined) productToUpdate.imageUrl = imageUrl;
      if (serviceFee !== undefined)
        productToUpdate.serviceFee = Number(serviceFee);
      if (longDescription !== undefined)
        productToUpdate.longDescription = longDescription;
      if (stock !== undefined) productToUpdate.stock = Number(stock);
      if (status !== undefined) productToUpdate.status = status;
      if (tags !== undefined)
        productToUpdate.tags = Array.isArray(tags) ? tags : [];
      if (sortOrder !== undefined)
        productToUpdate.sortOrder = Number(sortOrder);

      await db.write();
      res.json({ message: "商品更新成功", product: productToUpdate });
    } catch (error) {
      next(error);
    }
  }
);

// 刪除商品
app.delete(
  "/api/products/:id",
  authenticateToken,
  authorizeAdmin,
  async (req, res, next) => {
    try {
      const i = db.data.products.findIndex((p) => p.id === req.params.id);
      if (i === -1) return res.status(404).json({ message: "找不到該商品" });
      db.data.products.splice(i, 1);
      await db.write();
      res.status(200).json({ message: "商品刪除成功" });
    } catch (error) {
      next(error);
    }
  }
);

// 更新商品排序
app.patch(
  "/api/products/order",
  authenticateToken,
  authorizeAdmin,
  async (req, res, next) => {
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
      next(error);
    }
  }
);

// (所有 Orders, Requests, Users, Categories 的管理路由)
// ... 這部分維持您原有的完整邏輯，但統一用 next(error) 處理錯誤 ...
// 範例：
app.get(
  "/api/orders",
  authenticateToken,
  authorizeAdmin,
  async (req, res, next) => {
    try {
      const ordersToReturn = [...db.data.orders].reverse();
      let updated = false;
      ordersToReturn.forEach((order) => {
        if (order.isNew) {
          order.isNew = false;
          updated = true;
        }
      });
      if (updated) await db.write();
      res.json(ordersToReturn);
    } catch (error) {
      next(error);
    }
  }
);

app.patch(
  "/api/orders/:orderId/status",
  authenticateToken,
  authorizeAdmin,
  async (req, res, next) => {
    try {
      const { orderId } = req.params;
      const { status: newStatus } = req.body;
      const orderToUpdate = db.data.orders.find((o) => o.orderId === orderId);
      if (!orderToUpdate)
        return res.status(404).json({ message: "找不到該訂單" });

      const oldStatus = orderToUpdate.status;
      if (oldStatus !== newStatus) {
        orderToUpdate.status = newStatus;
        const logEntry = {
          timestamp: new Date().toISOString(),
          updatedBy: req.user.username,
          action: `狀態由「${oldStatus}」更新為「${newStatus}」`,
        };
        orderToUpdate.activityLog = orderToUpdate.activityLog || [];
        orderToUpdate.activityLog.push(logEntry);
        await db.write();
      }
      res.json({ message: "訂單狀態更新成功", order: orderToUpdate });
    } catch (error) {
      next(error);
    }
  }
);

// [其他所有管理路由... 請確保它們都在這裡，並使用 try/catch/next(error) 模式]
// ...
app.get(
  "/api/requests",
  authenticateToken,
  authorizeAdmin,
  async (req, res, next) => {
    /* ... */
  }
);
app.patch(
  "/api/requests/:requestId/status",
  authenticateToken,
  authorizeAdmin,
  async (req, res, next) => {
    /* ... */
  }
);
app.get("/api/users", authenticateToken, authorizeAdmin, (req, res) => {
  /* ... */
});
app.post(
  "/api/users",
  authenticateToken,
  authorizeAdmin,
  async (req, res, next) => {
    /* ... */
  }
);
app.delete(
  "/api/users/:username",
  authenticateToken,
  authorizeAdmin,
  async (req, res, next) => {
    /* ... */
  }
);
app.delete(
  "/api/orders/:orderId",
  authenticateToken,
  authorizeAdmin,
  async (req, res, next) => {
    /* ... */
  }
);
app.post(
  "/api/orders/bulk-delete",
  authenticateToken,
  authorizeAdmin,
  async (req, res, next) => {
    /* ... */
  }
);
app.post(
  "/api/categories",
  authenticateToken,
  authorizeAdmin,
  async (req, res, next) => {
    /* ... */
  }
);
app.delete(
  "/api/categories/:id",
  authenticateToken,
  authorizeAdmin,
  async (req, res, next) => {
    /* ... */
  }
);
// --- 路由結束 ---

// ================================================================
// --- 伺服器啟動 ---
// ================================================================

// 將集中的錯誤處理中介軟體放在所有路由之後
app.use((err, req, res, next) => {
  console.error(`[錯誤] 於 ${req.method} ${req.originalUrl}:`, err);
  res.status(500).json({ message: "伺服器內部發生未知錯誤" });
});

(async () => {
  await initializeAdminUser();
  app.listen(port, () => {
    console.log(`伺服器成功啟動！正在監聽 http://localhost:${port}`);
  });
})();
