// Price of a menu item as the server will charge it. GET /menu/items returns
// effective_price (branch override → promotional → list) when a branch is in scope;
// without one, fall back the same way so the cart matches the bill.
export const itemPrice = (item) =>
  parseFloat(item.effective_price ?? item.promotional_price ?? item.price ?? 0);
