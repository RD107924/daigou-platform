document.addEventListener("DOMContentLoaded", () => {
  const productGrid = document.querySelector(".product-grid");
  const categoryFiltersContainer = document.getElementById("category-filters");
  const API_BASE_URL = "https://daigou-platform-api.onrender.com"; // 請確認是您的後端網址

  let allProducts = []; // 用來儲存所有從後端獲取的商品

  // 函式：渲染商品卡片到頁面上
  function renderProducts(productsToRender) {
    productGrid.innerHTML = ""; // 清空現有商品
    if (productsToRender.length === 0) {
      productGrid.innerHTML = "<p>這個分類下沒有商品。</p>";
      return;
    }
    productsToRender.forEach((product) => {
      const serviceFee = product.serviceFee || 0;
      const cardHTML = `
            <div class="product-card">
                <img src="${product.imageUrl}" alt="${product.title}">
                <div class="product-info">
                    <div>
                        <span class="product-category">${product.category}</span>
                        <h3 class="product-title">${product.title}</h3>
                    </div>
                    <div>
                        <p class="product-price">$${product.price} TWD</p>
                        <p class="service-fee">代購服務費: $${serviceFee}</p>
                    </div>
                </div>
                <div class="product-actions">
                    <button class="btn-primary btn-add-to-cart" 
                        data-id="${product.id}" 
                        data-title="${product.title}" 
                        data-price="${product.price}"
                        data-servicefee="${serviceFee}">
                        加入購物車
                    </button>
                </div>
            </div>
            `;
      productGrid.insertAdjacentHTML("beforeend", cardHTML);
    });
  }

  // 函式：根據商品資料，產生分類標籤
  function renderCategories(products) {
    const categories = [...new Set(products.map((p) => p.category))];

    categoryFiltersContainer.innerHTML = "";

    const allButton = `<button class="filter-btn active" data-category="all">全部</button>`;
    categoryFiltersContainer.insertAdjacentHTML("beforeend", allButton);

    categories.forEach((category) => {
      const categoryButton = `<button class="filter-btn" data-category="${category}">${category}</button>`;
      categoryFiltersContainer.insertAdjacentHTML("beforeend", categoryButton);
    });
  }

  // 主函式：從 API 獲取資料並初始化頁面
  async function initializePage() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/products`);
      if (!response.ok) throw new Error("無法獲取商品列表");
      allProducts = await response.json();

      renderProducts(allProducts);
      renderCategories(allProducts);
    } catch (error) {
      console.error("無法獲取商品資料:", error);
      productGrid.innerHTML = "<p>無法載入商品，請稍後再試。</p>";
    }
  }

  // 事件監聽：處理分類標籤的點擊
  categoryFiltersContainer.addEventListener("click", (event) => {
    if (event.target.tagName === "BUTTON") {
      document
        .querySelectorAll(".filter-btn")
        .forEach((btn) => btn.classList.remove("active"));
      event.target.classList.add("active");

      const selectedCategory = event.target.dataset.category;

      if (selectedCategory === "all") {
        renderProducts(allProducts);
      } else {
        const filteredProducts = allProducts.filter(
          (p) => p.category === selectedCategory
        );
        renderProducts(filteredProducts);
      }
    }
  });

  // 事件監聽：處理加入購物車的點擊
  productGrid.addEventListener("click", (event) => {
    if (event.target.classList.contains("btn-add-to-cart")) {
      const button = event.target;
      const productId = button.dataset.id;
      const productTitle = button.dataset.title;
      const productPrice = parseInt(button.dataset.price, 10);
      const serviceFee = parseInt(button.dataset.servicefee, 10);
      addToCart(productId, productTitle, productPrice, serviceFee);
      alert(`「${productTitle}」已加入購物車！`);
    }
  });

  // 啟動頁面
  initializePage();
});
