(function(){if(!localStorage.getItem("currentAdmin")){location.href="login.html";return;}})();
/* ================= LOAD DATA ================= */

let orders =
  JSON.parse(
    localStorage.getItem("orders")
  ) || [];


let products =
  JSON.parse(
    localStorage.getItem("sellerProducts")
  ) || [];


/* ================= STATS ================= */

function updateDashboard() {
  
  let pending = 0;
  let delivered = 0;
  let processing = 0;
  let sales = 0;
  
  
  orders.forEach(
    function(order) {
      
      const status =
        String(
          order.status ||
          "pending"
        ).toLowerCase();
      
      
      if (status === "pending") {
        pending++;
      }
      
      
      if (status === "processing") {
        processing++;
      }
      
      
      if (status === "delivered") {
        delivered++;
      }
      
      
      if (status !== "cancelled") {
        
        sales +=
          Number(
            order.total
          ) || 0;
        
      }
      
    }
  );
  
  
  /* PRODUCTS */
  
  document.getElementById(
      "totalProducts"
    ).innerText =
    products.length;
  
  
  /* ORDERS */
  
  document.getElementById(
      "totalOrders"
    ).innerText =
    orders.length;
  
  
  /* PENDING */
  
  document.getElementById(
      "pendingOrders"
    ).innerText =
    pending;
  
  
  /* SALES */
  
  document.getElementById(
      "totalSales"
    ).innerText =
    "₱" +
    sales.toLocaleString();
  
  
  document.getElementById(
      "salesOverview"
    ).innerText =
    "₱" +
    sales.toLocaleString();
  
  
  /* PERCENTAGES */
  
  const total =
    orders.length || 1;
  
  
  const deliveredPercent =
    Math.round(
      delivered / total * 100
    );
  
  
  const processingPercent =
    Math.round(
      processing / total * 100
    );
  
  
  const pendingPercent =
    Math.round(
      pending / total * 100
    );
  
  
  document.getElementById(
      "deliveredPercent"
    ).innerText =
    deliveredPercent + "%";
  
  
  document.getElementById(
      "processingPercent"
    ).innerText =
    processingPercent + "%";
  
  
  document.getElementById(
      "pendingPercent"
    ).innerText =
    pendingPercent + "%";
  
  
  document.getElementById(
      "deliveredBar"
    ).style.width =
    deliveredPercent + "%";
  
  
  document.getElementById(
      "processingBar"
    ).style.width =
    processingPercent + "%";
  
  
  document.getElementById(
      "pendingBar"
    ).style.width =
    pendingPercent + "%";
  
  
  renderRecentOrders();
  
}


/* ================= RECENT ORDERS ================= */

function renderRecentOrders() {
  
  const box =
    document.getElementById(
      "recentOrders"
    );
  
  
  box.innerHTML = "";
  
  
  if (
    orders.length === 0
  ) {
    
    box.innerHTML = `

    <div class="empty">

        <div class="empty-icon">
        📦
        </div>

        <p>
        No customer orders yet.
        </p>

    </div>

    `;
    
    return;
    
  }
  
  
  const recent = [...orders]
    .reverse()
    .slice(0, 5);
  
  
  recent.forEach(
    function(order) {
      
      const status =
        String(
          order.status ||
          "pending"
        ).toLowerCase();
      
      
      const customer =
        order.customerName ||
        "Customer";
      
      
      const total =
        Number(
          order.total
        ) || 0;
      
      
      box.innerHTML += `

        <div class="order">


            <div class="order-icon">
            📦
            </div>


            <div class="order-info">

                <div class="order-id">

                #${order.id}

                </div>


                <div class="order-customer">

                ${customer}

                </div>


                <span
                class="status ${status}">

                ${status}

                </span>

            </div>


            <div class="order-price">

            ₱${total.toLocaleString()}

            </div>


        </div>

        `;
      
    }
  );
  
}


/* ================= STORAGE UPDATE ================= */

window.addEventListener(
  "storage",
  function() {
    
    orders =
      JSON.parse(
        localStorage.getItem(
          "orders"
        )
      ) || [];
    
    
    products =
      JSON.parse(
        localStorage.getItem(
          "sellerProducts"
        )
      ) || [];
    
    
    updateDashboard();
    
  }
);


/* ================= START ================= */

updateDashboard();

function logout(){localStorage.removeItem("currentAdmin");location.href="login.html";}
