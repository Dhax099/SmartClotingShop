const DEFAULT_OOTD = [
  {
    id:"OOTD001",
    title:"Weekend Casual",
    description:"A simple everyday look using pieces from Smart Clothing.",
    image:"https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=85",
    productName:"Oversized Basic T-Shirt",
    productIds:["PH001"],
    price:499
  },
];

const DEFAULT_PRODUCTS = [
  {id:"PH001",name:"Oversized Basic T-Shirt",price:499,image:"https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85",stock:25,category:"tops"},
  {id:"PH002",name:"Straight Cut Cargo Pants",price:899,image:"https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=900&q=85",stock:15,category:"bottoms"},
  {id:"PH003",name:"Lightweight Zip Hoodie",price:999,image:"https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=85",stock:12,category:"outerwear"},
  {id:"PH004",name:"Canvas Everyday Tote Bag",price:399,image:"https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=900&q=85",stock:20,category:"accessories"}
];

const DEFAULT_VOUCHERS = [
  {id:"V001",code:"WELCOME10",discount:"10% OFF",description:"Use on your first order."}
];

function readList(key, defaults){
  const stored=localStorage.getItem(key);
  if(stored===null){
    localStorage.setItem(key,JSON.stringify(defaults));
    return defaults.slice();
  }
  try{
    const parsed=JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  }catch(e){
    return [];
  }
}

let ootdItems=readList("ootdItems",DEFAULT_OOTD);
let vouchers=readList("vouchers",DEFAULT_VOUCHERS);
let products=readProducts();
let ootdIndex=0;
let activeOOTD=null;

function readProducts(){
  const stored=localStorage.getItem("sellerProducts");
  if(stored===null){
    localStorage.setItem("sellerProducts",JSON.stringify(DEFAULT_PRODUCTS));
    return DEFAULT_PRODUCTS.slice();
  }
  try{
    const parsed=JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  }catch(error){
    return [];
  }
}

function escapeHTML(value){
  return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]));
}

function getOOTDProducts(item){
  const ids=Array.isArray(item.productIds) ? item.productIds.map(String) : [];
  if(ids.length) return ids.map(id=>products.find(product=>String(product.id)===id)).filter(Boolean);
  const legacyName=String(item.productName||"").trim().toLowerCase();
  return legacyName ? products.filter(product=>String(product.name||"").trim().toLowerCase()===legacyName) : [];
}

function renderOOTD(){
  const box=document.getElementById("ootdSlider");
  if(!box)return;

  if(!ootdItems.length){
    box.innerHTML='<div class="ootd-empty">No OOTD posts available right now.</div>';
    return;
  }

  if(ootdIndex>=ootdItems.length) ootdIndex=0;

  box.innerHTML=ootdItems.map(x=>`<article class="ootd-slide">
    <img src="${escapeHTML(x.image||"")}" alt="${escapeHTML(x.title||"OOTD")}">
    <div class="ootd-info">
      <small>OUTFIT OF THE MONTH</small>
      <h3>${escapeHTML(x.title||"")}</h3>
      <p>${escapeHTML(x.description||"")}</p>
      <div class="ootd-price">${escapeHTML(x.productName||"")}${x.price?` • ₱${Number(x.price).toLocaleString("en-PH")}`:""}</div>
      <button class="btn primary" type="button" data-shop-ootd="${escapeHTML(x.id)}">Shop this look →</button>
    </div>
  </article>`).join("");

  box.style.transform=`translateX(-${ootdIndex*100}%)`;
}

function openOOTD(itemId){
  activeOOTD=ootdItems.find(item=>String(item.id)===String(itemId));
  if(!activeOOTD)return;
  const modal=document.getElementById("ootdModal");
  const grid=document.getElementById("ootdProductGrid");
  document.getElementById("ootdModalTitle").textContent=activeOOTD.title||"Outfit details";
  document.getElementById("ootdModalMessage").textContent="";
  const outfitProducts=getOOTDProducts(activeOOTD);
  grid.innerHTML=outfitProducts.length ? outfitProducts.map(product=>{
    const stock=Number(product.stock)||0;
    return `<article class="ootd-product-card">
      ${product.image||product.img ? `<img src="${escapeHTML(product.image||product.img)}" alt="${escapeHTML(product.name||"Product")}">` : '<div class="ootd-product-no-image">📦</div>'}
      <div class="ootd-product-details">
        <strong>${escapeHTML(product.name||"Product")}</strong>
        <span>₱${Number(product.price||0).toLocaleString("en-PH")}</span>
        <small>${stock>0 ? `${stock} available` : "Out of stock"}</small>
        <button type="button" data-add-ootd-product="${escapeHTML(product.id)}" ${stock<=0?"disabled":""}>Add to cart</button>
      </div>
    </article>`;
  }).join("") : '<p class="ootd-no-products">No catalog products are linked to this look yet.</p>';
  document.getElementById("addOOTDToCart").hidden=!outfitProducts.length;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden","false");
  document.body.classList.add("ootd-modal-open");
}

function closeOOTD(){
  const modal=document.getElementById("ootdModal");
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden","true");
  document.body.classList.remove("ootd-modal-open");
  activeOOTD=null;
}

function addProductToCart(product){
  if(!window.isClientLoggedIn()){
    window.location.href="login.html";
    return false;
  }
  const stock=Number(product.stock)||0;
  if(stock<=0)return false;
  let cart;
  try{
    const saved=JSON.parse(localStorage.getItem("cart")||"[]");
    cart=Array.isArray(saved) ? saved : [];
  }catch(error){
    cart=[];
  }
  const existing=cart.find(item=>String(item.id)===String(product.id));
  const quantity=existing ? Number(existing.quantity)||0 : 0;
  if(quantity>=stock){
    document.getElementById("ootdModalMessage").textContent=`Only ${stock} ${product.name} available; your cart already has ${quantity}.`;
    return false;
  }
  if(existing){
    existing.quantity=quantity+1;
    existing.price=Number(product.price||0);
    existing.name=product.name;
    existing.image=product.image||product.img||"";
    existing.stock=stock;
  }else{
    cart.push({id:product.id,name:product.name,price:Number(product.price||0),image:product.image||product.img||"",stock,quantity:1});
  }
  localStorage.setItem("cart",JSON.stringify(cart));
  document.getElementById("ootdModalMessage").textContent=`${product.name} added to your cart.`;
  return true;
}

function addOOTDProductsToCart(){
  if(!activeOOTD)return;
  if(!window.isClientLoggedIn()){
    window.location.href="login.html";
    return;
  }
  const outfitProducts=getOOTDProducts(activeOOTD);
  let added=0;
  outfitProducts.forEach(product=>{
    const stock=Number(product.stock)||0;
    if(stock<=0)return;
    let cart;
    try{
      const saved=JSON.parse(localStorage.getItem("cart")||"[]");
      cart=Array.isArray(saved) ? saved : [];
    }catch(error){
      cart=[];
    }
    const existing=cart.find(item=>String(item.id)===String(product.id));
    if(existing && (Number(existing.quantity)||0)>=stock)return;
    if(existing){
      existing.quantity=(Number(existing.quantity)||0)+1;
      existing.price=Number(product.price||0);
      existing.name=product.name;
      existing.image=product.image||product.img||"";
      existing.stock=stock;
    }else{
      cart.push({id:product.id,name:product.name,price:Number(product.price||0),image:product.image||product.img||"",stock,quantity:1});
    }
    localStorage.setItem("cart",JSON.stringify(cart));
    added++;
  });
  document.getElementById("ootdModalMessage").textContent=added
    ? `${added} outfit item${added===1?"":"s"} added. You can continue to your cart to check out.`
    : "No outfit items could be added. Check stock and your current cart.";
}

document.getElementById("ootdSlider").addEventListener("click",event=>{
  const button=event.target.closest("[data-shop-ootd]");
  if(button)openOOTD(button.dataset.shopOotd);
});

document.getElementById("ootdModal").addEventListener("click",event=>{
  if(event.target.closest("[data-close-ootd-modal]"))closeOOTD();
  const addButton=event.target.closest("[data-add-ootd-product]");
  if(addButton){
    const product=products.find(item=>String(item.id)===String(addButton.dataset.addOotdProduct));
    if(product)addProductToCart(product);
  }
});

document.getElementById("addOOTDToCart").addEventListener("click",addOOTDProductsToCart);
document.addEventListener("keydown",event=>{
  if(event.key==="Escape" && document.getElementById("ootdModal").classList.contains("is-open"))closeOOTD();
});

function nextOOTD(){
  if(!ootdItems.length)return;
  ootdIndex=(ootdIndex+1)%ootdItems.length;
  renderOOTD();
}

function prevOOTD(){
  if(!ootdItems.length)return;
  ootdIndex=(ootdIndex-1+ootdItems.length)%ootdItems.length;
  renderOOTD();
}

function renderVouchers(){
  const box=document.getElementById("voucherGrid");
  if(!box)return;
  const today=new Date();
  today.setHours(0,0,0,0);
  const activeVouchers=vouchers.filter(v=>!v.expirationDate || new Date(`${v.expirationDate}T00:00:00`)>=today);
  box.innerHTML=activeVouchers.length
    ? activeVouchers.map(v=>`<div class="voucher-card"><div class="voucher-code">${escapeHTML(v.code)}</div><strong>${escapeHTML(v.discount)}</strong><p>${escapeHTML(v.description||"")}</p>${v.expirationDate?`<small>Expires: ${escapeHTML(formatVoucherDate(v.expirationDate))}</small>`:""}</div>`).join("")
    : `<div class="voucher-card">No vouchers available right now.</div>`;
}

function formatVoucherDate(date){
  const [year,month,day]=String(date).split("-").map(Number);
  return new Date(year,month-1,day).toLocaleDateString("en-PH",{year:"numeric",month:"long",day:"numeric"});
}

renderOOTD();
renderVouchers();

window.addEventListener("storage",()=>{
  ootdItems=readList("ootdItems",[]);
  vouchers=readList("vouchers",[]);
  products=readProducts();
  renderOOTD();
  renderVouchers();
});
