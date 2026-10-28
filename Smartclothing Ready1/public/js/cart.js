/* ================= CART ================= */

let cart =
  JSON.parse(
    localStorage.getItem(
      "cart"
    )
  ) || [];


/* ================= PRODUCTS ================= */

let products = JSON.parse(localStorage.getItem("sellerProducts")) || [];


/* ================= SAVE ================= */

function saveCart() {
  
  localStorage.setItem(
    "cart",
    JSON.stringify(cart)
  );
  
}


/* ================= RENDER ================= */

function renderCart() {
  
  const area =
    document.getElementById(
      "cartArea"
    );
  
  
  if (cart.length === 0) {
    
    area.innerHTML = `

    <div class="empty">

        <div class="empty-icon">
            🛒
        </div>

        <h2>
            Your Cart Is Empty
        </h2>

        <p>
            You haven't added any products yet.
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
  
  
  let subtotal = 0;
  let totalItems = 0;
  
  let itemsHTML = "";
  
  
  cart.forEach(
    function(item, index) {
      
      const product =
        products.find(
          function(p) {
            
            return String(
                p.id
              ) ===
              String(
                item.id
              );
            
          }
        );
      
      
      /*
      Use latest product
      price and stock.
      */
      
      const price =
        product ?
        Number(
          product.price
        ) :
        Number(
          item.price
        ) || 0;
      
      
      const stock =
        product ?
        Number(
          product.stock
        ) || 0 :
        Number(
          item.stock
        ) || 999;
      
      
      let quantity =
        Number(
          item.quantity
        ) || 1;
      
      
      /*
      Prevent quantity from
      exceeding current stock.
      */
      
      if (
        stock > 0 &&
        quantity > stock
      ) {
        
        quantity =
          stock;
        
        item.quantity =
          quantity;
        
      }
      
      
      const itemTotal =
        price * quantity;
      
      
      subtotal +=
        itemTotal;
      
      
      totalItems +=
        quantity;
      
      
      const image =
        product?.image ||
        item.image ||
        "";
      
      
      const name =
        product?.name ||
        item.name ||
        "Product";
      
      
      const category =
        product?.category ||
        "Product";
      
      
      const imageHTML =
        image ?
        `<img
            src="${image}"
            alt="">
        ` :
        `<div class="no-image">
            📦
        </div>`;
      
      
      itemsHTML += `

        <div class="cart-item">


            <div class="item-image">

                ${imageHTML}

            </div>


            <div class="item-info">

                <div class="item-category">

                    ${category}

                </div>


                <div class="item-name">

                    ${name}

                </div>


                <div class="item-price">

                    ₱${price.toLocaleString()}

                </div>


                <div class="item-stock">

                    ${
                        stock > 0
                        ?
                        stock +
                        " available"
                        :
                        "Out of stock"
                    }

                </div>

            </div>


            <div class="quantity">

                <button
                class="qty-btn"
                onclick="changeQuantity(
                    ${index},
                    -1
                )">

                    −

                </button>


                <div class="qty-number">

                    ${quantity}

                </div>


                <button
                class="qty-btn"
                onclick="changeQuantity(
                    ${index},
                    1
                )">

                    +

                </button>

            </div>


            <div class="item-price">

                ₱${itemTotal.toLocaleString()}

            </div>


            <button
            class="remove-btn"
            onclick="removeItem(
                ${index}
            )">

                ✕

            </button>


        </div>

        `;
      
    }
  );
  
  
  const shipping =
    subtotal >= 1000 ?
    0 :
    60;
  
  
  const total =
    subtotal + shipping;
  
  
  area.innerHTML = `

<div class="cart-layout">


    <section class="cart-box">

        <div class="box-title">

            Cart Items
            (${totalItems})

        </div>


        ${itemsHTML}

    </section>


    <aside class="summary">

        <div class="summary-title">

            Order Summary

        </div>


        <div class="summary-row">

            <span>
                Items
            </span>

            <span>
                ${totalItems}
            </span>

        </div>


        <div class="summary-row">

            <span>
                Subtotal
            </span>

            <span>
                ₱${subtotal.toLocaleString()}
            </span>

        </div>


        <div class="summary-row">

            <span>
                Delivery
            </span>

            <span>

                ${
                    shipping === 0
                    ?
                    "FREE"
                    :
                    "₱" +
                    shipping
                }

            </span>

        </div>


        <div class="summary-row total">

            <span>
                Total
            </span>

            <span class="total-price">

                ₱${total.toLocaleString()}

            </span>

        </div>


        <button
        class="checkout-btn"
        onclick="goCheckout()">

            Proceed to Checkout →

        </button>


        <a
        href="shop.html"
        class="continue-btn">

            ← Continue Shopping

        </a>

    </aside>


</div>

`;
  
}


/* ================= QUANTITY ================= */

function changeQuantity(
  index,
  change
) {
  
  if (!cart[index])
    return;
  
  
  let quantity =
    Number(
      cart[index].quantity
    ) || 1;
  
  
  const product =
    products.find(
      function(p) {
        
        return String(
            p.id
          ) ===
          String(
            cart[index].id
          );
        
      }
    );
  
  
  const stock =
    product ?
    Number(
      product.stock
    ) || 0 :
    Number(
      cart[index].stock
    ) || 999;
  
  
  quantity +=
    change;
  
  
  if (quantity <= 0) {
    
    cart.splice(
      index,
      1
    );
    
  }
  else if (
    stock > 0 &&
    quantity > stock
  ) {
    
    alert(
      "Only " +
      stock +
      " items available."
    );
    
    return;
    
  }
  else {
    
    cart[index].quantity =
      quantity;
    
  }
  
  
  saveCart();
  
  renderCart();
  
}


/* ================= REMOVE ================= */

function removeItem(index) {
  
  if (!cart[index])
    return;
  
  
  cart.splice(
    index,
    1
  );
  
  
  saveCart();
  
  renderCart();
  
}


/* ================= CHECKOUT ================= */

function goCheckout() {
  
  if (cart.length === 0) {
    
    alert(
      "Your cart is empty."
    );
    
    return;
    
  }
  
  
  /*
  Save cart before checkout.
  */
  
  saveCart();
  
  
  window.location.href =
    "checkout.html";
  
}




/* ================= START ================= */

renderCart();


/* ================= LIVE UPDATE ================= */

window.addEventListener(
  "storage",
  function() {
    
    cart =
      JSON.parse(
        localStorage.getItem(
          "cart"
        )
      ) || [];
    
    
    products =
      JSON.parse(
        localStorage.getItem(
          "sellerProducts"
        )
      ) || [];
    
    
    renderCart();
    
  }
);
