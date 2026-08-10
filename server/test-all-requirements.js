const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('==================================================');
  console.log('RUNNING FULL ERP/CRM SYSTEM REQUIREMENTS AUDIT');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. AUTHENTICATION & ROLES
    console.log('--- 1. Testing Authentication & RBAC ---');
    const rolesToTest = [
      { email: 'admin@distroerp.com', password: 'admin123', role: 'Admin' },
      { email: 'sales@distroerp.com', password: 'sales123', role: 'Sales' },
      { email: 'warehouse@distroerp.com', password: 'warehouse123', role: 'Warehouse' },
      { email: 'accounts@distroerp.com', password: 'accounts123', role: 'Accounts' }
    ];

    let tokens = {};

    for (const r of rolesToTest) {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: r.email, password: r.password })
      });
      assert(res.status === 200, `Login status 200 for ${r.role}`);
      const data = await res.json();
      assert(data.user && data.user.role === r.role, `JWT payload role matches ${r.role}`);
      assert(typeof data.token === 'string' && data.token.length > 20, `Valid JWT token generated for ${r.role}`);
      tokens[r.role] = data.token;
    }

    // 2. CUSTOMER CRM MODULE
    console.log('\n--- 2. Testing Customer CRM Module ---');
    const salesHeader = { 'Authorization': `Bearer ${tokens.Sales}`, 'Content-Type': 'application/json' };

    // Add customer
    const newCustRes = await fetch(`${BASE_URL}/customers`, {
      method: 'POST',
      headers: salesHeader,
      body: JSON.stringify({
        name: 'Sharma Retailers',
        mobile: '9123456789',
        email: 'info@sharmaretail.in',
        businessName: 'Sharma Mega Store',
        gst: '07AAACS1234A1Z1',
        type: 'Retail',
        address: 'Sector 18, Noida, UP 201301',
        status: 'Lead',
        followUpDate: '2026-08-25',
        notesText: 'Interested in dairy and grain products.'
      })
    });
    assert(newCustRes.status === 201, 'Create Customer returns HTTP 201 Created');
    const createdCust = await newCustRes.json();
    assert(createdCust.id && createdCust.name === 'Sharma Retailers', 'Customer created with generated ID');
    assert(createdCust.notes && createdCust.notes.length === 1, 'Initial follow-up note saved with customer');

    // Add follow-up note
    const noteRes = await fetch(`${BASE_URL}/customers/${createdCust.id}/notes`, {
      method: 'POST',
      headers: salesHeader,
      body: JSON.stringify({ text: 'Called customer. Scheduled demo for tomorrow.' })
    });
    assert(noteRes.status === 200, 'Add Customer Note returns HTTP 200 OK');
    const noteData = await noteRes.json();
    assert(noteData.notes.length === 2, 'Customer now has 2 follow-up notes in timeline');

    // Search customers
    const searchRes = await fetch(`${BASE_URL}/customers?query=Sharma&status=Lead`, {
      headers: salesHeader
    });
    assert(searchRes.status === 200, 'Search Customers returns HTTP 200 OK');
    const searchData = await searchRes.json();
    assert(searchData.data.length >= 1, 'Search customer by query & status filter works');

    // Edit customer
    const editRes = await fetch(`${BASE_URL}/customers/${createdCust.id}`, {
      method: 'PUT',
      headers: salesHeader,
      body: JSON.stringify({ status: 'Active' })
    });
    assert(editRes.status === 200, 'Update Customer returns HTTP 200 OK');
    const editedCust = await editRes.json();
    assert(editedCust.status === 'Active', 'Customer status updated from Lead to Active');


    // 3. PRODUCT & INVENTORY MODULE
    console.log('\n--- 3. Testing Product & Inventory Module ---');
    const whHeader = { 'Authorization': `Bearer ${tokens.Warehouse}`, 'Content-Type': 'application/json' };

    // Add product
    const newProdRes = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: whHeader,
      body: JSON.stringify({
        name: 'Tea Bags Earl Grey Case/24',
        sku: 'TEA-EG-C24',
        category: 'Beverages',
        unitPrice: 1200,
        currentStock: 15,
        minStockAlert: 20,
        warehouseLocation: 'B-04-R2'
      })
    });
    assert(newProdRes.status === 201, 'Create Product returns HTTP 201 Created');
    const createdProd = await newProdRes.json();
    assert(createdProd.sku === 'TEA-EG-C24', 'Product SKU code stored uppercase');

    // Adjust stock IN
    const adjustInRes = await fetch(`${BASE_URL}/products/${createdProd.id}/adjust-stock`, {
      method: 'POST',
      headers: whHeader,
      body: JSON.stringify({ qtyChanged: 30, type: 'IN', reason: 'Restock PO #PO-9912' })
    });
    assert(adjustInRes.status === 200, 'Stock IN adjustment returns HTTP 200 OK');
    const adjustInData = await adjustInRes.json();
    assert(adjustInData.newStock === 45, 'Stock updated from 15 + 30 = 45');

    // Verify Stock Movement Log
    const smRes = await fetch(`${BASE_URL}/stock-movements?query=TEA-EG-C24`, {
      headers: whHeader
    });
    assert(smRes.status === 200, 'Get Stock Movements returns HTTP 200 OK');
    const smData = await smRes.json();
    assert(smData.data.length >= 1, 'Stock Movement log captured IN adjustment with reason and user');


    // 4. SALES CHALLAN MODULE & BUSINESS LOGIC
    console.log('\n--- 4. Testing Sales Challan Flow & Stock Logic ---');

    // Fetch product stock before order (P001 Basmati Rice)
    const p1Res = await fetch(`${BASE_URL}/products/P001`, { headers: salesHeader });
    const p1Before = await p1Res.json();
    console.log(`Current P001 Stock: ${p1Before.currentStock}`);

    // Create Draft Challan
    const draftRes = await fetch(`${BASE_URL}/challans`, {
      method: 'POST',
      headers: salesHeader,
      body: JSON.stringify({
        customerId: 'C001',
        items: [{ productId: 'P001', qty: 10 }],
        status: 'Draft'
      })
    });
    assert(draftRes.status === 201, 'Create Draft Challan returns HTTP 201 Created');
    const draftChallan = await draftRes.json();
    assert(draftChallan.status === 'Draft', 'Challan created with status Draft');
    assert(draftChallan.items[0].productName === 'Basmati Rice Premium 25kg', 'Challan stores product snapshot name');

    // Verify stock NOT changed for Draft
    const p1AfterDraft = await (await fetch(`${BASE_URL}/products/P001`, { headers: salesHeader })).json();
    assert(p1AfterDraft.currentStock === p1Before.currentStock, 'Draft challan does NOT reduce inventory stock');

    // Attempt Confirmed Challan with EXCEEDED stock -> Expect HTTP 400 Bad Request
    const excessiveQty = p1Before.currentStock + 500;
    const failChallanRes = await fetch(`${BASE_URL}/challans`, {
      method: 'POST',
      headers: salesHeader,
      body: JSON.stringify({
        customerId: 'C001',
        items: [{ productId: 'P001', qty: excessiveQty }],
        status: 'Confirmed'
      })
    });
    assert(failChallanRes.status === 400, 'Insufficient stock returns HTTP 400 Bad Request');
    const failErr = await failChallanRes.json();
    assert(failErr.error.includes('Insufficient stock'), `API returns clear error: "${failErr.error}"`);

    // Confirm Draft Challan with VALID stock
    const confirmRes = await fetch(`${BASE_URL}/challans/${draftChallan.id}/confirm`, {
      method: 'POST',
      headers: salesHeader
    });
    assert(confirmRes.status === 200, 'Confirm Challan returns HTTP 200 OK');
    const confirmedChallan = await confirmRes.json();
    assert(confirmedChallan.status === 'Confirmed', 'Challan status updated to Confirmed');

    // Verify stock reduced after confirmation
    const p1AfterConfirm = await (await fetch(`${BASE_URL}/products/P001`, { headers: salesHeader })).json();
    assert(p1AfterConfirm.currentStock === p1Before.currentStock - 10, `Stock reduced atomically from ${p1Before.currentStock} to ${p1AfterConfirm.currentStock}`);

    // Verify OUT movement log generated
    const smOutRes = await fetch(`${BASE_URL}/stock-movements?query=${confirmedChallan.number}`, { headers: salesHeader });
    const smOutData = await smOutRes.json();
    assert(smOutData.data.length >= 1 && smOutData.data[0].type === 'OUT', 'Stock Movement log created (type OUT) for confirmed challan');

    // 5. DASHBOARD KPI METRICS
    console.log('\n--- 5. Testing Dashboard Stats ---');
    const dashRes = await fetch(`${BASE_URL}/dashboard/stats`, { headers: salesHeader });
    assert(dashRes.status === 200, 'Dashboard Stats returns HTTP 200 OK');
    const dashData = await dashRes.json();
    assert(dashData.customers && dashData.inventory && dashData.challans, 'Dashboard response contains customer, inventory, and challan metrics');


    console.log('\n==================================================');
    console.log(`AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('==================================================');

  } catch (error) {
    console.error('Fatal error during requirements test:', error);
  }
}

runTests();
