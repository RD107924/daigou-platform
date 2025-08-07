document.addEventListener("DOMContentLoaded", () => {
  const productGrid = document.querySelector(".product-grid");
  const API_BASE_URL = "https://daigou-platform-api.onrender.com"; // 請確認是您的後端網址

  async function fetchAndRenderProducts() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/products`);
      if (!response.ok) throw new Error("無法獲取商品列表");
      const products = await response.json();
      productGrid.innerHTML = "";
      products.forEach((product) => {
        // 套用最新的卡片 HTML 結構
        const cardHTML = `
              <div class="product-card">
                  <img src="${product.imageUrl}" alt="${product.title}">
                  <div class="product-info">
                      <div>
                          <span class="product-category">${
                            product.category
                          }</span>
                          <h3 class="product-title">${product.title}</h3>
                      </div>
                      <div>
                          <p class="product-price">$${product.price} TWD</p>
                      </div>
                  </div>
                  <div class="product-actions">
                      <button class="btn-primary btn-add-to-cart" 
                          data-id="${product.id}" 
                          data-title="${product.title}" 
                          data-price="${product.price}"
                          data-servicefee="${product.serviceFee || 0}">
                          加入購物車
                      </button>
                  </div>
              </div>
              `;
        productGrid.insertAdjacentHTML("beforeend", cardHTML);
      });
    } catch (error) {
      console.error("無法獲取商品資料:", error);
      productGrid.innerHTML = "<p>無法載入商品，請稍後再試。</p>";
    }
  }

  // 這段邏輯與您提供的一致，是正確的
  productGrid.addEventListener("click", (event) => {
    if (event.target.classList.contains("btn-add-to-cart")) {
      const button = event.target;
      const productId = button.dataset.id;
      const productTitle = button.dataset.title;
      const productPrice = parseInt(button.dataset.price, 10);
      const serviceFee = parseInt(button.dataset.servicefee, 10);

      // 呼叫 cart.js 中的 addToCart 函式，並傳入 serviceFee
      addToCart(productId, productTitle, productPrice, serviceFee);

      alert(`「${productTitle}」已加入購物車！`);
    }
  });

  fetchAndRenderProducts();
});
