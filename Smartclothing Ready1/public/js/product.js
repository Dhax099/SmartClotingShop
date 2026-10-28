const productId = new URLSearchParams(window.location.search).get("id");
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

let products = getProducts();
const product = products.find(item => String(item.id) === String(productId));
let currentUser = JSON.parse(localStorage.getItem("currentUser"));
let allReviews = JSON.parse(localStorage.getItem("productReviews")) || {};

function reviews(){ return Array.isArray(allReviews[productId]) ? allReviews[productId] : []; }
function saveReviews(){ localStorage.setItem("productReviews", JSON.stringify(allReviews)); }

function renderReviews(){
  const list=document.getElementById("reviewsList"); if(!list)return;
  const data=reviews();
  if(!data.length){list.innerHTML='<div class="no-reviews">No reviews yet. Be the first customer to review this product.</div>';return;}
  list.innerHTML=data.map(r=>`<div class="review"><strong>${r.name}</strong><span class="review-stars">${"★".repeat(Number(r.rating))}${"☆".repeat(5-Number(r.rating))}</span><p>${r.comment}</p><small>${r.date}</small></div>`).join("");
}

function showProduct(){
  const container=document.getElementById("productContainer");
  if(!product){container.innerHTML='<div class="not-found"><h2>Product Not Found</h2><a href="shop.html" class="back-btn">Back to Shop</a></div>';return;}
  const data=reviews();
  const average=data.length ? (data.reduce((a,r)=>a+Number(r.rating),0)/data.length).toFixed(1) : null;
  container.innerHTML=`<div class="product-details">
    <div class="product-image"><img src="${product.image||""}" alt="${product.name}"></div>
    <div class="details"><h1>${product.name}</h1><p class="price">₱${Number(product.price||0).toLocaleString("en-PH")}</p>
      <p class="description">${product.description||"Quality clothing from Smart Clothing."}</p>
      <p class="review-summary">${average ? `★★★★★ ${average} (${data.length} review${data.length>1?'s':''})` : "No reviews yet"}</p>
      <div class="quantity">Quantity: <input type="number" id="quantity" value="1" min="1"></div>
      <button data-requires-login ${window.isClientLoggedIn() ? "" : "hidden"} onclick="addToCart()">Add to Cart 🛒</button><div id="message" class="message"></div>
    </div></div>
    <section class="reviews-section"><h2>Customer Reviews</h2><div id="reviewsList"></div>
      <div class="review-form"><h3>Write a Review</h3><p>${currentUser ? "Share your experience with this product." : "Please log in as a customer to leave a review."}</p>
      ${currentUser ? `<form id="reviewForm"><label>Rating</label><select id="reviewRating" required><option value="5">★★★★★</option><option value="4">★★★★☆</option><option value="3">★★★☆☆</option><option value="2">★★☆☆☆</option><option value="1">★☆☆☆☆</option></select><label>Review</label><textarea id="reviewComment" maxlength="500" placeholder="Write your review..." required></textarea><button type="submit">Submit Review</button></form>` : `<a href="login.html" class="back-btn">Login to Review</a>`}</div></section>`;
  renderReviews();
  const form=document.getElementById("reviewForm");
  if(form)form.addEventListener("submit",e=>{e.preventDefault();
    const rating=Number(document.getElementById("reviewRating").value),comment=document.getElementById("reviewComment").value.trim();
    if(!comment)return;SmartCloDB.addReview(productId,rating,comment).then(d=>{if(!d.ok){alert(d.message||"Could not save your review.");return;}allReviews[productId]=reviews().concat(d.review);showProduct();}).catch(()=>alert("Cannot reach the server. Your review was not saved."));});
}
function addToCart(){if(!window.isClientLoggedIn()){window.location.href="login.html";return;}
let quantity=Math.max(1,parseInt(document.getElementById("quantity").value)||1);
let cart=JSON.parse(localStorage.getItem("cart"))||[];
let existing=cart.find(item=>String(item.id)===String(product.id));if(existing)existing.quantity+=quantity;else cart.push({id:product.id,name:product.name,price:Number(product.price||0),image:product.image,quantity});localStorage.setItem("cart",JSON.stringify(cart));document.getElementById("message").innerText="✓ Product added to cart!";}
showProduct();