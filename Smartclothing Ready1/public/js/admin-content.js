(function(){
  if(!localStorage.getItem("currentAdmin")){
    location.href="login.html";
    return;
  }
})();

let ootdItems = JSON.parse(localStorage.getItem("ootdItems") || "[]");
let vouchers = JSON.parse(localStorage.getItem("vouchers") || "[]");
if(!Array.isArray(ootdItems)) ootdItems=[];
if(!Array.isArray(vouchers)) vouchers=[];

const DEFAULT_PRODUCTS = [
  {id:"PH001",name:"Oversized Basic T-Shirt",price:499,image:"https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85",stock:25},
  {id:"PH002",name:"Straight Cut Cargo Pants",price:899,image:"https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=900&q=85",stock:15},
  {id:"PH003",name:"Lightweight Zip Hoodie",price:999,image:"https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=85",stock:12},
  {id:"PH004",name:"Canvas Everyday Tote Bag",price:399,image:"https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=900&q=85",stock:20}
];

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

let products=readProducts();

function saveContent(){
  localStorage.setItem("ootdItems",JSON.stringify(ootdItems));
  localStorage.setItem("vouchers",JSON.stringify(vouchers));
  render();
}

function escapeHTML(value){
  return String(value ?? "").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]));
}

function render(){
  const o=document.getElementById("ootdList");
  const v=document.getElementById("voucherList");
  const options=document.getElementById("ootdProductOptions");

  o.innerHTML=ootdItems.length
    ? ootdItems.map((x,i)=>`<div class="item">
        <img src="${escapeHTML(x.image||"")}" alt="">
        <div class="info">
          <strong>${escapeHTML(x.title)}</strong>
          <small>${escapeHTML(getOOTDProductNames(x))}${getOOTDProductPrice(x) ? ` • ₱${getOOTDProductPrice(x).toLocaleString("en-PH")}` : ""}</small>
          <p>${escapeHTML(x.description||"")}</p>
        </div>
        <button class="delete" onclick="removeOOTD(${i})">Delete</button>
      </div>`).join("")
    : "<p>No OOTD slides yet. Add one above.</p>";

  options.innerHTML=products.length ? products.map(product=>{
    const stock=Number(product.stock)||0;
    return `<label class="product-option">
      <input type="checkbox" name="ootdProductIds" value="${escapeHTML(product.id)}">
      <span>${escapeHTML(product.name||"Product")} <small>₱${Number(product.price||0).toLocaleString("en-PH")} · ${stock>0?`${stock} available`:"Out of stock"}</small></span>
    </label>`;
  }).join("") : "<p>No catalog products available. Add products first.</p>";

  v.innerHTML=vouchers.length
    ? vouchers.map((x,i)=>`<div class="item">
        <div class="info">
          <strong>${escapeHTML(x.code)}</strong>
          <small>${escapeHTML(x.discount)}</small>
          <p>${escapeHTML(x.description||"")}</p>
          <small>${x.expirationDate ? `Expires: ${escapeHTML(formatVoucherDate(x.expirationDate))}` : "No expiration date"}</small>
        </div>
        <button class="delete" onclick="removeVoucher(${i})">Delete</button>
      </div>`).join("")
    : "<p>No vouchers yet.</p>";
}

function getOOTDProducts(item){
  const ids=Array.isArray(item.productIds) ? item.productIds.map(String) : [];
  if(ids.length)return ids.map(id=>products.find(product=>String(product.id)===id)).filter(Boolean);
  const legacyName=String(item.productName||"").trim().toLowerCase();
  return legacyName ? products.filter(product=>String(product.name||"").trim().toLowerCase()===legacyName) : [];
}

function getOOTDProductNames(item){
  const related=getOOTDProducts(item);
  return related.length ? related.map(product=>product.name).join(", ") : item.productName||"";
}

function getOOTDProductPrice(item){
  const related=getOOTDProducts(item);
  return related.length ? related.reduce((sum,product)=>sum+Number(product.price||0),0) : Number(item.price)||0;
}

function formatVoucherDate(date){
  const [year,month,day]=String(date).split("-").map(Number);
  return new Date(year,month-1,day).toLocaleDateString("en-PH",{year:"numeric",month:"long",day:"numeric"});
}

function getTodayDate(){
  const today=new Date();
  return `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
}

function readImage(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result);
    reader.onerror=reject;
    reader.readAsDataURL(file);
  });
}

document.getElementById("ootdForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const file=document.getElementById("ootdImage").files[0];
  if(!file){alert("Please select an OOTD image.");return;}
  if(file.size>2*1024*1024){alert("Image must be smaller than 2MB.");return;}

  try{
    const selectedProducts=Array.from(document.querySelectorAll('input[name="ootdProductIds"]:checked'))
      .map(input=>products.find(product=>String(product.id)===String(input.value)))
      .filter(Boolean);
    if(!selectedProducts.length){
      alert("Select at least one product worn in this OOTD.");
      return;
    }
    ootdItems.push({
      id:"OOTD"+Date.now(),
      title:document.getElementById("ootdTitle").value.trim(),
      description:document.getElementById("ootdDescription").value.trim(),
      productIds:selectedProducts.map(product=>product.id),
      productName:selectedProducts.map(product=>product.name).join(", "),
      price:selectedProducts.reduce((sum,product)=>sum+Number(product.price||0),0),
      image:await readImage(file)
    });
    e.target.reset();
    saveContent();
  }catch(err){
    alert("Unable to save the OOTD image.");
  }
});

document.getElementById("voucherForm").addEventListener("submit",e=>{
  e.preventDefault();
  const code=document.getElementById("voucherCode").value.trim().toUpperCase();
  const discount=document.getElementById("voucherDiscount").value.trim();
  const expirationDate=document.getElementById("voucherExpiry").value;
  if(!code || !discount || !expirationDate){alert("Please complete the voucher information, including its expiration date.");return;}
  if(expirationDate<getTodayDate()){alert("The expiration date cannot be in the past.");return;}

  vouchers.push({
    id:"V"+Date.now(),
    code,
    discount,
    description:document.getElementById("voucherDescription").value.trim(),
    expirationDate
  });
  e.target.reset();
  saveContent();
});

function removeOOTD(i){
  if(!ootdItems[i]) return;
  if(!confirm(`Remove "${ootdItems[i].title}" from OOTD?`)) return;
  ootdItems.splice(i,1);
  saveContent();
}

function removeVoucher(i){
  if(!vouchers[i]) return;
  if(!confirm(`Delete voucher "${vouchers[i].code}"?`)) return;
  vouchers.splice(i,1);
  saveContent();
}

function logout(){
  localStorage.removeItem("currentAdmin");
  location.href="login.html";
}

render();
document.getElementById("voucherExpiry").min=getTodayDate();
window.addEventListener("storage",()=>{
  ootdItems=JSON.parse(localStorage.getItem("ootdItems")||"[]");
  vouchers=JSON.parse(localStorage.getItem("vouchers")||"[]");
  products=readProducts();
  if(!Array.isArray(ootdItems)) ootdItems=[];
  if(!Array.isArray(vouchers)) vouchers=[];
  render();
});
