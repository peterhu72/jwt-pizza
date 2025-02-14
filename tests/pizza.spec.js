import { test, expect } from 'playwright-test-coverage';

// Only mock what's necessary for each test case
test.describe('Pizza Application End-to-End Tests', () => {
  test('Complete pizza order flow with user authentication', async ({ page }) => {
    // Mock franchise data for store selection
    await page.route('*/**/api/franchise', async route => {
      const franchiseData = [
        {
          id: 2,
          name: 'LotaPizza',
          stores: [
            { id: 4, name: 'Lehi' },
            { id: 5, name: 'Springville' },
            { id: 6, name: 'American Fork' },
          ],
        },
        { id: 3, name: 'PizzaCorp', stores: [{ id: 7, name: 'Spanish Fork' }] },
      ];
      await route.fulfill({ json: franchiseData });
    });

    // Mock menu data
    await page.route('*/**/api/order/menu', async route => {
      const menuData = [
        { id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' },
        { id: 2, title: 'Pepperoni', image: 'pizza2.png', price: 0.0042, description: 'Spicy treat' },
      ];
      await route.fulfill({ json: menuData });
    });

    // Mock order submission
    await page.route('*/**/api/order', async route => {
      if (route.request().method() === 'POST') {
        const orderRes = {
          order: {
            items: [
              { menuId: 1, description: 'Veggie', price: 0.0038 },
              { menuId: 2, description: 'Pepperoni', price: 0.0042 }
            ],
            storeId: '4',
            franchiseId: 2,
            id: 23
          },
          jwt: 'eyJpYXQ'
        };
        await route.fulfill({ json: orderRes });
      }
    });

    await page.goto('/');
    await page.getByRole('button', { name: 'Order now' }).click();
    await expect(page.locator('h2')).toContainText('Awesome is a click away');
    
    // Use real API for menu and store selection
    // Wait for store options to be loaded
    await page.waitForResponse('**/api/franchise');
    await page.getByRole('combobox').selectOption('4');
    await page.getByRole('link', { name: 'Image Description Veggie A' }).click();
    await page.getByRole('link', { name: 'Image Description Pepperoni' }).click();
    await expect(page.locator('form')).toContainText('Selected pizzas: 2');
    await page.getByRole('button', { name: 'Checkout' }).click();

    // Mock authentication
    await page.route('*/**/api/auth', async route => {
      if (route.request().method() === 'PUT') {
        const loginRes = { 
          user: { 
            id: 3, 
            name: 'Kai Chen', 
            email: 'd@jwt.com', 
            roles: [{ role: 'diner' }] 
          }, 
          token: 'abcdef' 
        };
        await route.fulfill({ json: loginRes });
      }
    });

    await page.getByPlaceholder('Email address').fill('d@jwt.com');
    await page.getByPlaceholder('Password').fill('a');
    await page.getByRole('button', { name: 'Login' }).click();
    
    // Wait for authentication response
    await page.waitForResponse('**/api/auth');

    await expect(page.getByRole('main')).toContainText('Send me those 2 pizzas right now!');
    await expect(page.locator('tbody')).toContainText('Veggie');
    await expect(page.locator('tbody')).toContainText('Pepperoni');
    await expect(page.locator('tfoot')).toContainText('0.008 ₿');
    await page.getByRole('button', { name: 'Pay now' }).click();
    await expect(page.getByText('0.008')).toBeVisible();
  });

  test('Navigation and content verification', async ({ page }) => {
    // No mocks needed - testing real pages
    await page.goto('/');
    await page.getByRole('link', { name: 'About' }).click();
    await expect(page.getByRole('main')).toContainText('The secret sauce');
    await expect(page.getByRole('main')).toContainText('Our employees');
    await expect(page.getByRole('main').getByRole('img').first()).toBeVisible();
    await expect(page.getByRole('list')).toContainText('about');

    await page.goto('/');
    await page.getByRole('link', { name: 'History' }).click();
    await expect(page.getByRole('heading')).toContainText('Mama Rucci, my my');
    await expect(page.getByRole('main').getByRole('img')).toBeVisible();
  });

  test('Admin functionality', async ({ page }) => {
    // Only mock admin authentication
    await page.route('*/**/api/auth', async route => {
      if (route.request().method() === 'PUT' && 
          route.request().postDataJSON().email === 'a@jwt.com') {
        await route.fulfill({ 
          json: { 
            user: { 
              id: 3, 
              name: '常', 
              email: 'a@jwt.com', 
              roles: [{ role: 'admin' }] 
            }, 
            token: 'abcdef' 
          } 
        });
      }
    });

    await page.goto('/');
    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('admin');
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page.locator('#navbar-dark')).toContainText('Admin');
    await expect(page.getByRole('link', { name: '常' })).toBeVisible();
    await page.getByRole('link', { name: 'Admin' }).click();
    await expect(page.getByRole('heading')).toContainText('Mama Ricci\'s kitchen');
    await expect(page.getByRole('link', { name: 'admin-dashboard' })).toBeVisible();
  });

  test('Regular user dashboard and franchise page access', async ({ page }) => {
    // Only mock regular user authentication
    await page.route('*/**/api/auth', async route => {
      if (route.request().method() === 'PUT' && 
          route.request().postDataJSON().email === 't@jwt.com') {
        await route.fulfill({ 
          json: { 
            user: { 
              id: 3, 
              name: 'test', 
              email: 't@jwt.com', 
              roles: [{ role: 'diner' }] 
            }, 
            token: 'abcdef' 
          } 
        });
      }
    });

    await page.goto('/');
    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByRole('textbox', { name: 'Email address' }).fill('t@jwt.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('test');
    await page.getByRole('button', { name: 'Login' }).click();

    // Test real franchise page content
    await expect(page.locator('#navbar-dark')).toContainText('Franchise');
    await page.getByLabel('Global').getByRole('link', { name: 'Franchise' }).click();
    await expect(page.getByRole('main')).toContainText('So you want a piece of the pie?');
    await expect(page.getByText('If you are already a')).toBeVisible();
    await expect(page.getByRole('main')).toContainText('Call now800-555-5555');

    await page.getByRole('link', { name: 't', exact: true }).click();
    await expect(page.getByRole('heading')).toContainText('Your pizza kitchen');
    await expect(page.getByRole('link', { name: 'diner-dashboard' })).toBeVisible();
    await expect(page.getByRole('main')).toContainText('test');
    await expect(page.getByRole('main')).toContainText('t@jwt.com');
    await expect(page.getByRole('main')).toContainText('diner');
  });

  test('Documentation page access', async ({ page }) => {
    // No mocks needed - testing real page
    await page.goto('/docs');
    await expect(page.getByRole('main')).toContainText('JWT Pizza API');
  });

  test('Not found page handling', async ({ page }) => {
    // No mocks needed - testing real 404 handling
    await page.goto('http://localhost:5173/notfound');
    await expect(page.getByRole('list')).toContainText('notfound');
    await expect(page.getByText('Oops')).toBeVisible();
  });
});