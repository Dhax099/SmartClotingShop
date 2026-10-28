(function(){if(!localStorage.getItem("currentAdmin")){location.href="login.html";return;}})();
/* ================= DATA ================= */

let orders =
  JSON.parse(
    localStorage.getItem("orders")
  ) || [];


/* ================= DATE ================= */

function formatDate(date) {
  
  if (!date)
    return "Unknown date";
  
  const d = new Date(date);
  
  return d.toLocaleDateString(
      "en-PH",
      {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }
    ) +
    " • " +
    d.toLocaleTimeString(
      "en-PH",
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    );
  
}


/* ================= STATS ================= */

function renderStats() {
  
  let pending = 0;
  let shipped = 0;
  let sales = 0;
  
  orders.forEach(function(order) {
    
    const status =
      String(
        order.status || "pending"
      ).toLowerCase();
    
    if (status === "pending") {
      pending++;
    }
    
    if (status === "shipped") {
      shipped++;
    }
    
    if (status !== "cancelled") {
      sales +=
        Number(order.total) || 0;
    }
    
  });
  
  
  document.getElementById(
    "totalOrders"
  ).innerText = orders.length;
  
  
  document.getElementById(
    "pendingOrders"
  ).innerText = pending;
  
  
  document.getElementById(
    "shippedOrders"
  ).innerText = shipped;
  
  
  document.getElementById(
      "totalSales"
    ).innerText =
    "₱" + sales.toLocaleString();
  
}


/* ================= STATUS ================= */

function updateStatus(
  orderId,
  status
) {
  
  const order =
    orders.find(function(o) {
      
      return String(o.id) ===
        String(orderId);
      
    });
  
  
  if (!order)
    return;
  
  
  order.status = status;
  
  
  localStorage.setItem(
    "orders",
    JSON.stringify(orders)
  );
  
  
  renderStats();
  
  renderOrders();
  
}


/* ================= VIEW DETAILS ================= */

function viewDetails(orderId) {
  
  const order =
    orders.find(function(o) {
      
      return String(o.id) ===
        String(orderId);
      
    });
  
  
  if (!order)
    return;
  
  
  let itemsHTML = "";
  
  
  const items =
    Array.isArray(order.items) ?
    order.items :
    [];
  
  
  items.forEach(function(item) {
    
    const quantity =
      Number(item.quantity) || 1;
    
    const price =
      Number(item.price) || 0;
    
    
    itemsHTML += `

    <p>

    <strong>
    ${item.name || "Product"}
    </strong>

    × ${quantity}

    — ₱${(
        price * quantity
    ).toLocaleString()}

    </p>

    `;
    
  });
  
  
  const address = [
      order.city,
      order.address
    ]
    .filter(Boolean)
    .join(", ");
  
  
  document.getElementById(
    "modalContent"
  ).innerHTML = `

<div class="detail-card">

    <h3>🆔 Order Information</h3>

    <p>
    Order ID:
    <strong>
    ${order.id}
    </strong>
    </p>

    <p>
    Date:
    ${formatDate(order.createdAt)}
    </p>

    <p>
    Status:
    <strong>
    ${order.status || "Pending"}
    </strong>
    </p>

</div>


<div class="detail-card">

    <h3>👤 Customer</h3>

    <p>
    Name:
    ${order.customerName || "Not provided"}
    </p>

    <p>
    Phone:
    ${order.phone || "Not provided"}
    </p>

    <p>
    Email:
    ${order.email || "Not provided"}
    </p>

</div>


<div class="detail-card">

    <h3>📍 Delivery Address</h3>

    <p>
    ${address || "Not provided"}
    </p>

</div>


<div class="detail-card">

    <h3>🛍️ Products</h3>

    ${itemsHTML}

</div>


<div class="detail-card">

    <h3>💳 Payment</h3>

    <p>
    Method:
    ${order.paymentMethod || "Cash on Delivery"}
    </p>

    <p>
    Subtotal:
    ₱${Number(
        order.subtotal || 0
    ).toLocaleString()}
    </p>

    <p>
    Delivery:
    ₱${Number(
        order.shipping || 0
    ).toLocaleString()}
    </p>

    <p>

    <strong>
    Grand Total:
    ₱${Number(
        order.total || 0
    ).toLocaleString()}
    </strong>

    </p>

</div>

`;
  
  
  document.getElementById(
    "detailsModal"
  ).style.display = "flex";
  
}


/* ================= CLOSE ================= */

function closeModal() {
  
  document.getElementById(
    "detailsModal"
  ).style.display = "none";
  
}


document.getElementById(
  "detailsModal"
).addEventListener(
  "click",
  function(e) {
    
    if (e.target === this) {
      closeModal();
    }
    
  }
);


/* ================= RENDER ================= */

function renderOrders() {
  
  const container =
    document.getElementById(
      "ordersContainer"
    );
  
  
  const search =
    document.getElementById(
      "search"
    )
    .value
    .toLowerCase()
    .trim();
  
  
  const filter =
    document.getElementById(
      "statusFilter"
    ).value;
  
  
  container.innerHTML = "";
  
  
  const filtered = [...orders]
    .reverse()
    .filter(function(order) {
      
      const status =
        String(
          order.status || "pending"
        ).toLowerCase();
      
      
      const customer =
        String(
          order.customerName || ""
        ).toLowerCase();
      
      
      const phone =
        String(
          order.phone || ""
        ).toLowerCase();
      
      
      const id =
        String(
          order.id || ""
        ).toLowerCase();
      
      
      const matchesSearch = !search ||
        id.includes(search) ||
        customer.includes(search) ||
        phone.includes(search);
      
      
      const matchesStatus =
        filter === "all" ||
        status === filter;
      
      
      return (
        matchesSearch &&
        matchesStatus
      );
      
    });
  
  
  if (filtered.length === 0) {
    
    container.innerHTML = `

    <div class="empty">

        <div class="empty-icon">
        🔎
        </div>

        <h2>
        No Orders Found
        </h2>

        <p>
        Try another search or status filter.
        </p>

    </div>

    `;
    
    return;
    
  }
  
  
  filtered.forEach(function(order) {
    
    const status =
      String(
        order.status || "pending"
      ).toLowerCase();
    
    
    const address = [
        order.city,
        order.address
      ]
      .filter(Boolean)
      .join(", ");
    
    
    let productsHTML = "";
    
    
    const items =
      Array.isArray(order.items) ?
      order.items :
      [];
    
    
    items.forEach(function(item) {
      
      const image =
        item.image || "";
      
      
      const imageHTML =
        image ?
        `<img src="${image}" alt="">` :
        `📦`;
      
      
      const quantity =
        Number(item.quantity) || 1;
      
      
      const price =
        Number(item.price) || 0;
      
      
      productsHTML += `

        <div class="product">

            <div class="product-image">

                ${imageHTML}

            </div>


            <div class="product-info">

                <div class="product-name">

                ${item.name || "Product"}

                </div>


                <div class="product-qty">

                Quantity: ${quantity}

                </div>

            </div>


            <div class="product-price">

            ₱${(
                price * quantity
            ).toLocaleString()}

            </div>

        </div>

        `;
      
    });
    
    
    const safeId =
      String(order.id)
      .replace(/'/g, "\\'");
    
    
    container.innerHTML += `

    <article class="order-card">


        <div class="order-top">

            <div>

                <div class="order-id">

                Order #${order.id}

                </div>

                <div class="order-date">

                ${formatDate(
                    order.createdAt
                )}

                </div>

            </div>


            <select
            class="status-select ${status}"
            onchange="
            updateStatus(
                '${safeId}',
                this.value
            )">

                <option value="pending"
                ${status==="pending"?"selected":""}>
                Pending
                </option>

                <option value="processing"
                ${status==="processing"?"selected":""}>
                Processing
                </option>

                <option value="shipped"
                ${status==="shipped"?"selected":""}>
                Shipped
                </option>

                <option value="delivered"
                ${status==="delivered"?"selected":""}>
                Delivered
                </option>

                <option value="cancelled"
                ${status==="cancelled"?"selected":""}>
                Cancelled
                </option>

            </select>

        </div>


        <div class="customer-box">

            <div class="section-title">

            👤 Customer Information

            </div>


            <div class="customer-grid">

                <div class="info">

                <strong>Name:</strong><br>
                ${order.customerName || "Not provided"}

                </div>


                <div class="info">

                <strong>Phone:</strong><br>
                ${order.phone || "Not provided"}

                </div>


                <div class="info">

                <strong>Email:</strong><br>
                ${order.email || "Not provided"}

                </div>


                <div class="info">

                <strong>Address:</strong><br>
                ${address || "Not provided"}

                </div>

            </div>

        </div>


        <div class="products-title">

        🛍️ Ordered Products

        </div>


        ${productsHTML}


        <div class="order-bottom">

            <div class="payment">

            💳
            ${order.paymentMethod || "Cash on Delivery"}

            </div>


            <div>

            Total:

            <span class="total">

            ₱${Number(
                order.total || 0
            ).toLocaleString()}

            </span>

            </div>

        </div>


        <button
        class="view-btn"
        onclick="
        viewDetails('${safeId}')
        ">

        👁️ View Full Order Details

        </button>


    </article>

    `;
    
  });
  
}


/* ================= SEARCH ================= */

document.getElementById(
  "search"
).addEventListener(
  "input",
  renderOrders
);


/* ================= FILTER ================= */

document.getElementById(
  "statusFilter"
).addEventListener(
  "change",
  renderOrders
);


/* ================= START ================= */

renderStats();

renderOrders();


/* ================= LIVE UPDATE ================= */

window.addEventListener(
  "storage",
  function() {
    
    orders =
      JSON.parse(
        localStorage.getItem("orders")
      ) || [];
    
    
    renderStats();
    
    renderOrders();
    
  }
);

function logout(){localStorage.removeItem("currentAdmin");location.href="login.html";}
