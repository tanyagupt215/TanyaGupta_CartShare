# CartShare — Collaborative Shopping Ecosystem

CartShare is a real-time, browser-based shared shopping cart designed to help roommates, office teams, and travel groups coordinate group orders, hit free-shipping minimums ($75), and generate itemized split receipts.

## Features Implemented
- **Room-Based Access:** Create a random room code or join an existing room using your name.
- **Cross-Tab Real-Time Sync:** Uses `localStorage` and the browser `storage` event listener to sync cart additions, deletions, and activity logs across multiple open tabs instantaneously.
- **Free Delivery Threshold Tracker:** Live progress bar tracking progress toward the $75.00 free shipping goal.
- **Automated Expense Splitting:** Dynamically calculates how much each participant owes based on the items they added.
- **Audit-Ready Printable Receipt:** Uses CSS `@media print` rules to format a clean, printable invoice summarizing items and individual balances.

## How to Run Locally & Test Multi-User Sync
1. Clone or download this repository.
2. Open `index.html` in any modern web browser (Chrome, Edge, Firefox).
3. Enter your name (e.g., **Alex**) and generate/enter a Room Code (e.g., **DORM1**).
4. **To test real-time collaboration:** Open `index.html` in a **second browser tab**, enter a different name (e.g., **Sam**), and join the **exact same Room Code (`DORM1`)**.
5. Add or remove items in either tab and watch the other tab update automatically!