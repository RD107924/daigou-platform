document.addEventListener("DOMContentLoaded", () => {
  const copyBtn = document.getElementById("copy-btn");
  const confirmationInput = document.getElementById("confirmation-input");
  const submitBtn = document.getElementById("submit-btn");
  const paopaohuIdInput = document.getElementById("paopaohu-id");
  const lastFiveInput = document.getElementById("last-five");
  const cartItemsBody = document.getElementById("cart-items-body");
  const cartSummaryEl = document.getElementById("cart-summary");

  const API_BASE_URL = "https://daigou-platform-api.onrender.com";

  function renderCart() {
    const cart = getCart();
    cartItemsBody.innerHTML = "";
    let subtotal = 0;
    let totalServiceFee = 0;

    if (cart.length === 0) {
      cartItemsBody.innerHTML =
        '<tr><td colspan="6" style="text-align: center;">您的購物車是空的</td></tr>';
    } else {
      cart.forEach((item) => {
        const serviceFee = item.serviceFee || 0;

        // --- 這裡是唯一的修改點 ---
        // 為了顯示在「小計」欄位，我們計算單項商品含服務費的總價
        const itemTotalForDisplay = (item.price + serviceFee) * item.quantity;

        // 為了計算最下方的總金額，我們仍然分開計算商品總額和服務費總額
        subtotal += item.price * item.quantity;
        totalServiceFee += serviceFee * item.quantity;

        const row = `
              <tr>
                  <td>
                      <div class="cart-item-title">${item.title}</div>
                      <input type="text" class="item-notes" data-id="${
                        item.id
                      }" placeholder="新增顏色、規格等備註..." value="${
          item.notes || ""
        }">
                  </td>
                  <td>$${item.price}</td>
                  <td>$${serviceFee}</td>
                  <td>
                      <div class="quantity-input">
                          <button class="quantity-btn" data-id="${
                            item.id
                          }" data-change="-1">-</button>
                          <input type="text" value="${item.quantity}" readonly>
                          <button class="quantity-btn" data-id="${
                            item.id
                          }" data-change="1">+</button>
                      </div>
                  </td>
                  <td>$${itemTotalForDisplay}</td>
                  <td>
                      <button class="cart-item-remove" data-id="${
                        item.id
                      }">&times;</button>
                  </td>
              </tr>
          `;
        cartItemsBody.insertAdjacentHTML("beforeend", row);
      });
    }

    const finalTotal = subtotal + totalServiceFee;
    cartSummaryEl.innerHTML = `
        <div style="font-size: 1em; color: #6c757d;">商品總額: $${subtotal} TWD</div>
        <div style="font-size: 1em; color: #6c757d;">服務費總額: $${totalServiceFee} TWD</div>
        <div style="font-size: 1.2em; font-weight: bold; margin-top: 10px;">訂單總金額: $${finalTotal} TWD</div>
    `;
  }

  cartItemsBody.addEventListener("click", (event) => {
    const target = event.target;
    if (target.classList.contains("quantity-btn")) {
      const productId = target.dataset.id;
      const change = parseInt(target.dataset.change, 10);
      const cart = getCart();
      const item = cart.find((i) => i.id === productId);
      if (item) {
        updateCartQuantity(productId, item.quantity + change);
        renderCart();
      }
    }
    if (target.classList.contains("cart-item-remove")) {
      if (confirm("您確定要從購物車移除此商品嗎？")) {
        const productId = target.dataset.id;
        removeFromCart(productId);
        renderCart();
      }
    }
  });

  cartItemsBody.addEventListener("change", (event) => {
    if (event.target.classList.contains("item-notes")) {
      const productId = target.dataset.id;
      const notes = event.target.value;
      updateCartNotes(productId, notes);
    }
  });

  copyBtn.addEventListener("click", () => {
    navigator.clipboard
      .writeText(document.getElementById("bank-account").innerText)
      .then(() => {
        copyBtn.innerText = "已複製!";
        setTimeout(() => {
          copyBtn.innerText = "一鍵複製";
        }, 2000);
      });
  });

  confirmationInput.addEventListener("input", () => {
    if (confirmationInput.value.trim() === "我了解") {
      submitBtn.disabled = false;
      submitBtn.classList.remove("disabled");
    } else {
      submitBtn.disabled = true;
      submitBtn.classList.add("disabled");
    }
  });

  submitBtn.addEventListener("click", async (event) => {
    event.preventDefault();
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

    const totalAmount = cart.reduce(
      (sum, item) =>
        sum +
        item.price * item.quantity +
        (item.serviceFee || 0) * item.quantity,
      0
    );

    const orderData = { paopaohuId, lastFiveDigits, totalAmount, items: cart };

    try {
      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "建立訂單失敗");

      alert(`訂單建立成功！\n您的訂單編號是: ${result.order.orderId}`);
      localStorage.removeItem("shoppingCart");
      window.location.reload();
    } catch (error) {
      console.error("訂單提交錯誤:", error);
      alert(`訂單提交時發生錯誤: ${error.message}`);
    }
  });

  renderCart();
});
