const DEFAULT_PRODUCTS = [
  {
    id:"PH001",
    name:"Oversized Basic T-Shirt",
    price:499,
    oldPrice:599,
    image:"https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85",
    badge:"NEW",
    stock:25,
    category:"tops",
    description:"Comfortable oversized shirt for everyday casual wear."
  },
  {
    id:"PH002",
    name:"Straight Cut Cargo Pants",
    price:899,
    oldPrice:1099,
    image:"https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=900&q=85",
    badge:"POPULAR",
    stock:15,
    category:"bottoms",
    description:"Casual cargo pants with a relaxed fit for everyday outfits."
  },
  {
    id:"PH003",
    name:"Lightweight Zip Hoodie",
    price:999,
    oldPrice:1299,
    image:"https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=85",
    badge:"TRENDING",
    stock:12,
    category:"outerwear",
    description:"A lightweight hoodie that is easy to pair with your daily outfit."
  },
  {
    id:"PH004",
    name:"Canvas Everyday Tote Bag",
    price:399,
    oldPrice:499,
    image:"https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=900&q=85",
    badge:"NEW",
    stock:20,
    category:"accessories",
    description:"Simple and durable canvas tote bag for everyday use."
  }
];

function getProducts(){
  const stored = localStorage.getItem("sellerProducts");
  if (stored === null) {
    localStorage.setItem("sellerProducts", JSON.stringify(DEFAULT_PRODUCTS));
    return DEFAULT_PRODUCTS.slice();
  }

  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) throw new Error("Invalid products");
    return parsed;
  } catch (e) {
    localStorage.setItem("sellerProducts", JSON.stringify(DEFAULT_PRODUCTS));
    return DEFAULT_PRODUCTS.slice();
  }
}

let cart = JSON.parse(localStorage.getItem("cart")) || [];
let products = getProducts();

function getReviews(id){
  const all = JSON.parse(localStorage.getItem("productReviews")) || {};
  return Array.isArray(all[id]) ? all[id] : [];
}

function renderProducts(){
  const grid = document.getElementById("productsGrid");
  if (!grid) return;

  const searchEl = document.getElementById("search");
  const search = searchEl ? searchEl.value.toLowerCase().trim() : "";
  const filtered = products.filter(p =>
    String(p.name || "").toLowerCase().includes(search)
  );

  if (!filtered.length) {
    grid.innerHTML = '<div class="empty"><h2>No Products Found</h2><p>Try another search.</p></div>';
    return;
  }

  grid.innerHTML = filtered.map(p => {
    const reviews = getReviews(p.id);
    const rating = reviews.length
      ? (reviews.reduce((a,r)=>a+Number(r.rating||0),0)/reviews.length).toFixed(1)
      : null;

    const stock = Number(p.stock) || 0;
    const disabled = stock <= 0 ? "disabled" : "";

    return `<article class="product-card">
      <a href="product.html?id=${encodeURIComponent(p.id)}" class="product-image-link">
        <div class="product-image">
          <span class="badge">${p.badge || "NEW"}</span>
          ${p.image ? `<img src="${p.image}" alt="${p.name}" loading="lazy">` : '<div class="no-image">📦</div>'}
        </div>
      </a>
      <div class="product-info">
        <div class="product-name">${p.name}</div>
        <div class="rating">${rating ? `★★★★★ <span>${rating} (${reviews.length} review${reviews.length>1?'s':''})</span>` : `<span>No reviews yet</span>`}</div>
        <div class="price-row">
          <div>
            <span class="price">₱${Number(p.price||0).toLocaleString("en-PH")}</span>
            ${p.oldPrice ? `<span class="old-price">₱${Number(p.oldPrice).toLocaleString("en-PH")}</span>` : ""}
          </div>
        </div>
        <div class="stock-text">${stock > 0 ? `${stock} available` : "Out of stock"}</div>
        <a class="add-cart" href="product.html?id=${encodeURIComponent(p.id)}">View Product</a>
        <button class="add-cart" data-requires-login ${window.isClientLoggedIn() ? "" : "hidden"} ${disabled} onclick="addToCart('${String(p.id).replace(/'/g,"\\'")}')">
          ${stock > 0 ? "🛒 Add to Cart" : "Out of Stock"}
        </button>
      </div>
    </article>`;
  }).join("");
}

function addToCart(id){
  if (!window.isClientLoggedIn()) {
    window.location.href = "login.html";
    return;
  }

  const p = products.find(x => String(x.id) === String(id));
  if (!p) return;

  const stock = Number(p.stock) || 0;
  if (stock <= 0) {
    showToast("This product is out of stock.");
    return;
  }

  const existing = cart.find(x => String(x.id) === String(p.id));
  const currentQty = existing ? Number(existing.quantity || 0) : 0;

  if (currentQty >= stock) {
    showToast("You reached the available stock.");
    return;
  }

  if (existing) {
    existing.quantity = currentQty + 1;
    existing.price = Number(p.price || 0);
    existing.name = p.name;
    existing.image = p.image || "";
    existing.stock = stock;
  } else {
    cart.push({
      id:p.id,
      name:p.name,
      price:Number(p.price||0),
      image:p.image || "",
      stock:stock,
      quantity:1
    });
  }

  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();
  showToast(p.name + " added to cart");
}

function updateCartCount(){
  const el = document.getElementById("cartCount");
  if (el) el.textContent = cart.reduce((s,x)=>s+Number(x.quantity||0),0);
}

function showToast(t){
  const x = document.getElementById("toast");
  if (!x) return;
  x.textContent = t;
  x.classList.add("show");
  setTimeout(()=>x.classList.remove("show"),1800);
}

const searchInput = document.getElementById("search");
if (searchInput) searchInput.addEventListener("input", renderProducts);

updateCartCount();
renderProducts();

window.addEventListener("storage", () => {
  products = getProducts();
  cart = JSON.parse(localStorage.getItem("cart")) || [];
  updateCartCount();
  renderProducts();
});
