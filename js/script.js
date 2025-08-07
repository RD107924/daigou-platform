document.addEventListener("DOMContentLoaded", () => {
  // --- 獲取所有需要的 DOM 元素 ---
  const bankAccountEl = document.getElementById("bank-account");
  const copyBtn = document.getElementById("copy-btn");
  const confirmationInput = document.getElementById("confirmation-input");
  const submitBtn = document.getElementById("submit-btn");
  const paopaohuIdInput = document.getElementById("paopaohu-id");
  const lastFiveInput = document.getElementById("last-five");
  const cartItemsBody = document.getElementById("cart-items-body");
  const cartTotalEl = document.getElementById("cart-total");

  const API_BASE_URL = "https://daigou-platform-api.onrender.com"; // 後端網址

  // --- 新功能：渲染購物車 ---
  function renderCart() {
    const cart = getCart(); // 從 cart.js 獲取購物車資料
    cartItemsBody.innerHTML = ""; // 清空現有列表
    let totalAmount = 0;

    if (cart.length === 0) {
      cartItemsBody.innerHTML =
        '<tr><td colspan="4" style="text-align: center;">您的購物車是空的</td></tr>';
      cartTotalEl.innerText = "訂單總額: $0 TWD";
      return;
    }

    cart.forEach((item) => {
      const row = `
                <tr>
                    <td>${item.title}</td>
                    <td>$${item.price}</td>
                    <td>${item.quantity}</td>
                    <td>$${item.price * item.quantity}</td>
                </tr>
            `;
      cartItemsBody.insertAdjacentHTML("beforeend", row);
      totalAmount += item.price * item.quantity;
    });

    cartTotalEl.innerText = `訂單總額: $${totalAmount} TWD`;
  }

  // --- 功能1: 一鍵複製銀行帳號 ---
  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(bankAccountEl.innerText).then(
      () => {
        copyBtn.innerText = "已複製!";
        setTimeout(() => {
          copyBtn.innerText = "一鍵複製";
        }, 2000);
      },
      (err) => {
        alert("複製失敗: " + err);
      }
    );
  });

  // --- 功能2: 驗證「我了解」以啟用按鈕 ---
  confirmationInput.addEventListener("input", () => {
    if (confirmationInput.value.trim() === "我了解") {
      submitBtn.disabled = false;
      submitBtn.classList.remove("disabled");
      submitBtn.classList.add("enabled");
    } else {
      submitBtn.disabled = true;
      submitBtn.classList.remove("enabled");
      submitBtn.classList.add("disabled");
    }
  });

  // --- 功能3: 真正的下單按鈕點擊事件 ---
  submitBtn.addEventListener("click", async (event) => {
    event.preventDefault(); // 防止表單預設提交行為

    // 1. 驗證必填欄位
    const paopaohuId = paopaohuIdInput.value.trim();
    const lastFiveDigits = lastFiveInput.value.trim();
    const cart = getCart();

    if (!paopaohuId || !lastFiveDigits) {
      alert("請務必填寫跑跑虎會員編號與匯款末五碼！");
      return;
    }

    if (cart.length === 0) {
      alert("您的購物車是空的，無法建立訂單！");
      return;
    }

    // 2. 從購物車資料計算總金額
    const totalAmount = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // 3. 組合要發送到後端的訂單資料
    const orderData = {
      paopaohuId: paopaohuId,
      lastFiveDigits: lastFiveDigits,
      totalAmount: totalAmount,
      items: cart, // 使用從 localStorage 來的真實購物車商品
    };

    // 4. 使用 fetch 發送 POST 請求到後端
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (!response.ok) {
        // 如果後端回傳錯誤 (例如 400, 500)
        throw new Error(result.message || "建立訂單失敗");
      }

      // 訂單建立成功！
      alert(`訂單建立成功！\n您的訂單編號是: ${result.order.orderId}`);

      localStorage.removeItem("shoppingCart"); // 清空 localStorage 的購物車
      renderCart(); // 重新渲染空的購物車畫面
      paopaohuIdInput.value = ""; // 清空表單欄位
      lastFiveInput.value = "";
    } catch (error) {
      console.error("訂單提交錯誤:", error);
      alert(`訂單提交時發生錯誤: ${error.message}`);
    }
  });

  // --- 頁面載入時，立即渲染一次購物車 ---
  renderCart();
});
