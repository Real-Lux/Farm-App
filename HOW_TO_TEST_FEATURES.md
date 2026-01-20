# How to Test the New Features

## Feature 1: Price Saving When Editing Orders

### What it does:
When you edit an existing order, the system now saves and restores:
- Calculated price
- Price adjustment
- Price breakdown details

### How to test:
1. **Create a new order:**
   - Go to Commandes screen
   - Click the "+" button
   - Add some animals or products
   - Set a delivery date
   - Note the calculated price shown
   - Add a price adjustment (e.g., +5.00)
   - Save the order

2. **Edit the order:**
   - Click on the order you just created
   - **You should see:**
     - The calculated price is restored
     - The price adjustment is restored
     - The price breakdown is visible
   - If you click "Détail du calcul", you should see the breakdown

### What was fixed:
- Before: Prices were recalculated but not saved/restored when editing
- Now: Prices are saved and restored when you open an order for editing

---

## Feature 2: Egg Consumption Tracking & Crosscheck

### What it does:
- Automatically tracks when orders contain egg products
- Compares egg production vs orders to show stock availability
- Shows a crosscheck section in the Commandes screen

### How to test:

#### Step 1: Add Egg Production Data
1. Go to **Gestion** → **Productions** tab
2. Make sure you're on the "Production d'œufs" section
3. Add some egg production for today:
   - Select a date (e.g., today)
   - Add production for "Poules" (e.g., 50 eggs)
   - Add rejected eggs if any (e.g., 2)
   - Save

#### Step 2: Create an Order with Eggs
1. Go to **Commandes** screen
2. Click the "+" button to create a new order
3. Switch to **"📦 Autres produits"** tab
4. **Important:** Select a product that contains "œuf" or "egg" in the name
   - The default product "Œufs de consommation" should work
   - Or create a product with name containing "œuf" or category "eggs"
5. Set quantity (e.g., 10)
6. Set delivery date to match the production date you entered
7. Fill in customer info and save

#### Step 3: View the Crosscheck
1. Go back to **Commandes** screen
2. **You should see a new section:** "🥚 Vérification Stock Œufs"
3. Click on it to expand
4. **You should see:**
   - Date of production
   - Animal type (e.g., "poules")
   - Produced: 50
   - Rejected: 2
   - Disponibles: 48 (50 - 2)
   - Commandés: 10 (from your order)
   - Restant: 38 (48 - 10)

### What products are detected as eggs?
The system detects egg products if:
- Product name contains "œuf" or "egg" (case-insensitive)
- Product category is "eggs" or "œufs"

### Example products that work:
- "Œufs de consommation" ✅
- "Eggs" ✅
- "Œufs de canards" ✅
- Product with category "eggs" ✅

---

## Troubleshooting

### I don't see the egg crosscheck section:
**Possible reasons:**
1. No egg production data exists yet
   - Solution: Add production data first (Gestion → Productions)
2. No orders with eggs exist yet
   - Solution: Create an order with an egg product
3. The product name doesn't contain "œuf" or "egg"
   - Solution: Check product name/category matches

### Prices aren't restored when editing:
**Check:**
1. Make sure you saved the order with prices first
2. Try closing and reopening the order
3. Check browser console for errors

### The crosscheck shows wrong numbers:
**Check:**
1. Delivery date of order matches production date
2. Product is correctly identified as eggs
3. Quantity in order is correct

---

## Visual Guide

### Where to find features:

1. **Price restoration:**
   - Commandes → Click any order → Edit
   - Look at the "💰 Calcul du prix" section

2. **Egg crosscheck:**
   - Commandes screen (main list)
   - Look for "🥚 Vérification Stock Œufs" section
   - It appears below the filter dropdowns
   - Click to expand and see details

---

## Technical Details

### How egg detection works:
```javascript
// Checks product name
productName.includes('œuf') || productName.includes('egg')

// Checks product category
category === 'eggs' || category === 'œufs'
```

### How crosscheck works:
1. Gets all egg production data
2. Gets all orders with egg consumption
3. Matches by date (delivery date or order date)
4. Calculates: Available = Produced - Rejected - Consumed
5. Shows status: "ok" if remaining >= 0, "deficit" if < 0



