document.addEventListener("DOMContentLoaded", () => {
  const productGrid = document.querySelector(".product-grid");
  const API_BASE_URL = "http://localhost:3000";

  async function fetchAndRenderProducts() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/products`);
      if (!response.ok) throw new Error("無法獲取商品列表");
      const products = await response.json();
      productGrid.innerHTML = "";
      products.forEach((product) => {
        const cardHTML = `
                    <div class="product-card">
                        <img src="${product.imageUrl}" alt="${product.title}">
                        <div class="product-info">
                            <span class="product-category">${product.category}</span>
                            <h3 class="product-title">${product.title}</h3>
                            <p class="product-price">$${product.price} TWD</p>
                        </div>
                        <div class="product-actions">
                            <button class="btn btn-secondary">查看詳情</button>
                            <button class="btn btn-primary btn-add-to-cart" 
                                data-id="${product.id}" 
                                data-title="${product.title}" 
                                data-price="${product.price}">
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

  // 新增功能：監聽整個商品網格的點擊事件
  productGrid.addEventListener("click", (event) => {
    // 檢查被點擊的是否為「加入購物車」按鈕
    if (event.target.classList.contains("btn-add-to-cart")) {
      const button = event.target;
      const productId = button.dataset.id;
      const productTitle = button.dataset.title;
      const productPrice = parseInt(button.dataset.price, 10);

      // 呼叫我們在 cart.js 中定義的函式
      addToCart(productId, productTitle, productPrice);

      alert(`「${productTitle}」已加入購物車！`);
    }
  });

  fetchAndRenderProducts();
});
