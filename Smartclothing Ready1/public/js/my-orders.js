/* ================= LOAD ORDERS ================= */

function getCustomerOrders() {
  const currentUser = JSON.parse(
    localStorage.getItem("currentUser")
  );

  if (!currentUser || !currentUser.email) {
    window.location.replace("login.html");
    return [];
  }

  const customerEmail = currentUser.email.trim().toLowerCase();
  const allOrders = JSON.parse(localStorage.getItem("orders")) || [];

  return allOrders.filter(function(order) {
    const orderEmail = String(order.customerEmail || order.email || "")
      .trim()
      .toLowerCase();

    return orderEmail === customerEmail;
  });
}

let orders = getCustomerOrders();


/* ================= DATE ================= */

function formatDate(date) {
  
  if (!date)
    return "Date unavailable";
  
  
  const d =
    new Date(date);
  
  
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


/* ================= STATUS ================= */

function getStatusClass(status) {
  
  const value =
    String(
      status ||
      "pending"
    ).toLowerCase();
  
  
  if (
    value === "processing"
  )
    return "processing";
  
  
  if (
    value === "shipped"
  )
    return "shipped";
  
  
  if (
    value === "delivered"
  )
    return "delivered";
  
  
  if (
    value === "cancelled"
  )
    return "cancelled";
  
  
  return "pending";
  
}


/* ================= RENDER ================= */

function renderOrders() {
  
  const container =
    document.getElementById(
      "ordersContainer"
    );
  
  
  container.innerHTML =
    "";
  
  
  if (
    orders.length === 0
  ) {
    
    container.innerHTML = `

    <div class="empty">

        <div class="empty-icon">
            📦
        </div>

        <h2>
            No Orders Yet
        </h2>

        <p>
            You haven't placed any orders yet.
        </p>

        <a
        href="shop.html"
        class="shop-btn">

            Start Shopping

        </a>

    </div>

    `;
    
    return;
    
  }
  
  
  /*
  Newest orders first
  */
  
  const sortedOrders = [...orders].reverse();
  
  
  sortedOrders.forEach(
    function(order) {
      
      const status =
        String(
          order.status ||
          "pending"
        );
      
      
      let itemsHTML =
        "";
      
      
      const items =
        Array.isArray(
          order.items
        ) ?
        order.items :
        [];
      
      
      items.forEach(
        function(item) {
          
          const image =
            item.image ||
            "";
          
          
          const imageHTML =
            image ?
            `<img
                    src="${image}"
                    alt="">
                ` :
            `📦`;
          
          
          const quantity =
            Number(
              item.quantity
            ) || 1;
          
          
          const price =
            Number(
              item.price
            ) || 0;
          
          
          itemsHTML += `

                <div class="order-item">

                    <div class="product-image">

                        ${imageHTML}

                    </div>


                    <div class="product-info">

                        <div class="product-name">

                            ${
                                item.name ||
                                "Product"
                            }

                        </div>


                        <div class="product-quantity">

                            Quantity:
                            ${quantity}

                        </div>

                    </div>


                    <div class="product-price">

                        ₱${
                            (
                                price *
                                quantity
                            ).toLocaleString()
                        }

                    </div>

                </div>

                `;
          
        }
      );
      
      
      const payment =
        order.paymentMethod ||
        "Cash on Delivery";
      
      
      const address = [
          order.city,
          order.address
        ]
        .filter(Boolean)
        .join(
          ", "
        );
      
      
      container.innerHTML += `

        <article class="order-card">


            <div class="order-header">

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


                <div
                class="status ${getStatusClass(
                    status
                )}">

                    ${status}

                </div>

            </div>


            <div class="items-title">

                Ordered Products

            </div>


            ${itemsHTML}


            <div class="order-details">


                <div class="detail">

                    <div class="detail-title">

                        PAYMENT METHOD

                    </div>

                    <div class="detail-value">

                        ${payment}

                    </div>

                </div>


                <div class="detail">

                    <div class="detail-title">

                        DELIVERY PHONE

                    </div>

                    <div class="detail-value">

                        ${
                            order.phone ||
                            "Not provided"
                        }

                    </div>

                </div>


                <div class="detail">

                    <div class="detail-title">

                        DELIVERY ADDRESS

                    </div>

                    <div class="detail-value">

                        ${
                            address ||
                            "Not provided"
                        }

                    </div>

                </div>


                <div class="detail">

                    <div class="detail-title">

                        CUSTOMER

                    </div>

                    <div class="detail-value">

                        ${
                            order.customerName ||
                            "Customer"
                        }

                    </div>

                </div>


            </div>


            <div class="order-footer">


                <div class="payment">

                    ${
                        order.paymentMethod ||
                        "Cash on Delivery"
                    }

                </div>


                <div>

                    <span class="total-label">

                        Total:

                    </span>


                    <span class="total-price">

                        ₱${
                            Number(
                                order.total
                            || 0
                            ).toLocaleString()
                        }

                    </span>

                </div>


            </div>


        </article>

        `;
      
    }
  );
  
}


/* ================= START ================= */

renderOrders();


/* ================= LIVE UPDATE ================= */

window.addEventListener(
  "storage",
  function() {
    
    orders = getCustomerOrders();
    
    
    renderOrders();
    
  }
);
