/* ================= DATA ================= */

let cart =
  JSON.parse(
    localStorage.getItem("cart")
  ) || [];

let products =
  JSON.parse(
    localStorage.getItem("sellerProducts")
  ) || [];

let currentUser =
  JSON.parse(
    localStorage.getItem("currentUser")
  );


/* ================= USER ================= */

if (currentUser) {
  
  document.getElementById("fullName").value =
    currentUser.name || "";
  
  document.getElementById("email").value =
    currentUser.email || "";
  
}


/* ================= EMPTY CART ================= */

if (cart.length === 0) {
  
  document.getElementById("checkoutArea").innerHTML = `

<div class="empty">

    <div class="empty-icon">🛒</div>

    <h2>Your Cart Is Empty</h2>

    <p>
    Add products to your cart before checkout.
    </p>

    <a href="shop.html" class="shop-btn">
    Go To Shop
    </a>

</div>

`;
  
}


let appliedVoucher = null;
const vouchers = JSON.parse(localStorage.getItem("vouchers")) || [];

function applyVoucher(){
  const code=(document.getElementById("voucherCode").value||"").trim().toUpperCase();
  const found=vouchers.find(v=>String(v.code).toUpperCase()===code);
  const msg=document.getElementById("voucherMessage");
  if(!found){appliedVoucher=null;msg.textContent="Invalid voucher code.";msg.style.color="#d33";renderSummary();return}
  if(found.expirationDate){
    const today=new Date();
    today.setHours(0,0,0,0);
    if(new Date(`${found.expirationDate}T00:00:00`)<today){
      appliedVoucher=null;msg.textContent="This voucher has expired.";msg.style.color="#d33";renderSummary();return;
    }
  }
  appliedVoucher=found;msg.textContent=`Voucher applied: ${found.discount}`;msg.style.color="#14833b";renderSummary();
}
function voucherDiscount(subtotal){
  if(!appliedVoucher)return 0;
  const d=String(appliedVoucher.discount||"");
  const percent=d.match(/(\d+(?:\.\d+)?)\s*%/);
  const fixed=d.match(/₱\s*(\d+(?:,\d+)?(?:\.\d+)?)/);
  if(percent)return subtotal*(Number(percent[1])/100);
  if(fixed)return Math.min(subtotal,Number(fixed[1].replace(/,/g,"")));
  return 0;
}

/* ================= TOTALS ================= */

function calculateTotals() {
  
  let subtotal = 0;
  let totalItems = 0;
  
  cart.forEach(function(item) {
    
    const product =
      products.find(function(p) {
        
        return String(p.id) ===
          String(item.id);
        
      });
    
    const price =
      product ?
      Number(product.price) :
      Number(item.price) || 0;
    
    const quantity =
      Number(item.quantity) || 1;
    
    subtotal += price * quantity;
    
    totalItems += quantity;
    
  });
  
  const shipping =
    subtotal >= 1000 ?
    0 :
    60;
  
  const discount=voucherDiscount(subtotal);
  return {
    subtotal,
    shipping,
    discount,
    total: Math.max(0, subtotal + shipping - discount),
    totalItems
  };
  
}


/* ================= ITEMS ================= */

function renderItems() {
  
  const box =
    document.getElementById("orderItems");
  
  box.innerHTML = "";
  
  cart.forEach(function(item) {
    
    const product =
      products.find(function(p) {
        
        return String(p.id) ===
          String(item.id);
        
      });
    
    const name =
      product?.name ||
      item.name ||
      "Product";
    
    const price =
      product ?
      Number(product.price) :
      Number(item.price) || 0;
    
    const quantity =
      Number(item.quantity) || 1;
    
    const image =
      product?.image ||
      item.image ||
      "";
    
    const imageHTML =
      image ?
      `<img src="${image}" alt="">` :
      `📦`;
    
    box.innerHTML += `

    <div class="order-item">

        <div class="item-image">
            ${imageHTML}
        </div>

        <div class="item-info">

            <div class="item-name">
                ${name}
            </div>

            <div class="item-qty">
                Quantity: ${quantity}
            </div>

        </div>

        <div class="item-price">
            ₱${(price * quantity).toLocaleString()}
        </div>

    </div>

    `;
    
  });
  
}


/* ================= SUMMARY ================= */

function renderSummary() {
  
  const data =
    calculateTotals();
  
  document.getElementById("summary").innerHTML = `

<div class="summary-row">

    <span>Items</span>

    <span>${data.totalItems}</span>

</div>


<div class="summary-row">

    <span>Subtotal</span>

    <span>
    ₱${data.subtotal.toLocaleString()}
    </span>

</div>


<div class="summary-row">
    <span>Voucher Discount</span>
    <span>${data.discount > 0 ? "-₱" + data.discount.toLocaleString() : "₱0"}</span>
</div>

<div class="summary-row">

    <span>Delivery</span>

    <span>

    ${
        data.shipping === 0
        ? "FREE"
        : "₱" + data.shipping
    }

    </span>

</div>


<div class="summary-row total">

    <span>Total</span>

    <strong>
    ₱${data.total.toLocaleString()}
    </strong>

</div>

`;

}

function submitOrder() {
  const name = document.getElementById("fullName").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const email = document.getElementById("email").value.trim();
  const city = document.getElementById("city").value;
  const address = document.getElementById("address").value.trim();
  const payment = document.querySelector('input[name="payment"]:checked').value;

  const normalizedPhone = phone.replace(/[\s-]/g, "");
  if (!/^(09\d{9}|\+639\d{9})$/.test(normalizedPhone)) {
    alert("Please enter a valid Philippine mobile number: 09XXXXXXXXX or +639XXXXXXXXX.");
    return;
  }

  if (!name || !normalizedPhone || !city || !address) {
    alert("Please complete all required information.");
    return;
  }

  for (const item of cart) {
    const product = products.find(function(p) {
      return String(p.id) === String(item.id);
    });

    if (product) {
      const stock = Number(product.stock) || 0;
      const quantity = Number(item.quantity) || 1;

      if (stock < quantity) {
        alert(product.name + " does not have enough stock.");
        return;
      }
    }
  }

  const totals = calculateTotals();
  const orderId = "ORD-" + Date.now();

  const orderItems = cart.map(function(item) {
    const product = products.find(function(p) {
      return String(p.id) === String(item.id);
    });

    return {
      id: item.id,
      name: product?.name || item.name,
      price: product ? Number(product.price) : Number(item.price) || 0,
      quantity: Number(item.quantity) || 1,
      image: product?.image || item.image || ""
    };
  });

  const newOrder = {
    id: orderId,
    customerName: name,
    phone: normalizedPhone,
    email: email,
    customerEmail: currentUser?.email || email,
    city: city,
    address: address,
    paymentMethod: payment,
    items: orderItems,
    subtotal: totals.subtotal,
    shipping: totals.shipping,
    discount: totals.discount,
    total: totals.total,
    status: "pending",
    createdAt: new Date().toISOString()
  };

  const submitBtn = document.querySelector('#checkoutForm [type="submit"]');
  if (submitBtn) submitBtn.disabled = true;

  SmartCloDB.placeOrder(newOrder, appliedVoucher ? appliedVoucher.code : "")
    .then(function(result) {
      if (submitBtn) submitBtn.disabled = false;

      if (!result.ok) {
        alert(result.message || "Could not place your order. Please try again.");
        return;
      }

      localStorage.removeItem("cart");
      document.getElementById("orderNumber").innerText = "Order ID: " + result.order.id;
      document.getElementById("successModal").style.display = "flex";
    })
    .catch(function() {
      if (submitBtn) submitBtn.disabled = false;
      alert("Cannot reach the server. Your order was not placed. Is the SmartClo server running (run.bat)?");
    });
}


/* ================= PLACE ORDER ================= */

const checkoutForm = document.getElementById("checkoutForm");
if (checkoutForm) checkoutForm.addEventListener("submit", function(e) {
    
    e.preventDefault();
    
    if (cart.length === 0) {
      
      alert("Your cart is empty.");
      
      return;
      
    }
    
    
    submitOrder();
  });



/* ================= START ================= */

if (cart.length > 0) {
  
  renderItems();
  
  renderSummary();
  
}
