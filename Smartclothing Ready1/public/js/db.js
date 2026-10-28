/* SmartClo database bridge.
 *
 * api/hydrate.js (loaded just before this file) copies the data from MySQL into
 * localStorage on every page load, so the page scripts read fresh database data.
 *
 * This file does the other direction: whenever a page script saves one of these
 * keys to localStorage, the change is also sent to MySQL (api/save):
 *   sellerProducts, vouchers, ootdItems, orders  -> admin only (only what changed is sent)
 *   cart                                         -> logged-in customer
 * Removing currentUser / currentAdmin (logout) also ends the PHP session.
 * Orders and reviews from customers use SmartCloDB.placeOrder / addReview below.
 */
(function () {
  var rawSet = Storage.prototype.setItem;
  var rawRemove = Storage.prototype.removeItem;
  var rawGet = Storage.prototype.getItem;

  var COLLECTIONS = { sellerProducts: true, vouchers: true, ootdItems: true, orders: true };
  var base = {}; // what MySQL had when the page loaded, per key

  function clone(v) { return v === undefined ? v : JSON.parse(JSON.stringify(v)); }
  function read(key) {
    try { return JSON.parse(rawGet.call(window.localStorage, key)); } catch (e) { return null; }
  }
  function isAdmin() { return !!rawGet.call(window.localStorage, "currentAdmin"); }
  function isCustomer() { return !!rawGet.call(window.localStorage, "currentUser"); }

  Object.keys(COLLECTIONS).forEach(function (k) {
    var v = read(k);
    base[k] = Array.isArray(v) ? clone(v) : [];
  });

  var queue = Promise.resolve();
  function post(url, payload) {
    var body = JSON.stringify(payload);
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body,
      keepalive: body.length < 60000 // lets small saves finish even if you change page right away
    }).then(function (res) {
      return res.json().catch(function () { return { ok: false, message: "Unexpected server response." }; });
    });
  }
  function send(payload) {
    queue = queue.then(function () {
      return post("api/save", payload).then(function (res) {
        if (!res.ok) alert("Could not save to the database: " + (res.message || "unknown error"));
      });
    }).catch(function () {
      alert("Cannot reach the server. Your change was not saved. Is the SmartClo server running (run.bat)?");
    });
  }

  function pushCollection(key, next) {
    if (!Array.isArray(next) || !isAdmin()) return;
    var prevMap = {};
    (base[key] || []).forEach(function (x) { prevMap[String(x.id)] = JSON.stringify(x); });
    var seen = {};
    var upserts = [];
    next.forEach(function (x) {
      var id = String(x.id);
      seen[id] = true;
      if (prevMap[id] !== JSON.stringify(x)) upserts.push(x);
    });
    var deletes = Object.keys(prevMap).filter(function (id) { return !seen[id]; });
    base[key] = clone(next);
    if (!upserts.length && !deletes.length) return;
    send({ key: key, upserts: upserts, deletes: deletes });
  }

  function pushCart(items) {
    if (!isCustomer() || !Array.isArray(items)) return;
    send({
      key: "cart",
      value: items.map(function (i) { return { id: i.id, quantity: Number(i.quantity) || 0 }; })
    });
  }

  Storage.prototype.setItem = function (key, value) {
    rawSet.call(this, key, value); // may throw if the browser storage is full - same as before
    if (this !== window.localStorage) return;
    try {
      if (COLLECTIONS[key]) pushCollection(key, JSON.parse(value));
      else if (key === "cart") pushCart(JSON.parse(value));
    } catch (e) { console.error("SmartClo sync error", e); }
  };

  Storage.prototype.removeItem = function (key) {
    rawRemove.call(this, key);
    if (this !== window.localStorage) return;
    if (key === "cart") pushCart([]);
    // Logging out on any page also ends the PHP session, otherwise the next page would log you back in.
    if (key === "currentUser" || key === "currentAdmin") {
      fetch("api/logout", { keepalive: true }).catch(function () {});
    }
  };

  window.SmartCloDB = {
    placeOrder: function (order, voucherCode) {
      return post("api/place-order", { order: order, voucherCode: voucherCode || "" });
    },
    addReview: function (productId, rating, comment) {
      return post("api/add-review", { productId: String(productId), rating: rating, comment: comment });
    }
  };
})();
