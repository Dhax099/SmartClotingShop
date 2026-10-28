let customerOrders =
  JSON.parse(
    localStorage.getItem("orders")
  ) || [];
let latestOrder = customerOrders[customerOrders.length - 1];
let lastOrder = latestOrder ? {
  orderId: latestOrder.id,
  date: new Date(latestOrder.createdAt).toLocaleString("en-PH"),
  products: latestOrder.items || [],
  total: Number(latestOrder.total) || 0
} : null;



function showOrders() {
  
  
  let ordersList =
    document.getElementById(
      "ordersList"
    );
  
  if (!lastOrder) {
    
    ordersList.innerHTML = `

<div class="empty">

<p>
You have no orders yet.
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
  
  
  let products = "";
  
  
  lastOrder.products.forEach(
    item => {
      
      products +=
        `<p>
${item.name}
× ${item.quantity}
</p>`;
      
    });
  
  
  ordersList.innerHTML = `

<div class="order">

<div class="order-id">

Order ID:
${lastOrder.orderId}

</div>


<div class="order-date">

${lastOrder.date}

</div>


${products}


<br>


<p>

Total Payment:
<strong>
${calculateTotal()}
</strong>

</p>


<br>


<span class="status">
Order Placed
</span>

</div>

`;
  
}



function calculateTotal() {
  return "₱" + lastOrder.total.toLocaleString();
}

showOrders();

function logout() {
  
  localStorage.removeItem(
    "currentUser"
  );
  
  window.location.href =
    "login.html";
  
}
