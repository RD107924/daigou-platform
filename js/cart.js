// --- 購物車公用函式 ---

// 從 localStorage 獲取購物車資料
function getCart() {
  const cartJson = localStorage.getItem("shoppingCart");
  // 如果購物車是空的 (null)，就回傳一個空陣列
  return cartJson ? JSON.parse(cartJson) : [];
}

// 將購物車資料儲存到 localStorage
function saveCart(cart) {
  const cartJson = JSON.stringify(cart);
  localStorage.setItem("shoppingCart", cartJson);
}

// 加入商品到購物車
function addToCart(productId, productTitle, productPrice) {
  const cart = getCart();

  // 檢查購物車內是否已有此商品
  const existingItem = cart.find((item) => item.id === productId);

  if (existingItem) {
    // 如果有，數量 +1
    existingItem.quantity += 1;
  } else {
    // 如果沒有，新增一筆商品
    cart.push({
      id: productId,
      title: productTitle,
      price: productPrice,
      quantity: 1,
    });
  }

  // 存回 localStorage
  saveCart(cart);
}
