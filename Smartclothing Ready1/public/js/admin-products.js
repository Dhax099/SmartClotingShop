/* ================= ADMIN PRODUCTS ================= */
(function(){
  if(!localStorage.getItem("currentAdmin")){
    location.href="login.html";
    return;
  }
})();

const currentAdmin = JSON.parse(localStorage.getItem("currentAdmin") || "null");
const adminNameEl = document.getElementById("adminName");
const avatarEl = document.getElementById("avatar");

if (currentAdmin) {
  const name = currentAdmin.name || currentAdmin.email || "Admin";
  if (adminNameEl) adminNameEl.textContent = name;
  if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();
}

let products = JSON.parse(localStorage.getItem("sellerProducts") || "[]");
if (!Array.isArray(products)) products = [];
let editId = null;

function saveProducts(){
  localStorage.setItem("sellerProducts", JSON.stringify(products));
}

function updateStats(){
  let inStock=0, lowStock=0, outStock=0;
  products.forEach(p=>{
    const stock=Number(p.stock)||0;
    if(stock<=0) outStock++;
    else if(stock<=5) lowStock++;
    else inStock++;
  });
  document.getElementById("totalProducts").textContent=products.length;
  document.getElementById("inStock").textContent=inStock;
  document.getElementById("lowStock").textContent=lowStock;
  document.getElementById("outStock").textContent=outStock;
}

function escapeHTML(value){
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[ch]));
}

function renderProducts(){
  const container=document.getElementById("products");
  const search=(document.getElementById("search")?.value || "").toLowerCase().trim();
  const category=document.getElementById("categoryFilter")?.value || "all";

  const filtered=products.filter(p=>{
    const name=String(p.name||"").toLowerCase();
    const cat=String(p.category||"other").toLowerCase();
    return name.includes(search) && (category==="all" || cat===category);
  });

  if(!filtered.length){
    container.innerHTML=`<div class="empty">
      <div class="empty-icon">📦</div>
      <strong>${products.length ? "No Products Found" : "No Products Yet"}</strong>
      <p>${products.length ? "Try another search or category." : "Click Add Product to create your first product."}</p>
    </div>`;
    return;
  }

  container.innerHTML=filtered.map(product=>{
    const stock=Number(product.stock)||0;
    const stockText=stock<=0 ? "Out of Stock" : stock<=5 ? "Low Stock" : "In Stock";
    const image=product.image||product.img||"";
    const safeId=String(product.id).replace(/\\/g,"\\\\").replace(/'/g,"\\'");
    return `<article class="product">
      <div class="product-image">
        ${image ? `<img src="${escapeHTML(image)}" alt="${escapeHTML(product.name)}">` : '<div class="no-image">📦</div>'}
        <div class="stock-badge">${stockText}</div>
      </div>
      <div class="product-body">
        <div class="product-category">${escapeHTML(product.category||"Other")}</div>
        <div class="product-name">${escapeHTML(product.name||"Product")}</div>
        <div class="product-description">${escapeHTML(product.description||"No description available.")}</div>
        <div class="product-bottom">
          <div class="price">₱${Number(product.price||0).toLocaleString("en-PH")}</div>
          <div class="stock">Stock: ${stock}</div>
        </div>
        <div class="actions">
          <button class="edit-btn" onclick="editProduct('${safeId}')">✏ Edit</button>
          <button class="delete-btn" onclick="deleteProduct('${safeId}')">🗑 Delete</button>
        </div>
      </div>
    </article>`;
  }).join("");
}

function openAddProduct(){
  editId=null;
  document.getElementById("modalTitle").textContent="Add Product";
  document.getElementById("productForm").reset();
  document.getElementById("productCategory").value="tops";
  document.getElementById("productModal").classList.add("show");
}

function editProduct(id){
  const product=products.find(p=>String(p.id)===String(id));
  if(!product) return;
  editId=id;
  document.getElementById("modalTitle").textContent="Edit Product";
  document.getElementById("productName").value=product.name||"";
  document.getElementById("productDescription").value=product.description||"";
  document.getElementById("productPrice").value=product.price ?? "";
  document.getElementById("productStock").value=product.stock ?? 0;
  document.getElementById("productCategory").value=product.category||"other";
  document.getElementById("productImage").value=product.image && String(product.image).startsWith("http") ? product.image : "";
  document.getElementById("imageFile").value="";
  document.getElementById("productModal").classList.add("show");
}

function deleteProduct(id){
  const product=products.find(p=>String(p.id)===String(id));
  if(!product) return;
  if(!confirm(`Delete "${product.name||"this product"}"?`)) return;

  products=products.filter(p=>String(p.id)!==String(id));
  saveProducts();
  updateStats();
  renderProducts();
}

document.getElementById("productForm").addEventListener("submit",function(event){
  event.preventDefault();

  const name=document.getElementById("productName").value.trim();
  const description=document.getElementById("productDescription").value.trim();
  const price=Number(document.getElementById("productPrice").value);
  const stock=Number(document.getElementById("productStock").value);
  const category=document.getElementById("productCategory").value;
  const imageURL=document.getElementById("productImage").value.trim();
  const file=document.getElementById("imageFile").files[0];

  if(!name || !Number.isFinite(price) || price<0 || !Number.isFinite(stock) || stock<0){
    alert("Please enter a product name, valid price, and valid stock.");
    return;
  }

  const finishSave=(finalImage)=>{
    if(editId!==null){
      const product=products.find(p=>String(p.id)===String(editId));
      if(product){
        product.name=name;
        product.description=description;
        product.price=price;
        product.stock=stock;
        product.category=category;
        if(finalImage) product.image=finalImage;
      }
    } else {
      products.push({
        id:"P"+Date.now(),
        name,
        description,
        price,
        stock,
        category,
        image:finalImage||"",
        badge:"NEW",
        createdAt:new Date().toISOString()
      });
    }

    saveProducts();
    updateStats();
    renderProducts();
    closeModal();
    alert(editId===null ? "Product added successfully!" : "Product updated successfully!");
  };

  if(file){
    if(file.size>2*1024*1024){
      alert("Image must be smaller than 2MB.");
      return;
    }
    const reader=new FileReader();
    reader.onload=()=>finishSave(reader.result);
    reader.onerror=()=>alert("Unable to read the selected image.");
    reader.readAsDataURL(file);
  } else {
    finishSave(imageURL);
  }
});

function closeModal(){
  document.getElementById("productModal").classList.remove("show");
}

document.getElementById("search").addEventListener("input",renderProducts);
document.getElementById("categoryFilter").addEventListener("change",renderProducts);

function logout(){
  localStorage.removeItem("currentAdmin");
  location.href="login.html";
}

function mobileMenu(){
  const sidebar=document.querySelector(".sidebar");
  const button=document.querySelector(".mobile-menu");
  if(!sidebar || !button) return;
  const isOpen=sidebar.classList.toggle("open");
  button.setAttribute("aria-expanded",String(isOpen));
}

updateStats();
renderProducts();

window.addEventListener("storage",()=>{
  products=JSON.parse(localStorage.getItem("sellerProducts") || "[]");
  if(!Array.isArray(products)) products=[];
  updateStats();
  renderProducts();
});
