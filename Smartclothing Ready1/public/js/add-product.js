(function(){if(!localStorage.getItem("currentAdmin")){location.href="login.html";return;}})();
let selectedImage = "";



/* IMAGE PREVIEW */

function previewImage(event) {
  
  let file =
    event.target.files[0];
  
  
  if (!file) {
    
    return;
    
  }
  
  
  /* LIMIT */
  
  if (
    file.size >
    2 * 1024 * 1024
  ) {
    
    alert(
      "Image must be smaller than 2MB."
    );
    
    event.target.value = "";
    
    return;
    
  }
  
  
  let reader =
    new FileReader();
  
  
  reader.onload =
    function(e) {
      
      selectedImage =
        e.target.result;
      
      
      let preview =
        document.getElementById(
          "imagePreview"
        );
      
      
      preview.src =
        selectedImage;
      
      
      preview.style.display =
        "block";
      
      
      document.getElementById(
          "uploadContent"
        ).style.display =
        "none";
      
    };
  
  
  reader.readAsDataURL(file);
  
}



/* SAVE PRODUCT */

function saveProduct() {
  
  let name =
    document.getElementById(
      "productName"
    ).value.trim();
  
  
  let price =
    Number(
      document.getElementById(
        "productPrice"
      ).value
    );
  
  
  let stock =
    Number(
      document.getElementById(
        "productStock"
      ).value
    );
  
  
  let category =
    document.getElementById(
      "productCategory"
    ).value;
  
  
  let description =
    document.getElementById(
      "productDescription"
    ).value.trim();
  
  
  
  /* VALIDATION */
  
  if (
    name === "" ||
    price <= 0 ||
    stock < 0 ||
    category === "" ||
    description === "" ||
    selectedImage === ""
  ) {
    
    alert(
      "Please complete all product information and select an image."
    );
    
    return;
    
  }
  
  
  
  /* GET PRODUCTS */
  
  let products =
    JSON.parse(
      localStorage.getItem(
        "sellerProducts"
      )
    ) || [];
  
  
  
  /* CREATE PRODUCT */
  
  let product = {
    
    id: Date.now(),
    
    name: name,
    
    price: price,
    
    stock: stock,
    
    category: category,
    
    description: description,
    
    image: selectedImage,
    
    createdAt: new Date()
      .toISOString()
    
  };
  
  
  
  /* SAVE */
  
  products.push(
    product
  );
  
  
  try {
    
    localStorage.setItem(
      "sellerProducts",
      JSON.stringify(
        products
      )
    );
    
  }
  catch (error) {
    
    alert(
      "Storage is full. Please use a smaller image."
    );
    
    return;
    
  }
  
  
  
  /* SUCCESS */
  
  document.getElementById(
      "formArea"
    ).style.display =
    "none";
  
  
  document.getElementById(
      "successBox"
    ).style.display =
    "block";
  
}



/* PRODUCTS */

function goProducts() {
  
  window.location.href =
    "admin-products.html";
  
}
